<?php

namespace App\Services\Product;

use App\Models\Product;
use App\Models\ProductScrapeRun;
use App\Models\ProductSpecificationComparison;
use App\Models\ProductUpdateSuggestion;
use App\Models\AiFeatureRoute;
use App\Models\AiGeneratedOutput;
use App\Services\Ai\GoogleGeminiClient; // Assume this exists or use Http directly
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class ProductSpecificationComparisonService
{
    /**
     * Compare the current product with the scraped run via AI
     */
    public function compare(Product $product, ProductScrapeRun $run, ?int $userId = null): ProductSpecificationComparison
    {
        $route = AiFeatureRoute::where('feature_name', 'product_specification_comparison')->first();
        if (!$route) {
            throw new Exception("AI Feature Route for product_specification_comparison not found");
        }

        $promptTemplate = \App\Models\AiPromptTemplate::where('feature_name', 'product_specification_comparison')->first();
        $template = $promptTemplate ? $promptTemplate->activeVersion : null;
        if (!$template) {
            throw new Exception("Active Prompt Template not found for feature product_specification_comparison");
        }

        $currentData = [
            'name' => $product->name,
            'description' => $product->description,
            'category' => $product->category,
            'target_industry' => $product->target_industry,
            'target_company_size' => $product->target_company_size,
            'target_buyer_persona' => $product->target_buyer_persona,
            'budget_range' => $product->budget_range,
            'supported_regions' => $product->supported_regions,
            'keywords' => $product->keywords,
            'target_pain_points' => $product->target_pain_points,
            'use_cases' => $product->use_cases,
            'ideal_company_profile' => $product->ideal_company_profile,
            'competitor_notes' => $product->competitor_notes,
            'features' => $product->features ?? null,
            'pricing_notes' => $product->budget_range,
            'target_audience' => $product->target_buyer_persona,
        ];

        // Replace placeholders in prompt
        $prompt = str_replace(
            ['{{current_product_json}}', '{{scraped_text}}'],
            [json_encode($currentData, JSON_PRETTY_PRINT), substr($run->cleaned_text, 0, 15000)], // Limit scraped text
            $template->content
        );

        $apiKey = $route->aiModel->aiProvider->decrypted_api_key ?? config('services.gemini.key');
        if (!$apiKey) {
            throw new Exception("AI Provider API key is not configured");
        }

        if (str_contains(strtoupper($apiKey), 'PLACEHOLDER') || empty($apiKey)) {
            $aiResult = [
                'latest_snapshot' => $currentData,
                'changes' => [
                    [
                        'field' => 'description',
                        'old_value' => $currentData['description'] ?? '',
                        'new_value' => 'Updated description from mocked AI scraping (Placeholder API Key).',
                        'type' => 'updated',
                        'reason' => 'Mock AI response due to placeholder API key.',
                    ]
                ],
                'confidence_score' => 95,
                'highlights' => []
            ];
        } else {
            // Make AI Call
            $response = Http::withHeaders(['Content-Type' => 'application/json'])
                ->post("https://generativelanguage.googleapis.com/v1beta/models/{$route->aiModel->name}:generateContent?key={$apiKey}", [
                    'contents' => [
                        ['parts' => [['text' => $prompt]]]
                    ],
                    'generationConfig' => [
                        'responseMimeType' => 'application/json',
                        'temperature' => $template->temperature ?? 0.2,
                    ]
                ]);

            if (!$response->successful()) {
                throw new Exception("AI Call failed: " . $response->body());
            }

            $aiResultStr = $response->json('candidates.0.content.parts.0.text');
            
            // Clean markdown if AI included it
            if (preg_match('/```(?:json)?\s*(.*?)\s*```/s', $aiResultStr, $matches)) {
                $aiResultStr = $matches[1];
            }

            $aiResult = json_decode($aiResultStr, true);

            if (!$aiResult) {
                throw new Exception("Failed to parse JSON from AI response");
            }
        }

        // Create Comparison Record
        $comparison = ProductSpecificationComparison::create([
            'product_id' => $product->id,
            'scrape_run_id' => $run->id,
            'previous_snapshot_json' => $currentData,
            'latest_snapshot_json' => $aiResult['latest_snapshot'] ?? [],
            'comparison_result_json' => $aiResult,
            'update_recommendation_json' => $aiResult['recommendations'] ?? [],
            'confidence_score' => $aiResult['confidence_score'] ?? 80,
            'status' => 'draft',
        ]);

        // Save into AI outputs for governance
        AiGeneratedOutput::create([
            'entity_type' => ProductSpecificationComparison::class,
            'entity_id' => $comparison->id,
            'feature_key' => 'product_specification_comparison',
            'original_output_json' => $aiResult,
            'current_output_json' => $aiResult,
            'status' => 'draft',
            'ai_provider' => $route->aiModel->aiProvider->name ?? 'Google',
            'ai_model' => $route->aiModel->name,
            'prompt_version' => $template->version,
            'generated_by' => $userId,
            'generated_at' => now(),
        ]);

        // Generate Update Suggestions
        if (isset($aiResult['changes']) && is_array($aiResult['changes'])) {
            foreach ($aiResult['changes'] as $change) {
                ProductUpdateSuggestion::create([
                    'product_id' => $product->id,
                    'comparison_id' => $comparison->id,
                    'field_name' => $change['field'],
                    'current_value' => is_array($change['old_value']) ? json_encode($change['old_value']) : $change['old_value'],
                    'suggested_value' => is_array($change['new_value']) ? json_encode($change['new_value']) : $change['new_value'],
                    'change_type' => $change['type'], // added | updated | removed
                    'reason' => $change['reason'] ?? '',
                    'status' => 'pending',
                ]);
            }
        }

        return $comparison;
    }

    /**
     * Apply approved suggestions to the product
     */
    public function applyApprovedSuggestions(ProductSpecificationComparison $comparison)
    {
        $product = $comparison->product;
        // Query both pending (awaiting user approval) and approved suggestions
        $suggestions = $comparison->updateSuggestions()->whereIn('status', ['pending', 'approved'])->get();

        foreach ($suggestions as $suggestion) {
            $field = $suggestion->field_name;
            $val = $suggestion->suggested_value;

            // Normalize alias field names
            if ($field === 'pricing_notes') {
                $field = 'budget_range';
            } elseif ($field === 'target_audience') {
                $field = 'target_buyer_persona';
            }

            if (in_array($field, [
                'name',
                'description',
                'category',
                'target_industry',
                'target_company_size',
                'target_buyer_persona',
                'target_pain_points',
                'ideal_company_profile',
                'budget_range',
                'supported_regions',
                'competitor_notes',
            ])) {
                $product->$field = is_array($val) ? implode(', ', $val) : $val;
            } elseif (in_array($field, ['features', 'use_cases', 'keywords'])) {
                if (is_array($val)) {
                    $product->$field = $val;
                } else {
                    $decoded = json_decode((string) $val, true);
                    $product->$field = is_array($decoded) ? $decoded : array_values(array_filter(array_map('trim', explode(',', (string) $val))));
                }
            }

            $suggestion->update(['status' => 'applied']);
        }

        $product->save();
        $comparison->update([
            'status' => 'approved',
            'reviewed_by' => auth()->id(),
            'reviewed_at' => now(),
        ]);

        return $product;
    }
}
