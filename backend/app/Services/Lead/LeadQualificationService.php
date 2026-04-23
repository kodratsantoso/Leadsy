<?php

namespace App\Services\Lead;

use App\Models\Lead;
use App\Models\LeadQualification;
use App\Services\AI\AiOrchestrationService;
use Carbon\Carbon;

/**
 * Lead Qualification Service — Module A (Lead Intelligence Engine)
 * 
 * Implements lead qualification logic with:
 * - yes/maybe/no qualification status
 * - Business type detection (B2B/B2C/mixed)
 * - Company size band inference (micro/small/medium/enterprise/unknown)
 * - Rule-based qualification with optional AI support
 * - Qualification reason tracking
 * - BRD §3.4 compliance
 */
class LeadQualificationService
{
    public function __construct(
        private AiOrchestrationService $ai,
        private QualificationRuleEngineService $engine,
    )
    {
    }

    /**
     * Qualify a lead based on rules and optional AI analysis
     */
    public function qualifyLead(Lead $lead, bool $useAi = true): LeadQualification
    {
        // Step 1: Rule-based qualification
        $ruleQualification = $this->applyQualificationRules($lead);

        // Step 2: AI-enhanced qualification if enabled
        $finalQualification = $ruleQualification;
        if ($useAi) {
            $aiResult = $this->getAiQualification($lead);
            if ($aiResult['success']) {
                // AI can override or enhance rule-based decision
                $finalQualification = $this->mergeQualifications($ruleQualification, $aiResult);
            }
        }

        // Step 3: Persist qualification
        $qualification = $lead->qualifications()->create([
            'qualified' => $finalQualification['qualified'],
            'classification' => $finalQualification['classification'],
            'score' => $ruleQualification['evaluation']['score'] ?? null,
            'business_type' => $finalQualification['business_type'],
            'company_size_band' => $finalQualification['company_size_band'],
            'qualification_reason' => $finalQualification['reason'],
            'dimension_breakdown' => $ruleQualification['evaluation']['dimension_breakdown'] ?? null,
            'risk_flags' => $ruleQualification['evaluation']['risk_flags'] ?? null,
            'hard_stops' => $ruleQualification['evaluation']['hard_stops'] ?? null,
            'recommendation' => $ruleQualification['evaluation']['recommendation'] ?? null,
            'evaluation_snapshot' => $ruleQualification['evaluation']['input_snapshot'] ?? null,
            'last_qualified_at' => Carbon::now(),
        ]);

        // Step 4: Update lead qualification_status field
        $statusMap = [
            'yes' => 'eligible',
            'maybe' => 'potential',
            'no' => 'not_eligible',
        ];

        $lead->update([
            'qualification_status' => $finalQualification['classification'] === 'need_review'
                ? 'pending'
                : ($statusMap[$finalQualification['qualified']] ?? 'pending'),
        ]);

        return $qualification;
    }

    /**
     * Apply rule-based qualification logic
     * Returns qualification array with qualified, business_type, company_size_band, reason
     */
    private function applyQualificationRules(Lead $lead): array
    {
        $evaluation = $this->engine->evaluateLead($lead);
        $snapshot = $evaluation['input_snapshot'];
        $qualified = match ($evaluation['status']) {
            'eligible' => 'yes',
            'potential', 'need_review' => 'maybe',
            default => 'no',
        };

        return [
            'qualified' => $qualified,
            'classification' => $evaluation['status'],
            'business_type' => $this->inferBusinessType($lead),
            'company_size_band' => $snapshot['company_size_band'] ?? $this->inferCompanySizeBand($lead),
            'reason' => implode('; ', $evaluation['reasoning']) ?: 'Insufficient data for qualification',
            'score' => $evaluation['score'],
            'evaluation' => $evaluation,
        ];
    }

    /**
     * Infer business type from lead data
     * B2B, B2C, or mixed
     */
    private function inferBusinessType(Lead $lead): string
    {
        if ($lead->product?->target_industry) {
            $targetIndustry = strtolower($lead->product->target_industry);

            // B2B industries
            if (str_contains($targetIndustry, 'enterprise') ||
                str_contains($targetIndustry, 'manufacturing') ||
                str_contains($targetIndustry, 'technology') ||
                str_contains($targetIndustry, 'distribution')) {
                return 'B2B';
            }

            // B2C industries
            if (str_contains($targetIndustry, 'retail') ||
                str_contains($targetIndustry, 'consumer') ||
                str_contains($targetIndustry, 'restaurant') ||
                str_contains($targetIndustry, 'hospitality')) {
                return 'B2C';
            }
        }

        // Default based on company size
        if (!empty($lead->company_size_estimate)) {
            $size = strtolower($lead->company_size_estimate);
            if (str_contains($size, 'enterprise') || str_contains($size, 'large')) {
                return 'B2B';
            }
        }

        return 'mixed';
    }

