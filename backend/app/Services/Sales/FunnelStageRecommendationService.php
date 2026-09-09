<?php

namespace App\Services\Sales;

use App\Models\FunnelStage;
use App\Models\Lead;
use App\Models\LeadAiEvaluation;
use App\Models\LeadFunnelHistory;
use Illuminate\Support\Facades\DB;

class FunnelStageRecommendationService
{
    /**
     * Minimum lead score thresholds for recommended stages.
     */
    public const STAGE_SCORE_THRESHOLDS = [
        'discovery' => 0,
        'qualification' => 20,
        'demo' => 40,
        'solution' => 55,
        'proposal' => 65,
        'negotiation' => 75,
        'closing' => 85,
    ];

    /**
     * Evaluate stage readiness and recommend the next stage transition.
     *
     * @param Lead $lead
     * @return array<string, mixed>
     */
    public function recommendStage(Lead $lead): array
    {
        $currentStage = $lead->funnelStage;
        $allStages = FunnelStage::where('is_active', true)->orderBy('sequence')->get();

        if ($allStages->isEmpty()) {
            return [
                'success' => false,
                'message' => 'No active funnel stages configured in the system.',
            ];
        }

        // Default to first stage if not in any stage yet
        $currentStage = $currentStage ?? $allStages->first();
        $currentSequence = $currentStage ? $currentStage->sequence : 0;
        $currentIndex = $allStages->search(fn ($s) => $s->id === $currentStage?->id);

        $latestEvaluation = LeadAiEvaluation::where('lead_id', $lead->id)
            ->latest('evaluated_at')
            ->first();

        $bantc = $this->evaluateBantcCompleteness($lead, $latestEvaluation);
        $score = (int) ($lead->lead_score ?? 0);
        $sentiment = strtolower($latestEvaluation?->sentiment ?? 'neutral');
        $objections = $latestEvaluation?->objections_detected ?? [];
        $buyingSignals = $latestEvaluation?->buying_signals ?? [];

        // Check for Won / Lost signals
        $wonStage = $allStages->first(fn ($s) => str_contains(strtolower($s->name), 'won'));
        $lostStage = $allStages->first(fn ($s) => str_contains(strtolower($s->name), 'lost'));

        // Loss condition: Disqualified or overwhelming negative sentiment with severe objections
        if ($lead->qualification_status === 'disqualified' || $lead->qualification_status === 'unqualified') {
            return [
                'current_stage' => ['id' => $currentStage?->id, 'name' => $currentStage?->name],
                'recommended_stage' => $lostStage ? ['id' => $lostStage->id, 'name' => $lostStage->name] : null,
                'action' => 'close_lost',
                'confidence_score' => 90,
                'reasoning' => 'Lead has been marked unqualified or disqualified by sales / AI evaluation.',
                'readiness_checklist' => $bantc['checklist'],
                'recommended_action' => 'Archive lead to Lost Funnel and document disqualification reasons.',
            ];
        }

        // Next logical stage in sequence
        $nextStage = $allStages->first(fn ($s) => $s->sequence > $currentSequence && !str_contains(strtolower($s->name), 'lost') && !str_contains(strtolower($s->name), 'won'));

        // If at the end of open pipeline and sentiment is strongly positive with high score
        if (!$nextStage && $wonStage && $score >= 80 && $sentiment === 'positive') {
            return [
                'current_stage' => ['id' => $currentStage?->id, 'name' => $currentStage?->name],
                'recommended_stage' => ['id' => $wonStage->id, 'name' => $wonStage->name],
                'action' => 'close_won',
                'confidence_score' => 90,
                'reasoning' => 'All pipeline stages completed, high lead score with confirmed commercial agreement.',
                'readiness_checklist' => $bantc['checklist'],
                'recommended_action' => 'Issue invoice / sales order confirmation and transition to CSM onboarding.',
            ];
        }

        // Readiness calculation for next stage
        $targetStage = $nextStage ?? $currentStage;
        $targetName = strtolower($targetStage->name);
        $stageRequiredScore = $this->resolveRequiredScore($targetName);

        $hasBudget = !empty($bantc['budget']);
        $hasAuthority = !empty($bantc['authority']);
        $hasNeeds = !empty($bantc['needs']);
        $hasTimeline = !empty($bantc['timeline']);

        $missingItems = [];
        if (!$hasNeeds) $missingItems[] = 'Customer Pain Points & Needs Validation';
        if (!$hasAuthority) $missingItems[] = 'Decision Maker / Authority Identification';
        if (!$hasBudget && ($stageRequiredScore >= 55)) $missingItems[] = 'Budget Validation';
        if (!$hasTimeline && ($stageRequiredScore >= 65)) $missingItems[] = 'Procurement Timeline Confirmation';

        // Check if ready to advance
        $scoreReady = $score >= $stageRequiredScore;
        $prerequisitesMet = empty($missingItems);
        $positiveMomentum = in_array($sentiment, ['positive', 'very positive']) || count($buyingSignals) > 0;

        if ($nextStage && $scoreReady && $prerequisitesMet) {
            $confidence = min(95, 60 + ($positiveMomentum ? 20 : 0) + (count($buyingSignals) * 5));

            return [
                'current_stage' => ['id' => $currentStage?->id, 'name' => $currentStage?->name],
                'recommended_stage' => ['id' => $nextStage->id, 'name' => $nextStage->name],
                'action' => 'advance',
                'confidence_score' => $confidence,
                'reasoning' => "Prerequisites for '{$nextStage->name}' satisfied. Lead score ({$score}/100) exceeds threshold ({$stageRequiredScore}) with validated qualification signals.",
                'readiness_checklist' => $bantc['checklist'],
                'recommended_action' => "Promote deal to '{$nextStage->name}' and schedule next milestone meeting.",
            ];
        }

        // Hold in current stage with clear blockers
        $reasoning = "Not yet ready to advance to '" . ($nextStage?->name ?? 'Next Stage') . "'. ";
        if (!$scoreReady) {
            $reasoning .= "Lead score ({$score}/100) is below the required threshold ({$stageRequiredScore}). ";
        }
        if (!empty($missingItems)) {
            $reasoning .= "Missing critical qualification items: " . implode(', ', $missingItems) . ".";
        }

        return [
            'current_stage' => ['id' => $currentStage?->id, 'name' => $currentStage?->name],
            'recommended_stage' => ['id' => $currentStage?->id, 'name' => $currentStage?->name],
            'action' => 'hold',
            'confidence_score' => 80,
            'reasoning' => trim($reasoning),
            'readiness_checklist' => $bantc['checklist'],
            'missing_prerequisites' => $missingItems,
            'recommended_action' => !empty($missingItems)
                ? "Collect missing information: " . $missingItems[0] . " during next interaction."
                : "Execute targeted discovery to elevate lead score.",
        ];
    }

