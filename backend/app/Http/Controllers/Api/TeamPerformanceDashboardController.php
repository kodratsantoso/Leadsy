<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Analytics\RoleKpiCalculationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

        // Allow filtering by a specific role category if provided
        $roleFilter = $request->query('role_category');

        if ($user->isSuperAdmin() || $user->isExecutive()) {
            $userIds = User::where('is_active', true)->pluck('id')->all();
        } else {
            $userIds = $user->hierarchyUserIds();
        }

        $users = User::whereIn('id', $userIds)
            ->where('is_active', true)
            ->with('role')
            ->get();

        $teams = [];

        foreach ($users as $u) {
            $kpiData = $this->kpiService->calculateForUser($u, $period);
            $cat = $kpiData['role_category'];
            
            if ($roleFilter && $cat !== $roleFilter) {
                continue;
            }

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
                        'description' => $m['description'],
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

        $aggregatedTeams = [];
        
        foreach ($teams as $cat => $data) {
            if (empty($data['users'])) continue;

            $ownerParam = $cat === 'presales' ? 'presales_owner_id' 
                        : ($cat === 'am' ? 'am_owner_id' 
                        : ($cat === 'csm' ? 'csm_owner_id' : 'owner_id'));

            $userIdsCsv = implode(',', $data['users']);

            $finalMetrics = [];
            foreach ($data['metrics'] as $key => $m) {
                if ($m['format'] === 'percentage' && $m['users_counted'] > 0) {
                    $m['actual'] = round($m['actual'] / $m['users_counted'], 1);
                }
                
                $target = $m['target'] > 0 ? $m['target'] : null;
                $achievement = null;
                if ($target !== null && $target > 0) {
                    $achievement = min(200, round(($m['actual'] / $target) * 100, 1));
                }

                $m['achievement_percentage'] = $achievement;
                
                // Determine Drilldown Href based on KPI key
                $baseHref = "/leads?{$ownerParam}={$userIdsCsv}";
                $extraParams = "";
                
                if (in_array($key, ['sales_pipeline_value'])) {
                    $extraParams = "&pipeline_status=active";
                } elseif (in_array($key, ['sales_closed_won', 'am_portfolio_value', 'sales_win_rate'])) {
                    $extraParams = "&outcome=won";
                } elseif (in_array($key, ['presales_eligible_count', 'presales_eligible_rate'])) {
                    $extraParams = "&qualification_status=eligible";
                }

                $m['drilldown_href'] = $baseHref . $extraParams;

                unset($m['users_counted']);
                $finalMetrics[] = $m;
            }
            
            $achievements = collect($finalMetrics)->pluck('achievement_percentage')->filter(fn($val) => $val !== null);
            $overallAchievement = $achievements->count() > 0 ? round($achievements->avg(), 1) : null;

            $aggregatedTeams[] = [
                'role_category' => $cat,
                'user_count' => count($data['users']),
                'overall_achievement' => $overallAchievement,
                'metrics' => $finalMetrics,
            ];
        }

        // Sort by role_category or overall achievement
        $aggregatedTeams = collect($aggregatedTeams)->sortByDesc('user_count')->values()->all();

        return response()->json([
            'data' => [
                'period' => $period,
                'teams' => $aggregatedTeams,
            ]
        ]);
    }
}
