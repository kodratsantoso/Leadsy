<?php

namespace App\Models;

use App\Models\Traits\ScopesTaxonomyToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubIndustry extends Model
{
    use ScopesTaxonomyToTenant;

    protected $fillable = [
        'tenant_id',
        'industry_id',
        'name',
        'synonyms',
        'scoring_hints',
        'is_active',
    ];

    protected $casts = [
        'synonyms' => 'array',
        'is_active' => 'boolean',
    ];

    public function industry(): BelongsTo
    {
        return $this->belongsTo(Industry::class);
    }
}
