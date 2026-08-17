<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $name
 * @property string|null $description
 * @property array<array-key, mixed>|null $target_industries
 * @property array<array-key, mixed>|null $target_company_sizes
 * @property array<array-key, mixed>|null $target_territories
 * @property int $min_lead_score
 * @property array<array-key, mixed>|null $required_fields
 * @property float $weight_lead_score
 * @property float $weight_industry
 * @property float $weight_company_size
 * @property float $weight_territory
 * @property float $weight_contact_info
 * @property bool $is_active
 * @property int|null $created_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property int|null $tenant_id
 * @property-read \App\Models\User|null $creator
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\LeadIcpMatch> $leadMatches
 * @property-read int|null $lead_matches_count
 * @property-read \App\Models\Tenant|null $tenant
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IcpProfile newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IcpProfile newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IcpProfile query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IcpProfile whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IcpProfile whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IcpProfile whereDescription($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IcpProfile whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IcpProfile whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IcpProfile whereMinLeadScore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IcpProfile whereName($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IcpProfile whereRequiredFields($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IcpProfile whereTargetCompanySizes($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IcpProfile whereTargetIndustries($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IcpProfile whereTargetTerritories($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IcpProfile whereTenantId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IcpProfile whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IcpProfile whereWeightCompanySize($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IcpProfile whereWeightContactInfo($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IcpProfile whereWeightIndustry($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IcpProfile whereWeightLeadScore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|IcpProfile whereWeightTerritory($value)
 * @mixin \Eloquent
 */
class IcpProfile extends Model
{
    protected $fillable = [
        'tenant_id',
        'name', 'description',
        'target_industries', 'target_company_sizes', 'target_territories',
        'min_lead_score', 'required_fields',
        'weight_lead_score', 'weight_industry', 'weight_company_size',
        'weight_territory', 'weight_contact_info',
        'is_active', 'created_by',
    ];

    protected $casts = [
        'target_industries' => 'array',
        'target_company_sizes' => 'array',
        'target_territories' => 'array',
        'required_fields' => 'array',
        'weight_lead_score' => 'float',
        'weight_industry' => 'float',
        'weight_company_size' => 'float',
        'weight_territory' => 'float',
        'weight_contact_info' => 'float',
        'is_active' => 'boolean',
        'min_lead_score' => 'integer',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function leadMatches(): HasMany
    {
        return $this->hasMany(LeadIcpMatch::class);
    }
}
