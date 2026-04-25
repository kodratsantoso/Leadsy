<?php

namespace App\Services;

use App\Models\Product;
use App\Services\AI\AiOrchestrationService;
use Illuminate\Support\Facades\Log;

/**
 * ICP Generation Service
 *
 * Reads active products from the database and uses AI to synthesise
 * one or more Ideal Customer Profile suggestions.
 *
 * The generated profiles are returned as suggestion arrays —
 * they are NOT persisted automatically. The user reviews and saves via the UI.
 */
class IcpGenerationService
{
    public function __construct(private AiOrchestrationService $ai) {}

    /**
     * Generate ICP suggestions from all active products.
     *
     * @param  string  $mode  'combined' = one ICP for the whole portfolio
     *                        'per_category' = one ICP per distinct product category
     * @return array{suggestions: array, products_analysed: int, mode: string, ai_model: string|null}
     */
    public function generate(string $mode = 'combined'): array
    {
        $products = Product::where('status', 'active')
            ->select([
                'id', 'name', 'category', 'description',
                'target_industry', 'target_company_size', 'target_pain_points',
                'target_buyer_persona', 'ideal_company_profile',
                'budget_range', 'use_cases', 'competitor_notes',
                'keywords', 'supported_regions',
            ])
            ->get();

        if ($products->isEmpty()) {
            return [
                'suggestions'       => [],
                'products_analysed' => 0,
                'mode'              => $mode,
                'ai_model'          => null,
                'error'             => 'No active products found. Add products with targeting metadata first.',
            ];
        }

        if ($mode === 'per_category') {
            return $this->generatePerCategory($products, $mode);
        }

        return $this->generateCombined($products, $mode);
    }

    /* ── Combined (one ICP across all products) ───────────────────── */

    private function generateCombined(\Illuminate\Support\Collection $products, string $mode): array
    {
        $prompt  = $this->buildPrompt($products->toArray(), 'combined');
        $result  = $this->ai->call('icp_generation', $prompt, [
            'entity_type' => 'icp_generation',
            'entity_id'   => 'combined_' . md5($products->pluck('id')->join(',')),
        ]);

        if (!$result['success'] || empty($result['content'])) {
            return $this->errorResult($mode, $products->count(), $result['error'] ?? 'AI call failed');
        }

        $parsed = json_decode($result['content'], true);
        if (!is_array($parsed)) {
            return $this->errorResult($mode, $products->count(), 'AI returned invalid JSON');
        }

        // Normalise: AI may return a single object or an array
        $suggestions = isset($parsed[0]) ? $parsed : [$parsed];

        return [
            'suggestions'       => $this->normaliseSuggestions($suggestions),
            'products_analysed' => $products->count(),
            'mode'              => $mode,
            'ai_model'          => $result['model'] ?? null,
        ];
    }

    /* ── Per-category (one ICP per distinct category) ─────────────── */

    private function generatePerCategory(\Illuminate\Support\Collection $products, string $mode): array
    {
        $categories = $products->groupBy(fn ($p) => $p->category ?: 'Uncategorised');
        $suggestions = [];
        $aiModel     = null;

        foreach ($categories as $category => $group) {
            $prompt = $this->buildPrompt($group->toArray(), 'per_category', $category);
            $result = $this->ai->call('icp_generation', $prompt, [
                'entity_type' => 'icp_generation',
                'entity_id'   => 'cat_' . md5($category),
            ]);

            if (!$result['success'] || empty($result['content'])) {
                Log::warning('[IcpGeneration] Category failed', ['category' => $category]);
                continue;
            }

            $parsed = json_decode($result['content'], true);
            if (!is_array($parsed)) continue;

            $single      = isset($parsed[0]) ? $parsed[0] : $parsed;
            $suggestions = array_merge($suggestions, $this->normaliseSuggestions([$single]));
            $aiModel     = $result['model'] ?? $aiModel;
        }

        return [
            'suggestions'       => $suggestions,
            'products_analysed' => $products->count(),
            'mode'              => $mode,
            'ai_model'          => $aiModel,
        ];
    }

    /* ── Prompt builder ───────────────────────────────────────────── */

