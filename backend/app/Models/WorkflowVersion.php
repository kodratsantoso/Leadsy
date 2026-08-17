<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $workflow_definition_id
 * @property int $version_number
 * @property bool $is_active
 * @property bool $is_testing
 * @property int|null $created_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property-read \App\Models\User|null $creator
 * @property-read \App\Models\WorkflowDefinition|null $definition
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\WorkflowState> $states
 * @property-read int|null $states_count
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\WorkflowTransition> $transitions
 * @property-read int|null $transitions_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowVersion newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowVersion newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowVersion onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowVersion query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowVersion whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowVersion whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowVersion whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowVersion whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowVersion whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowVersion whereIsTesting($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowVersion whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowVersion whereVersionNumber($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowVersion whereWorkflowDefinitionId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowVersion withTrashed(bool $withTrashed = true)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|WorkflowVersion withoutTrashed()
 * @mixin \Eloquent
 */
class WorkflowVersion extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'workflow_definition_id', 'version_number', 'is_active', 'is_testing',
        'created_by'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_testing' => 'boolean',
        'version_number' => 'integer',
    ];

    public function definition(): BelongsTo
    {
        return $this->belongsTo(WorkflowDefinition::class, 'workflow_definition_id');
    }

    public function states(): HasMany
    {
        return $this->hasMany(WorkflowState::class);
    }

    public function transitions(): HasMany
    {
        return $this->hasMany(WorkflowTransition::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
