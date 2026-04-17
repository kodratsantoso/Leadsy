<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadAiAnalysis extends Model
{
    protected $fillable = [
        'lead_id', 'relevance_score', 'business_opportunity_summary',
        'probable_needs', 'suggested_approach', 'urgency_level',
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
