<?php

namespace App\Models;

use App\Models\Traits\ScopesTaxonomyToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BusinessCategory extends Model
{
    use ScopesTaxonomyToTenant;

    public const CHANNEL_ROLES = [
        'direct_b2b',
        'direct_b2c',
        'partner_influencer',
        'indirect_contract',
    ];

    protected $fillable = [
        'tenant_id',
        'industry_id',
        'code',
        'name',
        'channel_role',
        'description',
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
