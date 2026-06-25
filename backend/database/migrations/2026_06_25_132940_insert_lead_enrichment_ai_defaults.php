<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $template = \App\Models\AiPromptTemplate::create([
            'feature_name' => 'lead_enrichment',
            'template_name' => 'Lead Enrichment',
            'description' => 'System prompt for enriching lead firmographics.'
        ]);

        $version = \App\Models\AiPromptTemplateVersion::create([
            'ai_prompt_template_id' => $template->id,
            'version' => 1,
            'content' => "Please perform a web search to identify the firmographics of the following company:
Name: {{company_name}}
Address: {{address}}
Website: {{website}}

Return ONLY a JSON object with:
- industry_name: (string) General industry e.g., 'Technology'
- sub_industry_name: (string) Specific niche e.g., 'SaaS'
- business_category_name: (string) Company type e.g., 'B2B Software'
- website: (string) Website URL if you found one and it was missing
- company_size_estimate: (string) e.g., '1-50', '51-200', '1000+'",
            'is_active' => true,
            'is_enabled' => true,
        ]);

        $template->update(['active_version_id' => $version->id]);

        $model = \App\Models\AiModel::where('status', 'active')->first();
        if ($model) {
            \App\Models\AiFeatureRoute::create([
                'feature_name' => 'lead_enrichment',
                'ai_model_id' => $model->id,
                'priority' => 1,
                'max_tokens' => 2000,
                'timeout_seconds' => 30,
                'cache_ttl_minutes' => 60,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        \App\Models\AiPromptTemplate::where('feature_name', 'lead_enrichment')->delete();
        \App\Models\AiFeatureRoute::where('feature_name', 'lead_enrichment')->delete();
    }
};
