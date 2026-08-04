<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkflowTransition extends Model
{
    protected $fillable = [
        'workflow_version_id', 'source_state_id', 'destination_state_id',
        'label', 'trigger', 'priority', 'is_enabled', 'conditions'
    ];

    protected $casts = [
        'priority' => 'integer',
        'is_enabled' => 'boolean',
        'conditions' => 'array',
    ];

    public function version(): BelongsTo
    {
        return $this->belongsTo(WorkflowVersion::class, 'workflow_version_id');
    }

    public function sourceState(): BelongsTo
    {
        return $this->belongsTo(WorkflowState::class, 'source_state_id');
    }

    public function destinationState(): BelongsTo
    {
        return $this->belongsTo(WorkflowState::class, 'destination_state_id');
    }

    public function actions(): HasMany
    {
        return $this->hasMany(WorkflowAction::class);
    }
}
