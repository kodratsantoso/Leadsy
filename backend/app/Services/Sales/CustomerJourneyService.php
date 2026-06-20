<?php

namespace App\Services\Sales;

use App\Models\Lead;
use App\Services\AI\AiOrchestrationService;
use App\Services\AuditService;

class CustomerJourneyService
{
    public function __construct(
        private AiOrchestrationService $ai
    ) {}

    public function compileJourney(Lead $lead): array
    {
        $lead->loadMissing([
            'industry',
            'owner',
            'activities' => fn($q) => $q->oldest(),
            'meetings' => fn($q) => $q->oldest(),
            'transcripts.evaluations' => fn($q) => $q->latest(),
            'preMeetingBrief',
            'funnelHistory' => fn($q) => $q->oldest()->with('toStage'),
            'productMatches' => fn($q) => $q->with('product')->orderBy('match_score', 'desc'),
        ]);

        $timeline = collect();

        // 1. Activities
        foreach ($lead->activities as $activity) {
            $timeline->push([
                'type' => 'activity',
                'title' => $activity->activity_type,
                'description' => $activity->description,
                'outcome' => $activity->outcome,
                'date' => $activity->activity_date ?? $activity->created_at,
            ]);
        }

        // 2. Meetings
        foreach ($lead->meetings as $meeting) {
            $timeline->push([
                'type' => 'meeting',
                'title' => 'Meeting: ' . $meeting->subject,
                'description' => $meeting->description,
                'outcome' => $meeting->meeting_status,
                'date' => $meeting->start_time ?? $meeting->created_at,
            ]);
        }

        // 3. Stage Changes
        foreach ($lead->funnelHistory as $history) {
            $timeline->push([
                'type' => 'stage_change',
                'title' => 'Stage moved to ' . ($history->toStage?->name ?? 'Unknown'),
                'description' => $history->notes ?? '',
                'outcome' => '',
                'date' => $history->created_at,
            ]);
        }

        // Sort timeline
        $timeline = $timeline->sortBy('date')->values()->toArray();

        // Compile payload
        return [
            'profile_snapshot' => [
                'company_name' => $lead->company_name,
                'industry' => $lead->industry?->name,
                'size' => $lead->company_size_estimate,
                'location' => $lead->address,
                'owner' => $lead->owner?->name,
            ],
            'timeline' => $timeline,
            'pre_meeting_insights' => $lead->preMeetingBrief ? [
                'objective_hypothesis' => $lead->preMeetingBrief->objective_hypothesis_json,
                'expected_needs' => $lead->preMeetingBrief->objective_hypothesis_json['expected_needs'] ?? null,
                'pain_points' => $lead->preMeetingBrief->pain_point_json,
                'discovery_questions' => $lead->preMeetingBrief->questions_json,
            ] : null,
            'meeting_intelligence' => $lead->transcripts->map(fn($t) => [
                'title' => $t->title,
                'evaluations' => $t->evaluations->map(fn($e) => [
                    'summary' => $e->summary,
                    'bantc_extracted' => $e->bantc_extracted,
                    'next_best_action' => $e->next_best_action,
                ])
            ])->toArray(),
            'post_meeting_analysis' => [
                'qualification_status' => $lead->qualification_status,
                'risk_analysis' => $lead->preMeetingBrief?->risk_analysis_json,
            ],
            'product_fit_analysis' => $lead->productMatches->map(fn($m) => [
                'product' => $m->product?->name,
                'match_score' => $m->match_score,
                'icp_match' => $m->icp_match,
                'feature_alignment' => $m->ai_analysis['matched_signals'] ?? [],
            ])->toArray(),
            'revenue_journey' => [
                'estimated_value' => $lead->estimated_closing_amount,
                'realized_value' => $lead->realized_closing_amount,
            ],
            'final_customer_story' => $lead->customer_story,
        ];
    }

    public function generateCustomerStory(Lead $lead): string
    {
        $journeyData = $this->compileJourney($lead);

        $prompt = "Customer Journey Data:\n" . json_encode($journeyData, JSON_PRETTY_PRINT);

        $result = $this->ai->call('customer_journey_story', $prompt);
        $data = json_decode($result['content'] ?? '{}', true);

        $story = $data['story'] ?? 'Failed to generate story.';

        $lead->update([
            'customer_story' => $story
        ]);

        AuditService::log(
            'customer_story_generated',
            'leads',
            $lead,
            null,
            ['story_length' => strlen($story)],
            'success'
        );

        return $story;
    }
}
