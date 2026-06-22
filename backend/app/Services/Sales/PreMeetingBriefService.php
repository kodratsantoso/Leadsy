<?php

namespace App\Services\Sales;

use App\Models\Lead;
use App\Models\LeadPreMeetingBrief;
use App\Services\AI\AiOrchestrationService;
use App\Services\AuditService;

class PreMeetingBriefService
{
    public function __construct(
        private AiOrchestrationService $ai
    ) {}

    public function generateBrief(Lead $lead, array $inputs = []): LeadPreMeetingBrief
    {
        set_time_limit(120);

        // 1. Gather Context
        $lead->loadMissing([
            'industry',
            'activities' => fn($q) => $q->latest()->take(10),
            'transcripts' => fn($q) => $q->latest()->take(5),
            'aiEvaluations' => fn($q) => $q->latest()->take(5),
            'productMatches' => fn($q) => $q->with('product')->orderBy('match_score', 'desc')->take(3)
        ]);

        $product = null;
        if (!empty($inputs['product_id'])) {
            $product = \App\Models\Product::find($inputs['product_id']);
        }
        if (!$product) {
            $product = $lead->productMatches->first()?->product;
        }

        // Context Completeness Calculations
        $completenessScore = 20; // Base score
        if ($lead->company_name) $completenessScore += 10;
        if ($lead->activities->count() > 0) $completenessScore += 20;
        if ($lead->transcripts->count() > 0) $completenessScore += 20;

        $industryContextScore = 0;
        if ($lead->industry_id) $industryContextScore += 50;
        if ($lead->business_category) $industryContextScore += 50;

        $completenessScore += ($industryContextScore * 0.15); // Add up to 15 points
        if ($product) $completenessScore += 15;
        $completenessScore = min(100, (int)$completenessScore);

        // Build Prompt Context
        $context = [
            'Lead Profile' => [
                'name' => $lead->name,
                'company' => $lead->company_name,
                'stage' => $lead->stage,
                'score' => $lead->score,
                'employees' => $lead->employees,
            ],
            'Industry & Business Category' => [
                'Industry' => $lead->industry?->name,
                'Sub-Industry' => $lead->sub_industry_id,
                'Business Category' => $lead->business_category,
                'Business Type' => $lead->business_type,
            ],
            'Recent Activities' => $lead->activities->map(fn($a) => [
                'type' => $a->activity_type,
                'notes' => $a->notes,
                'date' => $a->created_at->toIso8601String(),
            ])->toArray(),
            'Recent Transcripts & Evaluations' => $lead->aiEvaluations->map(fn($e) => [
                'summary' => $e->summary,
                'bantc_extracted' => $e->bantc_extracted,
                'date' => $e->evaluated_at,
            ])->toArray(),
            'Product Context' => $product ? [
                'name' => $product->name,
                'description' => $product->description,
                'category' => $product->category,
                'target_industry' => $product->target_industry,
                'target_company_size' => $product->target_company_size,
                'icp_rules' => $product->icp_rules_json,
                'use_cases' => $product->use_cases_json,
            ] : null,
            'Manual Inputs (Priority)' => [
                'Meeting Type' => $inputs['meeting_type'] ?? 'Unknown',
                'Initial Needs' => $inputs['initial_needs'] ?? null,
                'Customer Objective' => $inputs['customer_objective'] ?? null,
                'Demo Expectation' => $inputs['demo_expectation'] ?? null,
                'Pain Point' => $inputs['pain_point'] ?? null,
                'KPI Target' => $inputs['kpi_target'] ?? null,
            ]
        ];

        $prompt = "You are a Sales Readiness AI. Generate a comprehensive Pre-Meeting Brief based on the provided context. Pay specific attention to the interaction between the Initial Product and the Customer's Industry & Business Category.
Respond ONLY in valid JSON matching this exact structure:
{
  \"customer_snapshot\": {},
  \"industry_snapshot\": {\"industry\": \"\", \"business_category\": \"\", \"likely_business_model\": \"\", \"expected_maturity_level\": \"\", \"likely_buyer_persona\": \"\"},
  \"meeting_context\": {},
  \"needs_pain_hypothesis\": {},
  \"industry_pain_point_hypothesis\": {\"common_operational_challenges\": [], \"industry_specific_pain_points\": [], \"industry_specific_risk_signals\": [], \"key_validation_questions\": []},
  \"product_fit_hypothesis\": {},
  \"product_industry_fit\": {\"product_industry_fit_score\": 0, \"why_product_fits_industry\": \"\", \"relevant_use_cases\": [], \"pain_points_to_validate_first\": [], \"features_to_prioritize\": [], \"business_value_to_emphasize\": \"\", \"likely_objections\": [], \"common_legacy_alternatives\": []},
  \"bantc_discovery_plan\": {\"budget\": [], \"authority\": [], \"needs\": [], \"timeline\": [], \"competitor\": []},
  \"industry_based_bantc_questions\": {\"budget\": [], \"authority\": [], \"needs\": [], \"timeline\": [], \"competitor\": []},
  \"demo_strategy\": {},
  \"industry_based_demo_strategy\": {\"industry_specific_demo_storyline\": \"\", \"recommended_demo_scenario\": \"\", \"operational_process_to_simulate\": \"\", \"feature_sequence\": [], \"kpi_to_highlight\": [], \"objections_to_prepare\": [], \"success_criteria\": \"\"},
  \"stakeholder_strategy\": {},
  \"risk_flags\": [],
  \"recommended_meeting_approach\": {},
  \"readiness\": {\"readiness_score\": 0, \"readiness_status\": \"Ready|Needs Clarification|Not Ready\", \"reasoning\": []},
  \"executive_brief\": \"\"
}

Note: Make sure that `industry_based_bantc_questions` arrays each contain objects with `question`, `why_it_matters`, `ideal_answer`, `risk_answer`, `relation_to_product`, `relation_to_industry`.

Context data:
" . json_encode($context, JSON_PRETTY_PRINT);

        $result = $this->ai->call('pre_meeting_brief_generation', $prompt);
        
        if (!$result['success']) {
            abort(500, 'AI Generation Failed: ' . ($result['error'] ?? 'Unknown error'));
        }

        $content = $result['content'] ?? '{}';
        $content = preg_replace('/^```json\s*/i', '', $content);
        $content = preg_replace('/```$/', '', trim($content));
        $data = json_decode($content, true);

        // Adjust Readiness
        $aiReadiness = $data['readiness']['readiness_score'] ?? 50;
        $productIndustryFitScore = $data['product_industry_fit']['product_industry_fit_score'] ?? 50;
        
        // Final score combines AI readiness, Completeness, and Industry Fit
        $finalScore = (int) (($aiReadiness + $completenessScore + $productIndustryFitScore) / 3);
        
        // If industry fit is weak or context missing, penalize slightly more
        if ($industryContextScore === 0) {
             $finalScore -= 10;
        }
        $finalScore = max(0, min(100, $finalScore));
        $status = $finalScore >= 80 ? 'Ready' : ($finalScore >= 60 ? 'Needs Clarification' : 'Not Ready');

        // Save History Record
        $brief = LeadPreMeetingBrief::create([
            'lead_id' => $lead->id,
            'product_id' => $product?->id,
            'meeting_type' => $inputs['meeting_type'] ?? null,
            'input_context_json' => $inputs,
            'customer_snapshot_json' => $data['customer_snapshot'] ?? null,
            'industry_snapshot_json' => $data['industry_snapshot'] ?? null,
            'meeting_context_json' => $data['meeting_context'] ?? null,
            'needs_pain_hypothesis_json' => $data['needs_pain_hypothesis'] ?? null,
            'industry_pain_point_hypothesis_json' => $data['industry_pain_point_hypothesis'] ?? null,
            'product_fit_hypothesis_json' => $data['product_fit_hypothesis'] ?? null,
            'product_industry_fit_json' => $data['product_industry_fit'] ?? null,
            'bantc_discovery_plan_json' => $data['bantc_discovery_plan'] ?? null,
            'industry_based_bantc_questions_json' => $data['industry_based_bantc_questions'] ?? null,
            'demo_strategy_json' => $data['demo_strategy'] ?? null,
            'industry_based_demo_strategy_json' => $data['industry_based_demo_strategy'] ?? null,
            'stakeholder_strategy_json' => $data['stakeholder_strategy'] ?? null,
            'risk_flags_json' => $data['risk_flags'] ?? null,
            'recommended_meeting_approach_json' => $data['recommended_meeting_approach'] ?? null,
            'readiness_score' => $finalScore,
            'readiness_status' => $status,
            'data_completeness_score' => $completenessScore,
            'industry_context_completeness_score' => $industryContextScore,
            'product_industry_fit_score' => $productIndustryFitScore,
            'executive_brief' => $data['executive_brief'] ?? null,
            'ai_provider' => $result['provider'] ?? 'orchestration',
            'ai_model' => $result['model'] ?? 'default',
            'prompt_version' => 'v3',
            'generated_by' => request()->user()?->id,
            'generated_at' => now(),
        ]);

        AuditService::log(
            'pre_meeting_brief_generated',
            'leads',
            $lead,
            null,
            ['brief_id' => $brief->id, 'score' => $finalScore, 'status' => $status],
            'success'
        );

        return $brief;
    }
}
