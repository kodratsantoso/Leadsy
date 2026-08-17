<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $lead_id
 * @property float $probability_to_close
 * @property float|null $expected_deal_size
 * @property string $estimated_sales_effort
 * @property float $confidence_score
 * @property array<array-key, mixed>|null $prediction_factors
 * @property string $model_version
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Lead|null $lead
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadConversionPrediction newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadConversionPrediction newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadConversionPrediction query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadConversionPrediction whereConfidenceScore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadConversionPrediction whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadConversionPrediction whereEstimatedSalesEffort($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadConversionPrediction whereExpectedDealSize($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadConversionPrediction whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadConversionPrediction whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadConversionPrediction whereModelVersion($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadConversionPrediction wherePredictionFactors($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadConversionPrediction whereProbabilityToClose($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadConversionPrediction whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
