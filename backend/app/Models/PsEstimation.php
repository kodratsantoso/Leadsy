<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PsEstimation extends Model
{
    use HasFactory;

    protected $table = 'ps_estimations';

    protected $fillable = [
        'estimation_number',
        'lead_id',
        'service_category_id',
        'template_id',
        'complexity_level_id',
        'title',
        'complexity_multiplier',
        'buffer_percentage',
        'currency_code',
        'total_base_mandays',
        'total_adjusted_mandays',
        'total_buffer_mandays',
        'total_manual_adjustment_mandays',
        'total_final_mandays',
        'total_estimated_fee',
        'assumptions',
        'out_of_scope',
        'dependencies',
        'risks',
        'internal_notes',
        'status',
        'created_by',
        'reviewed_by',
        'approved_by',
        'reviewed_at',
        'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'complexity_multiplier' => 'decimal:2',
            'buffer_percentage' => 'decimal:2',
            'total_base_mandays' => 'decimal:2',
            'total_adjusted_mandays' => 'decimal:2',
            'total_buffer_mandays' => 'decimal:2',
            'total_manual_adjustment_mandays' => 'decimal:2',
            'total_final_mandays' => 'decimal:2',
            'total_estimated_fee' => 'decimal:2',
            'reviewed_at' => 'datetime',
            'approved_at' => 'datetime',
        ];
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(PsServiceCategory::class, 'service_category_id');
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(PsEstimationTemplate::class, 'template_id');
    }

    public function complexityLevel(): BelongsTo
    {
        return $this->belongsTo(PsComplexityLevel::class, 'complexity_level_id');
    }

    public function lines(): HasMany
    {
        return $this->hasMany(PsEstimationLine::class, 'estimation_id')->orderBy('sort_order');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
