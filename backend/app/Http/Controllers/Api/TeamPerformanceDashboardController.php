<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\LeadFollowUp;
use App\Models\LeadMeeting;
use App\Models\LeadOutcome;
use App\Models\LeadQuotation;
use App\Models\LeadSalesOrder;
use App\Models\AiAttentionHighlight;
use App\Models\FunnelStage;
use App\Services\Analytics\RoleKpiCalculationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class TeamPerformanceDashboardController extends Controller
{
    private RoleKpiCalculationService $kpiService;

    public function __construct(RoleKpiCalculationService $kpiService)
    {
        $this->kpiService = $kpiService;
    }

    /**
     * GET /api/dashboard/team-performance
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $period = $request->query('period', 'month');
        $dateRange = $this->getDateRange($period);

        if ($user->isSuperAdmin() || $user->isExecutive()) {
            $userIds = User::where('is_active', true)->pluck('id')->all();
        } else {
            $userIds = $user->hierarchyUserIds();
        }

        $users = User::whereIn('id', $userIds)
            ->where('is_active', true)
            ->with('role')
            ->get();

        return response()->json([
            'data' => [
                'period'               => $period,
                'overview_kpis'        => $this->buildOverviewKpis($userIds, $dateRange),
                'role_matrix'          => $this->buildRoleMatrix($users, $period),
                'leaderboard'          => $this->buildLeaderboard($users, $period),
                'lifecycle_funnel'     => $this->buildLifecycleFunnel($userIds),
                'target_achievement'   => $this->buildTargetAchievement($users, $period),
                'revenue_contribution' => $this->buildRevenueContribution($userIds, $dateRange),
                'attention_risks'      => $this->buildAttentionRisks($userIds),
                'kpi_trends'           => $this->buildKpiTrends($period, $userIds),
                'lost_bottlenecks'     => $this->buildLostBottlenecks($userIds, $dateRange),
                'manager_hierarchy'    => $this->buildManagerHierarchy($users, $period),
            ]
        ]);
    }

    // ──────────────────────────────────────────────
    // Block 1: Executive KPI Summary
    // ──────────────────────────────────────────────
    private function buildOverviewKpis(array $userIds, array $dateRange): array
    {
        $leadsBase = Lead::where(function ($q) use ($userIds) {
            $q->whereIn('owner_id', $userIds)
              ->orWhereIn('presales_owner_id', $userIds)
              ->orWhereIn('am_owner_id', $userIds)
              ->orWhereIn('csm_owner_id', $userIds)
              ->orWhereHas('roleAssignments', fn ($sq) => $sq->whereIn('user_id', $userIds));
        });

        $totalLeads = (clone $leadsBase)->whereBetween('leads.created_at', $dateRange)->count();

        $qualifiedLeads = (clone $leadsBase)
            ->whereBetween('leads.created_at', $dateRange)
            ->where('qualification_status', 'eligible')
            ->count();

        $activeOpps = (clone $leadsBase)
            ->whereHas('funnelStage', fn ($q) => $q->whereNotIn('name', ['Won', 'Lost']))
            ->count();

        $pipelineValue = (float) ((clone $leadsBase)
            ->whereHas('funnelStage', fn ($q) => $q->whereNotIn('name', ['Won', 'Lost']))
            ->sum('estimated_closing_amount') ?? 0);

        $wonRevenue = (float) (LeadOutcome::whereIn('closed_by', $userIds)
            ->whereBetween('closed_at', $dateRange)
            ->where('outcome', 'won')
            ->sum('deal_size') ?? 0);

        $overdueFollowUps = LeadFollowUp::whereIn('assigned_to', $userIds)
            ->where('status', '!=', 'completed')
            ->where('due_date', '<', now())
            ->count();

        // Avg readiness score from pre-meeting briefs
        $leadIds = (clone $leadsBase)->pluck('id');
        $avgReadiness = $leadIds->isEmpty()
            ? null
            : (float) DB::table('lead_pre_meeting_briefs')
                ->whereIn('lead_id', $leadIds)
                ->avg('readiness_score');

        return [
            'total_leads'       => $totalLeads,
            'qualified_leads'   => $qualifiedLeads,
            'active_opps'       => $activeOpps,
            'pipeline_value'    => $pipelineValue,
            'won_revenue'       => $wonRevenue,
            'overdue_follow_ups'=> $overdueFollowUps,
            'avg_readiness'     => $avgReadiness,
        ];
    }

    // ──────────────────────────────────────────────
    // Block 2: Role Performance Matrix
    // ──────────────────────────────────────────────
    private function buildRoleMatrix(object $users, string $period): array
    {
        $teams = [];
        foreach ($users as $u) {
            $kpiData = $this->kpiService->calculateForUser($u, $period);
            $cat = $kpiData['role_category'];

            if ($cat === 'other') continue;

            if (!isset($teams[$cat])) {
                $teams[$cat] = ['users' => [], 'metrics' => []];
            }
            $teams[$cat]['users'][] = $u->id;

            foreach ($kpiData['metrics'] as $m) {
                $key = $m['kpi_key'];
                if (!isset($teams[$cat]['metrics'][$key])) {
                    $teams[$cat]['metrics'][$key] = [
                        'kpi_key'     => $m['kpi_key'],
                        'kpi_name'    => $m['kpi_name'],
                        'format'      => $m['format'],
                        'data_source' => $m['data_source'],
                        'calculation_basis' => $m['calculation_basis'],
                        'actual'      => 0,
                        'target'      => 0,
                        'users_counted' => 0,
                    ];
                }
                $teams[$cat]['metrics'][$key]['actual'] += $m['actual'];
                $teams[$cat]['metrics'][$key]['target'] += $m['target'] ?: 0;
                $teams[$cat]['metrics'][$key]['users_counted']++;
            }
        }

        $matrix = [];
        foreach ($teams as $cat => $data) {
            if (empty($data['users'])) continue;
            $finalMetrics = [];
            foreach ($data['metrics'] as $m) {
                if ($m['format'] === 'percentage' && $m['users_counted'] > 0) {
                    $m['actual'] = round($m['actual'] / $m['users_counted'], 1);
                }
                $achievement = ($m['target'] > 0) ? min(200, round(($m['actual'] / $m['target']) * 100, 1)) : null;
                $m['achievement_percentage'] = $achievement;
                $m['status'] = $achievement !== null ? $this->resolveStatusFromAchievement($achievement) : 'on_track';
                unset($m['users_counted']);
                $finalMetrics[] = $m;
            }
            $matrix[] = [
                'role_category' => $cat,
                'user_count'    => count($data['users']),
                'metrics'       => $finalMetrics,
            ];
        }
        return $matrix;
    }

    // ──────────────────────────────────────────────
    // Block 3: Leaderboard
    // ──────────────────────────────────────────────
    private function buildLeaderboard(object $users, string $period): array
    {
        $leaderboard = [];
        foreach ($users as $u) {
            $kpiData = $this->kpiService->calculateForUser($u, $period);
            if ($kpiData['role_category'] === 'other') continue;

            $achievements = collect($kpiData['metrics'])->pluck('achievement_percentage')->filter(fn ($val) => $val !== null);
            $avgAchievement = $achievements->count() > 0 ? round($achievements->avg(), 1) : 0;

            $leaderboard[] = [
                'user_id'             => $u->id,
                'name'                => $u->name,
                'role_category'       => $kpiData['role_category'],
                'role_name'           => $u->role?->name ?? 'N/A',
                'overall_achievement' => $avgAchievement,
                'metrics'             => $kpiData['metrics'],
                'manager_id'          => $u->direct_manager_id,
            ];
        }
        return collect($leaderboard)->sortByDesc('overall_achievement')->take(10)->values()->all();
    }

    // ──────────────────────────────────────────────
    // Block 4: Lifecycle Funnel (current snapshot, not filtered by date)
    // ──────────────────────────────────────────────
    private function buildLifecycleFunnel(array $userIds): array
    {
        $stages = FunnelStage::orderBy('sequence')->get();

        $leadsBase = Lead::where(function ($q) use ($userIds) {
            $q->whereIn('owner_id', $userIds)
              ->orWhereIn('presales_owner_id', $userIds)
              ->orWhereIn('am_owner_id', $userIds)
              ->orWhereIn('csm_owner_id', $userIds)
              ->orWhereHas('roleAssignments', fn ($sq) => $sq->whereIn('user_id', $userIds));
        });

        $totalLeads = (clone $leadsBase)->count();
        $funnel = [];

        foreach ($stages as $stage) {
            $count = (clone $leadsBase)->where('funnel_stage_id', $stage->id)->count();
            $funnel[] = [
                'stage_id'    => $stage->id,
                'stage_name'  => $stage->name,
                'sequence'    => $stage->sequence,
                'color'       => $stage->color,
                'probability' => $stage->probability,
                'count'       => $count,
                'percentage'  => $totalLeads > 0 ? round(($count / $totalLeads) * 100, 1) : 0,
            ];
        }

        return [
            'total_leads' => $totalLeads,
            'stages'      => $funnel,
        ];
    }

    // ──────────────────────────────────────────────
    // Block 5: Target vs Achievement (V2)
    // ──────────────────────────────────────────────
    private function buildTargetAchievement(object $users, string $period): array
    {
        $results = [];

        foreach ($users as $u) {
            $kpiData = $this->kpiService->calculateForUser($u, $period);
            $roleCategory = $kpiData['role_category'];

            if ($roleCategory === 'other') continue;

            foreach ($kpiData['metrics'] as $m) {
                if ($m['target'] !== null && $m['target'] > 0) {
                    $results[] = [
                        'user_id'               => $u->id,
                        'name'                  => $u->name,
                        'role_category'         => $roleCategory,
                        'kpi_key'               => $m['kpi_key'],
                        'kpi_name'              => $m['kpi_name'],
                        'format'                => $m['format'],
                        'actual'                => $m['actual'],
                        'target'                => $m['target'],
                        'achievement_percentage'=> $m['achievement_percentage'],
                        'status'                => $m['status'],
                    ];
                }
            }
        }
        
        return collect($results)->groupBy('role_category')->toArray();
    }

    // ──────────────────────────────────────────────
    // Block 6: Revenue Contribution by Role
    // ──────────────────────────────────────────────
    private function buildRevenueContribution(array $userIds, array $dateRange): array
    {
        // Primary: lead_sales_orders + lead_role_assignments
        $contributions = DB::table('lead_sales_orders')
            ->join('lead_role_assignments', 'lead_sales_orders.lead_id', '=', 'lead_role_assignments.lead_id')
            ->whereIn('lead_role_assignments.user_id', $userIds)
            ->whereBetween('lead_sales_orders.order_date', $dateRange)
            ->where('lead_sales_orders.order_status', 'confirmed')
            ->where('lead_role_assignments.assignment_status', 'active')
            ->selectRaw('lead_role_assignments.role_type, sum(lead_sales_orders.total_amount * (lead_role_assignments.contribution_percentage / 100.0)) as total_contribution')
            ->groupBy('lead_role_assignments.role_type')
            ->pluck('total_contribution', 'role_type')
            ->toArray();

        $source = 'lead_sales_orders + lead_role_assignments';

        // Fallback: lead_outcomes by owner mapping
        if (empty($contributions)) {
            $outcomes = LeadOutcome::whereIn('closed_by', $userIds)
                ->whereBetween('closed_at', $dateRange)
                ->where('outcome', 'won')
                ->with('lead')
                ->get();

            foreach ($outcomes as $oc) {
                $lead = $oc->lead;
                if (!$lead) continue;

                $amount = (float) $oc->deal_size;

                if ($lead->owner_id && in_array($lead->owner_id, $userIds)) {
                    $contributions['sales'] = ($contributions['sales'] ?? 0) + $amount;
                }
                if ($lead->presales_owner_id && in_array($lead->presales_owner_id, $userIds)) {
                    $contributions['presales'] = ($contributions['presales'] ?? 0) + ($amount * 0.1);
                }
                if ($lead->am_owner_id && in_array($lead->am_owner_id, $userIds)) {
                    $contributions['account_manager'] = ($contributions['account_manager'] ?? 0) + ($amount * 0.1);
                }
            }
            $source = 'lead_outcomes (fallback — owner-based mapping)';
        }

        return [
            'data'        => $contributions,
            'data_source' => $source,
        ];
    }

    // ──────────────────────────────────────────────
    // Block 7: Attention & Risk Center
    // ──────────────────────────────────────────────
    private function buildAttentionRisks(array $userIds): array
    {
        $risks = [];

        // 1. AI Attention Highlights
        $highlights = AiAttentionHighlight::whereIn('assigned_to', $userIds)
            ->where('status', 'open')
            ->orderByRaw("CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END")
            ->take(5)
            ->get();

        foreach ($highlights as $h) {
            $risks[] = [
                'category'    => 'ai_highlight',
                'severity'    => $h->severity,
                'title'       => $h->title,
                'description' => $h->reason,
                'lead_name'   => $h->entity_type === 'App\\Models\\Lead' ? Lead::find($h->entity_id)?->company_name : null,
                'user_name'   => $h->assigned_to ? User::find($h->assigned_to)?->name : null,
                'entity_id'   => $h->entity_id,
            ];
        }

        // 2. Overdue Follow-ups
        $overdueFollowUps = LeadFollowUp::whereIn('assigned_to', $userIds)
            ->where('status', '!=', 'completed')
            ->where('due_date', '<', now())
            ->with('lead')
            ->take(5)
            ->get();

        foreach ($overdueFollowUps as $fu) {
            $daysOverdue = Carbon::parse($fu->due_date)->diffInDays(now());
            $risks[] = [
                'category'    => 'overdue_follow_up',
                'severity'    => $daysOverdue > 7 ? 'high' : 'medium',
                'title'       => "Follow-up overdue by {$daysOverdue} days",
                'description' => $fu->purpose ?? 'Follow-up task past due date',
                'lead_name'   => $fu->lead?->company_name,
                'user_name'   => $fu->assigned_to ? User::find($fu->assigned_to)?->name : null,
                'entity_id'   => $fu->lead_id,
            ];
        }

        // 3. Leads without owner
        $noOwner = Lead::whereNull('owner_id')
            ->whereHas('funnelStage', fn ($q) => $q->whereNotIn('name', ['Won', 'Lost']))
            ->take(5)
            ->get();

        foreach ($noOwner as $lead) {
            $risks[] = [
                'category'    => 'missing_owner',
                'severity'    => 'medium',
                'title'       => 'Lead has no assigned owner',
                'description' => "{$lead->company_name} is in the pipeline without an owner",
                'lead_name'   => $lead->company_name,
                'user_name'   => null,
                'entity_id'   => $lead->id,
            ];
        }

        // 4. Stuck leads (no activity in 14+ days, not Won/Lost)
        $stuckLeads = Lead::where(function ($q) use ($userIds) {
                $q->whereIn('owner_id', $userIds)
                  ->orWhereIn('presales_owner_id', $userIds)
                  ->orWhereIn('am_owner_id', $userIds)
                  ->orWhereIn('csm_owner_id', $userIds);
            })
            ->whereHas('funnelStage', fn ($q) => $q->whereNotIn('name', ['Won', 'Lost', 'Nurture / Hold']))
            ->whereDoesntHave('activities', fn ($q) => $q->where('created_at', '>', now()->subDays(14)))
            ->where('leads.updated_at', '<', now()->subDays(14))
            ->take(5)
            ->get();

        foreach ($stuckLeads as $lead) {
            $daysSinceUpdate = Carbon::parse($lead->updated_at)->diffInDays(now());
            $risks[] = [
                'category'    => 'stuck_lead',
                'severity'    => $daysSinceUpdate > 30 ? 'high' : 'medium',
                'title'       => "Lead inactive for {$daysSinceUpdate} days",
                'description' => "{$lead->company_name} has had no activity for {$daysSinceUpdate} days",
                'lead_name'   => $lead->company_name,
                'user_name'   => $lead->owner_id ? User::find($lead->owner_id)?->name : null,
                'entity_id'   => $lead->id,
            ];
        }

        // 5. Lost leads without loss reason
        $noLossReason = LeadOutcome::whereIn('closed_by', $userIds)
            ->where('outcome', 'lost')
            ->whereNull('loss_reason')
            ->take(5)
            ->get();

        foreach ($noLossReason as $oc) {
            $risks[] = [
                'category'    => 'missing_loss_reason',
                'severity'    => 'low',
                'title'       => 'Lost lead without loss reason',
                'description' => 'A closed-lost lead is missing loss reason documentation',
                'lead_name'   => Lead::find($oc->lead_id)?->company_name,
                'user_name'   => $oc->closed_by ? User::find($oc->closed_by)?->name : null,
                'entity_id'   => $oc->lead_id,
            ];
        }

        // Sort by severity priority
        usort($risks, function ($a, $b) {
            $severityOrder = ['critical' => 0, 'high' => 1, 'medium' => 2, 'low' => 3];
            return ($severityOrder[$a['severity']] ?? 4) <=> ($severityOrder[$b['severity']] ?? 4);
        });

        return array_slice($risks, 0, 15);
    }

    // ──────────────────────────────────────────────
    // Block 8: KPI Trend Analysis (real data)
    // ──────────────────────────────────────────────
    private function buildKpiTrends(string $period, array $userIds): array
    {
        $groupFormat = $period === 'year' ? 'YYYY-MM' : 'IYYY-IW';
        $labelFormat = $period === 'year' ? 'Mon' : 'W##';
        $dateRange = $this->getDateRange($period);

        // Leads created over time
        $leadsCreated = Lead::where(function ($q) use ($userIds) {
                $q->whereIn('owner_id', $userIds)
                  ->orWhereIn('presales_owner_id', $userIds);
            })
            ->whereBetween('created_at', $dateRange)
            ->selectRaw("to_char(created_at, '{$groupFormat}') as period_label, count(*) as value")
            ->groupByRaw("to_char(created_at, '{$groupFormat}')")
            ->orderByRaw("to_char(created_at, '{$groupFormat}')")
            ->pluck('value', 'period_label')
            ->toArray();

        // Deals closed over time
        $closedWon = LeadOutcome::whereIn('closed_by', $userIds)
            ->where('outcome', 'won')
            ->whereBetween('closed_at', $dateRange)
            ->selectRaw("to_char(closed_at, '{$groupFormat}') as period_label, count(*) as value")
            ->groupByRaw("to_char(closed_at, '{$groupFormat}')")
            ->orderByRaw("to_char(closed_at, '{$groupFormat}')")
            ->pluck('value', 'period_label')
            ->toArray();

        // Meetings held over time
        $meetings = LeadMeeting::whereIn('created_by', $userIds)
            ->whereBetween('meeting_date', $dateRange)
            ->selectRaw("to_char(meeting_date, '{$groupFormat}') as period_label, count(*) as value")
            ->groupByRaw("to_char(meeting_date, '{$groupFormat}')")
            ->orderByRaw("to_char(meeting_date, '{$groupFormat}')")
            ->pluck('value', 'period_label')
            ->toArray();

        // Merge all period labels for consistent x-axis
        $allLabels = array_unique(array_merge(
            array_keys($leadsCreated),
            array_keys($closedWon),
            array_keys($meetings)
        ));
        sort($allLabels);

        return [
            'labels' => $allLabels,
            'series' => [
                ['name' => 'Leads Created', 'data' => array_map(fn ($l) => $leadsCreated[$l] ?? 0, $allLabels)],
                ['name' => 'Closed Won',    'data' => array_map(fn ($l) => $closedWon[$l] ?? 0, $allLabels)],
                ['name' => 'Meetings',      'data' => array_map(fn ($l) => $meetings[$l] ?? 0, $allLabels)],
            ],
        ];
    }

    // ──────────────────────────────────────────────
    // Block 9: Lost Reason & Bottleneck Analysis
    // ──────────────────────────────────────────────
    private function buildLostBottlenecks(array $userIds, array $dateRange): array
    {
        // Lost reasons
        $lostReasons = LeadOutcome::whereIn('closed_by', $userIds)
            ->whereBetween('closed_at', $dateRange)
            ->where('outcome', 'lost')
            ->selectRaw('COALESCE(loss_reason, \'No Reason Provided\') as reason, count(*) as count')
            ->groupBy('loss_reason')
            ->orderByDesc('count')
            ->pluck('count', 'reason')
            ->toArray();

        // Stuck leads by stage
        $stuckByStage = Lead::where(function ($q) use ($userIds) {
                $q->whereIn('owner_id', $userIds)
                  ->orWhereIn('presales_owner_id', $userIds);
            })
            ->whereHas('funnelStage', fn ($q) => $q->whereNotIn('name', ['Won', 'Lost', 'Nurture / Hold']))
            ->whereDoesntHave('activities', fn ($q) => $q->where('created_at', '>', now()->subDays(14)))
            ->where('leads.updated_at', '<', now()->subDays(14))
            ->join('funnel_stages', 'leads.funnel_stage_id', '=', 'funnel_stages.id')
            ->selectRaw('funnel_stages.name as stage, count(*) as count')
            ->groupBy('funnel_stages.name')
            ->orderByDesc('count')
            ->pluck('count', 'stage')
            ->toArray();

        return [
            'lost_reasons'   => $lostReasons,
            'stuck_by_stage' => $stuckByStage,
        ];
    }

    // ──────────────────────────────────────────────
    // Block 10: Manager Hierarchy
    // ──────────────────────────────────────────────
    private function buildManagerHierarchy(object $users, string $period): array
    {
        $hierarchy = [];
        foreach ($users as $u) {
            $kpiData = $this->kpiService->calculateForUser($u, $period);
            $achievements = collect($kpiData['metrics'])->pluck('achievement_percentage')->filter(fn ($val) => $val !== null);
            $avgAchievement = $achievements->count() > 0 ? round($achievements->avg(), 1) : 0;

            $hierarchy[] = [
                'id'            => $u->id,
                'name'          => $u->name,
                'manager_id'    => $u->direct_manager_id,
                'role'          => $u->role ? $u->role->name : 'N/A',
                'role_category' => $kpiData['role_category'],
                'achievement'   => $avgAchievement,
            ];
        }

        // Build Tree
        $tree = [];
        $map = [];
        foreach ($hierarchy as &$node) {
            $node['children'] = [];
            $map[$node['id']] = &$node;
        }
        foreach ($hierarchy as &$node) {
            if ($node['manager_id'] && isset($map[$node['manager_id']])) {
                $map[$node['manager_id']]['children'][] = &$node;
            } else {
                $tree[] = &$node;
            }
        }
        return $tree;
    }

    // ──────────────────────────────────────────────
    // Drilldown Endpoint
    // ──────────────────────────────────────────────
    public function drilldown(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $block = $request->query('block_key');
        $kpi = $request->query('kpi_key');
        $role = $request->query('role');
        $targetUserId = $request->query('user_id');
        $period = $request->query('period', 'month');
        $stage = $request->query('stage');

        $dateRange = $this->getDateRange($period);

        if ($user->isSuperAdmin() || $user->isExecutive()) {
            $userIds = User::where('is_active', true)->pluck('id')->all();
        } else {
            $userIds = $user->hierarchyUserIds();
        }

        if ($targetUserId && in_array((int) $targetUserId, $userIds)) {
            $userIds = [(int) $targetUserId];
        }

        $records = [];
        $columns = [];
        $explanation = '';

        if ($block === 'revenue_contribution') {
            $columns = [
                ['key' => 'id', 'label' => 'Order ID'],
                ['key' => 'company_name', 'label' => 'Lead Name'],
                ['key' => 'role_type', 'label' => 'Role'],
                ['key' => 'contribution', 'label' => 'Contribution Amount'],
                ['key' => 'order_date', 'label' => 'Date'],
            ];

            $records = DB::table('lead_sales_orders')
                ->join('lead_role_assignments', 'lead_sales_orders.lead_id', '=', 'lead_role_assignments.lead_id')
                ->join('leads', 'lead_sales_orders.lead_id', '=', 'leads.id')
                ->whereIn('lead_role_assignments.user_id', $userIds)
                ->whereBetween('lead_sales_orders.order_date', $dateRange)
                ->where('lead_sales_orders.order_status', 'confirmed')
                ->when($role, fn ($q) => $q->where('lead_role_assignments.role_type', $role))
                ->selectRaw('lead_sales_orders.id, leads.company_name, lead_role_assignments.role_type, (lead_sales_orders.total_amount * (lead_role_assignments.contribution_percentage / 100.0)) as contribution, lead_sales_orders.order_date')
                ->get();

            $explanation = 'Revenue contribution from confirmed sales orders × role assignment percentage';
        } elseif ($block === 'lifecycle_funnel') {
            $columns = [
                ['key' => 'company_name', 'label' => 'Lead Name'],
                ['key' => 'industry', 'label' => 'Industry'],
                ['key' => 'score', 'label' => 'Score'],
                ['key' => 'stage', 'label' => 'Stage'],
                ['key' => 'created_at', 'label' => 'Created'],
            ];

            $records = Lead::where(function ($q) use ($userIds) {
                    $q->whereIn('owner_id', $userIds)
                      ->orWhereIn('presales_owner_id', $userIds)
                      ->orWhereIn('am_owner_id', $userIds)
                      ->orWhereIn('csm_owner_id', $userIds);
                })
                ->join('funnel_stages', 'leads.funnel_stage_id', '=', 'funnel_stages.id')
                ->when($stage, fn ($q) => $q->where('funnel_stages.name', $stage))
                ->leftJoin('industries', 'leads.industry_id', '=', 'industries.id')
                ->select('leads.id', 'leads.company_name', 'industries.name as industry', 'leads.lead_score as score', 'funnel_stages.name as stage', 'leads.created_at')
                ->orderByDesc('leads.created_at')
                ->take(50)
                ->get();

            $explanation = 'Leads at the selected funnel stage';
        } elseif ($block === 'attention_risks') {
            $columns = [
                ['key' => 'company_name', 'label' => 'Lead Name'],
                ['key' => 'category', 'label' => 'Risk Type'],
                ['key' => 'severity', 'label' => 'Severity'],
                ['key' => 'description', 'label' => 'Description'],
            ];

            $risks = $this->buildAttentionRisks($userIds);
            $records = collect($risks)->map(fn ($r) => [
                'company_name' => $r['lead_name'] ?? 'N/A',
                'category'     => $r['category'],
                'severity'     => $r['severity'],
                'description'  => $r['description'],
            ]);

            $explanation = 'All active risk items requiring attention';
        } elseif ($block === 'lost_bottlenecks') {
            $columns = [
                ['key' => 'company_name', 'label' => 'Lead Name'],
                ['key' => 'loss_reason', 'label' => 'Loss Reason'],
                ['key' => 'deal_size', 'label' => 'Deal Size'],
                ['key' => 'closed_at', 'label' => 'Closed Date'],
            ];

            $records = LeadOutcome::whereIn('closed_by', $userIds)
                ->whereBetween('closed_at', $dateRange)
                ->where('outcome', 'lost')
                ->join('leads', 'lead_outcomes.lead_id', '=', 'leads.id')
                ->select('leads.company_name', 'lead_outcomes.loss_reason', 'lead_outcomes.deal_size', 'lead_outcomes.closed_at')
                ->orderByDesc('lead_outcomes.closed_at')
                ->take(50)
                ->get();

            $explanation = 'Lost deals with reason analysis';
        }

        return response()->json([
            'data' => [
                'columns'     => $columns,
                'records'     => $records,
                'explanation' => $explanation,
            ]
        ]);
    }

    // ──────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────

    private function resolveStatusFromAchievement(float $achievement): string
    {
        if ($achievement >= 100) return 'exceeded';
        if ($achievement >= 75) return 'on_track';
        if ($achievement >= 50) return 'at_risk';
        return 'behind';
    }

    private function getDateRange(string $period): array
    {
        $now = Carbon::now();
        switch ($period) {
            case 'week':
                return [$now->copy()->startOfWeek(), $now->copy()->endOfWeek()];
            case 'biweekly':
                return [$now->copy()->subWeeks(2)->startOfWeek(), $now->copy()->endOfWeek()];
            case 'month':
                return [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()];
            case 'quarter':
                return [$now->copy()->startOfQuarter(), $now->copy()->endOfQuarter()];
            case 'year':
                return [$now->copy()->startOfYear(), $now->copy()->endOfYear()];
            case 'all':
            default:
                return [Carbon::parse('1970-01-01'), $now->copy()->addYears(10)];
        }
    }
}
