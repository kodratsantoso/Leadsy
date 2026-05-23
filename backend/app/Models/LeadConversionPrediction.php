<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadConversionPrediction extends Model
{
    protected $fillable = [
        'lead_id', 'probability_to_close', 'expected_deal_size',
        'estimated_sales_effort', 'confidence_score',
        'prediction_factors', 'model_version',
    ];

    protected $casts = [
        'probability_to_close' => 'float',
        'expected_deal_size' => 'float',
        'confidence_score' => 'float',
        'prediction_factors' => 'array',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
