<?php

namespace App\Services\Analytics;

use App\Models\Lead;
use App\Models\ConfidentialityAssessment;
use Carbon\Carbon;

class ConfidentialityScoringService
{
    public function calculateForLead(Lead $lead): ConfidentialityAssessment
    {
        $scoreBreakdown = [];
        $dataSources = [];
        $missingData = [];
        $reasons = [];
        $recommendations = [];
        $totalScore = 0;

        // --- 1. Data Sensitivity (Max ~30) ---
        $dataSensitivityScore = 0;
        
        // Transcripts
        $hasTranscripts = $lead->transcripts()->exists();
        if ($hasTranscripts) {
            $dataSensitivityScore += 15;
            $scoreBreakdown[] = $this->makeBreakdown('Transcripts', 'Present', 15, 'High', ['lead_meetings']);
            $reasons[] = 'Contains sensitive meeting transcripts';
            $dataSources[] = 'lead_meetings';
        }

        // BANTC
        $hasBantc = $lead->bantcQuestionGuide()->exists();
        if ($hasBantc) {
            $dataSensitivityScore += 10;
            $scoreBreakdown[] = $this->makeBreakdown('BANTC Data', 'Present', 10, 'High', ['lead_bantc_question_guides']);
            $dataSources[] = 'lead_bantc_question_guides';
        } else {
            $missingData[] = 'BANTC qualification data';
        }

        // Notes / Activities
        $hasNotes = $lead->activities()->exists();
        if ($hasNotes) {
            $dataSensitivityScore += 5;
            $scoreBreakdown[] = $this->makeBreakdown('Internal Activities/Notes', 'Present', 5, 'Medium', ['lead_activities']);
            $dataSources[] = 'lead_activities';
        }

        $totalScore += $dataSensitivityScore;

        // --- 2. Revenue Sensitivity (Max ~30) ---
        $revenueScore = 0;
        $totalRevenue = (float) $lead->estimated_closing_amount;
        $salesOrdersTotal = $lead->salesOrders()->where('order_status', 'confirmed')->sum('total_amount');
        
        $effectiveRevenue = max($totalRevenue, $salesOrdersTotal);
        
        if ($effectiveRevenue > 100000) {
            $revenueScore = 30;
            $reasons[] = 'High value enterprise deal (>$100k)';
        } elseif ($effectiveRevenue > 25000) {
            $revenueScore = 20;
            $reasons[] = 'Significant commercial value (>$25k)';
        } elseif ($effectiveRevenue > 0) {
            $revenueScore = 10;
        } else {
            $missingData[] = 'Estimated revenue / Sales orders';
        }
        
        if ($revenueScore > 0) {
            $totalScore += $revenueScore;
            $scoreBreakdown[] = $this->makeBreakdown('Revenue Potential', "$".number_format($effectiveRevenue), $revenueScore, 'High', ['leads.estimated_closing_amount', 'lead_sales_orders']);
            $dataSources[] = 'leads';
            $dataSources[] = 'lead_sales_orders';
        }

        // --- 3. Deal Stage Sensitivity (Max ~20) ---
        $stageScore = 0;
        $stage = $lead->funnelStage;
        if ($stage) {
            $stageName = strtolower($stage->name);
            if (in_array($stageName, ['won', 'closed won'])) {
                $stageScore = 20;
                $reasons[] = 'Closed deal with contracted terms';
            } elseif (in_array($stageName, ['proposal', 'negotiation', 'quotation'])) {
                $stageScore = 15;
                $reasons[] = 'Active commercial negotiations';
            } elseif (in_array($stageName, ['lost', 'closed lost'])) {
                $stageScore = 5;
            } else {
                $stageScore = 5;
            }
            $scoreBreakdown[] = $this->makeBreakdown('Funnel Stage', $stage->name, $stageScore, 'High', ['funnel_stages']);
            $dataSources[] = 'funnel_stages';
        } else {
            $missingData[] = 'Funnel Stage';
        }
        $totalScore += $stageScore;

        // --- 4. Access Exposure & Stakeholders (Max ~20) ---
        $accessScore = 0;
        $roleAssignments = $lead->roleAssignments()->count();
        
        if ($roleAssignments > 3) {
            $accessScore = 20;
            $reasons[] = 'Broad internal access exposure (>3 assigned roles)';
            $recommendations[] = 'Review role assignments to enforce least-privilege access.';
        } elseif ($roleAssignments > 1) {
            $accessScore = 10;
        }

        if (!$lead->owner_id) {
            $missingData[] = 'Primary Owner';
            $recommendations[] = 'Assign a primary owner to establish accountability.';
        }

        if ($accessScore > 0) {
            $totalScore += $accessScore;
            $scoreBreakdown[] = $this->makeBreakdown('Access Exposure', "$roleAssignments roles assigned", $accessScore, 'High', ['lead_role_assignments']);
            $dataSources[] = 'lead_role_assignments';
        }

        // Map Level
        $totalScore = min(100, max(0, $totalScore));
        $level = 'low';
        if ($totalScore > 80) $level = 'restricted';
        elseif ($totalScore > 60) $level = 'high';
        elseif ($totalScore > 30) $level = 'medium';

        if ($level === 'restricted' || $level === 'high') {
            $recommendations[] = 'Requires direct manager review due to high sensitivity score.';
        }

        $assessment = ConfidentialityAssessment::updateOrCreate(
            [
                'entity_type' => Lead::class,
                'entity_id'   => $lead->id,
            ],
            [
                'confidentiality_level' => $level,
                'score' => $totalScore,
                'assessment_method' => 'rule_based',
                'score_breakdown_json' => $scoreBreakdown,
                'data_sources_json' => array_values(array_unique($dataSources)),
                'missing_data_json' => $missingData,
                'recommendation_json' => $recommendations,
                'confidence_score' => count($missingData) > 2 ? 'medium' : 'high',
                'status' => 'draft',
                'assessed_at' => now(),
            ]
        );

        // Also record AI highlights if any exist for this lead to recommend action
        $highlights = \DB::table('ai_attention_highlights')->where('entity_id', $lead->id)->where('entity_type', Lead::class)->count();
        if ($highlights > 0 && !in_array('Review AI Attention Highlights for potential risks', $recommendations)) {
            $recommendations[] = 'Review AI Attention Highlights for potential risks';
            $assessment->recommendation_json = $recommendations;
            $assessment->save();
        }

        return $assessment;
    }

    private function makeBreakdown(string $parameter, string $value, int $impact, string $confidence, array $sources): array
    {
        return [
            'parameter' => $parameter,
            'detected_value' => $value,
            'score_impact' => $impact,
            'confidence' => $confidence,
            'data_source' => $sources,
            'evidence' => ["Extracted from DB record"]
        ];
    }
}
