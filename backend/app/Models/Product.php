<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Product extends Model
{
    protected $fillable = [
        'tenant_id',
        'name', 'website_url', 'category', 'description', 'target_industry',
        'target_pain_points', 'target_buyer_persona',
        'ideal_company_profile', 'ai_reference_material',
        'supported_regions', 'budget_range', 'target_company_size',
        'use_cases', 'competitor_notes', 'keywords',
        'status', 'created_by',
        'logo_path', 'default_terms_conditions', 'quotation_terms_conditions', 'sales_order_terms_conditions',
    ];

    protected $casts = [
        'use_cases' => 'array',
        'keywords' => 'array',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function questionGuide(): HasOne
    {
        return $this->hasOne(ProductQuestion::class);
    }

    public function tiers(): HasMany
    {
        return $this->hasMany(ProductTier::class);
    }
}
