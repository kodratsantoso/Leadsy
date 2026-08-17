<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $lead_id
 * @property string|null $business_type
 * @property string|null $use_case
 * @property string|null $intent_level
 * @property string|null $urgency
 * @property float|null $probability_to_close
 * @property array<array-key, mixed>|null $buying_signals
 * @property array<array-key, mixed>|null $objections
 * @property string|null $recommended_action
 * @property string|null $recommended_approach
 * @property float|null $confidence
 * @property array<array-key, mixed>|null $reasoning
 * @property string|null $ai_model
 * @property int|null $prompt_tokens
 * @property int|null $completion_tokens
 * @property float|null $cost_usd
 * @property string $status
 * @property string|null $raw_response
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Lead|null $lead
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRevenueAnalysis newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRevenueAnalysis newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRevenueAnalysis query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRevenueAnalysis whereAiModel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRevenueAnalysis whereBusinessType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRevenueAnalysis whereBuyingSignals($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRevenueAnalysis whereCompletionTokens($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRevenueAnalysis whereConfidence($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRevenueAnalysis whereCostUsd($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRevenueAnalysis whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRevenueAnalysis whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRevenueAnalysis whereIntentLevel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRevenueAnalysis whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRevenueAnalysis whereObjections($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRevenueAnalysis whereProbabilityToClose($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRevenueAnalysis wherePromptTokens($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRevenueAnalysis whereRawResponse($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRevenueAnalysis whereReasoning($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRevenueAnalysis whereRecommendedAction($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRevenueAnalysis whereRecommendedApproach($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRevenueAnalysis whereStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRevenueAnalysis whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRevenueAnalysis whereUrgency($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadRevenueAnalysis whereUseCase($value)
 * @mixin \Eloquent
 */
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
        'buying_signals' => 'array',
        'objections' => 'array',
        'reasoning' => 'array',
        'probability_to_close' => 'float',
        'confidence' => 'float',
        'prompt_tokens' => 'integer',
        'completion_tokens' => 'integer',
        'cost_usd' => 'float',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
