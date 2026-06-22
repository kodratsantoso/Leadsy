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

        // Data Completeness Calculation
        $completenessScore = 20; // Base score
        if ($lead->industry_id) $completenessScore += 10;
        if ($lead->company_name) $completenessScore += 10;
        if ($lead->activities->count() > 0) $completenessScore += 20;
        if ($lead->transcripts->count() > 0) $completenessScore += 20;
        if ($product) $completenessScore += 20;
        $completenessScore = min(100, $completenessScore);

        // Build Prompt Context
        $context = [
            'Lead Profile' => [
                'name' => $lead->name,
                'company' => $lead->company_name,
                'stage' => $lead->stage,
                'score' => $lead->score,
                'industry' => $lead->industry?->name,
                'employees' => $lead->employees,
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
                'icp_rules' => $product->icp_rules_json,
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

        $prompt = "You are a Sales Readiness AI. Generate a comprehensive Pre-Meeting Brief based on the following context.
Respond ONLY in valid JSON matching this exact structure:
{
  \"customer_snapshot\": {},
  \"meeting_context\": {},
  \"needs_pain_hypothesis\": {},
  \"product_fit_hypothesis\": {},
  \"bantc_discovery_plan\": {\"budget\": [], \"authority\": [], \"needs\": [], \"timeline\": [], \"competitor\": []},
  \"demo_strategy\": {},
  \"stakeholder_strategy\": {},
  \"risk_flags\": [],
  \"recommended_meeting_approach\": {},
  \"readiness\": {\"readiness_score\": 0, \"readiness_status\": \"Ready|Needs Clarification|Not Ready\", \"reasoning\": []},
  \"executive_brief\": \"\"
}

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
        $finalScore = (int) (($aiReadiness + $completenessScore) / 2);
        $status = $finalScore >= 80 ? 'Ready' : ($finalScore >= 60 ? 'Needs Clarification' : 'Not Ready');

        // Save History Record
        $brief = LeadPreMeetingBrief::create([
            'lead_id' => $lead->id,
            'product_id' => $product?->id,
            'meeting_type' => $inputs['meeting_type'] ?? null,
            'input_context_json' => $inputs,
            'customer_snapshot_json' => $data['customer_snapshot'] ?? null,
            'meeting_context_json' => $data['meeting_context'] ?? null,
            'needs_pain_hypothesis_json' => $data['needs_pain_hypothesis'] ?? null,
            'product_fit_hypothesis_json' => $data['product_fit_hypothesis'] ?? null,
            'bantc_discovery_plan_json' => $data['bantc_discovery_plan'] ?? null,
            'demo_strategy_json' => $data['demo_strategy'] ?? null,
            'stakeholder_strategy_json' => $data['stakeholder_strategy'] ?? null,
            'risk_flags_json' => $data['risk_flags'] ?? null,
            'recommended_meeting_approach_json' => $data['recommended_meeting_approach'] ?? null,
            'readiness_score' => $finalScore,
            'readiness_status' => $status,
            'data_completeness_score' => $completenessScore,
            'executive_brief' => $data['executive_brief'] ?? null,
            'ai_provider' => $result['provider'] ?? 'orchestration',
            'ai_model' => $result['model'] ?? 'default',
            'prompt_version' => 'v2',
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
