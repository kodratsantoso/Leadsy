<?php

namespace App\Services\Maps;

use App\Models\GeoProductFitAnalysis;
use App\Models\Product;
use App\Services\AI\AiOrchestrationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Geo Product Fit Service — Maps & Territory / Geo-Based Product Fit Intelligence
 *
 * Implements a two-phase strategy:
 *   1. Deterministic rule-based pre-score (cheap, instant)
 *   2. AI-powered deep analysis via Settings → AI Default (feature: geo_product_fit_analysis)
 *
 * Results are persisted in geo_product_fit_analyses keyed by (place_id, product_id).
 * Cached results are reused when neither place nor product metadata has changed.
 */
class GeoProductFitService
{
    const FEATURE_NAME = 'geo_product_fit_analysis';

    const MAX_AI_BATCH = 3;

    public function __construct(private AiOrchestrationService $ai) {}

    /* ══════════════════════════════════════════════════════════════════
     * PUBLIC API
     * ══════════════════════════════════════════════════════════════════ */

    /**
     * Analyze a batch of discovered places against a product.
     * Applies rule-based pre-score to all, then AI-analyzes top candidates up to $aiLimit.
     *
     * @param  array  $places  Array of place payloads (from Maps search)
     * @param  int  $aiLimit  Max places to analyze with AI this run
     * @return array<GeoProductFitAnalysis>
     */
    public function batchAnalyze(array $places, Product $product, int $userId, int $aiLimit = self::MAX_AI_BATCH): array
    {
        $productHash = $this->hashProduct($product);
        $results = [];

        // Phase 1: Pre-score all places (deterministic, free)
        $prescored = [];
        foreach ($places as $place) {
            $placeId = $place['external_place_id'] ?? $place['place_id'] ?? null;
            if (! $placeId) {
                continue;
            }

            $sourceHash = $this->hashPlace($place);

            // Check cache first
            $cached = $this->getCached($placeId, $product->id, $sourceHash, $productHash);
            if ($cached) {
                $results[] = $cached;

                continue;
            }

            $preScore = $this->preScore($place, $product);
            $prescored[] = [
                'place' => $place,
                'place_id' => $placeId,
                'source_hash' => $sourceHash,
                'pre_score' => $preScore,
            ];
        }

        // Phase 2: Sort prescored by pre_score desc, take top $aiLimit for AI
        usort($prescored, fn ($a, $b) => $b['pre_score'] <=> $a['pre_score']);
        $aiCandidates = array_slice($prescored, 0, $aiLimit);
        $ruleOnly = array_slice($prescored, $aiLimit);

        // Store rule-only results (no AI, use pre_score as fit_score)
        foreach ($ruleOnly as $item) {
            $record = $this->persistPreScoreOnly(
                $item['place_id'],
                $product,
                $item['place'],
                $item['pre_score'],
                $item['source_hash'],
                $productHash,
                $userId
            );
            $results[] = $record;
        }

        // AI analyze top candidates
        foreach ($aiCandidates as $item) {
            $record = $this->analyzeWithAi(
                $item['place'],
                $item['place_id'],
                $product,
                $item['pre_score'],
                $item['source_hash'],
                $productHash,
                $userId
            );
            $results[] = $record;
        }

        return $results;
    }

    /**
     * Analyze a single place against a product (with AI if available).
     */
    public function analyzeSingle(array $place, Product $product, int $userId): GeoProductFitAnalysis
    {
        $placeId = $place['external_place_id'] ?? $place['place_id'] ?? '';
        $sourceHash = $this->hashPlace($place);
        $productHash = $this->hashProduct($product);

        $cached = $this->getCached($placeId, $product->id, $sourceHash, $productHash);
        if ($cached) {
            return $cached;
        }

        $preScore = $this->preScore($place, $product);

        return $this->analyzeWithAi($place, $placeId, $product, $preScore, $sourceHash, $productHash, $userId);
    }

    /**
     * Get all cached analyses for a set of place_ids + product_id.
     *
     * @param  string[]  $placeIds
     * @return array<string, GeoProductFitAnalysis> Keyed by place_id
     */
    public function getCachedResults(array $placeIds, int $productId): array
    {
        return GeoProductFitAnalysis::where('product_id', $productId)
            ->whereIn('place_id', $placeIds)
            ->get()
            ->keyBy('place_id')
            ->all();
    }

    /* ══════════════════════════════════════════════════════════════════
     * RULE-BASED PRE-SCORE
     * ══════════════════════════════════════════════════════════════════ */

