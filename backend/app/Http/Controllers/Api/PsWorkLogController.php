<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PsWorkLog;
use App\Services\ProfessionalServices\PsWorkLogService;
use Illuminate\Http\Request;

class PsWorkLogController extends Controller
{
    protected PsWorkLogService $workLogService;

    public function __construct(PsWorkLogService $workLogService)
    {
        $this->workLogService = $workLogService;
    }

    public function index(Request $request)
    {
        $query = PsWorkLog::with(['projectPlan', 'projectTask', 'user', 'role', 'approvedBy']);

        if ($request->has('project_plan_id')) {
            $query->where('project_plan_id', $request->project_plan_id);
        }

        return response()->json($query->orderBy('work_date', 'desc')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'project_plan_id' => 'required|exists:ps_project_plans,id',
            'project_task_id' => 'nullable|exists:ps_project_tasks,id',
            'role_id' => 'nullable|exists:ps_roles,id',
            'work_date' => 'required|date',
            'actual_mandays' => 'nullable|numeric|min:0.1',
            'work_hours' => 'nullable|numeric|min:0.5',
            'work_description' => 'nullable|string',
            'work_type' => 'required|string',
            'billable' => 'boolean',
        ]);

        $workLog = $this->workLogService->createWorkLog($validated, auth()->id() ?? 1);
        return response()->json($workLog, 201);
    }

    public function approve($id)
    {
        $workLog = $this->workLogService->approveWorkLog($id, auth()->id() ?? 1);
        return response()->json($workLog);
    }

    public function reject(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string']);
        $workLog = $this->workLogService->rejectWorkLog($id, auth()->id() ?? 1, $request->reason);
        return response()->json($workLog);
    }
}
