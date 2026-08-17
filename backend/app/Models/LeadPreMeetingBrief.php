<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $lead_id
 * @property int|null $product_id
 * @property string|null $meeting_type
 * @property array<array-key, mixed>|null $input_context_json
 * @property array<array-key, mixed>|null $customer_snapshot_json
 * @property array<array-key, mixed>|null $meeting_context_json
 * @property array<array-key, mixed>|null $needs_pain_hypothesis_json
 * @property array<array-key, mixed>|null $product_fit_hypothesis_json
 * @property array<array-key, mixed>|null $bantc_discovery_plan_json
 * @property array<array-key, mixed>|null $demo_strategy_json
 * @property array<array-key, mixed>|null $stakeholder_strategy_json
 * @property array<array-key, mixed>|null $risk_flags_json
 * @property array<array-key, mixed>|null $recommended_meeting_approach_json
 * @property int|null $readiness_score
 * @property string|null $readiness_status
 * @property int|null $data_completeness_score
 * @property string|null $executive_brief
 * @property string|null $ai_provider
 * @property string|null $ai_model
 * @property string|null $prompt_version
 * @property int|null $generated_by
 * @property \Illuminate\Support\Carbon|null $generated_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property array<array-key, mixed>|null $industry_snapshot_json
 * @property array<array-key, mixed>|null $business_category_snapshot_json
 * @property array<array-key, mixed>|null $product_industry_fit_json
 * @property array<array-key, mixed>|null $industry_pain_point_hypothesis_json
 * @property array<array-key, mixed>|null $industry_based_bantc_questions_json
 * @property array<array-key, mixed>|null $industry_based_demo_strategy_json
 * @property int|null $industry_context_completeness_score
 * @property int|null $product_industry_fit_score
 * @property array<array-key, mixed>|null $executive_summary_json
 * @property array<array-key, mixed>|null $customer_context_json
 * @property array<array-key, mixed>|null $initial_product_intelligence_json
 * @property array<array-key, mixed>|null $initial_bantc_estimation_json
 * @property array<array-key, mixed>|null $question_guide_json
 * @property array<array-key, mixed>|null $digitalization_resistance_json
 * @property array<array-key, mixed>|null $meeting_strategy_json
 * @property array<array-key, mixed>|null $demo_cycle_json
 * @property array<array-key, mixed>|null $pain_point_hypothesis_json
 * @property array<array-key, mixed>|null $risk_analysis_json
 * @property array<array-key, mixed>|null $readiness_json
 * @property-read \App\Models\Lead|null $lead
 * @property-read \App\Models\Product|null $product
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereAiModel($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereAiProvider($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereBantcDiscoveryPlanJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereBusinessCategorySnapshotJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereCustomerContextJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereCustomerSnapshotJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereDataCompletenessScore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereDemoCycleJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereDemoStrategyJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereDigitalizationResistanceJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereExecutiveBrief($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereExecutiveSummaryJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereGeneratedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereGeneratedBy($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereIndustryBasedBantcQuestionsJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereIndustryBasedDemoStrategyJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereIndustryContextCompletenessScore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereIndustryPainPointHypothesisJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereIndustrySnapshotJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereInitialBantcEstimationJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereInitialProductIntelligenceJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereInputContextJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereLeadId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereMeetingContextJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereMeetingStrategyJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereMeetingType($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereNeedsPainHypothesisJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief wherePainPointHypothesisJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereProductFitHypothesisJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereProductId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereProductIndustryFitJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereProductIndustryFitScore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief wherePromptVersion($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereQuestionGuideJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereReadinessJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereReadinessScore($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereReadinessStatus($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereRecommendedMeetingApproachJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereRiskAnalysisJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereRiskFlagsJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereStakeholderStrategyJson($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|LeadPreMeetingBrief whereUpdatedAt($value)
 * @mixin \Eloquent
 */
class LeadPreMeetingBrief extends Model
{
    protected $fillable = [
        'lead_id',
        'product_id',
        'meeting_type',
        'input_context_json',
        'customer_snapshot_json',
        'meeting_context_json',
        'industry_snapshot_json',
        'business_category_snapshot_json',
        'needs_pain_hypothesis_json',
        'industry_pain_point_hypothesis_json',
        'product_fit_hypothesis_json',
        'product_industry_fit_json',
        'bantc_discovery_plan_json',
        'industry_based_bantc_questions_json',
        'demo_strategy_json',
        'industry_based_demo_strategy_json',
        'stakeholder_strategy_json',
        'risk_flags_json',
        'recommended_meeting_approach_json',
        'executive_summary_json',
        'customer_context_json',
        'initial_product_intelligence_json',
        'initial_bantc_estimation_json',
        'question_guide_json',
        'digitalization_resistance_json',
        'meeting_strategy_json',
        'demo_cycle_json',
        'pain_point_hypothesis_json',
        'risk_analysis_json',
        'readiness_json',
        'readiness_score',
        'readiness_status',
        'data_completeness_score',
        'industry_context_completeness_score',
        'product_industry_fit_score',
        'executive_brief',
        'ai_provider',
        'ai_model',
        'prompt_version',
        'generated_by',
        'generated_at',
    ];

    protected $casts = [
        'input_context_json' => 'array',
        'customer_snapshot_json' => 'array',
        'meeting_context_json' => 'array',
        'industry_snapshot_json' => 'array',
        'business_category_snapshot_json' => 'array',
        'needs_pain_hypothesis_json' => 'array',
        'industry_pain_point_hypothesis_json' => 'array',
        'product_fit_hypothesis_json' => 'array',
        'product_industry_fit_json' => 'array',
        'bantc_discovery_plan_json' => 'array',
        'industry_based_bantc_questions_json' => 'array',
        'demo_strategy_json' => 'array',
        'industry_based_demo_strategy_json' => 'array',
        'stakeholder_strategy_json' => 'array',
        'risk_flags_json' => 'array',
        'recommended_meeting_approach_json' => 'array',
        'executive_summary_json' => 'array',
        'customer_context_json' => 'array',
        'initial_product_intelligence_json' => 'array',
        'initial_bantc_estimation_json' => 'array',
        'question_guide_json' => 'array',
        'digitalization_resistance_json' => 'array',
        'meeting_strategy_json' => 'array',
        'demo_cycle_json' => 'array',
        'pain_point_hypothesis_json' => 'array',
        'risk_analysis_json' => 'array',
        'readiness_json' => 'array',
        'readiness_score' => 'integer',
        'data_completeness_score' => 'integer',
        'industry_context_completeness_score' => 'integer',
        'product_industry_fit_score' => 'integer',
        'generated_at' => 'datetime',
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
