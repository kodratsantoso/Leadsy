<?php

namespace App\Services\Lead;

use App\Models\Lead;
use App\Models\LeadAiAnalysis;
use App\Models\Product;
use App\Services\AI\AiOrchestrationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Lead Profiling & Strategy Service
 * Consolidates Lead AI Analysis and Product Matching into a single LLM call.
 */
class LeadProfilingAndStrategyService
{
    public function __construct(private AiOrchestrationService $ai) {}

    public function profileAndStrategize(Lead $lead, ?int $triggeredBy = null): array
    {
        $products = Product::where('status', 'active')->with('tiers')->get();
        if ($products->isEmpty()) {
            return [
                'success' => false,
                'message' => 'No active products to match against.',
            ];
        }

        $context = $this->buildContext($lead, $products);
        $result = $this->ai->call('lead_profiling_strategy', $context);

        if (!$result['success'] || empty($result['content'])) {
            return [
                'success' => false,
                'message' => 'AI call failed or returned empty response.',
            ];
        }

        $analysisData = json_decode($result['content'], true);
        if (!is_array($analysisData)) {
            return [
                'success' => false,
                'message' => 'Invalid JSON from AI.',
            ];
        }

        $now = Carbon::now();

        // 1. Save AI Analysis
        $aiAnalysis = $lead->aiAnalyses()->create([
            'relevance_score' => (int) ($analysisData['relevance_score'] ?? 50),
            'company_summary' => $analysisData['company_summary'] ?? 'Company summary unavailable.',
            'business_opportunity_summary' => $analysisData['opportunity_summary'] ?? 'Analysis pending',
            'potential_use_case' => $analysisData['potential_use_case'] ?? 'Primary use case not identified.',
            'probable_needs' => $analysisData['probable_needs'] ?? [],
            'suggested_approach' => $analysisData['suggested_approach'] ?? '',
            'risk_insight' => $analysisData['risk_insight'] ?? 'No major risk identified.',
            'urgency_level' => $analysisData['urgency_level'] ?? 'medium',
            'confidence_score' => (int) ($analysisData['confidence'] ?? 50),
        ]);

        // 2. Save Product Matches
        $lead->productMatches()->delete(); // Clear old matches
        
        $matchesSaved = [];
        if (!empty($analysisData['recommended_products']) && is_array($analysisData['recommended_products'])) {
            foreach ($analysisData['recommended_products'] as $pData) {
                $product = $products->firstWhere('id', $pData['product_id']);
                if (!$product) continue;

                $matchScore = (int) ($pData['match_score'] ?? 50);
                
                $match = $lead->productMatches()->create([
                    'product_id' => $product->id,
                    'match_score' => $matchScore,
                    'match_level' => $this->determineMatchLevel($matchScore),
                    'match_reason' => $pData['reasoning'] ?? 'No reasoning provided.',
                    'recommended_approach' => $pData['approach'] ?? '',
                    'competitor_context' => $pData['competitor_context'] ?? '',
                    'bant_analysis' => $pData['bant_analysis'] ?? [],
                    'confidence_score' => (int) ($pData['confidence'] ?? 50),
                    'is_recommended' => $matchScore >= 70,
                ]);
                $matchesSaved[] = $match;
            }
        }

        return [
            'success' => true,
            'analysis' => $aiAnalysis,
            'matches' => $matchesSaved,
        ];
    }

    private function buildContext(Lead $lead, $products): string
    {
        $lead->loadMissing(['industry', 'contacts', 'activities']);

        $leadJson = json_encode([
            'Company' => $lead->company_name,
            'Industry' => $lead->industry?->name,
            'Size' => $lead->company_size_estimate,
            'Location' => $lead->address,
            'RecentActivities' => $lead->activities->take(5)->pluck('description'),
        ], JSON_PRETTY_PRINT);

        $productCatalog = [];
        foreach ($products as $p) {
            $productCatalog[] = [
                'id' => $p->id,
                'name' => $p->name,
                'description' => $p->description,
                'target_pain_points' => $p->target_pain_points,
            ];
        }
        $productsJson = json_encode($productCatalog, JSON_PRETTY_PRINT);

        return <<<PROMPT
You are an elite B2B Sales Strategist. Given a lead profile and a product catalog, analyze the lead and recommend products.

Lead Profile:
{$leadJson}

Product Catalog:
{$productsJson}

You must return a strict JSON response containing:
- relevance_score: 0-100 (overall fit for our company)
- company_summary: short summary of the lead company
- opportunity_summary: the business opportunity for us
- potential_use_case: primary use case
- probable_needs: array of likely pain points
- suggested_approach: sales approach strategy
- risk_insight: risks to watch out for
- urgency_level: "high", "medium", or "low"
- confidence: 0-100
- recommended_products: an array of objects for each product in the catalog that is a fit, with keys:
    - product_id: (integer matching catalog ID)
    - match_score: 0-100
    - reasoning: why it fits
    - approach: how to pitch it
    - competitor_context: any known competitor info
    - bant_analysis: array with keys 'budget', 'authority', 'need', 'timeline' containing your assessment of each
    - confidence: 0-100

Return ONLY valid JSON. Do not include markdown formatting like ```json.
PROMPT;
    }

    private function determineMatchLevel(int $score): string
    {
        if ($score >= 80) return 'strong_match';
        if ($score >= 60) return 'good_match';
        if ($score >= 40) return 'weak_match';
        return 'no_match';
    }
}
