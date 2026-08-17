<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $lead_id
 * @property int $product_id
 * @property int $match_score
 * @property string|null $match_reason
 * @property bool $is_recommended
 * @property \Illuminate\Support\Carbon $last_matched_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property array<array-key, mixed>|null $bant_analysis
 * @property array<array-key, mixed>|null $reasoning
 * @property string|null $recommended_approach
 * @property string|null $competitor_context
 * @property string|null $match_level
 * @property int|null $confidence_score
 * @property string|null $ai_provider_used
 * @property string|null $ai_model_used
 * @property-read \App\Models\Lead|null $lead
 * @property-read \App\Models\Product $product
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatch newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatch newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatch query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatch whereAiModelUsed($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatch whereAiProviderUsed($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatch whereBantAnalysis($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatch whereCompetitorContext($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatch whereConfidenceScore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatch whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatch whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatch whereIsRecommended($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatch whereLastMatchedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatch whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatch whereMatchLevel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatch whereMatchReason($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatch whereMatchScore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatch whereProductId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatch whereReasoning($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatch whereRecommendedApproach($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadProductMatch whereUpdatedAt($value)
 * @mixin \Eloquent
 */
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
