<?php

namespace App\Services\Lead;

use App\Models\Lead;
use App\Models\Product;
use App\Models\LeadProductMatch;
use App\Services\AiOrchestrationService;
use Carbon\Carbon;

/**
 * Lead Product Matching Service — Module A (Lead Intelligence Engine)
 * 
 * Implements product matching engine with:
 * - Lead evaluation against all products
 * - Match score calculation (0-100)
 * - Match reason generation
 * - Recommendation flagging
 * - AI-powered product matching
 * - Persistent storage
 * - BRD §3.4 compliance
 */
class LeadProductMatchingService
{
    public function __construct(private AiOrchestrationService $ai)
    {
    }

    /**
     * Match a lead against all products and save results
     */
    public function matchLeadToProducts(Lead $lead): array
    {
        $products = Product::where('status', 'active')->get();
        $matches = [];

        foreach ($products as $product) {
            $match = $this->matchLeadToProduct($lead, $product);
            if ($match) {
                $matches[] = $match;
            }
        }

        return $matches;
    }

    /**
     * Match a lead to a specific product
     */
    public function matchLeadToProduct(Lead $lead, Product $product): LeadProductMatch
    {
        // Calculate rule-based match score
        $ruleScore = $this->calculateRuleBasedScore($lead, $product);

        // Get AI-enhanced score
        $aiScore = $this->getAiMatchScore($lead, $product);

        // Combine scores (70% rule-based, 30% AI)
        $finalScore = (int) ($ruleScore * 0.7 + $aiScore * 0.3);

        // Generate match reason
        $reason = $this->generateMatchReason($lead, $product, $finalScore);

        // Determine if recommended (score > 50)
        $isRecommended = $finalScore > 50;

        // Find or create match record
        $match = $lead->productMatches()
            ->where('product_id', $product->id)
            ->first();

        if ($match) {
            $match->update([
                'match_score' => $finalScore,
                'match_reason' => $reason,
                'is_recommended' => $isRecommended,
                'last_matched_at' => Carbon::now(),
            ]);
        } else {
            $match = $lead->productMatches()->create([
                'product_id' => $product->id,
                'match_score' => $finalScore,
                'match_reason' => $reason,
                'is_recommended' => $isRecommended,
                'last_matched_at' => Carbon::now(),
            ]);
        }

        return $match;
    }

    /**
     * Calculate rule-based product match score
     * Factors: industry match (40), size match (20), geography (15), contact info (15), activity (10)
     */
    private function calculateRuleBasedScore(Lead $lead, Product $product): int
    {
        $score = 0;

        // Factor 1: Industry Match (40 points)
        if ($product->target_industry && $lead->industry?->name) {
            if (str_contains(strtolower($product->target_industry), strtolower($lead->industry->name))) {
                $score += 40;
            } elseif (str_contains(strtolower($product->target_industry), strtolower($lead->business_category ?? ''))) {
                $score += 20;
            }
        }

        // Factor 2: Company Size Match (20 points)
        $productSizeReq = strtolower($product->ideal_company_profile ?? '');
        if (!empty($lead->company_size_estimate)) {
            $leadSize = strtolower($lead->company_size_estimate);

            if ((str_contains($productSizeReq, 'enterprise') && str_contains($leadSize, 'enterprise')) ||
                (str_contains($productSizeReq, 'large') && (str_contains($leadSize, 'large') || str_contains($leadSize, 'enterprise'))) ||
                (str_contains($productSizeReq, 'mid') && str_contains($leadSize, 'mid')) ||
                (str_contains($productSizeReq, 'small') && str_contains($leadSize, 'small'))) {
                $score += 20;
            } elseif (str_contains($productSizeReq, 'any')) {
                $score += 10;
            }
        }

        // Factor 3: Geographic (15 points) - simplified for now
        if (!empty($lead->address) && !empty($product->supported_regions)) {
            // Check if lead location in product's supported regions
            $score += 10; // Simplified
        }

        // Factor 4: Contact Information (15 points)
        $contactScore = 0;
        if (!empty($lead->email)) {
            $contactScore += 5;
        }
        if (!empty($lead->phone)) {
            $contactScore += 5;
        }
        if ($lead->contacts()->count() > 0) {
            $contactScore += 5;
        }
        $score += min(15, $contactScore);

        // Factor 5: Activity Level (10 points)
        if ($lead->activities()->count() > 0) {
            $score += 10;
        }

        return min(100, $score);
    }

    /**
     * Get AI-enhanced match score
     */
    private function getAiMatchScore(Lead $lead, Product $product): int
    {
        $leadData = [
            'company' => $lead->company_name,
            'industry' => $lead->industry?->name ?? 'Unknown',
            'size' => $lead->company_size_estimate ?? 'Unknown',
        ];

        $productData = [
            'name' => $product->name,
            'description' => $product->description,
            'target_industry' => $product->target_industry,
            'pain_points' => $product->target_pain_points,
        ];

        $prompt = <<<PROMPT
        Rate the product-to-lead match on a scale of 0-100. Return JSON with only: { "score": number }
        
        Product: {$productData['name']}
        Target: {$productData['target_industry']}
        
        Lead Company: {$leadData['company']}
        Industry: {$leadData['industry']}
        Size: {$leadData['size']}
        PROMPT;

        $result = $this->ai->call('product_matching', $prompt);

        if ($result['success'] && $result['content']) {
            $data = json_decode($result['content'], true);
            return (int) ($data['score'] ?? 50);
        }

        return 50; // Default neutral score
    }

    /**
     * Generate human-readable match reason
     */
    private function generateMatchReason(Lead $lead, Product $product, int $score): string
    {
        $reasons = [];

        // Industry match
        if ($product->target_industry && $lead->industry?->name) {
            if (str_contains(strtolower($product->target_industry), strtolower($lead->industry->name))) {
                $reasons[] = "Strong industry alignment with {$product->target_industry}";
            }
        }

        // Size match
        if ($product->ideal_company_profile && !empty($lead->company_size_estimate)) {
            $reasons[] = "Company size matches product profile";
        }

        // Contact availability
        if ($lead->contacts()->count() > 0) {
            $reasons[] = "Contact information available";
        }

        // Activity
        if ($lead->activities()->count() > 0) {
            $reasons[] = "Lead has shown engagement";
        }

        // Score-based reason
        if ($score >= 80) {
            $reasons[] = "Excellent fit for immediate outreach";
        } elseif ($score >= 60) {
            $reasons[] = "Good fit with some alignment gaps";
        } elseif ($score >= 40) {
            $reasons[] = "Possible fit requiring further research";
        } else {
            $reasons[] = "Limited relevance; consider for future nurture";
        }

        return implode(". ", $reasons) . ".";
    }

    /**
     * Get top product recommendations for a lead
     */
    public function getTopRecommendations(Lead $lead, int $limit = 3): array
    {
        return $lead->productMatches()
            ->where('is_recommended', true)
            ->orderByDesc('match_score')
            ->limit($limit)
            ->with('product')
            ->get()
            ->toArray();
    }

    /**
     * Rematch a lead to all products
     */
    public function rematchLeadToProducts(Lead $lead): array
    {
        // Delete old matches to recalculate
        $lead->productMatches()->delete();

        // Run new matching
        return $this->matchLeadToProducts($lead);
    }
}
