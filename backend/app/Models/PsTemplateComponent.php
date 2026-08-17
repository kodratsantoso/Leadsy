<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $template_id
 * @property int $role_id
 * @property string $task_name
 * @property string|null $description
 * @property numeric $base_mandays
 * @property int $sort_order
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $parent_component_id
 * @property string $component_type
 * @property string|null $deliverable
 * @property array<array-key, mixed>|null $acceptance_criteria
 * @property bool $is_complexity_sensitive
 * @property bool $is_optional
 * @property-read PsTemplateComponent|null $parentComponent
 * @property-read \App\Models\PsRole $role
 * @property-read \Illuminate\Database\Eloquent\Collection<int, PsTemplateComponent> $subcomponents
 * @property-read int|null $subcomponents_count
 * @property-read \App\Models\PsEstimationTemplate $template
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsTemplateComponent newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsTemplateComponent newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsTemplateComponent query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsTemplateComponent whereAcceptanceCriteria($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsTemplateComponent whereBaseMandays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsTemplateComponent whereComponentType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsTemplateComponent whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsTemplateComponent whereDeliverable($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsTemplateComponent whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsTemplateComponent whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsTemplateComponent whereIsComplexitySensitive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsTemplateComponent whereIsOptional($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsTemplateComponent whereParentComponentId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsTemplateComponent whereRoleId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsTemplateComponent whereSortOrder($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsTemplateComponent whereTaskName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsTemplateComponent whereTemplateId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsTemplateComponent whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class PsTemplateComponent extends Model
{
    use HasFactory;

    protected $table = 'ps_template_components';

    protected $fillable = [
        'template_id',
        'role_id',
        'task_name',
        'description',
        'base_mandays',
        'sort_order',
        'parent_component_id',
        'component_type',
        'deliverable',
        'acceptance_criteria',
        'is_complexity_sensitive',
        'is_optional',
    ];

    protected function casts(): array
    {
        return [
            'base_mandays' => 'decimal:2',
            'sort_order' => 'integer',
            'acceptance_criteria' => 'array',
            'is_complexity_sensitive' => 'boolean',
            'is_optional' => 'boolean',
        ];
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(PsEstimationTemplate::class, 'template_id');
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(PsRole::class, 'role_id');
    }

    public function parentComponent(): BelongsTo
    {
        return $this->belongsTo(PsTemplateComponent::class, 'parent_component_id');
    }

    public function subcomponents(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(PsTemplateComponent::class, 'parent_component_id')->orderBy('sort_order');
    }
}
