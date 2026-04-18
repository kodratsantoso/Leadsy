<?php

namespace App\Services\Sales;

use App\Models\Lead;
use App\Models\LeadMeeting;
use App\Models\LeadTranscript;
use App\Models\LeadAiEvaluation;
use App\Services\AiOrchestrationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

/**
 * Lead Evaluation Service — Module B (Sales Activity & Lead Evaluation Engine)
 * 
 * Implements AI-assisted evaluation of meetings and transcripts with:
 * - Sentiment analysis (positive/neutral/negative)
 * - Intent level detection (high/medium/low)
 * - Interest level assessment (high/medium/low)
 * - Objections detection
 * - Buying signals identification
 * - Next best action recommendations
 * - Product angle suggestions
 * - Confidence scoring
 * - BRD §4.4 compliance
 */
class LeadEvaluationService
{
    public function __construct(private AiOrchestrationService $ai)
    {
    }

    /**
     * Evaluate a transcript using AI
     */
    public function evaluateTranscript(Lead $lead, LeadTranscript $transcript): LeadAiEvaluation
    {
        $prompt = $this->buildTranscriptEvaluationPrompt($lead, $transcript);
        $result = $this->ai->call('transcript_evaluation', $prompt);

        if ($result['success'] && $result['content']) {
            $evaluation = json_decode($result['content'], true);
        } else {
            $evaluation = $this->defaultEvaluation();
        }

        // Persist evaluation
        $aiEvaluation = $lead->aiEvaluations()->create([
            'source_type' => LeadTranscript::class,
            'source_id' => $transcript->id,
            'sentiment' => $evaluation['sentiment'] ?? 'neutral',
            'intent_level' => $evaluation['intent_level'] ?? 'low',
            'interest_level' => $evaluation['interest_level'] ?? 'medium',
            'objections_detected' => $evaluation['objections'] ?? [],
            'buying_signals' => $evaluation['buying_signals'] ?? [],
            'next_best_action' => $evaluation['next_best_action'] ?? 'Schedule follow-up',
            'recommended_product_id' => $evaluation['recommended_product_id'] ?? null,
            'confidence_score' => (int) ($evaluation['confidence'] ?? 50),
            'evaluated_at' => Carbon::now(),
        ]);

        // Mark transcript as evaluated
        $transcript->update(['evaluation_status' => 'evaluated']);

        return $aiEvaluation;
    }

    /**
     * Evaluate a meeting using AI
     */
    public function evaluateMeeting(Lead $lead, LeadMeeting $meeting): LeadAiEvaluation
    {
        // Build from meeting data
        $prompt = $this->buildMeetingEvaluationPrompt($lead, $meeting);
        $result = $this->ai->call('meeting_evaluation', $prompt);

        if ($result['success'] && $result['content']) {
            $evaluation = json_decode($result['content'], true);
        } else {
            $evaluation = $this->defaultEvaluation();
        }

        // Persist evaluation
        $aiEvaluation = $lead->aiEvaluations()->create([
            'source_type' => LeadMeeting::class,
            'source_id' => $meeting->id,
            'sentiment' => $evaluation['sentiment'] ?? 'neutral',
            'intent_level' => $evaluation['intent_level'] ?? 'medium',
            'interest_level' => $evaluation['interest_level'] ?? 'medium',
            'objections_detected' => array_merge($meeting->objections ?? [], $evaluation['objections'] ?? []),
            'buying_signals' => $evaluation['buying_signals'] ?? [],
            'next_best_action' => $evaluation['next_best_action'] ?? 'Send proposal',
            'recommended_product_id' => $evaluation['recommended_product_id'] ?? null,
            'confidence_score' => (int) ($evaluation['confidence'] ?? 70),
            'evaluated_at' => Carbon::now(),
        ]);

        return $aiEvaluation;
    }

    /**
     * Get latest evaluation for a lead
     */
    public function getLatestEvaluation(Lead $lead): ?LeadAiEvaluation
    {
        return $lead->aiEvaluations()->latest('evaluated_at')->first();
    }

    /**
     * Get evaluations by source type
     */
    public function getEvaluationsBySource(
        Lead $lead,
        string $sourceType
    ): \Illuminate\Database\Eloquent\Collection {
        return $lead->aiEvaluations()
            ->where('source_type', $sourceType)
            ->orderByDesc('evaluated_at')
            ->get();
    }

