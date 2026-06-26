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
        $route = AiFeatureRoute::where('feature_key', 'product_specification_comparison')->first();
        if (!$route) {
            throw new Exception("AI Feature Route for product_specification_comparison not found");
        }

        $template = $route->activeTemplate;
        if (!$template) {
            throw new Exception("Active Prompt Template not found for feature product_specification_comparison");
        }

        $currentData = [
            'name' => $product->name,
            'description' => $product->description,
            'category' => $product->category,
            'features' => $product->features,
            'use_cases' => $product->use_cases,
            'pricing_notes' => $product->pricing_notes,
            'target_audience' => $product->target_audience,
        ];

        // Replace placeholders in prompt
        $prompt = str_replace(
            ['{{current_product_json}}', '{{scraped_text}}'],
            [json_encode($currentData, JSON_PRETTY_PRINT), substr($run->cleaned_text, 0, 15000)], // Limit scraped text
            $template->system_prompt . "\n" . $template->user_prompt_template
        );

        $apiKey = config('services.gemini.key');
        if (!$apiKey) {
            throw new Exception("Gemini API key is not configured");
        }

        // Make AI Call
        $response = Http::withHeaders(['Content-Type' => 'application/json'])
            ->post("https://generativelanguage.googleapis.com/v1beta/models/{$route->model_name}:generateContent?key={$apiKey}", [
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
        $aiResult = json_decode($aiResultStr, true);

        if (!$aiResult) {
            throw new Exception("Failed to parse JSON from AI response");
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
            'ai_provider' => $route->provider,
            'ai_model' => $route->model_name,
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
        $suggestions = $comparison->updateSuggestions()->where('status', 'approved')->get();

        foreach ($suggestions as $suggestion) {
            $field = $suggestion->field_name;
            if (in_array($field, ['description', 'category', 'pricing_notes', 'target_audience'])) {
                $product->$field = $suggestion->suggested_value;
            } elseif (in_array($field, ['features', 'use_cases'])) {
                // If it's an array field in Product model
                $decoded = json_decode($suggestion->suggested_value, true);
                if ($decoded) {
                    $product->$field = $decoded;
                } else {
                    $product->$field = $suggestion->suggested_value; // Fallback
                }
            }
            $suggestion->update(['status' => 'applied']);
        }

        $product->save();
        $comparison->update(['status' => 'approved']);
    }
}
