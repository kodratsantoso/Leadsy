<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
