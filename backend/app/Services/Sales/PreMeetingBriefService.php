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
            'bantcQuestionGuide',
            'activities' => fn($q) => $q->latest()->take(10),
            'transcripts' => fn($q) => $q->latest()->take(5),
            'aiEvaluations' => fn($q) => $q->latest()->take(5),
            'productMatches' => fn($q) => $q->with('product.questionGuide')->orderBy('match_score', 'desc')->take(3)
        ]);

        $product = null;
        if (!empty($inputs['product_id'])) {
            $product = \App\Models\Product::with('questionGuide')->find($inputs['product_id']);
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

        $productIndustryFitScore = 50; // default
        
        $meetingType = $inputs['meeting_type'] ?? 'First Discovery Meeting';

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
            'Question Guides' => [
                'Product Question Guide' => $product?->questionGuide?->questions ?? [],
                'Customer BANTC Question Guide' => $lead->bantcQuestionGuide?->questions ?? [],
            ],
            'Manual Inputs (Priority)' => [
                'Meeting Type' => $meetingType,
                'Initial Needs' => $inputs['initial_needs'] ?? null,
                'Customer Objective' => $inputs['customer_objective'] ?? null,
                'Demo Expectation' => $inputs['demo_expectation'] ?? null,
                'Pain Point' => $inputs['pain_point'] ?? null,
                'KPI Target' => $inputs['kpi_target'] ?? null,
            ]
        ];

        $prompt = "You are an elite Sales Readiness Engine. Generate a comprehensive Pre-Meeting Brief based on the provided context. 
Your goal is to prepare the Sales/Presales team for the upcoming '{$meetingType}'.
Do NOT invent budget numbers, competitor names, or specific facts if they are missing. Use hypotheses where data is missing.

Respond ONLY in valid JSON matching this exact structure:
{
  \"executive_summary\": {\"summary\": \"\", \"key_objective\": \"\", \"primary_challenge\": \"\"},
  \"customer_context\": {\"company_summary\": \"\", \"industry_context\": \"\", \"business_category_context\": \"\", \"known_evidence\": [], \"missing_data\": []},
  \"initial_product_intelligence\": {\"product_relevance\": \"\", \"product_fit_hypothesis\": \"\", \"relevant_use_cases\": [], \"buyer_persona_hypothesis\": \"\", \"demo_relevance\": \"\"},
  \"initial_bantc_estimation\": {
    \"budget\": {\"estimated_readiness\": \"\", \"evidence\": \"\", \"assumptions\": \"\", \"confidence\": \"Low|Medium|High\", \"validation_questions\": []},
    \"authority\": {\"likely_decision_maker\": \"\", \"likely_influencer\": \"\", \"possible_blocker\": \"\", \"authority_gaps\": \"\", \"confidence\": \"Low|Medium|High\"},
    \"need\": {\"likely_need_strength\": \"\", \"related_pain_points\": [], \"product_relevance\": \"\", \"confidence\": \"Low|Medium|High\"},
    \"timeline\": {\"likely_urgency_level\": \"\", \"possible_buying_trigger\": \"\", \"implementation_timing_hypothesis\": \"\", \"confidence\": \"Low|Medium|High\"},
    \"competitor\": {\"possible_competitor_or_legacy\": \"\", \"switching_risk\": \"\", \"validation_questions\": [], \"confidence\": \"Low|Medium|High\"},
    \"challenge\": {\"expected_implementation_challenge\": \"\", \"operational_challenge_hypothesis\": \"\", \"confidence\": \"Low|Medium|High\"}
  },
  \"question_guide\": [
    {
      \"question\": \"\", \"category\": \"Budget|Authority|Need|Timeline|Competitor|Challenge|Legacy|Other\", \"source\": \"product_question_guide|bantc_question_guide|ai_contextual|digital_resistance_check\",
      \"why_this_question_matters\": \"\", \"what_good_answer_indicates\": \"\", \"what_risk_answer_indicates\": \"\", \"follow_up_question\": \"\",
      \"priority\": \"critical|high|medium|low\", \"recommended_timing\": \"opening|discovery|validation|demo|closing\",
      \"related_product\": \"\", \"related_pain_point\": \"\", \"related_bantc_area\": \"\"
    }
  ],
  \"digitalization_resistance_analysis\": {
    \"resistance_level\": \"low|medium|high\", \"reasoning\": \"\", \"evidence_used\": [], \"assumptions\": [],
    \"resistance_signals_to_validate\": [], \"digitalization_resistance_questions\": []
  },
  \"meeting_strategy\": {
    \"focus_areas\": [], \"opening_approach\": \"\", \"discovery_sequence\": [], \"top_questions_to_prioritize\": [], \"what_not_to_pitch_yet\": \"\", \"qualification_objective\": \"\", \"expected_meeting_outcome\": \"\"
  },
  \"demo_cycle\": {
    \"demo_journey_name\": \"\",
    \"demo_flow\": [
      {\"step_number\": 1, \"demo_stage_name\": \"\", \"objective\": \"\", \"feature_or_module_to_show\": \"\", \"talk_track\": \"\", \"customer_pain_addressed\": \"\", \"validation_question\": \"\", \"expected_customer_reaction\": \"\"}
    ],
    \"demo_sequence_rule\": {\"show_first\": \"\", \"show_middle\": \"\", \"show_last\": \"\", \"avoid_showing_early\": \"\"},
    \"demo_success_criteria\": {\"understand\": [], \"confirm\": [], \"buying_signal\": \"\"},
    \"demo_risk\": {\"possible_mismatch\": \"\", \"possible_objection\": \"\", \"feature_gap\": \"\"}
  },
  \"pain_point_hypothesis\": {
    \"confirmed_pain_points\": [{\"pain_point\": \"\", \"business_impact\": \"\"}],
    \"inferred_pain_points\": [{\"pain_point_hypothesis\": \"\", \"why_likely\": \"\", \"evidence_basis\": \"\", \"relation_to_product\": \"\", \"business_impact_if_true\": \"\", \"validation_question\": \"\", \"confidence\": \"Low|Medium|High\", \"priority\": \"High|Medium|Low\"}]
  },
  \"risk_analysis\": {
    \"meeting_risks\": [], \"demo_risks\": [], \"deal_risks\": [], \"adoption_risks\": []
  },
  \"readiness\": {
    \"score\": 0, \"readiness_status\": \"Ready|Needs Clarification|Not Ready\", \"reason\": \"\", \"missing_information\": []
  }
}

