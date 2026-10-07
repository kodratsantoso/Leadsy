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
        return $this->analyzeLeadWithQualificationHint($lead)['analysis'];
    }

    /**
     * Same AI call as analyzeLead(), but the prompt also asks for a
     * lightweight qualification hint (qualified/business_type/
     * company_size_band) — this lets PreMeetingAiScreeningOrchestratorService
     * fold LeadQualificationService's own small `qualification_analysis` AI
     * call into this one instead of making a second AI round-trip for
     * every lead. LeadQualificationService::qualifyLeadWithAiHint() consumes
     * the 'qualification_hint' half of the return value.
     *
     * @return array{analysis: LeadAiAnalysis, qualification_hint: array}
     */
    public function analyzeLeadWithQualificationHint(Lead $lead): array
    {
        $prompt = $this->buildAnalysisPrompt($lead);
        $result = $this->ai->call('lead_analysis', $prompt);

        $aiCallSucceeded = $result['success'] && ! empty($result['content']);

        if ($aiCallSucceeded) {
            $analysis = json_decode($result['content'], true);
            if (! is_array($analysis)) {
                $aiCallSucceeded = false;
                $analysis = $this->defaultAnalysis();
            }
        } else {
            $analysis = $this->defaultAnalysis();
        }

        // Persist analysis
        $aiAnalysis = $lead->aiAnalyses()->create([
            'relevance_score' => (int) ($analysis['relevance_score'] ?? 50),
            'company_summary' => $analysis['company_summary'] ?? 'Ringkasan company belum tersedia.',
            'business_opportunity_summary' => $analysis['opportunity_summary'] ?? 'Analisis sedang diproses.',
            'potential_use_case' => $analysis['potential_use_case'] ?? 'Use case utama belum teridentifikasi.',
            'probable_needs' => $analysis['probable_needs'] ?? [],
            'suggested_approach' => $analysis['suggested_approach'] ?? '',
            'risk_insight' => $analysis['risk_insight'] ?? 'Belum ada risiko advisory yang signifikan teridentifikasi.',
            'urgency_level' => $analysis['urgency_level'] ?? 'medium',
            'confidence_score' => (int) ($analysis['confidence'] ?? 50),
        ]);

        return [
            'analysis' => $aiAnalysis,
            'qualification_hint' => [
                'success' => $aiCallSucceeded,
                'qualified' => $analysis['qualified'] ?? 'maybe',
                'business_type' => $analysis['business_type'] ?? 'mixed',
                'company_size_band' => $analysis['company_size_band'] ?? 'unknown',
                'reason' => $analysis['qualification_reasoning'] ?? 'Analisis AI',
            ],
        ];
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
            Target Product: {$lead->product->name}
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
        You are a B2B business analyst supporting an Indonesian sales team. Analyze this company and provide advisory insights for sales engagement, plus a lightweight qualification read.
        This analysis is advisory only. It must not replace or influence deterministic lead scoring or the deterministic qualification rule engine — your qualification fields are a secondary input only.

        Company Information:{$leadJson}{$productInfo}

        Write every free-text field below in Bahasa Indonesia (natural, professional sales language). Keep all JSON keys and the enum values themselves (business_type, company_size_band, urgency_level, qualified) in English exactly as specified — only the human-readable sentences should be in Indonesian.

        Provide a JSON response with:
        - relevance_score: 0-100 (how relevant this lead is for the product)
        - company_summary: 2-3 sentence company summary, in Bahasa Indonesia
        - opportunity_summary: 2-3 sentence description of business opportunity, in Bahasa Indonesia
        - potential_use_case: 1-2 sentence likely use case for this company, in Bahasa Indonesia
        - probable_needs: array of 3-4 likely pain points or needs, in Bahasa Indonesia
        - suggested_approach: recommended outreach or sales opening angle, in Bahasa Indonesia
        - risk_insight: 1-2 sentence advisory risk to watch for, in Bahasa Indonesia
        - urgency_level: "high", "medium", or "low" (when to prioritize contact)
        - confidence: 0-100 (confidence in this analysis)
        - qualified: "yes", "maybe", or "no" — a lightweight qualification read based on the same information
        - business_type: "B2B", "B2C", or "mixed"
        - company_size_band: "micro", "small", "medium", "enterprise", or "unknown"
        - qualification_reasoning: 1-2 sentence justification for the qualified/business_type/company_size_band read above, in Bahasa Indonesia

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
            'company_summary' => 'Profil dasar company tersedia, tetapi enrichment AI belum selesai diproses.',
            'opportunity_summary' => 'Analisis masih tertunda. Lead ini butuh pemrosesan AI untuk menghasilkan insight.',
            'potential_use_case' => 'Use case perlu digali manual dari profil company yang tersedia.',
            'probable_needs' => ['Pertanyaan bisnis umum', 'Evaluasi produk', 'Eksplorasi pasar'],
            'suggested_approach' => 'Mulai dengan panggilan discovery kebutuhan untuk memahami requirement.',
            'risk_insight' => 'Tingkat kepercayaan advisory rendah karena analisis AI belum tersedia.',
            'urgency_level' => 'medium',
            'confidence' => 30,
            'qualified' => 'maybe',
            'business_type' => 'mixed',
            'company_size_band' => 'unknown',
            'qualification_reasoning' => 'Analisis AI belum tersedia, hasil kualifikasi mengandalkan rule engine saja.',
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
