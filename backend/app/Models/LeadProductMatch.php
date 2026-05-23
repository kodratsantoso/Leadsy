<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadProductMatch extends Model
{
    protected $fillable = [
        'lead_id', 'product_id', 'match_score', 'match_reason',
        'bant_analysis', 'reasoning', 'recommended_approach',
        'competitor_context', 'match_level', 'confidence_score',
        'ai_provider_used', 'ai_model_used',
        'is_recommended', 'last_matched_at',
    ];

    protected $casts = [
        'match_score' => 'integer',
        'confidence_score' => 'integer',
        'is_recommended' => 'boolean',
        'last_matched_at' => 'datetime',
        'bant_analysis' => 'array',
        'reasoning' => 'array',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
