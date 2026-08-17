<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property int $id
 * @property string $name
 * @property string|null $category
 * @property string|null $description
 * @property string|null $target_industry
 * @property string|null $target_pain_points
 * @property string|null $target_buyer_persona
 * @property string|null $ideal_company_profile
 * @property string|null $ai_reference_material
 * @property string $status
 * @property int|null $created_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $tenant_id
 * @property string|null $supported_regions
 * @property string|null $budget_range
 * @property string|null $target_company_size
 * @property array<array-key, mixed>|null $use_cases
 * @property string|null $competitor_notes
 * @property array<array-key, mixed>|null $keywords
 * @property string|null $website_url
 * @property string|null $logo_path
 * @property string|null $default_terms_conditions
 * @property string|null $quotation_terms_conditions
 * @property string|null $sales_order_terms_conditions
 * @property-read \App\Models\User|null $creator
 * @property-read \App\Models\ProductQuestion|null $questionGuide
 * @property-read \App\Models\Tenant|null $tenant
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\ProductTier> $tiers
 * @property-read int|null $tiers_count
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Product newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Product newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Product query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Product whereAiReferenceMaterial($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Product whereBudgetRange($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Product whereCategory($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Product whereCompetitorNotes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Product whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Product whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Product whereDefaultTermsConditions($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Product whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Product whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Product whereIdealCompanyProfile($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Product whereKeywords($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Product whereLogoPath($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Product whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Product whereQuotationTermsConditions($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Product whereSalesOrderTermsConditions($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Product whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Product whereSupportedRegions($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Product whereTargetBuyerPersona($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Product whereTargetCompanySize($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Product whereTargetIndustry($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Product whereTargetPainPoints($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Product whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Product whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Product whereUseCases($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Product whereWebsiteUrl($value)
 * @mixin \Eloquent
 */
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
