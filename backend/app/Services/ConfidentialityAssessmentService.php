<?php

namespace App\Services;

use App\Models\Lead;
use Illuminate\Support\Facades\Log;

class ConfidentialityAssessmentService
{
    /**
     * Generate the confidentiality assessment for the dashboard or a specific entity.
     * 
     * @param mixed|null $entity
     * @return array
     */
    public function assess($entity = null): array
    {
        // For the dashboard matrix, we calculate an aggregate or explain the general rules.
        // If an entity (e.g. Lead) is passed, we assess that specific entity.
        
        $level = 'low';
        $score = 0;
        $basis = [];
        $specialAttention = [];
        $reasons = [];

        if ($entity instanceof Lead) {
            $this->assessLead($entity, $score, $basis, $specialAttention, $reasons);
        } else {
            // General dashboard view assessment
            $this->assessDashboard($score, $basis, $specialAttention, $reasons);
        }

        // Determine level based on score
        if ($score >= 80) {
            $level = 'restricted';
        } elseif ($score >= 50) {
            $level = 'high';
        } elseif ($score >= 20) {
            $level = 'medium';
        } else {
            $level = 'low';
        }

        return [
            'level' => $level,
            'score' => $score,
            'classification_reason' => implode(' ', $reasons),
            'basis' => $basis,
            'data_sources' => ['CRM Records', 'AI Interaction Logs', 'Sales Activities'],
            'recommended_access_handling' => $this->getHandlingRecommendation($level),
            'special_attention' => $specialAttention,
        ];
    }

    private function assessLead(Lead $lead, &$score, &$basis, &$specialAttention, &$reasons)
    {
        // A. Data Sensitivity
        if ($lead->estimated_closing_amount > 100000) {
            $score += 30;
            $basis[] = [
                'parameter' => 'Revenue Exposure',
                'value' => '>$100k',
                'score_impact' => 30,
                'reason' => 'High contract value exposes significant business revenue.',
            ];
            $specialAttention[] = 'High value enterprise deal';
        }

        // D. Lifecycle Stage
        $stageName = strtolower($lead->funnelStage->name ?? '');
        if (in_array($stageName, ['negotiation', 'proposal'])) {
            $score += 20;
            $basis[] = [
                'parameter' => 'Lifecycle Stage',
                'value' => ucfirst($stageName),
                'score_impact' => 20,
                'reason' => 'Active negotiations contain sensitive pricing and strategic information.',
            ];
            $reasons[] = 'The lead is in an active negotiation stage.';
        }
        
        if (empty($reasons)) {
            $reasons[] = 'Standard lead data with normal visibility rules.';
        }
    }

    private function assessDashboard(&$score, &$basis, &$specialAttention, &$reasons)
    {
        // General logic for dashboard confidentiality
        // In a real app, this might scan all active deals to find max exposure.
        $score = 55; // Example baseline for active company dashboard
        
        $basis[] = [
            'parameter' => 'Global Revenue Exposure',
            'value' => 'Active Pipeline',
            'score_impact' => 30,
            'reason' => 'Dashboard aggregates total company pipeline which is highly sensitive.',
        ];
        
        $basis[] = [
            'parameter' => 'Access Scope',
            'value' => 'Managerial',
            'score_impact' => 25,
            'reason' => 'Data spans across multiple hierarchies.',
        ];

        $reasons[] = 'Dashboard aggregates highly sensitive organizational data including total pipeline and cross-team performance.';
        $specialAttention[] = 'Do not share dashboard screenshots externally';
    }

    private function getHandlingRecommendation(string $level): string
    {
        return match ($level) {
            'restricted' => 'Strict Need-to-Know basis. Do not share externally or across non-involved teams. Direct manager & superadmin only.',
            'high' => 'Internal use only. Limit exposure to involved commercial team members.',
            'medium' => 'Standard CRM data. Treat with normal business confidentiality.',
            'low' => 'Public or low-risk data. Safe for general internal visibility.',
            default => 'Standard handling.',
        };
    }
}