    private function buildPrompt(array $products, string $mode, string $category = ''): string
    {
        $productJson = json_encode(array_map(function ($p) {
            return [
                'name'                => $p['name'] ?? null,
                'category'            => $p['category'] ?? null,
                'description'         => $p['description'] ?? null,
                'target_industry'     => $p['target_industry'] ?? null,
                'target_company_size' => $p['target_company_size'] ?? null,
                'target_pain_points'  => $p['target_pain_points'] ?? null,
                'target_buyer_persona'=> $p['target_buyer_persona'] ?? null,
                'ideal_company_profile'=> $p['ideal_company_profile'] ?? null,
                'budget_range'        => $p['budget_range'] ?? null,
                'use_cases'           => $p['use_cases'] ?? null,
                'competitor_notes'    => $p['competitor_notes'] ?? null,
                'keywords'            => $p['keywords'] ?? null,
                'supported_regions'   => $p['supported_regions'] ?? null,
            ];
        }, $products), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        $categoryContext = $category ? "\nFocus only on the '{$category}' product category." : '';
        $modeInstruction = $mode === 'per_category'
            ? "Generate ONE ICP profile specifically for the products in this category.{$categoryContext}"
            : "Synthesise ONE combined ICP profile that represents the ideal customer across the entire product portfolio.";

        return <<<PROMPT
You are an expert B2B go-to-market strategist. Analyse the product portfolio below and generate an Ideal Customer Profile (ICP).

## TASK
{$modeInstruction}

## PRODUCTS
{$productJson}

## INSTRUCTIONS
- Base all conclusions strictly on the product data above.
- Identify the common target segment (industry, company size, buyer persona, pain points, geography).
- Suggest appropriate scoring weights for lead evaluation (values 0.00–1.00, sum should equal 1.00).
- Be specific and actionable — avoid vague language like "any industry".
- If product data is sparse, state what is missing in missing_data_notes.

## OUTPUT FORMAT
Return ONLY valid JSON — no markdown, no explanation outside the JSON:
{
  "name": "Suggested ICP profile name (descriptive, e.g. 'Mid-Market Manufacturing Indonesia')",
  "description": "2–3 sentence description of the ideal customer this profile targets",
  "target_industries": ["Industry 1", "Industry 2"],
  "target_company_sizes": ["51-200", "201-500"],
  "target_territories": ["Indonesia", "Malaysia"],
  "min_lead_score": 50,
  "weight_lead_score": 0.30,
  "weight_industry": 0.25,
  "weight_company_size": 0.20,
  "weight_territory": 0.15,
  "weight_contact_info": 0.10,
  "reasoning": "Brief explanation of why these parameters were chosen",
  "missing_data_notes": "What product metadata is missing that would improve this ICP",
  "confidence": 0
}
PROMPT;
    }

    /* ── Normalisation ────────────────────────────────────────────── */

    private function normaliseSuggestions(array $raw): array
    {
        return array_values(array_filter(array_map(function ($item) {
            if (!is_array($item) || empty($item['name'])) return null;

            return [
                'name'                 => (string) ($item['name'] ?? ''),
                'description'          => (string) ($item['description'] ?? ''),
                'target_industries'    => (array)  ($item['target_industries'] ?? []),
                'target_company_sizes' => (array)  ($item['target_company_sizes'] ?? []),
                'target_territories'   => (array)  ($item['target_territories'] ?? []),
                'min_lead_score'       => (int)    ($item['min_lead_score'] ?? 0),
                'weight_lead_score'    => (float)  ($item['weight_lead_score'] ?? 0.30),
                'weight_industry'      => (float)  ($item['weight_industry'] ?? 0.25),
                'weight_company_size'  => (float)  ($item['weight_company_size'] ?? 0.20),
                'weight_territory'     => (float)  ($item['weight_territory'] ?? 0.15),
                'weight_contact_info'  => (float)  ($item['weight_contact_info'] ?? 0.10),
                'reasoning'            => (string) ($item['reasoning'] ?? ''),
                'missing_data_notes'   => (string) ($item['missing_data_notes'] ?? ''),
                'confidence'           => (int)    ($item['confidence'] ?? 50),
                'is_active'            => true,
            ];
        }, $raw)));
    }

    private function errorResult(string $mode, int $count, string $error): array
    {
        return [
            'suggestions'       => [],
            'products_analysed' => $count,
            'mode'              => $mode,
            'ai_model'          => null,
            'error'             => $error,
        ];
    }
}
