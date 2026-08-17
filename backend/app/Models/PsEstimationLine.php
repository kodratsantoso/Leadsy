<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $estimation_id
 * @property int|null $role_id
 * @property int|null $template_component_id
 * @property string $task_name
 * @property string|null $description
 * @property numeric $base_mandays
 * @property numeric $adjusted_mandays
 * @property numeric $buffer_mandays
 * @property numeric $manual_adjustment
 * @property numeric $final_mandays
 * @property numeric $rate_snapshot
 * @property numeric $estimated_fee
 * @property int $sort_order
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $parent_task_id
 * @property string $task_type
 * @property string|null $subtask_name
 * @property string|null $deliverable
 * @property array<array-key, mixed>|null $acceptance_criteria
 * @property int|null $complexity_level_id
 * @property numeric|null $complexity_multiplier_snapshot
 * @property numeric|null $buffer_percentage_snapshot
 * @property string|null $manual_adjustment_reason
 * @property array<array-key, mixed>|null $dependency_notes
 * @property array<array-key, mixed>|null $risk_notes
 * @property bool $is_ai_generated
 * @property string|null $ai_confidence
 * @property string $source_type
 * @property string|null $source_reference_id
 * @property string $status
 * @property-read \App\Models\PsComplexityLevel|null $complexityLevel
 * @property-read \App\Models\PsEstimation $estimation
 * @property-read PsEstimationLine|null $parentTask
 * @property-read \App\Models\PsRole|null $role
 * @property-read \Illuminate\Database\Eloquent\Collection<int, PsEstimationLine> $subtasks
 * @property-read int|null $subtasks_count
 * @property-read \App\Models\PsTemplateComponent|null $templateComponent
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereAcceptanceCriteria($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereAdjustedMandays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereAiConfidence($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereBaseMandays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereBufferMandays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereBufferPercentageSnapshot($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereComplexityLevelId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereComplexityMultiplierSnapshot($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereDeliverable($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereDependencyNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereEstimatedFee($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereEstimationId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereFinalMandays($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereIsAiGenerated($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereManualAdjustment($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereManualAdjustmentReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereParentTaskId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereRateSnapshot($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereRiskNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereRoleId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereSortOrder($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereSourceReferenceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereSourceType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereSubtaskName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereTaskName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereTaskType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereTemplateComponentId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|PsEstimationLine whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class PsEstimationLine extends Model
{
    use HasFactory;

    protected $table = 'ps_estimation_lines';

    protected $fillable = [
        'estimation_id',
        'role_id',
        'template_component_id',
        'task_name',
        'description',
        'base_mandays',
        'adjusted_mandays',
        'buffer_mandays',
        'manual_adjustment',
        'final_mandays',
        'rate_snapshot',
        'estimated_fee',
        'sort_order',
        'parent_task_id',
        'task_type',
        'subtask_name',
        'deliverable',
        'acceptance_criteria',
        'complexity_level_id',
        'complexity_multiplier_snapshot',
        'buffer_percentage_snapshot',
        'manual_adjustment_reason',
        'dependency_notes',
        'risk_notes',
        'is_ai_generated',
        'ai_confidence',
        'source_type',
        'source_reference_id',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'base_mandays' => 'decimal:2',
            'adjusted_mandays' => 'decimal:2',
            'buffer_mandays' => 'decimal:2',
            'manual_adjustment' => 'decimal:2',
            'final_mandays' => 'decimal:2',
            'rate_snapshot' => 'decimal:2',
            'estimated_fee' => 'decimal:2',
            'sort_order' => 'integer',
            'acceptance_criteria' => 'array',
            'dependency_notes' => 'array',
            'risk_notes' => 'array',
            'is_ai_generated' => 'boolean',
            'complexity_multiplier_snapshot' => 'decimal:2',
            'buffer_percentage_snapshot' => 'decimal:2',
        ];
    }

    public function estimation(): BelongsTo
    {
        return $this->belongsTo(PsEstimation::class, 'estimation_id');
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(PsRole::class, 'role_id');
    }

    public function templateComponent(): BelongsTo
    {
        return $this->belongsTo(PsTemplateComponent::class, 'template_component_id');
    }

    public function complexityLevel(): BelongsTo
    {
        return $this->belongsTo(PsComplexityLevel::class, 'complexity_level_id');
    }

    public function parentTask(): BelongsTo
    {
        return $this->belongsTo(PsEstimationLine::class, 'parent_task_id');
    }

    public function subtasks(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(PsEstimationLine::class, 'parent_task_id')->orderBy('sort_order');
    }
}
