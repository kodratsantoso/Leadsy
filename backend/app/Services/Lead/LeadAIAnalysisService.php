<?php

namespace App\Services\Lead;

use App\Models\Lead;
use App\Models\LeadAiAnalysis;
use App\Services\AI\AiOrchestrationService;

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
    public function __construct(private AiOrchestrationService $ai) {}

    /**
     * Analyze a lead using AI to understand opportunities
     */
    public function analyzeLead(Lead $lead): LeadAiAnalysis
    {
        $prompt = $this->buildAnalysisPrompt($lead);
        $result = $this->ai->call('lead_analysis', $prompt);

        if ($result['success'] && $result['content']) {
            $analysis = json_decode($result['content'], true);
            if (! is_array($analysis)) {
                $analysis = $this->defaultAnalysis();
            }
        } else {
            $analysis = $this->defaultAnalysis();
        }

        // Persist analysis
        $aiAnalysis = $lead->aiAnalyses()->create([
            'relevance_score' => (int) ($analysis['relevance_score'] ?? 50),
            'company_summary' => $analysis['company_summary'] ?? 'Company summary unavailable.',
            'business_opportunity_summary' => $analysis['opportunity_summary'] ?? 'Analysis pending',
            'potential_use_case' => $analysis['potential_use_case'] ?? 'Primary use case not identified yet.',
            'probable_needs' => $analysis['probable_needs'] ?? [],
            'suggested_approach' => $analysis['suggested_approach'] ?? '',
            'risk_insight' => $analysis['risk_insight'] ?? 'No major advisory risk identified.',
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
        You are a B2B business analyst. Analyze this company and provide advisory insights for sales engagement.
        This analysis is advisory only. It must not replace or influence deterministic lead scoring.
        
        Company Information:{$leadJson}{$productInfo}
        
        Provide a JSON response with:
        - relevance_score: 0-100 (how relevant this lead is for the product)
        - company_summary: 2-3 sentence company summary
        - opportunity_summary: 2-3 sentence description of business opportunity
        - potential_use_case: 1-2 sentence likely use case for this company
        - probable_needs: array of 3-4 likely pain points or needs
        - suggested_approach: recommended outreach or sales opening angle
        - risk_insight: 1-2 sentence advisory risk to watch for
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
            'company_summary' => 'Basic company profile is available, but AI enrichment did not complete.',
            'opportunity_summary' => 'Analysis pending. This lead requires AI processing to generate insights.',
            'potential_use_case' => 'Use case needs manual discovery from the available company profile.',
            'probable_needs' => ['General business inquiry', 'Product evaluation', 'Market exploration'],
            'suggested_approach' => 'Start with needs discovery call to understand requirements.',
            'risk_insight' => 'Advisory confidence is low because AI analysis is unavailable.',
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
