<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GeoProductFitAnalysis extends Model
{
    protected $table = 'geo_product_fit_analyses';

    protected $fillable = [
        'place_id', 'product_id', 'lead_id',
        'fit_score', 'fit_level', 'confidence_score',
        'reasoning', 'matched_signals', 'missing_information', 'risk_flags',
        'recommended_approach', 'recommended_next_action', 'potential_use_case',
        'pre_fit_score', 'analyzed_with_ai',
        'ai_provider_used', 'ai_model_used',
        'source_payload_hash', 'product_payload_hash',
        'analyzed_at', 'created_by',
    ];

    protected $casts = [
        'fit_score' => 'integer',
        'confidence_score' => 'integer',
        'pre_fit_score' => 'integer',
        'analyzed_with_ai' => 'boolean',
        'reasoning' => 'array',
        'matched_signals' => 'array',
        'missing_information' => 'array',
        'risk_flags' => 'array',
        'analyzed_at' => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
