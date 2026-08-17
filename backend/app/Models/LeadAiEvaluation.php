<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * @property int $id
 * @property int $lead_id
 * @property string $source_type
 * @property int $source_id
 * @property string|null $sentiment
 * @property string|null $intent_level
 * @property string|null $interest_level
 * @property array<array-key, mixed>|null $objections_detected
 * @property array<array-key, mixed>|null $buying_signals
 * @property string|null $next_best_action
 * @property int|null $recommended_product_id
 * @property int|null $confidence_score
 * @property \Illuminate\Support\Carbon $evaluated_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $summary
 * @property array<array-key, mixed>|null $bantc_extracted
 * @property string|null $eligibility_reason
 * @property string|null $presales_analysis
 * @property string|null $presales_recommendation
 * @property \Illuminate\Support\Carbon|null $estimated_closing_date
 * @property string|null $challenge
 * @property string|null $legacy_tools
 * @property array<array-key, mixed>|null $risks
 * @property array<array-key, mixed>|null $action_items
 * @property array<array-key, mixed>|null $missing_information
 * @property-read \App\Models\Lead|null $lead
 * @property-read \App\Models\Product|null $recommendedProduct
 * @property-read Model|\Eloquent $source
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation whereActionItems($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation whereBantcExtracted($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation whereBuyingSignals($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation whereChallenge($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation whereConfidenceScore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation whereEligibilityReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation whereEstimatedClosingDate($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation whereEvaluatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation whereIntentLevel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation whereInterestLevel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation whereLegacyTools($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation whereMissingInformation($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation whereNextBestAction($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation whereObjectionsDetected($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation wherePresalesAnalysis($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation wherePresalesRecommendation($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation whereRecommendedProductId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation whereRisks($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation whereSentiment($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation whereSourceId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation whereSourceType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation whereSummary($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiEvaluation whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class LeadAiEvaluation extends Model
{
    protected $fillable = [
        'lead_id', 'source_type', 'source_id', 'sentiment',
        'intent_level', 'interest_level', 'summary', 'eligibility_reason', 'presales_analysis', 
        'presales_recommendation', 'objections_detected',
        'buying_signals', 'bantc_extracted', 'next_best_action', 'recommended_product_id',
        'estimated_closing_date', 'confidence_score', 'evaluated_at',
        'challenge', 'legacy_tools', 'risks', 'action_items', 'missing_information',
    ];

    protected $casts = [
        'evaluated_at' => 'datetime',
        'objections_detected' => 'array',
        'buying_signals' => 'array',
        'bantc_extracted' => 'array',
        'confidence_score' => 'integer',
        'estimated_closing_date' => 'date',
        'risks' => 'array',
        'action_items' => 'array',
        'missing_information' => 'array',
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
