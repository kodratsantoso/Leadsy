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
}
