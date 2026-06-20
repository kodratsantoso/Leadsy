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

    public function generateBrief(Lead $lead): LeadPreMeetingBrief
    {
        // 1. Gather Context
        $lead->loadMissing([
            'industry',
            'activities' => fn($q) => $q->latest()->take(5),
            'transcripts' => fn($q) => $q->latest()->take(5),
            'aiEvaluations' => fn($q) => $q->latest()->take(5),
            'productMatches' => fn($q) => $q->with('product')->orderBy('match_score', 'desc')->take(1)
        ]);

        $product = $lead->productMatches->first()?->product;

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
        ];

        $prompt = "Context data:\n" . json_encode($context, JSON_PRETTY_PRINT);

        $result = $this->ai->call('pre_meeting_brief_generation', $prompt);
        $data = json_decode($result['content'] ?? '{}', true);

        // Save
        $brief = LeadPreMeetingBrief::updateOrCreate(
            ['lead_id' => $lead->id],
            [
                'product_id' => $product?->id,
                'summary_json' => $data['summary'] ?? null,
                'objective_hypothesis_json' => $data['objective_hypothesis'] ?? null,
                'strategy_json' => $data['strategy'] ?? null,
                'questions_json' => $data['questions'] ?? null,
                'demo_strategy_json' => $data['demo_strategy'] ?? null,
                'bantc_pre_json' => $data['bantc_pre'] ?? null,
                'pain_point_json' => $data['pain_point'] ?? null,
                'risk_analysis_json' => $data['risk_analysis'] ?? null,
                'readiness_score' => $data['readiness_score'] ?? null,
                'ai_provider' => 'orchestration',
                'ai_model' => 'default',
            ]
        );

        AuditService::log(
            'pre_meeting_brief_generated',
            'leads',
            $lead,
            null,
            ['brief_id' => $brief->id, 'score' => $brief->readiness_score],
            'success'
        );

        return $brief;
    }
}
