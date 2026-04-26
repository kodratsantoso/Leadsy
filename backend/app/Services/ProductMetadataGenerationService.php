<?php

namespace App\Services;

use App\Services\AI\AiOrchestrationService;
use Illuminate\Support\Facades\Log;

/**
 * Generates full product metadata from a product name using AI.
 *
 * Category selection is constrained to the provided list from the database —
 * the AI cannot invent new category values.
 *
 * Called by ProductController::aiGenerate().
 * Feature route: product_metadata_generation (configure in Settings → AI Defaults)
 */
class ProductMetadataGenerationService
{
    public function __construct(private AiOrchestrationService $ai) {}

    /**
     * @param  string  $productName
     * @param  array   $availableCategories  Distinct values loaded from DB (products + industries)
     * @return array{success: bool, data?: array, ai_model?: string|null, error?: string}
     */
    public function generate(string $productName, array $availableCategories): array
    {
        $prompt = $this->buildPrompt($productName, $availableCategories);

        $result = $this->ai->call('product_metadata_generation', $prompt, [
            'entity_type' => 'product_metadata',
            'entity_id'   => md5($productName),
        ]);

        if (! $result['success'] || empty($result['content'])) {
            Log::warning('[ProductMetadataGen] AI call failed', [
                'product_name' => $productName,
                'error'        => $result['error'] ?? 'unknown',
            ]);
            return ['success' => false, 'error' => $result['error'] ?? 'AI call failed'];
        }

        // Strip markdown fences if AI wraps in ```json ... ```
        $raw = preg_replace('/^```(?:json)?\s*|\s*```$/s', '', trim($result['content']));
        $parsed = json_decode($raw, true);

        if (! is_array($parsed)) {
            Log::warning('[ProductMetadataGen] AI returned invalid JSON', [
                'product_name' => $productName,
                'raw'          => substr($result['content'], 0, 300),
            ]);
            return ['success' => false, 'error' => 'AI returned invalid JSON — please retry'];
        }

        return [
            'success'  => true,
            'data'     => $this->normalise($parsed, $availableCategories),
            'ai_model' => $result['model'] ?? null,
        ];
    }

    /* ── Prompt ─────────────────────────────────────────────────────────── */

    private function buildPrompt(string $productName, array $availableCategories): string
    {
        $categoriesJson = json_encode(array_values($availableCategories), JSON_UNESCAPED_UNICODE);

        return <<<PROMPT
You are a B2B product metadata expert for an Indonesian sales intelligence platform.

## TASK
Generate complete product metadata for the following product name.

## PRODUCT NAME
{$productName}

## AVAILABLE CATEGORIES (you MUST choose from this list only)
{$categoriesJson}

## CONTEXT
- Platform target market: Indonesia B2B (manufacturing, retail, tech, finance, logistics, etc.)
- Output language: English
- Be specific and actionable — not vague

## OUTPUT FORMAT
Return ONLY valid JSON — no markdown, no code fences, no extra text:
{
  "description": "2-3 sentence product description explaining what it does and who it helps",
  "categories": ["Category from available list", "Another if applicable"],
  "target_industries": ["Industry 1", "Industry 2"],
  "company_size": "e.g. 51-200, 201-500 employees",
  "buyer_persona": ["Title 1", "Title 2", "Title 3"],
  "budget_range": "e.g. IDR 50M - 500M / year",
  "regions": ["Indonesia", "Malaysia"],
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "pain_points": ["Specific pain point 1", "Specific pain point 2", "Specific pain point 3"],
  "use_cases": ["Use case 1", "Use case 2", "Use case 3"],
  "competitor_context": "Brief description of key competitors and our differentiation",
  "ideal_company_profile": "Concise description of the ideal target company"
}
PROMPT;
    }

    /* ── Normalise AI output → product schema ───────────────────────────── */

    private function normalise(array $raw, array $availableCategories): array
    {
        $categorySet = array_map('strtolower', $availableCategories);

        // Validate each AI-suggested category against the available list (case-insensitive)
        $validCategories = collect($raw['categories'] ?? [])
            ->filter(fn ($cat) => in_array(strtolower((string) $cat), $categorySet, true))
            ->map(fn ($cat) => (string) $cat)
            ->unique()
            ->values()
            ->all();

        // pain_points may be array or string
        $painPoints = $raw['pain_points'] ?? '';
        if (is_array($painPoints)) {
            $painPoints = implode("\n", $painPoints);
        }

        return [
            'description'           => (string) ($raw['description'] ?? ''),
            'category'              => implode(', ', $validCategories),
            'target_industry'       => implode(', ', array_map('strval', (array) ($raw['target_industries'] ?? []))),
            'target_company_size'   => (string) ($raw['company_size'] ?? ''),
            'target_buyer_persona'  => implode(', ', array_map('strval', (array) ($raw['buyer_persona'] ?? []))),
            'budget_range'          => (string) ($raw['budget_range'] ?? ''),
            'supported_regions'     => implode(', ', array_map('strval', (array) ($raw['regions'] ?? []))),
            'keywords'              => array_map('strval', (array) ($raw['keywords'] ?? [])),
            'target_pain_points'    => (string) $painPoints,
            'use_cases'             => array_map('strval', (array) ($raw['use_cases'] ?? [])),
            'competitor_notes'      => (string) ($raw['competitor_context'] ?? ''),
            'ideal_company_profile' => (string) ($raw['ideal_company_profile'] ?? ''),
        ];
    }
}
