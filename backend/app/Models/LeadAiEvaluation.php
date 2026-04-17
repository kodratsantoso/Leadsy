<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class LeadAiEvaluation extends Model
{
    protected $fillable = [
        'lead_id', 'source_type', 'source_id', 'sentiment',
        'intent_level', 'interest_level', 'objections_detected',
        'buying_signals', 'next_best_action', 'recommended_product_id',
        'confidence_score', 'evaluated_at',
    ];

    protected $casts = [
        'evaluated_at' => 'datetime',
        'objections_detected' => 'array',
        'buying_signals' => 'array',
        'confidence_score' => 'integer',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function source(): MorphTo
    {
        return $this->morphTo();
    }

    public function recommendedProduct(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'recommended_product_id');
    }
}
