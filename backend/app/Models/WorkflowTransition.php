<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $workflow_version_id
 * @property int $source_state_id
 * @property int $destination_state_id
 * @property string|null $label
 * @property string $trigger
 * @property int $priority
 * @property bool $is_enabled
 * @property array<array-key, mixed>|null $conditions
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\WorkflowAction> $actions
 * @property-read int|null $actions_count
 * @property-read \App\Models\WorkflowState $destinationState
 * @property-read \App\Models\WorkflowState $sourceState
 * @property-read \App\Models\WorkflowVersion|null $version
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowTransition newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowTransition newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowTransition query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowTransition whereConditions($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowTransition whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowTransition whereDestinationStateId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowTransition whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowTransition whereIsEnabled($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowTransition whereLabel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowTransition wherePriority($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowTransition whereSourceStateId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowTransition whereTrigger($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowTransition whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowTransition whereWorkflowVersionId($value)
 * @mixin \Eloquent
 */
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