    /**
     * Apply recommended stage transition to lead and record in history.
     */
    public function applyRecommendation(Lead $lead, ?int $targetStageId = null, ?int $userId = null): array
    {
        $recommendation = $this->recommendStage($lead);

        $stageId = $targetStageId ?? ($recommendation['recommended_stage']['id'] ?? null);

        if (!$stageId) {
            return [
                'success' => false,
                'message' => 'Cannot apply transition: no valid target stage identified.',
            ];
        }

        $oldStageId = $lead->funnel_stage_id;

        if ($oldStageId == $stageId) {
            return [
                'success' => true,
                'message' => 'Lead is already in the recommended stage.',
                'stage_id' => $stageId,
            ];
        }

        DB::transaction(function () use ($lead, $oldStageId, $stageId, $userId, $recommendation) {
            $lead->update(['funnel_stage_id' => $stageId]);

            LeadFunnelHistory::create([
                'lead_id' => $lead->id,
                'from_stage_id' => $oldStageId,
                'to_stage_id' => $stageId,
                'moved_by' => $userId,
                'notes' => 'AI Stage Transition: ' . ($recommendation['reasoning'] ?? 'Automated recommendation applied'),
            ]);
        });

        return [
            'success' => true,
            'message' => 'Funnel stage transition successfully applied.',
            'from_stage_id' => $oldStageId,
            'to_stage_id' => $stageId,
            'recommendation' => $recommendation,
        ];
    }

    /**
     * Resolve required score for stage name keyword.
     */
    private function resolveRequiredScore(string $stageName): int
    {
        $normalized = strtolower($stageName);

        foreach (self::STAGE_SCORE_THRESHOLDS as $keyword => $score) {
            if (str_contains($normalized, $keyword)) {
                return $score;
            }
        }

        return 40;
    }

    /**
     * Compile BANT-C completeness from Lead model attributes and latest AI evaluation.
     */
    private function evaluateBantcCompleteness(Lead $lead, ?LeadAiEvaluation $evaluation): array
    {
        $aiBantc = $evaluation?->bantc_extracted ?? [];

        $budget = $lead->budget ?: ($aiBantc['budget'] ?? null);
        $authority = $lead->authority ?: ($aiBantc['authority'] ?? null);
        $needs = $lead->needs ?: ($aiBantc['needs'] ?? null);
        $timeline = $lead->timeline ?: ($aiBantc['timeline'] ?? null);
        $competitor = $lead->competitor ?: ($aiBantc['competitor'] ?? null);

        return [
            'budget' => $budget,
            'authority' => $authority,
            'needs' => $needs,
            'timeline' => $timeline,
            'competitor' => $competitor,
            'checklist' => [
                'budget_validated' => !empty($budget) && !in_array(strtolower($budget), ['unknown', 'none', 'tbd']),
                'authority_identified' => !empty($authority) && !in_array(strtolower($authority), ['unknown', 'none', 'tbd']),
                'needs_validated' => !empty($needs) && !in_array(strtolower($needs), ['unknown', 'none', 'tbd']),
                'timeline_confirmed' => !empty($timeline) && !in_array(strtolower($timeline), ['unknown', 'none', 'tbd']),
                'competitor_tracked' => !empty($competitor) && !in_array(strtolower($competitor), ['none', 'no competitor']),
            ],
        ];
    }
}
