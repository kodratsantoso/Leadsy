<?php

namespace App\Services\Lead;

use App\Models\Lead;
use App\Models\LeadScore;
use App\Services\AiOrchestrationService;
use Carbon\Carbon;

/**
 * Lead Scoring Service — Module A (Lead Intelligence Engine)
 * 
 * Implements comprehensive lead scoring with:
 * - Multiple scoring factors (contact info, industry match, product match, activity, recency, AI confidence)
 * - Persistent score storage with factor breakdown
 * - Grade calculation (Hot/Warm/Cold)
 * - Manual and automatic rescoring support
 * - BRD §3.3 compliance
 */
class LeadScoringService
{
    public function __construct(private AiOrchestrationService $ai)
    {
    }

    /**
     * Score a lead using multiple factors and AI analysis
     * 
     * Scoring factors:
     * - Contact info completeness (30 points max)
     * - Website presence (15 points)
     * - Industry match to product (20 points)
     * - Activity recency (15 points)
     * - Product match quality (15 points)
     * - Company size known (5 points)
     */
    public function scoreLead(Lead $lead, bool $useAi = true): LeadScore
    {
        // Calculate base score from factors
        $breakdown = $this->calculateScoreFactors($lead);
        $baseScore = array_sum(array_column($breakdown, 'score'));

        // Enhance with AI analysis if enabled
        if ($useAi) {
            $aiEnhancement = $this->getAiEnhancedScore($lead);
            if ($aiEnhancement['success']) {
                $breakdown[] = $aiEnhancement['factor'];
                $baseScore = min(100, $baseScore + $aiEnhancement['boost']);
            }
        }

        // Clamp score to 0-100
        $finalScore = max(0, min(100, $baseScore));

        // Calculate grade
        $grade = $this->calculateGrade($finalScore);

        // Add grade factor to breakdown
        $breakdown[] = [
            'factor' => 'Grade Classification',
            'score' => 0,
            'description' => "Lead grade: {$grade}",
        ];

        // Save score record
        $leadScoreRecord = $lead->scores()->create([
            'score' => $finalScore,
            'grade' => $grade,
            'score_breakdown' => $breakdown,
            'last_scored_at' => Carbon::now(),
        ]);

        // Update lead cache
        $lead->update(['lead_score' => $finalScore]);

        return $leadScoreRecord;
    }

    /**
     * Calculate score from individual factors
     * Returns array of factors with scores
     */
    private function calculateScoreFactors(Lead $lead): array
    {
        $factors = [];

        // Factor 1: Contact Information Completeness (30 points max)
        $contactScore = $this->scoreContactInfo($lead);
        $factors[] = [
            'factor' => 'Contact Information',
            'score' => $contactScore,
            'description' => "Contact details completeness: {$contactScore}/30",
        ];

        // Factor 2: Website Presence (15 points)
        $websiteScore = !empty($lead->website) ? 15 : 0;
        $factors[] = [
            'factor' => 'Website',
            'score' => $websiteScore,
            'description' => $websiteScore > 0 ? 'Has website URL' : 'No website provided',
        ];

        // Factor 3: Industry Match to Product (20 points)
        $industryScore = $this->scoreIndustryMatch($lead);
        $factors[] = [
            'factor' => 'Industry Match',
            'score' => $industryScore,
            'description' => "Product-to-industry alignment: {$industryScore}/20",
        ];

        // Factor 4: Activity Recency (15 points)
        $recencyScore = $this->scoreActivityRecency($lead);
        $factors[] = [
            'factor' => 'Activity Recency',
            'score' => $recencyScore,
            'description' => "Recent interactions score: {$recencyScore}/15",
        ];

        // Factor 5: Product Match Quality (15 points)
        $productMatchScore = $this->scoreProductMatch($lead);
        $factors[] = [
            'factor' => 'Product Match Quality',
            'score' => $productMatchScore,
            'description' => "Product relevance score: {$productMatchScore}/15",
        ];

        // Factor 6: Company Size Band (5 points bonus)
        $companySizeScore = !empty($lead->company_size_estimate) ? 5 : 0;
        $factors[] = [
            'factor' => 'Company Size Known',
            'score' => $companySizeScore,
            'description' => $companySizeScore > 0 ? "Size band: {$lead->company_size_estimate}" : 'Size unknown',
        ];

        return $factors;
    }

