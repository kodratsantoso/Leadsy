<?php

namespace App\Services;

use App\Models\Product;
use App\Services\AI\AiOrchestrationService;
use Illuminate\Support\Str;

/**
 * Generates a structured requirement question guide for a product.
 *
 * Questions are designed for sales/presales teams to use during
 * customer discovery calls to capture the prospect's requirements
 * and assess product-market fit.
 *
 * AI feature route: product_question_generation
 * (configure provider/model in Settings → AI Defaults)
 */
class ProductQuestionGenerationService
{
    public function __construct(private AiOrchestrationService $ai) {}

    /**
     * Generate requirement-gathering questions for a product.
     *
     * @return array{success: bool, questions?: array, ai_model?: string|null, error?: string}
     */
    public function generate(Product $product): array
    {
        $prompt = $this->buildPrompt($product);

        $result = $this->ai->call('product_question_generation', $prompt, [
            'product_id'   => $product->id,
            'product_name' => $product->name,
        ]);

        if (! $result['success']) {
            return ['success' => false, 'error' => $result['error'] ?? 'AI generation failed.'];
        }

        $questions = $this->parseQuestions($result['content'] ?? '');

        if (empty($questions)) {
            return ['success' => false, 'error' => 'AI returned an empty question list. Try again.'];
        }

        return [
            'success'   => true,
            'questions' => $questions,
            'ai_model'  => $result['model'] ?? null,
        ];
    }

    /* ─────────────────────────────────────────────────────────── */

    private function buildPrompt(Product $product): string
    {
        $fields = array_filter([
            'Product Name'          => $product->name,
            'Description'           => $product->description,
            'Category'              => $product->category,
            'Target Industry'       => $product->target_industry,
            'Target Company Size'   => $product->target_company_size,
            'Target Buyer Persona'  => $product->target_buyer_persona,
            'Pain Points Addressed' => $product->target_pain_points,
            'Ideal Company Profile' => $product->ideal_company_profile,
            'Use Cases'             => is_array($product->use_cases)
                ? implode(', ', $product->use_cases)
                : $product->use_cases,
            'Budget Range'          => $product->budget_range,
            'Supported Regions'     => $product->supported_regions,
            'Competitor Notes'      => $product->competitor_notes,
        ]);

        $productContext = collect($fields)
            ->map(fn ($v, $k) => "- {$k}: {$v}")
            ->implode("\n");

        return <<<PROMPT
You are a B2B sales discovery expert. Generate a structured requirement-gathering question guide for the product below.

PRODUCT CONTEXT:
{$productContext}

TASK:
Generate 12-18 discovery questions that a sales or presales team should ask a potential customer during a qualification call. Questions should help uncover:
1. Current State / Pain Points
2. Requirements & Desired Outcomes
3. Budget & Timeline
4. Decision Process & Stakeholders
5. Technical Fit
6. Competitive Landscape

RULES:
- Questions must be open-ended and conversational
- Each question must belong to one of these exact categories: "Current State", "Requirements", "Budget & Timeline", "Decision Process", "Technical Fit", "Competition"
- Output ONLY valid JSON — no markdown, no explanation, no extra text
- Preferred output is a JSON object with a "questions" array
- Each item must have exactly these keys: "id" (short UUID-like string), "text" (the question), "category" (from the list above), "order" (integer starting at 1)

EXAMPLE FORMAT:
{
  "questions": [
    {"id":"q1","text":"What does your current process look like for [X]?","category":"Current State","order":1},
    {"id":"q2","text":"What specific outcomes are you hoping to achieve?","category":"Requirements","order":2}
  ]
}
PROMPT;
    }

    private function parseQuestions(string $content): array
    {
        // Strip potential markdown code fences
        $json = preg_replace('/^```(?:json)?\s*/i', '', trim($content));
        $json = preg_replace('/\s*```$/', '', trim($json));
        $json = trim($json);

        $decoded = json_decode($json, true);

        if (! is_array($decoded)) {
            // Older prompts asked for a raw JSON array. Try to recover an array
            // embedded in additional text or markdown.
            $start = strpos($json, '[');
            $end   = strrpos($json, ']');

            if ($start === false || $end === false || $end <= $start) {
                return [];
            }

            $decoded = json_decode(substr($json, $start, $end - $start + 1), true);
        }

        if (! is_array($decoded)) {
            return [];
        }

        if (isset($decoded['questions']) && is_array($decoded['questions'])) {
            $decoded = $decoded['questions'];
        }

        $questions = [];
        foreach ($decoded as $i => $item) {
            if (! is_array($item) || empty($item['text'])) {
                continue;
            }

            $questions[] = [
                'id'       => $item['id'] ?? ('q' . ($i + 1)),
                'text'     => trim((string) $item['text']),
                'category' => $this->normalizeCategory($item['category'] ?? ''),
                'order'    => (int) ($item['order'] ?? ($i + 1)),
            ];
        }

        // Sort by order
        usort($questions, fn ($a, $b) => $a['order'] <=> $b['order']);

        return $questions;
    }

    private function normalizeCategory(string $category): string
    {
        $allowed = [
            'Current State',
            'Requirements',
            'Budget & Timeline',
            'Decision Process',
            'Technical Fit',
            'Competition',
        ];

        $category = trim($category);

        foreach ($allowed as $a) {
            if (strcasecmp($category, $a) === 0) {
                return $a;
            }
        }

        // Fuzzy match
        foreach ($allowed as $a) {
            if (str_contains(strtolower($category), strtolower(explode(' ', $a)[0]))) {
                return $a;
            }
        }

        return 'Requirements';
    }
}
