<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkflowAction;
use App\Models\WorkflowDefinition;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class WorkflowActionController extends Controller
{
    public function store(Request $request, $workflowId)
    {
        $tenantId = Auth::user()->tenant_id;
        
        // Ensure workflow belongs to tenant
        WorkflowDefinition::where('tenant_id', $tenantId)->findOrFail($workflowId);

        $request->validate([
            'workflow_state_id' => 'nullable|exists:workflow_states,id',
            'workflow_transition_id' => 'nullable|exists:workflow_transitions,id',
            'action_type' => 'required|string',
            'execution_timing' => 'required|string',
            'configuration' => 'nullable|array',
        ]);

        if (!$request->workflow_state_id && !$request->workflow_transition_id) {
            return response()->json(['message' => 'Must provide state or transition id'], 400);
        }

        $action = WorkflowAction::create([
            'workflow_state_id' => $request->workflow_state_id,
            'workflow_transition_id' => $request->workflow_transition_id,
            'action_type' => $request->action_type,
            'execution_timing' => $request->execution_timing,
            'configuration' => $request->configuration,
        ]);

        return response()->json(['data' => $action], 201);
    }

    public function destroy($workflowId, $id)
    {
        $tenantId = Auth::user()->tenant_id;
        WorkflowDefinition::where('tenant_id', $tenantId)->findOrFail($workflowId);

        $action = WorkflowAction::findOrFail($id);
        $action->delete();

        return response()->json(['message' => 'Action deleted']);
    }
}