    /**
     * Score contact information completeness
     * Email (10) + Phone (10) + Contact Person (10) = 30 max
     */
    private function scoreContactInfo(Lead $lead): int
    {
        $score = 0;

        if (!empty($lead->email)) {
            $score += 10;
        }

        if (!empty($lead->phone)) {
            $score += 10;
        }

        if ($lead->contacts()->where('is_primary', true)->exists()) {
            $score += 10;
        } elseif ($lead->contacts()->count() > 0) {
            $score += 5;
        }

        return min(30, $score);
    }

    /**
     * Score industry match to product
     * 20 points if product target industry matches
     */
    private function scoreIndustryMatch(Lead $lead): int
    {
        if (!$lead->product || !$lead->industry) {
            return 0;
        }

        if ($lead->product->target_industry && str_contains(strtolower($lead->product->target_industry), strtolower($lead->industry->name))) {
            return 20;
        }

        return 5;
    }

    /**
     * Score activity recency
     * 15 = active this week
     * 10 = active this month
     * 5 = active within 3 months
     * 0 = no recent activity
     */
    private function scoreActivityRecency(Lead $lead): int
    {
        $latestActivity = $lead->activities()->latest('activity_date')->first();

        if (!$latestActivity) {
            return 0;
        }

        $daysSinceActivity = Carbon::now()->diffInDays($latestActivity->activity_date);

        return match (true) {
            $daysSinceActivity <= 7 => 15,
            $daysSinceActivity <= 30 => 10,
            $daysSinceActivity <= 90 => 5,
            default => 0,
        };
    }

    /**
     * Score product match quality
     * 15 = high match (>75)
     * 10 = medium match (50-75)
     * 5 = low match (25-50)
     * 0 = no match (<25)
     */
    private function scoreProductMatch(Lead $lead): int
    {
        if (!$lead->product_id) {
            return 0;
        }

        $productMatch = $lead->productMatches()
            ->where('is_recommended', true)
            ->orderByDesc('match_score')
            ->first();

        if (!$productMatch) {
            return 0;
        }

        $matchScore = $productMatch->match_score;

        return match (true) {
            $matchScore >= 75 => 15,
            $matchScore >= 50 => 10,
            $matchScore >= 25 => 5,
            default => 0,
        };
    }

    /**
     * Get AI-enhanced score boost
     */
    private function getAiEnhancedScore(Lead $lead): array
    {
        $leadData = [
            'id' => $lead->id,
            'company_name' => $lead->company_name,
            'industry' => $lead->industry?->name,
            'company_size' => $lead->company_size_estimate,
            'has_contact' => $lead->contacts()->count() > 0,
            'activity_count' => $lead->activities()->count(),
        ];

        $productRef = null;
        if ($lead->product) {
            $productRef = "Product: {$lead->product->name}\nTarget: {$lead->product->target_industry}";
        }

        $result = $this->ai->scoreLead($leadData, $productRef);

        if ($result['success'] ?? false) {
            return [
                'success' => true,
                'factor' => [
                    'factor' => 'AI Analysis Boost',
                    'score' => 5,
                    'description' => 'AI confidence in lead quality assessment',
                ],
                'boost' => 5,
            ];
        }

        return ['success' => false];
    }

    /**
     * Calculate grade based on score
     * Hot: 80-100
     * Warm: 50-79
     * Cold: 0-49
     */
    private function calculateGrade(int $score): string
    {
        return match (true) {
            $score >= 80 => 'Hot',
            $score >= 50 => 'Warm',
            default => 'Cold',
        };
    }

    /**
     * Rescore an existing lead
     */
    public function rescoreLead(Lead $lead, bool $useAi = true): LeadScore
    {
        return $this->scoreLead($lead, $useAi);
    }
}
