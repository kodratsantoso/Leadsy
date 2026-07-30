<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
