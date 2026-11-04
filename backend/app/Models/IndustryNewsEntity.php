<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IndustryNewsEntity extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'article_id',
        'industry_id',
        'entity_name',
        'normalized_name',
        'entity_type',
        'parent_company_hint',
        'website_hint',
        'role_in_news',
        'signal_context',
        'matched_lead_id',
        'converted_at',
    ];

    protected $casts = [
        'converted_at' => 'datetime',
    ];

    public function article(): BelongsTo
    {
        return $this->belongsTo(IndustryNewsArticle::class, 'article_id');
    }

    public function industry(): BelongsTo
    {
        return $this->belongsTo(Industry::class);
    }

    public function matchedLead(): BelongsTo
    {
        return $this->belongsTo(Lead::class, 'matched_lead_id');
    }
}