Important Rules:
1. Merge questions from Product Question Guide and Customer BANTC Question Guide, plus generate your own ai_contextual and digital_resistance_check questions. Ensure at least 8 highly relevant questions are generated.
2. Adapt 'meeting_strategy' based specifically on the selected meeting type ('{$meetingType}').
3. For Readiness Score (0-100), penalize if Initial Product is missing, if Question Guides are missing, or if Industry/Business Category is missing.
4. Separate confirmed pain points from inferred ones based strictly on evidence provided.

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

        if (!$data) {
             abort(500, 'AI Generation Failed: Invalid JSON returned.');
        }

        // Adjust Readiness
        $aiReadiness = $data['readiness']['score'] ?? 50;
        
        // Final programmatic penalty checks just to ensure minimum standards
        $finalScore = (int) $aiReadiness;
        if (!$product) $finalScore -= 20;
        if (!$lead->bantcQuestionGuide) $finalScore -= 10;
        if ($industryContextScore === 0) $finalScore -= 15;
        
        $finalScore = max(0, min(100, $finalScore));
        $status = $finalScore >= 80 ? 'Ready' : ($finalScore >= 60 ? 'Needs Clarification' : 'Not Ready');

        // Save History Record
        $brief = LeadPreMeetingBrief::create([
            'lead_id' => $lead->id,
            'product_id' => $product?->id,
            'meeting_type' => $meetingType,
            'input_context_json' => $inputs,
            
            // Map legacy columns (useful if other parts of the app expect them, though we should transition)
            'customer_snapshot_json' => $data['customer_context'] ?? null,
            'needs_pain_hypothesis_json' => $data['pain_point_hypothesis'] ?? null,
            'product_fit_hypothesis_json' => $data['initial_product_intelligence'] ?? null,
            'bantc_discovery_plan_json' => $data['initial_bantc_estimation'] ?? null,
            'demo_strategy_json' => $data['demo_cycle'] ?? null,
            'risk_flags_json' => $data['risk_analysis'] ?? null,
            'recommended_meeting_approach_json' => $data['meeting_strategy'] ?? null,
            
            // Map new columns exactly as requested
            'executive_summary_json' => $data['executive_summary'] ?? null,
            'customer_context_json' => $data['customer_context'] ?? null,
            'initial_product_intelligence_json' => $data['initial_product_intelligence'] ?? null,
            'initial_bantc_estimation_json' => $data['initial_bantc_estimation'] ?? null,
            'question_guide_json' => $data['question_guide'] ?? null,
            'digitalization_resistance_json' => $data['digitalization_resistance_analysis'] ?? null,
            'meeting_strategy_json' => $data['meeting_strategy'] ?? null,
            'demo_cycle_json' => $data['demo_cycle'] ?? null,
            'pain_point_hypothesis_json' => $data['pain_point_hypothesis'] ?? null,
            'risk_analysis_json' => $data['risk_analysis'] ?? null,
            'readiness_json' => $data['readiness'] ?? null,

            'readiness_score' => $finalScore,
            'readiness_status' => $status,
            'data_completeness_score' => $completenessScore,
            'industry_context_completeness_score' => $industryContextScore,
            'product_industry_fit_score' => $productIndustryFitScore,
            'executive_brief' => $data['executive_summary']['summary'] ?? null,
            
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
