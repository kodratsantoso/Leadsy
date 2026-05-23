<?php

namespace App\Services\Sales;

use App\Models\Lead;
use App\Models\LeadAiEvaluation;
use App\Services\AI\AiOrchestrationService;
use Illuminate\Database\Eloquent\Model;

class EvaluationService
{
    public function __construct(private AiOrchestrationService $ai) {}

    public function evaluateTranscriptOrMeeting(Lead $lead, Model $source, string $textContent): LeadAiEvaluation
    {
        $prompt = "Evaluate the following interaction for Lead: {$lead->company_name}. Interaction content: {$textContent}. Return JSON with 'sentiment', 'intent_level', 'interest_level', 'objections_detected' (array), 'buying_signals' (array), 'next_best_action', 'confidence_score' (0-100).";

        $result = $this->ai->call('conversation_evaluation', $prompt);

        if ($result['success'] && $result['content']) {
            $data = json_decode($result['content'], true);
        } else {
            $data = [
                'sentiment' => 'neutral',
                'intent_level' => 'unknown',
                'interest_level' => 'unknown',
                'objections_detected' => [],
                'buying_signals' => [],
                'next_best_action' => 'Fallback logic executed; please review manually.',
                'confidence_score' => 0,
            ];
        }

        return $lead->aiEvaluations()->create([
            'source_type' => get_class($source),
            'source_id' => $source->id,
            'sentiment' => $data['sentiment'] ?? 'neutral',
            'intent_level' => $data['intent_level'] ?? 'unknown',
            'interest_level' => $data['interest_level'] ?? 'unknown',
            'objections_detected' => $data['objections_detected'] ?? [],
            'buying_signals' => $data['buying_signals'] ?? [],
            'next_best_action' => $data['next_best_action'] ?? '',
            'confidence_score' => $data['confidence_score'] ?? 0,
        ]);
    }
}
