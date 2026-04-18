<?php

namespace App\Services\Lead;

use App\Models\Lead;
use App\Models\LeadAiAnalysis;
use App\Services\AiOrchestrationService;

/**
 * Lead AI Analysis Service — Module A (Lead Intelligence Engine)
 * 
 * Implements AI-assisted lead analysis with:
 * - Relevance score (0-100)
 * - Business opportunity summary
 * - Probable needs and pain points
 * - Suggested approach
 * - Urgency level (high/medium/low)
 * - Confidence score
 * - Analysis persistence
 * - BRD §3.5 compliance
 */
class LeadAIAnalysisService
{
    public function __construct(private AiOrchestrationService $ai)
    {
    }

    /**
     * Analyze a lead using AI to understand opportunities
     */
    public function analyzeLead(Lead $lead): LeadAiAnalysis
    {
        $prompt = $this->buildAnalysisPrompt($lead);
        $result = $this->ai->call('lead_analysis', $prompt);

        if ($result['success'] && $result['content']) {
            $analysis = json_decode($result['content'], true);
        } else {
            $analysis = $this->defaultAnalysis();
        }

        // Persist analysis
        $aiAnalysis = $lead->aiAnalyses()->create([
            'relevance_score' => (int) ($analysis['relevance_score'] ?? 50),
            'business_opportunity_summary' => $analysis['opportunity_summary'] ?? 'Analysis pending',
            'probable_needs' => $analysis['probable_needs'] ?? [],
            'suggested_approach' => $analysis['suggested_approach'] ?? '',
            'urgency_level' => $analysis['urgency_level'] ?? 'medium',
            'confidence_score' => (int) ($analysis['confidence'] ?? 50),
        ]);

        return $aiAnalysis;
    }

    /**
     * Build AI analysis prompt
     */
    private function buildAnalysisPrompt(Lead $lead): string
    {
        $leadInfo = [
            'Company' => $lead->company_name,
            'Industry' => $lead->industry?->name ?? 'Unknown',
            'Size' => $lead->company_size_estimate ?? 'Unknown',
            'Location' => $lead->address ?? 'Unknown',
            'Website' => $lead->website ?? 'Not provided',
        ];

        $productInfo = '';
        if ($lead->product) {
            $productInfo = <<<PRODUCT
            \n\nTarget Product: {$lead->product->name}
            Description: {$lead->product->description}
            Target Industry: {$lead->product->target_industry}
            Target Pain Points: {$lead->product->target_pain_points}
            Buyer Persona: {$lead->product->buyer_persona}
            PRODUCT;
        }

        $leadJson = '';
        foreach ($leadInfo as $key => $value) {
            $leadJson .= "\n- {$key}: {$value}";
        }

        return <<<PROMPT
        You are a B2B business analyst. Analyze this company and provide strategic insights for sales engagement.
        
        Company Information:{$leadJson}{$productInfo}
        
        Provide a JSON response with:
        - relevance_score: 0-100 (how relevant this lead is for the product)
        - opportunity_summary: 2-3 sentence description of business opportunity
        - probable_needs: array of 3-4 likely pain points or needs
        - suggested_approach: recommended sales opening/angle
        - urgency_level: "high", "medium", or "low" (when to prioritize contact)
        - confidence: 0-100 (confidence in this analysis)
        
        Return ONLY valid JSON, no markdown.
        PROMPT;
    }

    /**
     * Default analysis when AI fails
     */
    private function defaultAnalysis(): array
    {
        return [
            'relevance_score' => 50,
            'opportunity_summary' => 'Analysis pending. This lead requires AI processing to generate insights.',
            'probable_needs' => ['General business inquiry', 'Product evaluation', 'Market exploration'],
            'suggested_approach' => 'Start with needs discovery call to understand requirements.',
            'urgency_level' => 'medium',
            'confidence' => 30,
        ];
    }

    /**
     * Reanalyze an existing lead
     */
    public function reanalyzeLead(Lead $lead): LeadAiAnalysis
    {
        return $this->analyzeLead($lead);
    }

    /**
     * Get latest analysis for a lead
     */
    public function getLatestAnalysis(Lead $lead): ?LeadAiAnalysis
    {
        return $lead->aiAnalyses()->latest()->first();
    }
}
