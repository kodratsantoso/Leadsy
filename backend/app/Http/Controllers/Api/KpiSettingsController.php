<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KpiDefinition;
use App\Models\UserKpiTarget;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KpiSettingsController extends Controller
{
    /**
     * GET /api/kpi-settings/definitions
     */
    public function getDefinitions(Request $request): JsonResponse
    {
        $definitions = KpiDefinition::where('is_active', true)
            ->orderBy('role_slug')
            ->orderBy('kpi_name')
            ->get();
            
        $grouped = $definitions->groupBy('role_slug');
        
        return response()->json([
            'data' => $grouped
        ]);
    }

    /**
     * GET /api/kpi-settings/targets/{userId}
     */
    public function getTargets(Request $request, int $userId): JsonResponse
    {
        $period = $request->query('period', 'month');
        
        $targets = UserKpiTarget::where('user_id', $userId)
            ->where('period_type', $period)
            ->get();
            
        return response()->json([
            'data' => $targets
        ]);
    }

    /**
     * POST /api/kpi-settings/targets/{userId}
     */
    public function saveTargets(Request $request, int $userId): JsonResponse
    {
        $request->validate([
            'period_type' => 'required|string',
            'targets' => 'required|array',
            'targets.*.kpi_key' => 'required|string',
            'targets.*.target_value' => 'required|numeric',
        ]);
        
        $period = $request->input('period_type');
        $targets = $request->input('targets');
        
        foreach ($targets as $target) {
            UserKpiTarget::updateOrCreate(
                [
                    'user_id' => $userId,
                    'period_type' => $period,
                    'kpi_key' => $target['kpi_key']
                ],
                [
                    'target_value' => $target['target_value'],
                    'period_start' => null,
                    'period_end' => null,
                ]
            );
        }
        
        return response()->json(['message' => 'KPI Targets saved successfully']);
    }
}