    /**
     * Infer company size band from lead data
     * micro, small, medium, enterprise, unknown
     */
    private function inferCompanySizeBand(Lead $lead): string
    {
        if (!empty($lead->company_size_estimate)) {
            $size = strtolower($lead->company_size_estimate);

            if (str_contains($size, 'enterprise') || str_contains($size, '1000+') || str_contains($size, '5000')) {
                return 'enterprise';
            }

            if (str_contains($size, 'large') || str_contains($size, '500') || str_contains($size, '1000')) {
                return 'medium';
            }

            if (str_contains($size, 'small') || str_contains($size, '50') || str_contains($size, '100') || str_contains($size, '250')) {
                return 'small';
            }

            if (str_contains($size, 'micro') || str_contains($size, '1-') || str_contains($size, '1 ') || str_contains($size, '10')) {
                return 'micro';
            }
        }

        // Estimate from branch count
        if (!empty($lead->branch_count)) {
            if ($lead->branch_count >= 50) {
                return 'enterprise';
            }
            if ($lead->branch_count >= 20) {
                return 'medium';
            }
            if ($lead->branch_count >= 5) {
                return 'small';
            }

            return 'micro';
        }

        return 'unknown';
    }

    /**
     * Get AI-enhanced qualification
     */
    private function getAiQualification(Lead $lead): array
    {
        $leadData = [
            'company_name' => $lead->company_name,
            'industry' => $lead->industry?->name,
            'website' => !empty($lead->website),
            'email' => !empty($lead->email),
            'phone' => !empty($lead->phone),
            'contacts' => $lead->contacts()->count(),
            'activities' => $lead->activities()->count(),
        ];

        $prompt = <<<PROMPT
        Evaluate the qualification of this lead. Return JSON with keys: qualified (yes/maybe/no), business_type (B2B/B2C/mixed), company_size_band (micro/small/medium/enterprise/unknown), reasoning (1-2 sentences).
        
        Lead data:
        {$this->formatDataForPrompt($leadData)}
        
        Return ONLY valid JSON.
        PROMPT;

        $result = $this->ai->call('qualification_analysis', $prompt);

        if ($result['success'] && $result['content']) {
            $data = json_decode($result['content'], true);
            return [
                'success' => true,
                'qualified' => $data['qualified'] ?? 'maybe',
                'business_type' => $data['business_type'] ?? 'mixed',
                'company_size_band' => $data['company_size_band'] ?? 'unknown',
                'reason' => $data['reasoning'] ?? 'AI analysis',
            ];
        }

        return ['success' => false];
    }

    /**
     * Merge rule-based and AI qualifications
     * AI can enhance but not contradict rules significantly
     */
    private function mergeQualifications(array $rule, array $ai): array
    {
        $classification = $rule['classification'] ?? match ($ai['qualified'] ?? $rule['qualified']) {
            'yes' => 'eligible',
            'maybe' => 'potential',
            default => 'not_eligible',
        };

        return [
            'qualified' => $ai['qualified'] ?? $rule['qualified'],
            'classification' => $classification === 'need_review' && ($ai['qualified'] ?? null) === 'yes'
                ? 'eligible'
                : ($classification === 'need_review' && ($ai['qualified'] ?? null) === 'no'
                    ? 'not_eligible'
                    : $classification),
            'business_type' => $ai['business_type'] ?? $rule['business_type'],
            'company_size_band' => $ai['company_size_band'] ?? $rule['company_size_band'],
            'reason' => "{$rule['reason']}; AI: {$ai['reason']}",
        ];
    }

    private function formatDataForPrompt(array $data): string
    {
        $lines = [];
        foreach ($data as $key => $value) {
            $lines[] = "- $key: $value";
        }

        return implode("\n", $lines);
    }

    /**
     * Requalify an existing lead
     */
    public function requalifyLead(Lead $lead, bool $useAi = true): LeadQualification
    {
        return $this->qualifyLead($lead, $useAi);
    }
}
