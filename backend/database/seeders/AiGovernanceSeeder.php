<?php

namespace Database\Seeders;

use App\Models\AiPromptTemplate;
use Illuminate\Database\Seeder;

class AiGovernanceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Neither a model nor a feature route is created here any more. This used to
        // invent a gemini-1.5-flash row when the catalog was empty and pin the feature to
        // it — a provider choice made by a seeder, overriding the routing table operators
        // configure in Settings -> AI Defaults.

        $template = AiPromptTemplate::updateOrCreate(
            ['feature_name' => 'product_specification_comparison', 'template_name' => 'default_diff'],
            [
                'description' => 'Compare the current CRM product data with the newly scraped website text',
                'is_active' => true,
            ]
        );

        $version = \App\Models\AiPromptTemplateVersion::updateOrCreate(
            ['ai_prompt_template_id' => $template->id, 'version' => 1],
            [
                'content' => 'You are an expert product analyst. Your job is to compare the current CRM product data with the newly scraped website text and return a JSON object containing the differences and update recommendations.
CURRENT PRODUCT JSON:
{{current_product_json}}

SCRAPED TEXT:
{{scraped_text}}

Analyze the scraped text against the current product json. Return a JSON object with the following structure:
{
  "latest_snapshot": { // A full JSON representing what the product should look like now based on the scrape },
  "changes": [
    {
      "field": "description|category|features|use_cases|pricing_notes|target_audience",
      "old_value": "...",
      "new_value": "...",
      "type": "added|updated|removed",
      "reason": "..."
    }
  ],
  "confidence_score": 85,
  "highlights": [ // Optional: Use this to flag any critical changes to pricing, or major product pivots. Format: {"title": "", "category": "", "severity": "medium", "reason": "", "evidence": ["..."]} ]
}
ONLY return valid JSON without markdown formatting. Do not wrap in ```json.',
                'is_active' => true,
                'is_enabled' => true,
                'activated_at' => now(),
            ]
        );

        $template->update(['active_version_id' => $version->id]);

    }
}