    /**
     * Get evaluation summary for lead detail
     */
    public function getEvaluationSummary(Lead $lead): array
    {
        $latestEval = $this->getLatestEvaluation($lead);
        $allEvals = $lead->aiEvaluations()->count();

        // Aggregate sentiment
        $sentiments = $lead->aiEvaluations()
            ->select('sentiment')
            ->selectRaw('COUNT(*) as count')
            ->groupBy('sentiment')
            ->get()
            ->pluck('count', 'sentiment')
            ->toArray();

        // Aggregate buying signals
        $allSignals = [];
        $lead->aiEvaluations()->each(function ($eval) use (&$allSignals) {
            $allSignals = array_merge($allSignals, $eval->buying_signals ?? []);
        });

        return [
            'total_evaluations' => $allEvals,
            'latest_evaluation' => $latestEval ? [
                'date' => $latestEval->evaluated_at,
                'sentiment' => $latestEval->sentiment,
                'intent_level' => $latestEval->intent_level,
                'interest_level' => $latestEval->interest_level,
                'buying_signals' => $latestEval->buying_signals,
                'next_action' => $latestEval->next_best_action,
                'confidence' => $latestEval->confidence_score,
            ] : null,
            'sentiment_distribution' => $sentiments,
            'common_objections' => $this->getCommonObjections($lead),
            'identified_signals' => array_unique(array_slice(array_values($allSignals), 0, 5)),
        ];
    }

    /**
     * Get common objections across evaluations
     */
    private function getCommonObjections(Lead $lead): array
    {
        $allObjections = [];

        $lead->aiEvaluations()->each(function ($eval) use (&$allObjections) {
            $allObjections = array_merge($allObjections, $eval->objections_detected ?? []);
        });

        // Count occurrences and return top ones
        $counts = array_count_values($allObjections);
        arsort($counts);

        return array_slice(array_keys($counts), 0, 5);
    }

    /**
     * Build prompt for transcript evaluation
     */
    private function buildTranscriptEvaluationPrompt(Lead $lead, LeadTranscript $transcript): string
    {
        return <<<PROMPT
        Analyze this customer interaction transcript and return a JSON evaluation with:
        - sentiment: "positive", "neutral", or "negative"
        - intent_level: "high", "medium", or "low" (likelihood they want to buy)
        - interest_level: "high", "medium", or "low" (expressed interest in product/service)
        - objections: array of 2-3 objections mentioned (if any)
        - buying_signals: array of 2-3 positive buying signals (if any)
        - next_best_action: recommended next step (string, brief)
        - confidence: 0-100 confidence in this evaluation
        
        Company: {$lead->company_name}
        Industry: {$lead->industry?->name}
        Source: {$transcript->source_type}
        
        Transcript:
        {$transcript->transcript_text}
        
        Return ONLY valid JSON, no markdown.
        PROMPT;
    }

    /**
     * Build prompt for meeting evaluation
     */
    private function buildMeetingEvaluationPrompt(Lead $lead, LeadMeeting $meeting): string
    {
        $participants = implode(', ', $meeting->participants ?? []);
        $points = implode('; ', $meeting->key_points ?? []);

        return <<<PROMPT
        Evaluate this meeting summary and return a JSON evaluation with:
        - sentiment: "positive", "neutral", or "negative"
        - intent_level: "high", "medium", or "low"
        - interest_level: "high", "medium", or "low"
        - objections: array of objections discussed
        - buying_signals: array of positive signals detected
        - next_best_action: recommended follow-up action
        - confidence: 0-100
        
        Company: {$lead->company_name}
        Industry: {$lead->industry?->name}
        Meeting Type: {$meeting->meeting_type}
        Participants: {$participants}
        
        Summary: {$meeting->summary}
        Key Points: {$points}
        
        Return ONLY valid JSON.
        PROMPT;
    }

    /**
     * Default evaluation when AI fails
     */
    private function defaultEvaluation(): array
    {
        return [
            'sentiment' => 'neutral',
            'intent_level' => 'medium',
            'interest_level' => 'medium',
            'objections' => [],
            'buying_signals' => [],
            'next_best_action' => 'Schedule follow-up meeting',
            'confidence' => 40,
        ];
    }

    /**
     * Re-evaluate an existing evaluation
     */
    public function reevaluateTranscript(Lead $lead, LeadTranscript $transcript): LeadAiEvaluation
    {
        return $this->evaluateTranscript($lead, $transcript);
    }

    /**
     * Reevaluate a meeting
     */
    public function reevaluateMeeting(Lead $lead, LeadMeeting $meeting): LeadAiEvaluation
    {
        return $this->evaluateMeeting($lead, $meeting);
    }
}
