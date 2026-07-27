<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PsEstimationTemplate extends Model
{
    use HasFactory;

    protected $table = 'ps_estimation_templates';

    protected $fillable = [
        'service_category_id',
        'name',
        'description',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function serviceCategory(): BelongsTo
    {
        return $this->belongsTo(PsServiceCategory::class, 'service_category_id');
    }

    public function components(): HasMany
    {
        return $this->hasMany(PsTemplateComponent::class, 'template_id')->orderBy('sort_order');
    }
}