    /**
     * Deterministic pre-score (0-100) based on place metadata vs product ICP.
     */
    public function preScore(array $place, Product $product): int
    {
        $score = 0;

        $placeCategory = strtolower($place['business_category'] ?? $place['category'] ?? '');
        $placeName = strtolower($place['company_name'] ?? $place['name'] ?? '');

        // --- Category / industry alignment (30 pts) ---
        $targetIndustry = strtolower($product->target_industry ?? '');
        if ($targetIndustry && $placeCategory) {
            $industryTerms = preg_split('/[\s,;|]+/', $targetIndustry);
            foreach ($industryTerms as $term) {
                if (strlen($term) >= 3 && str_contains($placeCategory, $term)) {
                    $score += 30;
                    break;
                }
            }
        }

        // --- Keyword match in name or category (25 pts) ---
        $keywords = is_array($product->keywords) ? $product->keywords : [];
        if ($keywords) {
            foreach ($keywords as $kw) {
                $kw = strtolower(trim((string) $kw));
                if (strlen($kw) >= 3 && (str_contains($placeName, $kw) || str_contains($placeCategory, $kw))) {
                    $score += 25;
                    break;
                }
            }
        }

        // --- Region / location match (15 pts) ---
        $supportedRegions = strtolower($product->supported_regions ?? '');
        $placeAddress = strtolower($place['address'] ?? '');
        if ($supportedRegions && $placeAddress) {
            $regionTerms = preg_split('/[\s,;|]+/', $supportedRegions);
            foreach ($regionTerms as $term) {
                if (strlen($term) >= 3 && str_contains($placeAddress, $term)) {
                    $score += 15;
                    break;
                }
            }
        }

        // --- Data completeness signals (15 pts) ---
        if (! empty($place['website'])) {
            $score += 7;
        }
        if (! empty($place['phone'])) {
            $score += 5;
        }
        if (! empty($place['email'])) {
            $score += 3;
        }

        // --- Rating / review quality (15 pts) ---
        $rating = (float) ($place['rating'] ?? 0);
        $reviewCount = (int) ($place['review_count'] ?? $place['user_ratings_total'] ?? 0);
        if ($rating >= 4.0 && $reviewCount >= 20) {
            $score += 15;
        } elseif ($rating >= 3.5 && $reviewCount >= 5) {
            $score += 8;
        } elseif ($rating > 0) {
            $score += 3;
        }

        return min(100, $score);
    }

    /* ══════════════════════════════════════════════════════════════════
     * AI ANALYSIS
     * ══════════════════════════════════════════════════════════════════ */

    private function analyzeWithAi(
        array $place, string $placeId, Product $product,
        int $preScore, string $sourceHash, string $productHash, int $userId
    ): GeoProductFitAnalysis {
        $prompt = $this->buildPrompt($place, $product);

        $aiResult = $this->ai->call(self::FEATURE_NAME, $prompt, [
            'entity_type' => 'geo_product_fit',
            'entity_id' => $placeId.'_'.$product->id,
            'check_collision' => false,
        ]);

        if (! $aiResult['success'] || empty($aiResult['content'])) {
            Log::warning('[GeoProductFit] AI call failed, falling back to pre-score', [
                'place_id' => $placeId,
                'product_id' => $product->id,
                'error' => $aiResult['error'] ?? 'unknown',
            ]);

            return $this->persistPreScoreOnly($placeId, $product, $place, $preScore, $sourceHash, $productHash, $userId);
        }

        $parsed = json_decode($aiResult['content'], true);
        if (! is_array($parsed)) {
            return $this->persistPreScoreOnly($placeId, $product, $place, $preScore, $sourceHash, $productHash, $userId);
        }

        $fitScore = min(100, max(0, (int) ($parsed['fit_score'] ?? $preScore)));
        $fitLevel = $this->scoreToLevel($fitScore);
        $confidence = min(100, max(0, (int) ($parsed['confidence_score'] ?? 50)));

        return $this->upsertRecord($placeId, $product->id, [
            'fit_score' => $fitScore,
            'fit_level' => $fitLevel,
            'confidence_score' => $confidence,
            'reasoning' => $parsed['reasoning'] ?? [],
            'matched_signals' => $parsed['matched_signals'] ?? [],
            'missing_information' => $parsed['missing_information'] ?? [],
            'risk_flags' => $parsed['risk_flags'] ?? [],
            'recommended_approach' => $parsed['recommended_approach'] ?? null,
            'recommended_next_action' => $parsed['recommended_next_action'] ?? null,
            'potential_use_case' => $parsed['potential_use_case'] ?? null,
            'pre_fit_score' => $preScore,
            'analyzed_with_ai' => true,
            'ai_provider_used' => $aiResult['provider'] ?? null,
            'ai_model_used' => $aiResult['model'] ?? null,
            'source_payload_hash' => $sourceHash,
            'product_payload_hash' => $productHash,
            'analyzed_at' => Carbon::now(),
            'created_by' => $userId,
        ]);
    }

