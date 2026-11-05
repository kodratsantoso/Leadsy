<?php

namespace App\Models;

use App\Models\Traits\ScopesTaxonomyToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Industry extends Model
{
    use ScopesTaxonomyToTenant;

    protected $fillable = [
        'tenant_id',
        'name',
        'synonyms',
        'scoring_hints',
        'is_active',
    ];

    protected $casts = [
        'synonyms' => 'array',
        'is_active' => 'boolean',
    ];

    public function subIndustries(): HasMany
    {
        return $this->hasMany(SubIndustry::class);
    }

    public function businessCategories(): HasMany
    {
        return $this->hasMany(BusinessCategory::class);
    }
}
