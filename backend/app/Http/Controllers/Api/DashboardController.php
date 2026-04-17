<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /** GET /api/dashboard */
    public function index(): JsonResponse
    {
        $totalLeads     = Lead::count();
        $qualifiedLeads = Lead::where('qualification_status', 'eligible')->count();
        $duplicateCount = Lead::where('duplicate_status', '!=', 'new')->count();

        // Pipeline leads = leads in active funnel stages (not Won/Lost)
        $pipelineLeads = Lead::whereHas('funnelStage', function ($q) {
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

        $thisMonthLeads     = Lead::whereBetween('created_at', [$thisStart, $thisEnd])->count();
        $lastMonthLeads     = Lead::whereBetween('created_at', [$lastStart, $lastEnd])->count();
        $thisMonthQualified = Lead::where('qualification_status', 'eligible')
                                ->whereBetween('created_at', [$thisStart, $thisEnd])->count();
        $lastMonthQualified = Lead::where('qualification_status', 'eligible')
                                ->whereBetween('created_at', [$lastStart, $lastEnd])->count();

        $byIndustry = Lead::select('industry_id', DB::raw('count(*) as total'))
            ->groupBy('industry_id')
            ->with('industry:id,name')
            ->get();

        $byStatus = Lead::select('qualification_status', DB::raw('count(*) as total'))
            ->groupBy('qualification_status')
            ->pluck('total', 'qualification_status');

        $byTerritory = Lead::select('territory_id', DB::raw('count(*) as total'))
            ->whereNotNull('territory_id')
            ->groupBy('territory_id')
            ->with('territory:id,name')
            ->get();

        $recentLeads = Lead::orderBy('created_at', 'desc')->limit(10)->get([
            'id', 'company_name', 'lead_score', 'qualification_status', 'created_at',
        ]);

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
            ],
        ]);
    }

    /** GET /api/dashboard/heatmap – lead coordinates for heatmap rendering */
    public function heatmap(Request $request): JsonResponse
    {
        $query = Lead::whereNotNull('lat')->whereNotNull('lng');

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
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

        $points = $query->get(['id', 'company_name', 'lat', 'lng', 'lead_score']);

        return response()->json(['data' => $points]);
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
