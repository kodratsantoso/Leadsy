<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkflowState extends Model
{
    protected $fillable = [
        'workflow_version_id', 'name', 'type', 'display_order',
        'visual_coordinates', 'description', 'is_entry', 'is_terminal'
    ];

    protected $casts = [
        'display_order' => 'integer',
        'is_entry' => 'boolean',
        'is_terminal' => 'boolean',
        'visual_coordinates' => 'array',
    ];

    public function version(): BelongsTo
    {
        return $this->belongsTo(WorkflowVersion::class, 'workflow_version_id');
    }

    public function outgoingTransitions(): HasMany
    {
        return $this->hasMany(WorkflowTransition::class, 'source_state_id');
    }

    public function incomingTransitions(): HasMany
    {
        return $this->hasMany(WorkflowTransition::class, 'destination_state_id');
    }

    public function actions(): HasMany
    {
        return $this->hasMany(WorkflowAction::class);
    }
}
