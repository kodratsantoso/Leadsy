<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadAiAnalysis extends Model
{
    protected $fillable = [
        'lead_id', 'relevance_score', 'company_summary', 'business_opportunity_summary',
        'potential_use_case', 'probable_needs', 'suggested_approach', 'risk_insight', 'urgency_level',
        'confidence_score',
    ];

    protected $casts = [
        'relevance_score' => 'integer',
        'confidence_score' => 'integer',
        'probable_needs' => 'array',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
