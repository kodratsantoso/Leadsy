<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
