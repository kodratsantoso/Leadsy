<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $lead_id
 * @property int|null $relevance_score
 * @property string|null $business_opportunity_summary
 * @property array<array-key, mixed>|null $probable_needs
 * @property string|null $suggested_approach
 * @property string $urgency_level
 * @property int|null $confidence_score
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property string|null $company_summary
 * @property string|null $potential_use_case
 * @property string|null $risk_insight
 * @property-read \App\Models\Lead|null $lead
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiAnalysis newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiAnalysis newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiAnalysis query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiAnalysis whereBusinessOpportunitySummary($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiAnalysis whereCompanySummary($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiAnalysis whereConfidenceScore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiAnalysis whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiAnalysis whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiAnalysis whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiAnalysis wherePotentialUseCase($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiAnalysis whereProbableNeeds($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiAnalysis whereRelevanceScore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiAnalysis whereRiskInsight($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiAnalysis whereSuggestedApproach($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiAnalysis whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadAiAnalysis whereUrgencyLevel($value)
 * @mixin \Eloquent
 */
class LeadAiAnalysis extends Model
{
    protected $fillable = [
        'lead_id', 'relevance_score', 'company_summary', 'business_opportunity_summary',
        'potential_use_case', 'probable_needs', 'suggested_approach', 'risk_insight', 'urgency_level',
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
