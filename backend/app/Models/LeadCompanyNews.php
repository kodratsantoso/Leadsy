<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LeadCompanyNews extends Model
{
    use HasFactory;

    protected $table = 'lead_company_news';

    protected $fillable = [
        'lead_id',
        'tenant_id',
        'headline',
        'canonical_url',
        'publisher_name',
        'publisher_domain',
        'published_at',
        'summary',
        'source_provider',
        'relevance_score',
        'reliability_score',
        'verification_status',
        'is_relevant',
        'is_excluded',
        'raw_metadata',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'is_relevant' => 'boolean',
        'is_excluded' => 'boolean',
        'relevance_score' => 'integer',
        'reliability_score' => 'integer',
        'raw_metadata' => 'array',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function signals(): HasMany
    {
        return $this->hasMany(LeadBusinessSignal::class, 'news_id');
    }
}
