<?php

namespace App\Services\Lead;

use App\Models\Lead;
use App\Models\LeadScore;
use App\Services\AiOrchestrationService;

class LeadScoringService
{
    public function __construct(private AiOrchestrationService $ai)
    {
    }

    public function scoreLead(Lead $lead): LeadScore
    {
        // Gather context
        $leadData = $lead->toArray();
        $productReference = null;
        if ($lead->product) {
            $productReference = "Product Name: {$lead->product->name}\nDescription: {$lead->product->description}\nTarget Industry: {$lead->product->target_industry}";
        }

        // We use the AI service to run it through lead_scoring model priority route
        $result = $this->ai->scoreLead($leadData, $productReference);

        $score = $result['score'] ?? 50;
        $grade = $score >= 80 ? 'Hot' : ($score >= 50 ? 'Warm' : 'Cold');

        // Extract explanation to breakdown
        $breakdown = $result['explanation'] ?? 'Default score evaluation.';

        // Save History
        $leadScoreRecord = $lead->scores()->create([
            'score' => $score,
            'grade' => $grade,
            'score_breakdown' => ['reasoning' => $breakdown],
        ]);

        // Update main lead row caching
        $lead->update([
            'lead_score' => $score,
        ]);

        return $leadScoreRecord;
    }
}
