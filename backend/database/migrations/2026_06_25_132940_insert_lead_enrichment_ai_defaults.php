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
            'content' => "Act as a B2B company firmographic research analyst.

Perform a web search to identify and validate the company profile using reliable public sources such as the official website, Google Business/Profile, LinkedIn, business directories, company registry, and credible references.

Input:
Company Name / Brand: {{company_name}}
Address: {{address}}
Website: {{website}}

Return ONLY a valid JSON object with the following structure:
{
\"brand\": \"\",
\"address\": \"\",
\"address_google_maps_url\": \"\",
\"industry_name\": \"\",
\"sub_industry_name\": \"\",
\"phone\": \"\",
\"company_email\": \"\",
\"website\": \"\",
\"company_size_estimate\": \"\",
\"business_category_name\": \"\",
\"confidence_level\": \"\",
\"notes\": \"\"
}

Rules:
* Use the provided company name as the main search reference.
* If address or website is provided, use it to validate the correct company.
* Prioritize official company sources first, then credible third-party sources.
* Do not guess phone numbers, emails, or websites.
* If data is unavailable, use null.
* For address_google_maps_url, provide a Google Maps search link based on the verified address.
* company_size_estimate must use ranges such as \"1-50\", \"51-200\", \"201-500\", \"501-1000\", or \"1000+\".
* business_category_name should describe the company type, for example \"B2B\", \"B2C\", \"B2B2C\", \"Manufacturer\", \"Distributor\", \"Retailer\", \"Service Provider\", \"Holding Company\", \"Contractor\", or \"SaaS / Technology Provider\".
* confidence_level must be one of: \"High\", \"Medium\", or \"Low\".
* notes should briefly explain if the data is verified, estimated, or not publicly available.
* Do not include markdown, tables, explanations, or source list outside the JSON.",
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
