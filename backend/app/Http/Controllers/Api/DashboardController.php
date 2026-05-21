<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\LeadOutcome;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /** GET /api/dashboard */
    public function index(Request $request): JsonResponse
    {
        $leadQuery = Lead::visibleTo($request->user());
        $totalLeads     = (clone $leadQuery)->count();
        $qualifiedLeads = (clone $leadQuery)->where('qualification_status', 'eligible')->count();
        $duplicateCount = (clone $leadQuery)->where('duplicate_status', '!=', 'new')->count();

        // Pipeline leads = leads in active funnel stages (not Won/Lost)
        $pipelineLeads = (clone $leadQuery)->whereHas('funnelStage', function ($q) {
            $q->whereNotIn('name', ['Won', 'Lost']);
        })->count();

        $duplicateRate = $totalLeads > 0
            ? round($duplicateCount / $totalLeads * 100, 1) . '%'
            : '0%';

        // Month-over-month deltas
        $now       = now();
        $thisStart = $now->copy()->startOfMonth();
        $thisEnd   = $now->copy()->endOfMonth();
        $lastStart = $now->copy()->subMonth()->startOfMonth();
        $lastEnd   = $now->copy()->subMonth()->endOfMonth();

        $thisMonthLeads     = (clone $leadQuery)->whereBetween('created_at', [$thisStart, $thisEnd])->count();
        $lastMonthLeads     = (clone $leadQuery)->whereBetween('created_at', [$lastStart, $lastEnd])->count();
        $thisMonthQualified = (clone $leadQuery)->where('qualification_status', 'eligible')
                                ->whereBetween('created_at', [$thisStart, $thisEnd])->count();
        $lastMonthQualified = (clone $leadQuery)->where('qualification_status', 'eligible')
                                ->whereBetween('created_at', [$lastStart, $lastEnd])->count();

        $byIndustry = (clone $leadQuery)->select('industry_id', DB::raw('count(*) as total'))
            ->groupBy('industry_id')
            ->with('industry:id,name')
            ->get();

        $byStatus = (clone $leadQuery)->select('qualification_status', DB::raw('count(*) as total'))
            ->groupBy('qualification_status')
            ->pluck('total', 'qualification_status');

        $byTerritory = (clone $leadQuery)->select('territory_id', DB::raw('count(*) as total'))
            ->whereNotNull('territory_id')
            ->groupBy('territory_id')
            ->with('territory:id,name')
            ->get();

        $recentLeads = (clone $leadQuery)->orderBy('created_at', 'desc')->limit(10)->get([
            'id', 'company_name', 'lead_score', 'qualification_status', 'created_at',
        ]);

        $mapPoints = (clone $leadQuery)->with('funnelStage:id,name,color')
            ->whereNotNull('lat')
            ->whereNotNull('lng')
            ->orderByDesc('created_at')
            ->limit(500)
            ->get(['id', 'company_name', 'address', 'lat', 'lng', 'lead_score', 'qualification_status', 'funnel_stage_id'])
            ->map(fn (Lead $lead) => [
                'id' => $lead->id,
                'company_name' => $lead->company_name,
                'address' => $lead->address,
                'lat' => $lead->lat,
                'lng' => $lead->lng,
                'lead_score' => $lead->lead_score,
                'qualification_status' => $lead->qualification_status,
                'funnel_stage' => $lead->funnelStage ? [
                    'id' => $lead->funnelStage->id,
                    'name' => $lead->funnelStage->name,
                    'color' => $lead->funnelStage->color,
                ] : null,
            ]);

        $conversionFunnels = $this->conversionFunnels($request);
        $salesAchievement = $this->salesAchievement($request);
        $salesFunnelTracking = $this->salesFunnelTracking($request, $totalLeads, $pipelineLeads);
        $sourceChannelBreakdown = $this->sourceChannelBreakdown($request);

        return response()->json([
            'data' => [
                'total_leads'      => $totalLeads,
                'qualified_leads'  => $qualifiedLeads,
                'pipeline_leads'   => $pipelineLeads,
                'duplicate_count'  => $duplicateCount,
                'duplicate_rate'   => $duplicateRate,
                'duplicate_ratio'  => $totalLeads > 0 ? round($duplicateCount / $totalLeads * 100, 1) : 0,
                'leads_change'     => $this->calcChange($thisMonthLeads, $lastMonthLeads),
                'qualified_change' => $this->calcChange($thisMonthQualified, $lastMonthQualified),
                'by_industry'      => $byIndustry,
                'by_status'        => $byStatus,
                'by_territory'     => $byTerritory,
                'recent_leads'     => $recentLeads,
                'map_points'       => $mapPoints,
                'conversion_funnels' => $conversionFunnels,
                'sales_achievement' => $salesAchievement,
                'sales_funnel_tracking' => $salesFunnelTracking,
                'source_channel_breakdown' => $sourceChannelBreakdown,
            ],
        ]);
    }

    /** GET /api/dashboard/heatmap – lead coordinates for heatmap rendering */
    public function heatmap(Request $request): JsonResponse
    {
        $query = Lead::visibleTo($request->user())->whereNotNull('lat')->whereNotNull('lng');

        if ($request->filled('product_id')) {
            $productId = $request->product_id;
            $query->where(function ($productQuery) use ($productId) {
                $productQuery
                    ->where('product_id', $productId)
                    ->orWhereHas('outcomes', fn ($outcomeQuery) => $outcomeQuery->where('product_id', $productId));
            });
        }
        if ($request->filled('industry_id')) {
            $query->where('industry_id', $request->industry_id);
        }
        if ($request->filled('min_score')) {
            $query->where('lead_score', '>=', (int) $request->min_score);
        }
        if ($request->filled('funnel_stage_id')) {
            $query->where('funnel_stage_id', $request->funnel_stage_id);
        }

        $points = $query->with('funnelStage:id,name,color')->get(['id', 'company_name', 'lat', 'lng', 'lead_score', 'funnel_stage_id']);

        return response()->json(['data' => $points]);
    }

    private function conversionFunnels(Request $request): array
    {
        $stages = \App\Models\FunnelStage::where('is_active', true)
            ->whereNotIn('name', ['Won', 'Lost', 'Nurture / Hold'])
            ->orderBy('sequence')
            ->get();
        $totalLeads = Lead::visibleTo($request->user())->count();
        $baseline = max($totalLeads, 1);
        $totalEstimated = (float) Lead::visibleTo($request->user())->sum('estimated_closing_amount');
        $estimatedBaseline = max($totalEstimated, 1);
        $stageAggregates = $this->cumulativeStageAggregates($request);

        $wonCount = (int) ($stageAggregates['terminal']['won']['count'] ?? 0);
        $lostCount = (int) ($stageAggregates['terminal']['lost']['count'] ?? 0);
        $wonEstimated = (float) ($stageAggregates['terminal']['won']['estimated'] ?? 0);
        $lostEstimated = (float) ($stageAggregates['terminal']['lost']['estimated'] ?? 0);

        $startRow = [
            'id' => 'unclassified',
            'name' => 'Belum Di Klasifikasi',
            'color' => 'info',
            'count' => $totalLeads,
            'percentage' => 100,
            'estimated_amount' => $totalEstimated,
            'estimated_percentage' => $totalEstimated > 0 ? 100 : 0,
            'href' => '/leads',
        ];

        $stageRows = $stages->map(function ($stage) use ($stageAggregates, $baseline, $estimatedBaseline) {
            $count = (int) ($stageAggregates['stages'][$stage->id]['count'] ?? 0);
            $estimated = (float) ($stageAggregates['stages'][$stage->id]['estimated'] ?? 0);

            return [
                'id' => $stage->id,
                'name' => $stage->name === 'New Lead' ? 'New Leads' : $stage->name,
                'color' => $stage->color,
                'count' => $count,
                'percentage' => round(($count / $baseline) * 100, 1),
                'estimated_amount' => $estimated,
                'estimated_percentage' => round(($estimated / $estimatedBaseline) * 100, 1),
                'href' => '/leads?funnel_min_sequence=' . $stage->sequence,
            ];
        })->values()->all();

        return [
            'won' => array_merge([$startRow], $stageRows, [[
                'id' => 'won',
                'name' => 'Won',
                'color' => 'success',
                'count' => $wonCount,
                'percentage' => round(($wonCount / $baseline) * 100, 1),
                'estimated_amount' => $wonEstimated,
                'estimated_percentage' => round(($wonEstimated / $estimatedBaseline) * 100, 1),
                'href' => '/leads?outcome=won',
            ]]),
            'lost' => array_merge([$startRow], $stageRows, [[
                'id' => 'lost',
                'name' => 'Lost',
                'color' => 'danger',
                'count' => $lostCount,
                'percentage' => round(($lostCount / $baseline) * 100, 1),
                'estimated_amount' => $lostEstimated,
                'estimated_percentage' => round(($lostEstimated / $estimatedBaseline) * 100, 1),
                'href' => '/leads?outcome=lost',
            ]]),
        ];
    }

    private function salesAchievement(Request $request): array
    {
        $user = $request->user();
        $visibleUserIds = $user?->isSuperAdmin() ? null : ($user?->hierarchyUserIds() ?? []);
        $period = $user?->target_period ?? 'monthly';
        $target = (float) ($user?->target_revenue ?? 0);
        $start = match ($period) {
            'weekly' => now()->startOfWeek(),
            'quarterly' => now()->startOfQuarter(),
            'yearly' => now()->startOfYear(),
            default => now()->startOfMonth(),
        };
        $end = match ($period) {
            'weekly' => now()->endOfWeek(),
            'quarterly' => now()->endOfQuarter(),
            'yearly' => now()->endOfYear(),
            default => now()->endOfMonth(),
        };

        $outcomes = LeadOutcome::where('outcome', 'won')
            ->whereBetween('closed_at', [$start, $end])
            ->when($visibleUserIds !== null, fn ($query) => $query->where(function ($scoped) use ($visibleUserIds) {
                $scoped->whereIn('closed_by', $visibleUserIds)
                    ->orWhereHas('lead', fn ($leadQuery) => $leadQuery
                        ->whereIn('owner_id', $visibleUserIds)
                        ->orWhereIn('created_by', $visibleUserIds));
            }));

        $realized = (float) (clone $outcomes)->sum('deal_size');
        $trend = (clone $outcomes)
            ->select(DB::raw('DATE(closed_at) as date'), DB::raw('sum(deal_size) as total'))
            ->groupBy(DB::raw('DATE(closed_at)'))
            ->orderBy('date')
            ->get()
            ->map(fn ($row) => ['date' => $row->date, 'total' => (float) $row->total]);

        return [
            'period' => $period,
            'target_revenue' => $target,
            'realized_revenue' => $realized,
            'achievement_percentage' => $target > 0 ? round(($realized / $target) * 100, 1) : 0,
            'closed_won_count' => (clone $outcomes)->count(),
            'period_start' => $start->toDateString(),
            'period_end' => $end->toDateString(),
            'trend' => $trend,
        ];
    }

    private function salesFunnelTracking(Request $request, int $totalLeads, int $pipelineLeads): array
    {
        $stages = \App\Models\FunnelStage::where('is_active', true)
            ->whereNotIn('name', ['Won', 'Lost', 'Nurture / Hold'])
            ->orderBy('sequence')
            ->get();
        $baseline = max($totalLeads, 1);
        $totalEstimated = (float) Lead::visibleTo($request->user())->sum('estimated_closing_amount');
        $estimatedBaseline = max($totalEstimated, 1);
        $stageAggregates = $this->cumulativeStageAggregates($request);
        $wonCount = (int) ($stageAggregates['terminal']['won']['count'] ?? 0);
        $lostCount = (int) ($stageAggregates['terminal']['lost']['count'] ?? 0);
        $wonEstimated = (float) ($stageAggregates['terminal']['won']['estimated'] ?? 0);
        $lostEstimated = (float) ($stageAggregates['terminal']['lost']['estimated'] ?? 0);

        $startRow = [
            'id' => 'unclassified',
            'label' => 'Belum Di Klasifikasi',
            'value' => $totalLeads,
            'percentage' => 100,
            'estimated_amount' => $totalEstimated,
            'estimated_percentage' => $totalEstimated > 0 ? 100 : 0,
            'color' => 'info',
            'href' => '/leads',
        ];

        $stageRows = $stages->map(function ($stage) use ($stageAggregates, $baseline, $estimatedBaseline) {
            $count = (int) ($stageAggregates['stages'][$stage->id]['count'] ?? 0);
            $estimated = (float) ($stageAggregates['stages'][$stage->id]['estimated'] ?? 0);

            return [
                'id' => $stage->id,
                'label' => $stage->name === 'New Lead' ? 'New Leads' : $stage->name,
                'value' => $count,
                'percentage' => round(($count / $baseline) * 100, 1),
                'estimated_amount' => $estimated,
                'estimated_percentage' => round(($estimated / $estimatedBaseline) * 100, 1),
                'color' => $stage->color ?: 'brand',
                'href' => '/leads?funnel_min_sequence=' . $stage->sequence,
            ];
        })->values()->all();

        $wonFunnel = array_merge([$startRow], $stageRows, [[
            'id' => 'won',
            'label' => 'Won',
            'value' => $wonCount,
            'percentage' => round(($wonCount / $baseline) * 100, 1),
            'estimated_amount' => $wonEstimated,
            'estimated_percentage' => round(($wonEstimated / $estimatedBaseline) * 100, 1),
            'color' => 'success',
            'href' => '/leads?outcome=won',
        ]]);

        $lostFunnel = array_merge([$startRow], $stageRows, [[
            'id' => 'lost',
            'label' => 'Lost',
            'value' => $lostCount,
            'percentage' => round(($lostCount / $baseline) * 100, 1),
            'estimated_amount' => $lostEstimated,
            'estimated_percentage' => round(($lostEstimated / $estimatedBaseline) * 100, 1),
            'color' => 'danger',
            'href' => '/leads?outcome=lost',
        ]]);

        $productAggregates = $this->productRevenueAggregates($request);

        return [
            'funnel' => $wonFunnel,
            'funnels' => [
                'won' => $wonFunnel,
                'lost' => $lostFunnel,
            ],
            'sales_volume' => collect($productAggregates)->map(fn ($row) => [
                'label' => $row['product_name'],
                'value' => (float) $row['sales_volume'],
                'count' => (int) $row['total_market'],
                'href' => $row['product_id'] ? '/leads?product_id=' . $row['product_id'] : '/leads',
            ])->values(),
            'total_market' => collect($productAggregates)->map(fn ($row) => [
                'label' => $row['product_name'],
                'value' => (int) $row['total_market'],
                'estimated_volume' => (float) $row['estimated_volume'],
                'href' => $row['product_id'] ? '/leads?product_id=' . $row['product_id'] : '/leads',
            ])->values(),
        ];
    }

    private function productRevenueAggregates(Request $request): array
    {
        $leads = Lead::visibleTo($request->user())->get(['id', 'product_id', 'estimated_closing_amount']);
        $leadIds = $leads->pluck('id');
        $leadById = $leads->keyBy('id');
        $outcomes = LeadOutcome::whereIn('lead_id', $leadIds)
            ->get(['lead_id', 'product_id', 'outcome', 'deal_size']);

        $marketPairs = [];
        $sales = [];

        $addMarketPair = function (?int $productId, int $leadId) use (&$marketPairs, $leadById) {
            $key = $productId ?: 'unassigned';
            if (isset($marketPairs[$key][$leadId])) {
                return;
            }

            $marketPairs[$key][$leadId] = [
                'estimated' => (float) ($leadById->get($leadId)?->estimated_closing_amount ?? 0),
            ];
        };

        foreach ($leads as $lead) {
            if ($lead->product_id) {
                $addMarketPair((int) $lead->product_id, (int) $lead->id);
            }
        }

        foreach ($outcomes as $outcome) {
            if ($outcome->product_id) {
                $addMarketPair((int) $outcome->product_id, (int) $outcome->lead_id);
            }

            if ($outcome->outcome === 'won') {
                $key = $outcome->product_id ?: 'unassigned';
                $sales[$key] = ($sales[$key] ?? 0) + (float) ($outcome->deal_size ?? 0);
            }
        }

        $productLeadIds = [];
        foreach ($marketPairs as $pairs) {
            foreach (array_keys($pairs) as $leadId) {
                $productLeadIds[$leadId] = true;
            }
        }

        foreach ($leads as $lead) {
            if (! isset($productLeadIds[$lead->id])) {
                $addMarketPair(null, (int) $lead->id);
            }
        }

        $keys = array_unique(array_merge(array_keys($marketPairs), array_keys($sales)));
        $productNames = Product::whereIn('id', collect($keys)->filter(fn ($key) => is_numeric($key))->values())
            ->pluck('name', 'id');

        return collect($keys)
            ->map(function ($key) use ($marketPairs, $sales, $productNames) {
                $pairs = $marketPairs[$key] ?? [];

                return [
                    'product_id' => is_numeric($key) ? (int) $key : null,
                    'product_name' => is_numeric($key) ? ($productNames[(int) $key] ?? "Product {$key}") : 'Unassigned',
                    'total_market' => count($pairs),
                    'estimated_volume' => collect($pairs)->sum('estimated'),
                    'sales_volume' => (float) ($sales[$key] ?? 0),
                ];
            })
            ->sortByDesc(fn ($row) => [$row['total_market'], $row['sales_volume']])
            ->values()
            ->all();
    }

    private function cumulativeStageAggregates(Request $request): array
    {
        $stageRows = \App\Models\FunnelStage::where('is_active', true)
            ->whereNotIn('name', ['Nurture / Hold'])
            ->orderBy('sequence')
            ->get(['id', 'name', 'sequence']);

        $pathStageRows = $stageRows->whereNotIn('name', ['Won', 'Lost'])->values();
        $stageIdsByMinimumSequence = [];

        foreach ($pathStageRows as $stage) {
            $stageIdsByMinimumSequence[$stage->id] = $stageRows
                ->filter(fn ($row) => $row->sequence >= $stage->sequence)
                ->pluck('id')
                ->values()
                ->all();
        }

        $aggregates = [];
        foreach ($stageIdsByMinimumSequence as $stageId => $stageIds) {
            $query = Lead::visibleTo($request->user())->whereIn('funnel_stage_id', $stageIds);
            $aggregates[$stageId] = [
                'count' => (clone $query)->count(),
                'estimated' => (float) (clone $query)->sum('estimated_closing_amount'),
            ];
        }

        $terminalAggregate = function (string $stageName, string $outcome) use ($request) {
            $query = Lead::visibleTo($request->user())
                ->where(function ($leadQuery) use ($stageName, $outcome) {
                    $leadQuery
                        ->whereHas('funnelStage', fn ($stageQuery) => $stageQuery->where('name', $stageName))
                        ->orWhereHas('outcomes', fn ($outcomeQuery) => $outcomeQuery->where('outcome', $outcome));
                });

            return [
                'count' => (clone $query)->distinct('leads.id')->count('leads.id'),
                'estimated' => (float) (clone $query)->sum('estimated_closing_amount'),
            ];
        };

        return [
            'stages' => $aggregates,
            'terminal' => [
                'won' => $terminalAggregate('Won', 'won'),
                'lost' => $terminalAggregate('Lost', 'lost'),
            ],
        ];
    }

    private function sourceChannelBreakdown(Request $request): array
    {
        $sourceRows = Lead::visibleTo($request->user())
            ->leftJoin('lead_sources', 'lead_sources.lead_id', '=', 'leads.id')
            ->leftJoin('lead_source_types', 'lead_source_types.slug', '=', 'lead_sources.source_type')
            ->select(
                'lead_sources.source_type',
                DB::raw("COALESCE(lead_source_types.name, lead_sources.source_type, 'Unassigned') as label"),
                DB::raw('COUNT(DISTINCT leads.id) as total')
            )
            ->groupBy('lead_sources.source_type', 'lead_source_types.name')
            ->orderByDesc(DB::raw('COUNT(DISTINCT leads.id)'))
            ->get();

        $channelRows = Lead::visibleTo($request->user())
            ->leftJoin('lead_sources', 'lead_sources.lead_id', '=', 'leads.id')
            ->leftJoin('lead_channel_types', 'lead_channel_types.id', '=', 'lead_sources.channel_type_id')
            ->leftJoin('lead_source_types', 'lead_source_types.slug', '=', 'lead_sources.source_type')
            ->select(
                'lead_sources.source_type',
                'lead_sources.channel_type_id',
                DB::raw("COALESCE(lead_source_types.name, lead_sources.source_type, 'Unassigned Source') as source_label"),
                DB::raw("COALESCE(lead_channel_types.name, 'Unassigned Channel') as label"),
                DB::raw('COUNT(DISTINCT leads.id) as total')
            )
            ->groupBy('lead_sources.source_type', 'lead_sources.channel_type_id', 'lead_source_types.name', 'lead_channel_types.name')
            ->orderByDesc(DB::raw('COUNT(DISTINCT leads.id)'))
            ->get();

        return [
            'sources' => $sourceRows->map(fn ($row) => [
                'source_type' => $row->source_type,
                'label' => $row->label,
                'value' => (int) $row->total,
                'href' => $row->source_type ? '/leads?source_type=' . urlencode($row->source_type) : '/leads',
            ])->values(),
            'channels' => $channelRows->map(fn ($row) => [
                'source_type' => $row->source_type,
                'source_label' => $row->source_label,
                'channel_type_id' => $row->channel_type_id,
                'label' => $row->label,
                'value' => (int) $row->total,
                'href' => $row->channel_type_id
                    ? '/leads?source_type=' . urlencode((string) $row->source_type) . '&channel_type_id=' . $row->channel_type_id
                    : ($row->source_type ? '/leads?source_type=' . urlencode($row->source_type) : '/leads'),
            ])->values(),
        ];
    }

    /** Calculate percentage change label between two periods */
    private function calcChange(int $current, int $previous): ?string
    {
        if ($previous === 0) {
            return $current > 0 ? '+100% this month' : null;
        }
        $pct  = round((($current - $previous) / $previous) * 100, 1);
        $sign = $pct >= 0 ? '+' : '';

        return "{$sign}{$pct}% vs last month";
    }
}
