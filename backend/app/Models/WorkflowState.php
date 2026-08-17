<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $workflow_version_id
 * @property string $name
 * @property string $type
 * @property int $display_order
 * @property array<array-key, mixed>|null $visual_coordinates
 * @property string|null $description
 * @property bool $is_entry
 * @property bool $is_terminal
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\WorkflowAction> $actions
 * @property-read int|null $actions_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\WorkflowTransition> $incomingTransitions
 * @property-read int|null $incoming_transitions_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\WorkflowTransition> $outgoingTransitions
 * @property-read int|null $outgoing_transitions_count
 * @property-read \App\Models\WorkflowVersion|null $version
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowState newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowState newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowState query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowState whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowState whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowState whereDisplayOrder($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowState whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowState whereIsEntry($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowState whereIsTerminal($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowState whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowState whereType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowState whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowState whereVisualCoordinates($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowState whereWorkflowVersionId($value)
 * @mixin \Eloquent
 */
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
