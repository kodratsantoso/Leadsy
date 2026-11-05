<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IndustryNewsArticle extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'industry_id',
        'sub_industry_id',
        'business_category_id',
        'region_scope',
        'url_hash',
        'title',
        'url',
        'source_name',
        'source_domain',
        'published_at',
        'snippet',
        'signal_type',
        'relevance_tier',
        'search_provider',
    ];

    protected $casts = [
        'published_at' => 'datetime',
    ];

    public function industry(): BelongsTo
    {
        return $this->belongsTo(Industry::class);
    }

    public function subIndustry(): BelongsTo
    {
        return $this->belongsTo(SubIndustry::class);
    }

    public function businessCategory(): BelongsTo
    {
        return $this->belongsTo(BusinessCategory::class);
    }

    public function entities(): HasMany
    {
        return $this->hasMany(IndustryNewsEntity::class, 'article_id');
    }
}
