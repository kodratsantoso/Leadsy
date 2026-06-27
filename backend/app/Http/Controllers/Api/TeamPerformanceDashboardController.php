<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Lead;
use App\Models\LeadOutcome;
use App\Models\AiAttentionHighlight;
use App\Services\Analytics\RoleKpiCalculationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

        $leadsQuery = Lead::whereIn('owner_id', $userIds)
            ->orWhereIn('presales_owner_id', $userIds)
            ->orWhereIn('am_owner_id', $userIds)
            ->orWhereIn('csm_owner_id', $userIds)
            ->orWhereHas('roleAssignments', function($q) use ($userIds) {
                $q->whereIn('user_id', $userIds);
            });

        return response()->json([
            'data' => [
                'period' => $period,
                'overview_kpis' => $this->buildOverviewKpis($leadsQuery, $dateRange, $userIds),
                'role_matrix' => $this->buildRoleMatrix($users, $period),
                'leaderboard' => $this->buildLeaderboard($users, $period),
                'lifecycle_funnel' => $this->buildLifecycleFunnel($leadsQuery, $dateRange),
                'target_achievement' => $this->buildTargetAchievement($users, $period),
                'revenue_contribution' => $this->buildRevenueContribution($userIds, $dateRange),
                'attention_risks' => $this->buildAttentionRisks($userIds),
                'kpi_trends' => $this->buildKpiTrends($period, $userIds),
                'lost_bottlenecks' => $this->buildLostBottlenecks($userIds, $dateRange),
                'manager_hierarchy' => $this->buildManagerHierarchy($users, $period),
            ]
        ]);
    }

    private function buildOverviewKpis($leadsQuery, $dateRange, $userIds)
    {
        $totalLeads = (clone $leadsQuery)->whereBetween('leads.created_at', $dateRange)->count();
        $activeOpps = (clone $leadsQuery)->whereHas('funnelStage', fn($q) => $q->whereNotIn('name', ['Won', 'Lost']))->count();
        $pipelineValue = (clone $leadsQuery)->whereHas('funnelStage', fn($q) => $q->whereNotIn('name', ['Won', 'Lost']))->sum('estimated_closing_amount');
        
        $wonValue = LeadOutcome::whereIn('closed_by', $userIds)
            ->whereBetween('closed_at', $dateRange)
            ->where('outcome', 'won')
            ->sum('deal_size');

        return [
            'total_leads' => $totalLeads,
            'active_opps' => $activeOpps,
            'pipeline_value' => (float) $pipelineValue,
            'won_revenue' => (float) $wonValue,
        ];
    }

    private function buildRoleMatrix($users, $period)
    {
        $teams = [];
        foreach ($users as $u) {
            $kpiData = $this->kpiService->calculateForUser($u, $period);
            $cat = $kpiData['role_category'];
            
            if (!isset($teams[$cat])) {
                $teams[$cat] = ['users' => [], 'metrics' => []];
            }
            $teams[$cat]['users'][] = $u->id;

            foreach ($kpiData['metrics'] as $m) {
                $key = $m['kpi_key'];
                if (!isset($teams[$cat]['metrics'][$key])) {
                    $teams[$cat]['metrics'][$key] = [
                        'kpi_key' => $m['kpi_key'],
                        'kpi_name' => $m['kpi_name'],
                        'format' => $m['format'],
                        'actual' => 0,
                        'target' => 0,
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
                unset($m['users_counted']);
                $finalMetrics[] = $m;
            }
            $matrix[] = [
                'role_category' => $cat,
                'user_count' => count($data['users']),
                'metrics' => $finalMetrics,
            ];
        }
        return $matrix;
    }

    private function buildLeaderboard($users, $period)
    {
        $leaderboard = [];
        foreach ($users as $u) {
            $kpiData = $this->kpiService->calculateForUser($u, $period);
            $achievements = collect($kpiData['metrics'])->pluck('achievement_percentage')->filter(fn($val) => $val !== null);
            $avgAchievement = $achievements->count() > 0 ? round($achievements->avg(), 1) : 0;
            
            $leaderboard[] = [
                'user_id' => $u->id,
                'name' => $u->name,
                'role_category' => $kpiData['role_category'],
                'overall_achievement' => $avgAchievement,
                'metrics' => $kpiData['metrics'],
            ];
        }
        return collect($leaderboard)->sortByDesc('overall_achievement')->take(10)->values()->all();
    }

    private function buildLifecycleFunnel($leadsQuery, $dateRange)
    {
        // Simply group by funnel stage for the users
        return (clone $leadsQuery)
            ->whereBetween('leads.created_at', $dateRange)
            ->join('funnel_stages', 'leads.funnel_stage_id', '=', 'funnel_stages.id')
            ->selectRaw('funnel_stages.name as stage, count(*) as count')
            ->groupBy('funnel_stages.name')
            ->pluck('count', 'stage')
            ->toArray();
    }

    private function buildTargetAchievement($users, $period)
    {
        // Re-use role matrix or specific target achievement per individual
        $results = [];
        foreach ($users as $u) {
            $kpiData = $this->kpiService->calculateForUser($u, $period);
            foreach ($kpiData['metrics'] as $m) {
                if ($m['target'] > 0) {
                    $results[] = [
                        'user_id' => $u->id,
                        'name' => $u->name,
                        'role_category' => $kpiData['role_category'],
                        'kpi_key' => $m['kpi_key'],
                        'kpi_name' => $m['kpi_name'],
                        'actual' => $m['actual'],
                        'target' => $m['target'],
                        'achievement_percentage' => $m['achievement_percentage'],
                    ];
                }
            }
        }
        return collect($results)->groupBy('role_category')->toArray();
    }

    private function buildRevenueContribution($userIds, $dateRange)
    {
        // E.g. Sum of sales_orders joined with lead_role_assignments
        $contributions = \DB::table('lead_sales_orders')
            ->join('lead_role_assignments', 'lead_sales_orders.lead_id', '=', 'lead_role_assignments.lead_id')
            ->join('users', 'lead_role_assignments.user_id', '=', 'users.id')
            ->whereIn('lead_role_assignments.user_id', $userIds)
            ->whereBetween('lead_sales_orders.order_date', $dateRange)
            ->where('lead_sales_orders.order_status', 'confirmed')
            ->selectRaw('lead_role_assignments.role_type, sum(lead_sales_orders.total_amount * (lead_role_assignments.contribution_percentage / 100.0)) as total_contribution')
            ->groupBy('lead_role_assignments.role_type')
            ->pluck('total_contribution', 'role_type')
            ->toArray();
            
        return $contributions;
    }

    private function buildAttentionRisks($userIds)
    {
        $risks = AiAttentionHighlight::whereIn('assigned_to', $userIds)
            ->where('status', 'open')
            ->orderBy('severity', 'desc')
            ->take(10)
            ->get()
            ->map(function($r) {
                return [
                    'id' => $r->id,
                    'severity' => $r->severity,
                    'title' => $r->title,
                    'description' => $r->reason,
                    'lead_name' => $r->entity_type === 'App\\Models\\Lead' ? \App\Models\Lead::find($r->entity_id)?->company_name : null,
                    'user_name' => $r->assigned_to ? \App\Models\User::find($r->assigned_to)?->name : null,
                ];
            });
        return $risks;
    }

    private function buildKpiTrends($period, $userIds)
    {
        // Mocking historical trend for now, as snapshots require specific date logic
        return [
            ['date' => 'W1', 'achievement' => 80],
            ['date' => 'W2', 'achievement' => 85],
            ['date' => 'W3', 'achievement' => 90],
            ['date' => 'W4', 'achievement' => 95],
        ];
    }

    private function buildLostBottlenecks($userIds, $dateRange)
    {
        return LeadOutcome::whereIn('closed_by', $userIds)
            ->whereBetween('closed_at', $dateRange)
            ->where('outcome', 'lost')
            ->selectRaw('loss_reason, count(*) as count')
            ->groupBy('loss_reason')
            ->orderByDesc('count')
            ->pluck('count', 'loss_reason')
            ->toArray();
    }

    private function buildManagerHierarchy($users, $period)
    {
        $hierarchy = [];
        foreach ($users as $u) {
            $kpiData = $this->kpiService->calculateForUser($u, $period);
            $achievements = collect($kpiData['metrics'])->pluck('achievement_percentage')->filter(fn($val) => $val !== null);
            $avgAchievement = $achievements->count() > 0 ? round($achievements->avg(), 1) : 0;
            
            $hierarchy[] = [
                'id' => $u->id,
                'name' => $u->name,
                'manager_id' => $u->direct_manager_id,
                'role' => $u->role ? $u->role->name : 'N/A',
                'achievement' => $avgAchievement,
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

        $dateRange = $this->getDateRange($period);

        if ($user->isSuperAdmin() || $user->isExecutive()) {
            $userIds = User::where('is_active', true)->pluck('id')->all();
        } else {
            $userIds = $user->hierarchyUserIds();
        }

        if ($targetUserId && in_array($targetUserId, $userIds)) {
            $userIds = [$targetUserId];
        }

        $records = [];
        $columns = [];

        // Logic based on block_key
        if ($block === 'revenue_contribution') {
            $columns = [
                ['key' => 'id', 'label' => 'Order ID'],
                ['key' => 'company_name', 'label' => 'Lead Name'],
                ['key' => 'amount', 'label' => 'Confirmed Amount'],
                ['key' => 'confirmed_at', 'label' => 'Date'],
            ];
            
            $records = \DB::table('sales_orders')
                ->join('lead_role_assignments', 'sales_orders.lead_id', '=', 'lead_role_assignments.lead_id')
                ->join('leads', 'sales_orders.lead_id', '=', 'leads.id')
                ->whereIn('lead_role_assignments.user_id', $userIds)
                ->whereBetween('sales_orders.confirmed_at', $dateRange)
                ->when($role, fn($q) => $q->where('lead_role_assignments.role_slug', $role))
                ->select('sales_orders.id', 'leads.company_name', 'sales_orders.amount', 'sales_orders.confirmed_at')
                ->get();
        } 
        elseif ($block === 'lifecycle_funnel') {
            $stage = $request->query('stage'); // e.g. "Meeting Scheduled"
            $columns = [
                ['key' => 'company_name', 'label' => 'Lead Name'],
                ['key' => 'industry', 'label' => 'Industry'],
                ['key' => 'score', 'label' => 'Score'],
                ['key' => 'created_at', 'label' => 'Created'],
            ];
            $records = Lead::where(function($q) use ($userIds) {
                    $q->whereIn('owner_id', $userIds)
                      ->orWhereIn('presales_owner_id', $userIds)
                      ->orWhereIn('am_owner_id', $userIds)
                      ->orWhereIn('csm_owner_id', $userIds);
                })
                ->whereBetween('leads.created_at', $dateRange)
                ->join('funnel_stages', 'leads.funnel_stage_id', '=', 'funnel_stages.id')
                ->when($stage, fn($q) => $q->where('funnel_stages.name', $stage))
                ->leftJoin('industries', 'leads.industry_id', '=', 'industries.id')
                ->select('leads.id', 'leads.company_name', 'industries.name as industry', 'leads.lead_score as score', 'leads.created_at')
                ->get();
        }
        // Add additional drilldowns as needed for other blocks...
        else {
            $records = [];
        }

        return response()->json([
            'data' => [
                'columns' => $columns,
                'records' => $records
            ]
        ]);
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
