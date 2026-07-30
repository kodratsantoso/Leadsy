<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PsProjectPlan;
use App\Models\PsEstimation;
use App\Services\ProfessionalServices\PsProjectPlanningService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Exception;

class PsProjectPlanController extends Controller
{
    protected PsProjectPlanningService $projectPlanningService;

    public function __construct(PsProjectPlanningService $projectPlanningService)
    {
        $this->projectPlanningService = $projectPlanningService;
    }

    public function index(Request $request): JsonResponse
    {
        $query = PsProjectPlan::with(['lead', 'projectManager']);

        if ($request->has('lead_id')) {
            $query->where('lead_id', $request->input('lead_id'));
        }

        $plans = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($plans);
    }

    public function show($id): JsonResponse
    {
        $plan = PsProjectPlan::with([
            'lead', 
            'projectManager',
            'estimation',
            'tasks.subtasks',
            'tasks.assignedRole',
            'tasks.assignedUser',
            'milestones',
            'resources.role',
            'resources.assignedUser',
            'deliveryChecklists',
            'risks',
            'readinessItems'
        ])->findOrFail($id);

        return response()->json(['data' => $plan]);
    }

    public function createFromEstimation(Request $request, $estimationId): JsonResponse
    {
        try {
            $plan = $this->projectPlanningService->generatePlanFromEstimation($estimationId, $request->user()->id);
            return response()->json(['message' => 'Project Plan created successfully', 'data' => $plan], 201);
        } catch (Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        $plan = PsProjectPlan::findOrFail($id);
        
        $plan->update($request->only([
            'project_name',
            'project_start_date',
            'target_go_live_date',
            'target_completion_date',
            'project_manager_id',
            'delivery_notes'
        ]));

        return response()->json(['message' => 'Project Plan updated successfully', 'data' => $plan]);
    }
    
    // For demonstration, a simple status update endpoint
    public function updateStatus(Request $request, $id): JsonResponse
    {
        $request->validate(['status' => 'required|string']);
        $plan = PsProjectPlan::findOrFail($id);
        
        if ($request->status === 'Ready for Kickoff') {
            // Verify readiness items
            $incompleteRequired = $plan->readinessItems()->where('is_required', true)->where('is_completed', false)->count();
            if ($incompleteRequired > 0) {
                return response()->json(['message' => 'Cannot mark as Ready for Kickoff. Readiness checklist is incomplete.'], 422);
            }
        }

        $plan->update(['project_status' => $request->status]);
        
        return response()->json(['message' => 'Status updated successfully', 'data' => $plan]);
    }
}
