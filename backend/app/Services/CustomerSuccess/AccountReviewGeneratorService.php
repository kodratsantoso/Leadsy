<?php

namespace App\Services\CustomerSuccess;

use App\Models\Lead;
use App\Services\AI\AiOrchestrationService;
use Illuminate\Support\Facades\Log;

class AccountReviewGeneratorService
{
    public function __construct(
        private AiOrchestrationService $aiOrchestrator,
    ) {}

    /**
     * Generate an executive-ready Quarterly or Monthly Business Review for a client account.
     *
     * @param Lead $lead
     * @param string $reviewPeriod 'Quarterly' or 'Monthly'
     * @return array<string, mixed>
     */
    public function generateAccountReview(Lead $lead, string $reviewPeriod = 'Quarterly'): array
    {
        $lead->loadMissing([
            'latestHealthScore',
            'onboardingMilestones',
            'feedbacks',
            'renewalOpportunities',
            'salesOrders',
        ]);

        $company = $lead->company_name;
        $healthScore = $lead->latestHealthScore?->overall_score ?? 80;
        $healthStatus = $lead->latestHealthScore?->health_status ?? 'healthy';

        $completedMilestones = $lead->onboardingMilestones->where('status', 'completed')->pluck('title')->toArray();
        $pendingMilestones = $lead->onboardingMilestones->where('status', '!=', 'completed')->pluck('title')->toArray();

        $feedbackSummaries = $lead->feedbacks->map(fn ($fb) => "{$fb->survey_type} score {$fb->score} ({$fb->category}): {$fb->feedback_text}")->toArray();
        $renewals = $lead->renewalOpportunities->pluck('reasoning')->toArray();

        $contextPayload = [
            'lead_id' => $lead->id,
            'company_name' => $company,
            'review_period' => $reviewPeriod,
            'health_score' => $healthScore,
            'health_status' => $healthStatus,
            'completed_milestones' => $completedMilestones,
            'pending_milestones' => $pendingMilestones,
            'feedbacks' => $feedbackSummaries,
            'renewal_insights' => $renewals,
        ];

        $prompt = "You are a Customer Success executive writer. Given the account context below, produce a business review "
            ."as strict JSON with keys: executive_summary (string), value_delivered (string[]), milestone_recap (string[]), "
            ."issues_and_mitigations (string[]), forward_roadmap (string[]), expansion_recommendations (string). "
            ."Respond with JSON only, no markdown fences.\n\nAccount context:\n"
            .json_encode($contextPayload, JSON_PRETTY_PRINT);

        try {
            $aiResult = $this->aiOrchestrator->call('ai_account_review_generator', $prompt, ['lead_id' => $lead->id]);
            $parsed = (!empty($aiResult['success']) && !empty($aiResult['content']))
                ? $this->parseResponse($aiResult['content'])
                : [];

            if (!empty($parsed['executive_summary'])) {
                return array_merge(['period' => $reviewPeriod, 'company_name' => $company], $parsed);
            }
        } catch (\Throwable $e) {
            Log::warning("[AccountReviewGeneratorService] AI orchestration failed, falling back to rule-based template for {$company}: " . $e->getMessage());
        }

        return $this->buildFallbackReview($lead, $reviewPeriod, $healthScore, $healthStatus, $completedMilestones, $pendingMilestones);
    }

    private function parseResponse($response): array
    {
        if (is_array($response)) {
            return $response;
        }

        if (is_string($response)) {
            $clean = preg_replace('/^```(?:json)?\s*/i', '', trim($response));
            $clean = preg_replace('/\s*```$/', '', $clean);
            $decoded = json_decode($clean, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return [];
    }

    private function buildFallbackReview(
        Lead $lead,
        string $period,
        int $healthScore,
        string $healthStatus,
        array $completed,
        array $pending
    ): array {
        $company = $lead->company_name;

        return [
            'period' => $period,
            'company_name' => $company,
            'executive_summary' => "{$company} maintains a {$healthStatus} posture ({$healthScore}/100) throughout the {$period} review period. Key milestones have been systematically transitioned with established user engagement.",
            'value_delivered' => [
                "Streamlined operational workflow adoption across core business units.",
                "Provided predictable SLAs and dedicated account management touchpoints.",
                "Stabilized platform data synchronization and verified critical user access.",
            ],
            'milestone_recap' => !empty($completed)
                ? array_map(fn ($m) => "Achieved: {$m}", $completed)
                : ["Initial setup completed and core workflows validated in production."],
            'issues_and_mitigations' => !empty($pending)
                ? array_map(fn ($m) => "Pending action: {$m} scheduled for accelerated delivery.", $pending)
                : ["No critical blockers reported; ongoing proactive monitoring active."],
            'forward_roadmap' => [
                "Complete any remaining technical integration and specialized team workflows.",
                "Initiate advanced reporting and ROI review sessions with key stakeholders.",
                "Align upcoming renewal milestones and discuss operational scale requirements.",
            ],
            'expansion_recommendations' => "Recommend exploring additional Leadsy operational modules to further enhance regional team coordination and pipeline velocity.",
        ];
    }
}
