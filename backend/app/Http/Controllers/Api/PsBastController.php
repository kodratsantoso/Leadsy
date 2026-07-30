<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PsBastDocument;
use App\Services\ProfessionalServices\PsBastService;
use Illuminate\Http\Request;

class PsBastController extends Controller
{
    protected PsBastService $bastService;

    public function __construct(PsBastService $bastService)
    {
        $this->bastService = $bastService;
    }

    public function index(Request $request)
    {
        $query = PsBastDocument::with(['projectPlan', 'document']);

        if ($request->has('project_plan_id')) {
            $query->where('project_plan_id', $request->project_plan_id);
        }

        return response()->json($query->orderBy('created_at', 'desc')->get());
    }

    public function generate(Request $request, $projectPlanId)
    {
        $validated = $request->validate([
            'customer_name' => 'nullable|string',
            'completion_summary' => 'nullable|string',
            'delivered_scope' => 'nullable|string',
            'pending_items' => 'nullable|string',
        ]);

        $bast = $this->bastService->generateBast($projectPlanId, $validated);
        return response()->json($bast, 201);
    }
}
