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
}
