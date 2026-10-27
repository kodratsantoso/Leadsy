<?php

namespace App\Services\Revenue;

use App\Models\Lead;
use App\Models\LeadConversionPrediction;
use App\Models\LeadFunnelHistory;
use Carbon\Carbon;

class ConversionPredictionService
{
    /**
     * Standard stage velocity benchmarks (in days) before a deal is flagged as stalling.
     */
    private const STAGE_BENCHMARK_DAYS = [
        'discovery' => 14,
        'qualification' => 10,
        'demo' => 14,
        'solution' => 18,
        'proposal' => 14,
        'negotiation' => 21,
        'closing' => 10,
    ];

    public function predict(Lead $lead): array
    {
        $lead->loadMissing('contacts', 'activities', 'funnelStage', 'product', 'qualifications');

        $score = (float) ($lead->lead_score ?? 0);
        $hasContact = $lead->contacts->count() > 0;
        $hasActivity = $lead->activities->count() > 0;
        $qualified = in_array(strtolower($lead->qualification_status ?? ''), ['yes', 'eligible', 'qualified']);
        $stageSeq = $lead->funnelStage?->sequence ?? 0;
        $stageName = strtolower($lead->funnelStage?->name ?? 'discovery');

        // 1. Base Win Probability — weighted multi-signal model
        $prob = $score * 0.35;               // max 35 from score
        if ($hasContact) {
            $prob += 8;
        }
        if ($hasActivity) {
            $prob += 12;
        }
        if ($qualified) {
            $prob += 15;
        }
        $prob += min(15, $stageSeq * 2.5);   // up to 15 from funnel progression

        // 2. BANTC Boost / Penalty
        $hasBudget = !empty(trim($lead->budget ?? ''));
        $hasAuthority = !empty(trim($lead->authority ?? ''));
        $hasNeeds = !empty(trim($lead->needs ?? ''));
        $hasTimeline = !empty(trim($lead->timeline ?? ''));

        if ($hasBudget) $prob += 6;
        if ($hasAuthority) $prob += 8;
        if ($hasNeeds) $prob += 6;
        if ($hasTimeline) $prob += 5;

        // 3. Funnel Velocity & Stagnation Analysis
        $lastStageChange = LeadFunnelHistory::where('lead_id', $lead->id)
            ->latest('created_at')
            ->value('created_at') ?? $lead->created_at ?? now();

        $daysInStage = (int) Carbon::parse($lastStageChange)->diffInDays(now());
        $benchmarkDays = self::STAGE_BENCHMARK_DAYS[$stageName] ?? 14;

        $lastActivityDate = $lead->activities()->latest('created_at')->value('created_at') ?? $lead->created_at ?? now();
        $daysSinceActivity = (int) Carbon::parse($lastActivityDate)->diffInDays(now());

        $slippageReasons = [];
        $slippagePenalty = 0;

        // Inactivity penalty
        if ($daysSinceActivity > 14) {
            $slippagePenalty += 15;
            $slippageReasons[] = "No customer engagement for {$daysSinceActivity} days.";
        } elseif ($daysSinceActivity > 7) {
            $slippagePenalty += 5;
            $slippageReasons[] = "Inactive for over a week without recorded interactions.";
        }

        // Stalled in stage penalty
        if ($daysInStage > ($benchmarkDays * 1.8)) {
            $slippagePenalty += 20;
            $slippageReasons[] = "Stalled in current stage ({$lead->funnelStage?->name}) for {$daysInStage} days (benchmark: {$benchmarkDays}d).";
        } elseif ($daysInStage > $benchmarkDays) {
            $slippagePenalty += 10;
            $slippageReasons[] = "Exceeded typical stage cycle time ({$daysInStage} days vs {$benchmarkDays}d).";
        }

        // Missing Critical Decision Maker in late stage
        if ($stageSeq >= 4 && !$hasAuthority) {
            $slippagePenalty += 15;
            $slippageReasons[] = "Advanced stage without verified Decision Maker / Authority.";
        }

        $netProb = max(5, min(95, $prob - $slippagePenalty));
        $probability = round($netProb, 1);

        // 4. Slippage Risk Level Assessment
        $slippageRisk = match (true) {
            $slippagePenalty >= 30 || ($daysSinceActivity > 21 && $stageSeq >= 3) => 'critical',
            $slippagePenalty >= 18 || $daysSinceActivity > 14 => 'high',
            $slippagePenalty >= 8 || $daysInStage > $benchmarkDays => 'medium',
            default => 'low',
        };

        $isSlipping = in_array($slippageRisk, ['high', 'critical']);

        // 5. Tactical Recovery Action Recommendation
        $recoveryAction = match ($slippageRisk) {
            'critical' => 'Initiate executive re-engagement or conduct deal rescue review with Sales Leadership.',
            'high' => $daysSinceActivity > 14 
                ? 'Send high-value insight re-engagement email or call primary champion immediately.'
                : 'Accelerate decision-maker mapping and schedule solution validation workshop.',
            'medium' => 'Follow up on open action items and confirm timeline for next milestone.',
            default => 'Deal is progressing within healthy velocity benchmarks. Maintain current cadence.',
        };

        $effort = match (true) {
            $probability >= 70 => 'low',
            $probability >= 50 => 'medium',
            $probability >= 30 => 'high',
            default => 'very_high',
        };

        $dealSize = $this->estimateDealSize($lead);
        $confidence = $this->calcConfidence($lead);

        $factors = [
            'score_contribution' => round($score * 0.35, 1),
            'contact_boost' => $hasContact ? 8 : 0,
            'activity_boost' => $hasActivity ? 12 : 0,
            'qualification_boost' => $qualified ? 15 : 0,
            'funnel_stage_boost' => round(min(15, $stageSeq * 2.5), 1),
            'bantc_signals' => [
                'has_budget' => $hasBudget,
                'has_authority' => $hasAuthority,
                'has_needs' => $hasNeeds,
                'has_timeline' => $hasTimeline,
            ],
            'velocity_telemetry' => [
                'days_in_stage' => $daysInStage,
                'benchmark_days' => $benchmarkDays,
                'days_since_activity' => $daysSinceActivity,
            ],
            'slippage_assessment' => [
                'risk' => $slippageRisk,
                'is_slipping' => $isSlipping,
                'penalty_applied' => $slippagePenalty,
                'reasons' => $slippageReasons,
                'recovery_action' => $recoveryAction,
            ],
        ];

        $prediction = LeadConversionPrediction::create([
            'lead_id' => $lead->id,
            'probability_to_close' => $probability,
            'expected_deal_size' => $dealSize,
            'estimated_sales_effort' => $effort,
            'confidence_score' => $confidence,
            'prediction_factors' => $factors,
            'model_version' => 'v2.0-predictive-slippage',
        ]);

        return array_merge($prediction->toArray(), [
            'slippage_risk' => $slippageRisk,
            'is_slipping' => $isSlipping,
            'slippage_reasons' => $slippageReasons,
            'recovery_action' => $recoveryAction,
            'days_in_stage' => $daysInStage,
            'days_since_activity' => $daysSinceActivity,
        ]);
    }

    private function estimateDealSize(Lead $lead): ?float
    {
        if ($lead->estimated_closing_amount && (float)$lead->estimated_closing_amount > 0) {
            return (float)$lead->estimated_closing_amount;
        }

        $base = match (strtolower($lead->company_size_estimate ?? '')) {
            'micro' => 5_000,
            'small' => 25_000,
            'medium' => 100_000,
            'enterprise' => 500_000,
            default => 20_000,
        };

        // Boost if product is linked
        $multiplier = $lead->product_id ? 1.2 : 1.0;

        return round($base * $multiplier, 2);
    }

    private function calcConfidence(Lead $lead): float
    {
        $points = 0;
        if ($lead->lead_score) {
            $points++;
        }
        if ($lead->industry_id) {
            $points++;
        }
        if ($lead->contacts->count() > 0) {
            $points++;
        }
        if ($lead->activities->count() > 0) {
            $points++;
        }
        if ($lead->qualification_status !== 'new') {
            $points++;
        }
        if ($lead->funnel_stage_id) {
            $points++;
        }

        return round($points / 6 * 100, 1);
    }
}
