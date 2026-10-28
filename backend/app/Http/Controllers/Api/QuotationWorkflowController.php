<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeadQuotation;
use App\Models\WorkflowTransition;
use App\Services\WorkflowEngineService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuotationWorkflowController extends Controller
{
    protected $engine;

    public function __construct(WorkflowEngineService $engine)
    {
        $this->engine = $engine;
    }

    protected function authorizeQuotationAccess(LeadQuotation $quotation): void
    {
        $user = auth()->user() ?? auth('sanctum')->user();
        if (! $user || ($user instanceof \App\Models\User && $user->isSuperAdmin())) {
            return;
        }

        $lead = \App\Models\Lead::withoutGlobalScopes()->find($quotation->lead_id);
        if (! $lead || ($user->tenant_id && $lead->tenant_id !== $user->tenant_id)) {
            abort(403, 'Unauthorized access to quotation belonging to another tenant.');
        }
    }

    public function getTransitions($id)
    {
        $quotation = LeadQuotation::findOrFail($id);
        $this->authorizeQuotationAccess($quotation);

        if (!$quotation->workflow_state_id) {
            return response()->json([
                'current_state' => null,
                'available_transitions' => []
            ]);
        }

        $transitions = WorkflowTransition::where('source_state_id', $quotation->workflow_state_id)
            ->with('destinationState:id,name,type')
            ->get();

        return response()->json([
            'current_state' => $quotation->workflowState,
            'available_transitions' => $transitions
        ]);
    }

    public function executeTransition(Request $request, $id)
    {
        $request->validate([
            'transition_id' => 'required|exists:workflow_transitions,id'
        ]);

        $quotation = LeadQuotation::findOrFail($id);
        $this->authorizeQuotationAccess($quotation);
        $transition = WorkflowTransition::findOrFail($request->transition_id);

        if ($quotation->workflow_state_id !== $transition->source_state_id) {
            return response()->json(['message' => 'Invalid transition for current state.'], 400);
        }

        try {
            DB::transaction(function () use ($quotation, $transition) {
                $this->engine->transitionRecord($quotation, $transition);
            });

            return response()->json([
                'message' => 'Transition executed successfully',
                'data' => $quotation->fresh()->load('workflowState')
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to execute transition: ' . $e->getMessage()], 500);
        }
    }
}
