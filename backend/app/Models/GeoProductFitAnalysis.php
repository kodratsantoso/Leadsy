<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $place_id
 * @property int $product_id
 * @property int|null $lead_id
 * @property int $fit_score
 * @property string $fit_level
 * @property int $confidence_score
 * @property array<array-key, mixed>|null $reasoning
 * @property array<array-key, mixed>|null $matched_signals
 * @property array<array-key, mixed>|null $missing_information
 * @property array<array-key, mixed>|null $risk_flags
 * @property string|null $recommended_approach
 * @property string|null $recommended_next_action
 * @property string|null $potential_use_case
 * @property int $pre_fit_score
 * @property bool $analyzed_with_ai
 * @property string|null $ai_provider_used
 * @property string|null $ai_model_used
 * @property string|null $source_payload_hash
 * @property string|null $product_payload_hash
 * @property \Illuminate\Support\Carbon|null $analyzed_at
 * @property int|null $created_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User|null $creator
 * @property-read \App\Models\Lead|null $lead
 * @property-read \App\Models\Product $product
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GeoProductFitAnalysis newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GeoProductFitAnalysis newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GeoProductFitAnalysis query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GeoProductFitAnalysis whereAiModelUsed($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GeoProductFitAnalysis whereAiProviderUsed($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GeoProductFitAnalysis whereAnalyzedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GeoProductFitAnalysis whereAnalyzedWithAi($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GeoProductFitAnalysis whereConfidenceScore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GeoProductFitAnalysis whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GeoProductFitAnalysis whereCreatedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GeoProductFitAnalysis whereFitLevel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GeoProductFitAnalysis whereFitScore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GeoProductFitAnalysis whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GeoProductFitAnalysis whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GeoProductFitAnalysis whereMatchedSignals($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GeoProductFitAnalysis whereMissingInformation($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GeoProductFitAnalysis wherePlaceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GeoProductFitAnalysis wherePotentialUseCase($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GeoProductFitAnalysis wherePreFitScore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GeoProductFitAnalysis whereProductId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GeoProductFitAnalysis whereProductPayloadHash($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GeoProductFitAnalysis whereReasoning($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GeoProductFitAnalysis whereRecommendedApproach($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GeoProductFitAnalysis whereRecommendedNextAction($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GeoProductFitAnalysis whereRiskFlags($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GeoProductFitAnalysis whereSourcePayloadHash($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|GeoProductFitAnalysis whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
