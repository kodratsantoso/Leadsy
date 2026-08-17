<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int|null $workflow_state_id
 * @property int|null $workflow_transition_id
 * @property string $action_type
 * @property string $execution_timing
 * @property int $execution_order
 * @property array<array-key, mixed>|null $configuration
 * @property array<array-key, mixed>|null $conditions
 * @property string $failure_behavior
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\WorkflowState|null $state
 * @property-read \App\Models\WorkflowTransition|null $transition
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowAction newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowAction newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowAction query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowAction whereActionType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowAction whereConditions($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowAction whereConfiguration($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowAction whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowAction whereExecutionOrder($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowAction whereExecutionTiming($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowAction whereFailureBehavior($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowAction whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowAction whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowAction whereWorkflowStateId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowAction whereWorkflowTransitionId($value)
 * @mixin \Eloquent
 */
class WorkflowAction extends Model
{
    protected $fillable = [
        'workflow_state_id', 'workflow_transition_id', 'action_type',
        'execution_timing', 'execution_order', 'configuration', 'conditions',
        'failure_behavior'
    ];

    protected $casts = [
        'execution_order' => 'integer',
        'configuration' => 'array',
        'conditions' => 'array',
    ];

    public function state(): BelongsTo
    {
        return $this->belongsTo(WorkflowState::class, 'workflow_state_id');
    }

    public function transition(): BelongsTo
    {
        return $this->belongsTo(WorkflowTransition::class, 'workflow_transition_id');
    }
}
