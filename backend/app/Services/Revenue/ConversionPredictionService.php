<?php

namespace App\Services\Revenue;

use App\Models\Lead;
use App\Models\LeadConversionPrediction;

class ConversionPredictionService
{
    public function predict(Lead $lead): array
    {
        $lead->loadMissing('contacts', 'activities', 'funnelStage', 'product', 'qualifications');

        $score      = (float)($lead->lead_score ?? 0);
        $hasContact = $lead->contacts->count() > 0;
        $hasActivity = $lead->activities->count() > 0;
        $qualified  = $lead->qualification_status === 'yes';
        $stageSeq   = $lead->funnelStage?->sequence ?? 0;

        // Probability — weighted rule-based model
        $prob = $score * 0.45;               // max 45 from score
        if ($hasContact)  $prob += 10;
        if ($hasActivity) $prob += 15;
        if ($qualified)   $prob += 20;
        $prob += min(10, $stageSeq * 1.5);   // up to 10 from funnel stage
        $probability = round(min(95, max(1, $prob)), 1);

        $effort = match(true) {
            $probability >= 70 => 'low',
            $probability >= 50 => 'medium',
            $probability >= 30 => 'high',
            default            => 'very_high',
        };

        $dealSize   = $this->estimateDealSize($lead);
        $confidence = $this->calcConfidence($lead);

        $factors = [
            'score_contribution'   => round($score * 0.45, 1),
            'contact_boost'        => $hasContact  ? 10 : 0,
            'activity_boost'       => $hasActivity ? 15 : 0,
            'qualification_boost'  => $qualified   ? 20 : 0,
            'funnel_stage_boost'   => round(min(10, $stageSeq * 1.5), 1),
        ];

        $prediction = LeadConversionPrediction::create([
            'lead_id'               => $lead->id,
            'probability_to_close'  => $probability,
            'expected_deal_size'    => $dealSize,
            'estimated_sales_effort'=> $effort,
            'confidence_score'      => $confidence,
            'prediction_factors'    => $factors,
            'model_version'         => 'v1.0-rule-based',
        ]);

        return $prediction->toArray();
    }

    private function estimateDealSize(Lead $lead): ?float
    {
        $base = match (strtolower($lead->company_size_estimate ?? '')) {
            'micro'      => 5_000,
            'small'      => 25_000,
            'medium'     => 100_000,
            'enterprise' => 500_000,
            default      => 20_000,
        };

        // Boost if product is linked — rough tier proxy
        $multiplier = $lead->product_id ? 1.2 : 1.0;
        return round($base * $multiplier, 2);
    }

    private function calcConfidence(Lead $lead): float
    {
        $points = 0;
        if ($lead->lead_score)                    $points++;
        if ($lead->industry_id)                   $points++;
        if ($lead->contacts->count() > 0)         $points++;
        if ($lead->activities->count() > 0)       $points++;
        if ($lead->qualification_status !== 'new') $points++;
        if ($lead->funnel_stage_id)               $points++;
        return round($points / 6 * 100, 1);
    }
}
