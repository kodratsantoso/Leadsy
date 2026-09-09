<?php

namespace App\Services\CustomerSuccess;

use App\Models\CustomerHealthScore;
use App\Models\Lead;
use App\Models\LeadAiEvaluation;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class CustomerHealthScoreService
{
    /**
     * Compute customer health score for a lead/client.
     *
     * @param Lead $lead
     * @return CustomerHealthScore
     */
    public function calculateHealthScore(Lead $lead): CustomerHealthScore
    {
        $lead->loadMissing(['activities' => fn ($q) => $q->latest('activity_date'), 'onboardingMilestones']);

        // 1. Activity Recency & Frequency Score (30% weight)
        $activityResult = $this->calculateActivityScore($lead);

        // 2. Onboarding Progress Score (25% weight)
        $onboardingResult = $this->calculateOnboardingScore($lead);

        // 3. AI Interaction Sentiment & Objections Score (25% weight)
        $sentimentResult = $this->calculateSentimentScore($lead);

        // 4. Relationship & Retention Stability (20% weight)
        $relationshipResult = $this->calculateRelationshipScore($lead);

        // Weighted Overall Calculation (0 - 100)
        $overall = round(
            ($activityResult['score'] * 0.30) +
            ($onboardingResult['score'] * 0.25) +
            ($sentimentResult['score'] * 0.25) +
            ($relationshipResult['score'] * 0.20)
        );

        $healthStatus = $this->determineHealthStatus($overall);

        // Determine trend relative to previous score
        $previousScore = CustomerHealthScore::where('lead_id', $lead->id)
            ->latest('calculated_at')
            ->first();

        $trend = 'stable';
        if ($previousScore) {
            $diff = $overall - $previousScore->overall_score;
            if ($diff >= 5) {
                $trend = 'improving';
            } elseif ($diff <= -5) {
                $trend = 'declining';
            }
        }

        $summary = $this->generateSummary($overall, $healthStatus, $lead, [
            'activity' => $activityResult,
            'onboarding' => $onboardingResult,
            'sentiment' => $sentimentResult,
            'relationship' => $relationshipResult,
        ]);

        return CustomerHealthScore::create([
            'lead_id' => $lead->id,
            'overall_score' => $overall,
            'health_status' => $healthStatus,
            'activity_score' => $activityResult['score'],
            'onboarding_score' => $onboardingResult['score'],
            'sentiment_score' => $sentimentResult['score'],
            'relationship_score' => $relationshipResult['score'],
            'factors_json' => [
                'activity_factors' => $activityResult,
                'onboarding_factors' => $onboardingResult,
                'sentiment_factors' => $sentimentResult,
                'relationship_factors' => $relationshipResult,
                'penalties' => array_merge(
                    $activityResult['penalties'] ?? [],
                    $onboardingResult['penalties'] ?? [],
                    $sentimentResult['penalties'] ?? []
                ),
            ],
            'summary' => $summary,
            'trend' => $trend,
            'calculated_at' => now(),
        ]);
    }

    /**
     * Compute health scores across all won/active customers.
     *
     * @return Collection<int, CustomerHealthScore>
     */
    public function calculateAllActiveCustomers(): Collection
    {
        $leads = Lead::whereHas('funnelStage', function ($q) {
            $q->where('name', 'like', '%won%');
        })
        ->orWhereHas('salesOrders', function ($q) {
            $q->whereIn('order_status', ['confirmed', 'delivered', 'active']);
        })
        ->get();

        $scores = collect();
        foreach ($leads as $lead) {
            $scores->push($this->calculateHealthScore($lead));
        }

        return $scores;
    }

    /**
     * Score based on recency and frequency of touchpoints (0-100).
     */
    private function calculateActivityScore(Lead $lead): array
    {
        $latestActivity = $lead->activities->first();
        $daysSinceActivity = $latestActivity && $latestActivity->activity_date
            ? (int) Carbon::parse($latestActivity->activity_date)->diffInDays(now())
            : 45;

        $score = 100;
        $penalties = [];

        if ($daysSinceActivity > 30) {
            $score = 30;
            $penalties[] = "No touchpoints logged in {$daysSinceActivity} days.";
        } elseif ($daysSinceActivity > 14) {
            $score = 65;
            $penalties[] = "Moderate inactivity ({$daysSinceActivity} days without contact).";
        } elseif ($daysSinceActivity > 7) {
            $score = 85;
        }

        return [
            'score' => max(0, min(100, $score)),
            'days_since_activity' => $daysSinceActivity,
            'recent_activity_count' => $lead->activities->count(),
            'penalties' => $penalties,
        ];
    }

    /**
     * Score based on onboarding milestones progress (0-100).
     */
    private function calculateOnboardingScore(Lead $lead): array
    {
        $milestones = $lead->onboardingMilestones;

        if ($milestones->isEmpty()) {
            return [
                'score' => 80,
                'total_milestones' => 0,
                'completed_milestones' => 0,
                'delayed_milestones' => 0,
                'note' => 'No active onboarding workflow configured.',
            ];
        }

        $total = $milestones->count();
        $completed = $milestones->where('status', 'completed')->count();
        $delayed = $milestones->filter(fn ($m) => $m->status === 'delayed' || ($m->target_date && $m->target_date < now() && $m->status !== 'completed'))->count();

        $baseRatio = ($completed / $total) * 100;
        $score = round($baseRatio - ($delayed * 15));

        $penalties = [];
        if ($delayed > 0) {
            $penalties[] = "{$delayed} onboarding milestone(s) behind schedule.";
        }

        return [
            'score' => max(10, min(100, (int) $score)),
            'total_milestones' => $total,
            'completed_milestones' => $completed,
            'delayed_milestones' => $delayed,
            'penalties' => $penalties,
        ];
    }

    /**
     * Score based on AI evaluation sentiment, objections, and buying signals (0-100).
     */
    private function calculateSentimentScore(Lead $lead): array
    {
        $latestEval = LeadAiEvaluation::where('lead_id', $lead->id)
            ->latest('evaluated_at')
            ->first();

        if (!$latestEval) {
            return [
                'score' => 75,
                'sentiment' => 'neutral',
                'objections_count' => 0,
                'note' => 'No recent AI evaluation available.',
            ];
        }

        $sentiment = strtolower($latestEval->sentiment ?? 'neutral');
        $objections = $latestEval->objections_detected ?? [];
        $buyingSignals = $latestEval->buying_signals ?? [];

        $score = match ($sentiment) {
            'very positive' => 95,
            'positive' => 85,
            'neutral' => 70,
            'negative' => 40,
            'very negative' => 20,
            default => 70,
        };

        // Penalize for open objections
        $objectionPenalty = count($objections) * 8;
        $signalBonus = min(15, count($buyingSignals) * 5);
        $finalScore = max(0, min(100, $score - $objectionPenalty + $signalBonus));

        $penalties = [];
        if (count($objections) > 0) {
            $penalties[] = count($objections) . ' unresolved objections/concerns detected.';
        }

        return [
            'score' => $finalScore,
            'sentiment' => $sentiment,
            'objections_count' => count($objections),
            'buying_signals_count' => count($buyingSignals),
            'penalties' => $penalties,
        ];
    }

    /**
     * Score based on account stability, authority, and duration (0-100).
     */
    private function calculateRelationshipScore(Lead $lead): array
    {
        $score = 80;

        // Bonus for having identified executive sponsor / champion
        if (!empty($lead->authority)) {
            $score += 10;
        }

        // Penalty if unassigned
        if (!$lead->owner_id && !$lead->csm_owner_id) {
            $score -= 20;
        }

        return [
            'score' => max(0, min(100, $score)),
            'has_csm_assigned' => !empty($lead->csm_owner_id),
            'has_executive_champion' => !empty($lead->authority),
        ];
    }

    /**
     * Categorize status based on overall numeric score.
     */
    private function determineHealthStatus(int $score): string
    {
        return match (true) {
            $score >= 80 => 'thriving',
            $score >= 60 => 'healthy',
            $score >= 40 => 'at_risk',
            default => 'critical',
        };
    }

    /**
     * Generate clear executive summary for CSM dashboard.
     */
    private function generateSummary(int $overall, string $status, Lead $lead, array $breakdown): string
    {
        $company = $lead->company_name;

        if ($status === 'thriving') {
            return "{$company} is in thriving health ({$overall}/100) with active engagement and stable milestone momentum.";
        }

        if ($status === 'healthy') {
            return "{$company} is healthy ({$overall}/100). Regular touchpoints maintained with steady account progress.";
        }

        if ($status === 'at_risk') {
            $reasons = implode(', ', $breakdown['activity']['penalties'] ?? ['inactivity detected']);
            return "{$company} is at risk ({$overall}/100). Primary concerns: {$reasons}. Proactive CSM intervention recommended.";
        }

        return "CRITICAL ALERT: {$company} health score dropped to {$overall}/100. Severe inactivity, delayed onboarding, or escalation signals detected. Immediate executive outreach required.";
    }
}
