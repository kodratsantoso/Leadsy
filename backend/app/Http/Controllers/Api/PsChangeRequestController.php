<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PsChangeRequest;
use App\Services\ProfessionalServices\PsChangeRequestService;
use Illuminate\Http\Request;

class PsChangeRequestController extends Controller
{
    protected PsChangeRequestService $crService;

    public function __construct(PsChangeRequestService $crService)
    {
        $this->crService = $crService;
    }

    public function index(Request $request)
    {
        $query = PsChangeRequest::with(['projectPlan', 'requestedBy', 'approvedBy']);

        if ($request->has('project_plan_id')) {
            $query->where('project_plan_id', $request->project_plan_id);
        }

        return response()->json($query->orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'project_plan_id' => 'required|exists:ps_project_plans,id',
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'reason' => 'nullable|string',
            'impact_type' => 'required|string',
            'additional_mandays' => 'numeric|min:0',
            'additional_fee' => 'numeric|min:0',
            'timeline_impact_days' => 'integer|min:0',
            'affected_tasks_json' => 'nullable|array',
        ]);

        $cr = $this->crService->createChangeRequest($validated, auth()->id() ?? 1);
        return response()->json($cr, 201);
    }

    public function approve($id)
    {
        $cr = $this->crService->approveChangeRequest($id, auth()->id() ?? 1);
        return response()->json($cr);
    }

    public function reject(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string']);
        $cr = $this->crService->rejectChangeRequest($id, auth()->id() ?? 1, $request->reason);
        return response()->json($cr);
    }
}
