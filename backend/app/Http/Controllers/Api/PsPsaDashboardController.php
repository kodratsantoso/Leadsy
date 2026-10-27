<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ProfessionalServices\PsPsaDashboardService;
use Illuminate\Http\Request;

class PsPsaDashboardController extends Controller
{
    protected PsPsaDashboardService $dashboardService;

    public function __construct(PsPsaDashboardService $dashboardService)
    {
        $this->dashboardService = $dashboardService;
    }

    public function index(Request $request)
    {
        $data = $this->dashboardService->getDashboardMetrics();
        return response()->json($data);
    }

    public function resourceMatrix(Request $request)
    {
        $weeksAhead = (int) $request->input('weeks', 6);
        $data = $this->dashboardService->getResourceCapacityMatrix($weeksAhead);
        return response()->json($data);
    }

    public function recommendStaff(Request $request)
    {
        $validated = $request->validate([
            'skills' => 'required|array',
            'min_mandays' => 'nullable|numeric|min:0.5',
        ]);

        $data = $this->dashboardService->getSkillMatchRecommendations(
            $validated['skills'],
            (float) ($validated['min_mandays'] ?? 5.0)
        );

        return response()->json($data);
    }
}

