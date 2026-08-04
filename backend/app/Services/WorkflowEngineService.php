<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use App\Models\WorkflowTransition;
use App\Models\WorkflowState;
use App\Jobs\ExecuteWorkflowActionJob;

class WorkflowEngineService
{
    /**
     * Handle the transition of a record to a new state and dispatch relevant actions.
     *
     * @param Model $record The eloquent model (e.g., Quotation, SalesOrder)
     * @param WorkflowTransition $transition The transition that is being executed
     */
    public function transitionRecord(Model $record, WorkflowTransition $transition)
    {
        // 1. Dispatch Actions attached to the Transition itself
        $this->dispatchActions($transition->actions, $record);

        // 2. Change the state on the target record
        // Assuming models that support workflow have a `workflow_state_id` column
        if (in_array('workflow_state_id', $record->getFillable())) {
            $record->update([
                'workflow_state_id' => $transition->destination_state_id
            ]);
        }

        // 3. Dispatch Actions attached to the new State
        $destinationState = $transition->destinationState;
        if ($destinationState) {
            $this->dispatchActions($destinationState->actions, $record);
        }
    }

    /**
     * Dispatch a collection of workflow actions for a given record.
     */
    protected function dispatchActions($actions, Model $record)
    {
        if (!$actions || $actions->isEmpty()) {
            return;
        }

        // Sort by execution order if we have multiple
        $sortedActions = $actions->sortBy('execution_order');

        foreach ($sortedActions as $action) {
            ExecuteWorkflowActionJob::dispatch($action, $record);
        }
    }
}
