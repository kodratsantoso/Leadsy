<?php

namespace App\Services\CustomerSuccess;

use App\Models\AiAttentionHighlight;
use App\Models\CustomerFeedback;
use App\Models\Lead;

class CustomerFeedbackService
{
    /**
     * Record new customer feedback and evaluate sentiment & detractor risk.
     *
     * @param Lead $lead
     * @param array $data
     * @return CustomerFeedback
     */
    public function recordFeedback(Lead $lead, array $data): CustomerFeedback
    {
        $surveyType = $data['survey_type'] ?? 'nps';
        $score = (int) ($data['score'] ?? 10);
        $text = $data['feedback_text'] ?? '';

        $classification = $this->classifyScore($surveyType, $score, $text);

        $feedback = CustomerFeedback::create([
            'lead_id' => $lead->id,
            'contact_id' => $data['contact_id'] ?? null,
            'sales_order_id' => $data['sales_order_id'] ?? null,
            'survey_type' => $surveyType,
            'score' => $score,
            'category' => $classification['category'],
            'feedback_text' => $text,
            'sentiment' => $classification['sentiment'],
            'action_required' => $classification['action_required'],
        ]);

        // Trigger proactive highlight if detractor or negative feedback
        if ($classification['action_required']) {
            $this->createDetractorAlert($lead, $feedback);
        }

        return $feedback;
    }

    /**
     * Classify survey response into category and sentiment.
     */
    private function classifyScore(string $surveyType, int $score, string $text): array
    {
        if ($surveyType === 'nps') {
            $category = match (true) {
                $score >= 9 => 'promoter',
                $score >= 7 => 'passive',
                default => 'detractor',
            };
        } else {
            // CSAT (1-5)
            $category = match (true) {
                $score >= 4 => 'satisfied',
                $score == 3 => 'neutral',
                default => 'dissatisfied',
            };
        }

        $sentiment = match ($category) {
            'promoter', 'satisfied' => 'positive',
            'passive', 'neutral' => 'neutral',
            default => 'negative',
        };

        $actionRequired = ($category === 'detractor' || $category === 'dissatisfied');

        return [
            'category' => $category,
            'sentiment' => $sentiment,
            'action_required' => $actionRequired,
        ];
    }

    /**
     * Create an urgent CSM attention highlight when negative customer sentiment is recorded.
     */
    private function createDetractorAlert(Lead $lead, CustomerFeedback $feedback): AiAttentionHighlight
    {
        return AiAttentionHighlight::create([
            'entity_type' => Lead::class,
            'entity_id' => $lead->id,
            'feature_key' => 'customer_detractor_alert',
            'title' => "Customer Dissatisfaction: {$lead->company_name} ({$feedback->survey_type} score {$feedback->score})",
            'category' => 'CSM Attention',
            'severity' => 'critical',
            'reason' => "Client flagged as {$feedback->category} in {$feedback->survey_type} survey. Feedback: \"{$feedback->feedback_text}\"",
            'evidence_json' => [
                'feedback_id' => $feedback->id,
                'survey_type' => $feedback->survey_type,
                'score' => $feedback->score,
                'category' => $feedback->category,
                'feedback_text' => $feedback->feedback_text,
            ],
            'recommended_action' => "Schedule prompt CSM service recovery call with client sponsor within 24 hours.",
            'status' => 'open',
            'assigned_to' => $lead->csm_owner_id ?? $lead->owner_id,
            'due_date' => now()->addDay(),
        ]);
    }
}
