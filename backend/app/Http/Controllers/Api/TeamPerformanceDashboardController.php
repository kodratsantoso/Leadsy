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

        $leaderboard = [];

        foreach ($users as $u) {
            $kpiData = $this->kpiService->calculateForUser($u, $period);
            
            // Apply role filter if requested
            if ($roleFilter && $kpiData['role_category'] !== $roleFilter) {
                continue;
            }

            // Summarize achievement (average of all defined KPI achievements)
            $achievements = collect($kpiData['metrics'])->pluck('achievement_percentage')->filter(fn($val) => $val !== null);
            $overallAchievement = $achievements->count() > 0 ? round($achievements->avg(), 1) : null;

            $leaderboard[] = [
                'user_id' => $u->id,
                'name' => $u->name,
                'role_display' => $u->role?->display_name ?? 'N/A',
                'role_category' => $kpiData['role_category'],
                'overall_achievement' => $overallAchievement,
                'metrics' => $kpiData['metrics'],
            ];
        }

        // Sort leaderboard dynamically (defaults to overall achievement)
        $leaderboard = collect($leaderboard)->sortByDesc('overall_achievement')->values()->all();

        return response()->json([
            'data' => [
                'period' => $period,
                'leaderboard' => $leaderboard,
            ]
        ]);
    }
}