    private function buildPrompt(array $place, Product $product): string
    {
        $placeJson = json_encode([
            'name' => $place['company_name'] ?? $place['name'] ?? '',
            'address' => $place['address'] ?? '',
            'category' => $place['business_category'] ?? $place['category'] ?? '',
            'phone' => $place['phone'] ?? null,
            'website' => $place['website'] ?? null,
            'rating' => $place['rating'] ?? null,
            'review_count' => $place['review_count'] ?? $place['user_ratings_total'] ?? null,
            'google_maps_url' => $place['google_maps_url'] ?? null,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        $productJson = json_encode([
            'name' => $product->name,
            'category' => $product->category,
            'description' => $product->description,
            'target_industry' => $product->target_industry,
            'target_company_size' => $product->target_company_size ?? $product->ideal_company_profile,
            'target_pain_points' => $product->target_pain_points,
            'target_buyer_persona' => $product->target_buyer_persona,
            'budget_range' => $product->budget_range,
            'use_cases' => $product->use_cases,
            'keywords' => $product->keywords,
            'supported_regions' => $product->supported_regions,
            'competitor_notes' => $product->competitor_notes,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        return <<<PROMPT
You are a B2B sales intelligence engine. Evaluate the product-fit between a discovered business location and a product's ICP (Ideal Customer Profile).

## PRODUCT ICP
{$productJson}

## DISCOVERED BUSINESS
{$placeJson}

## TASK
Analyze the business based on all available signals and score how well it matches the product's ICP. Consider:
1. Industry/category relevance to product target industry
2. Location fit relative to supported regions
3. Product use-case relevance for this type of business
4. Pain point likelihood based on business category and scale signals
5. Company/business scale (inferred from category, rating count, web presence)
6. Buyer persona likelihood (what roles are typical in this business type)
7. Budget fit signal if inferable from business scale/type
8. Digital/operational maturity (inferred from website, rating quality)
9. Competitor replacement opportunity if inferable
10. Data confidence given available information

Scoring guide:
- 80-100 = High Fit
- 60-79 = Medium Fit
- 40-59 = Low Fit
- <40 = Weak / Not Recommended

Return ONLY valid JSON — no markdown, no explanation outside JSON:
{
  "fit_score": 0-100,
  "fit_level": "high | medium | low | unknown",
  "confidence_score": 0-100,
  "reasoning": ["Specific reason 1", "Specific reason 2", "Specific reason 3"],
  "matched_signals": ["Signal 1", "Signal 2"],
  "missing_information": ["Missing field 1", "Missing field 2"],
  "recommended_approach": "Specific outreach or sales approach for this business",
  "recommended_next_action": "Immediate next action",
  "potential_use_case": "Most likely use case for this business",
  "risk_flags": ["Risk 1", "Risk 2"]
}
PROMPT;
    }

    /* ══════════════════════════════════════════════════════════════════
     * PERSISTENCE HELPERS
     * ══════════════════════════════════════════════════════════════════ */

    private function persistPreScoreOnly(
        string $placeId, Product $product, array $place,
        int $preScore, string $sourceHash, string $productHash, int $userId
    ): GeoProductFitAnalysis {
        $fitLevel = $this->scoreToLevel($preScore);

        return $this->upsertRecord($placeId, $product->id, [
            'fit_score' => $preScore,
            'fit_level' => $fitLevel,
            'confidence_score' => 40,
            'reasoning' => ['Rule-based pre-score. AI analysis pending or unavailable.'],
            'matched_signals' => [],
            'missing_information' => [],
            'risk_flags' => [],
            'pre_fit_score' => $preScore,
            'analyzed_with_ai' => false,
            'source_payload_hash' => $sourceHash,
            'product_payload_hash' => $productHash,
            'analyzed_at' => Carbon::now(),
            'created_by' => $userId,
        ]);
    }

    private function upsertRecord(string $placeId, int $productId, array $data): GeoProductFitAnalysis
    {
        $record = GeoProductFitAnalysis::where('place_id', $placeId)
            ->where('product_id', $productId)
            ->first();

        if ($record) {
            $record->update($data);

            return $record->fresh();
        }

        return GeoProductFitAnalysis::create(array_merge($data, [
            'place_id' => $placeId,
            'product_id' => $productId,
        ]));
    }

    private function getCached(string $placeId, int $productId, string $sourceHash, string $productHash): ?GeoProductFitAnalysis
    {
        return GeoProductFitAnalysis::where('place_id', $placeId)
            ->where('product_id', $productId)
            ->where('source_payload_hash', $sourceHash)
            ->where('product_payload_hash', $productHash)
            ->where('analyzed_with_ai', true)
            ->first();
    }

    private function scoreToLevel(int $score): string
    {
        return match (true) {
            $score >= 80 => 'high',
            $score >= 60 => 'medium',
            $score >= 40 => 'low',
            default => 'unknown',
        };
    }

    private function hashPlace(array $place): string
    {
        $key = ($place['external_place_id'] ?? $place['place_id'] ?? '')
            .($place['business_category'] ?? $place['category'] ?? '')
            .($place['website'] ?? '')
            .($place['phone'] ?? '')
            .($place['rating'] ?? '');

        return hash('sha256', $key);
    }

    private function hashProduct(Product $product): string
    {
        $key = $product->id
            .($product->description ?? '')
            .($product->target_industry ?? '')
            .($product->target_pain_points ?? '')
            .json_encode($product->keywords ?? []);

        return hash('sha256', $key);
    }
}
