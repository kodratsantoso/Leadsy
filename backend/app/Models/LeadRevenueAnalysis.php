<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadRevenueAnalysis extends Model
{
    protected $fillable = [
        'lead_id',
        'business_type',
        'use_case',
        'intent_level',
        'urgency',
        'probability_to_close',
        'buying_signals',
        'objections',
        'recommended_action',
        'recommended_approach',
        'confidence',
        'reasoning',
        'ai_model',
        'prompt_tokens',
        'completion_tokens',
        'cost_usd',
        'status',
        'raw_response',
    ];

    protected $casts = [
        'buying_signals'       => 'array',
        'objections'           => 'array',
        'reasoning'            => 'array',
        'probability_to_close' => 'float',
        'confidence'           => 'float',
        'prompt_tokens'        => 'integer',
        'completion_tokens'    => 'integer',
        'cost_usd'             => 'float',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
