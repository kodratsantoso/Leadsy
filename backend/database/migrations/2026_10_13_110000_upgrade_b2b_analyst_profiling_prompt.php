<?php

use App\Models\AiPromptTemplate;
use Illuminate\Database\Migrations\Migration;

/**
 * Creates versioned prompt for Lead AI Company Profiling matching the B2B Research Analyst standard.
 * 
 * Includes:
 * - Specific analyst instructions & source cross-validation
 * - Extended B2B fields (secondary industries, categories, office locations)
 * - Structured B2B Sales Notes (potential needs, departments to approach, pain points, solution angles, discovery questions)
 * - Source verification metadata per field
 */
return new class extends Migration
{
    public function up(): void
    {
        $template = AiPromptTemplate::where('feature_name', 'lead_ai_profiling')->orderBy('id')->first();

        if (! $template) {
            return;
        }

        $current = $template->versions()->where('is_active', true)->first();

        $system = <<<'TXT'
You are an expert senior commercial intelligence researcher and professional B2B company research analyst specializing in Indonesian enterprise profiling.

Your task is to research, validate, and summarize key company profile information from reliable public sources including official website pages, business registries (AHU Online, Kemendag, NIB), LinkedIn, and credible directories.

Core Research Principles:
1. Prioritize official company sources first.
2. Cross-check information from more than one source whenever possible.
3. Do not guess when information is unavailable. Set the value to null or empty.
4. If different sources provide conflicting information, record the discrepancy and recommend the most reliable version.
5. Provide actionable B2B sales and presales intelligence: potential business needs, target departments, industry pain points, and specific first-meeting discovery questions.
TXT;

        $user = <<<'TXT'
Research Request:
Company/Brand Name: {{company_name}}

Available Industries: {{available_industries}}
Available Sub-Industries: {{available_sub_industries}}
Available Business Categories: {{available_business_categories}}

=== WEB RESEARCH GATHERED FOR THIS COMPANY ===
{{web_research}}
=== END OF RESEARCH ===

Conduct a deep analysis and structure your output according to the required contract. Base every field on the gathered research above. Where research is silent, use null or an empty list rather than hallucinating facts.

Output requirements:
- legal_name: Verified legal or commonly used company name.
- entity_selection_note: If multiple entities exist with similar names, clarify the basis of selection.
- industry / sub_industry / business_category: Match best fit from available lists.
- secondary_industries / secondary_business_categories: List any secondary segments if applicable.
- office_locations: List identified office locations (city, province, country, type).
- customer_story: 3-5 sentences factual overview of what the company does, where it operates, and its business model.
- sales_notes: Structured object containing:
  - potential_needs: list of likely business / IT / operational needs
  - departments_to_approach: key departments/stakeholders to engage (e.g. IT, Procurement, HR, Operations)
  - pain_points: probable operational and industry pain points
  - solution_angles: recommended angles to position solutions
  - discovery_questions: 3-5 high-value questions for sales to ask in the first meeting
- source_validation: Summary or list of sources used with verification status (official, third_party, estimated).
TXT;

        $contract = [
            'company_name' => '',
            'legal_name' => '',
            'entity_selection_note' => null,
            'brand' => '',
            'abbreviation' => null,
            'year_established' => null,
            'ownership_type' => null,
            'website' => '',
            'address' => '',
            'city' => '',
            'province' => '',
            'phone' => '',
            'whatsapp' => null,
            'email' => '',
            'industry' => '',
            'sub_industry' => '',
            'business_category' => '',
            'secondary_industries' => [],
            'secondary_business_categories' => [],
            'primary_sector' => '',
            'vertical' => '',
            'core_product' => '',
            'specialization' => '',
            'company_size' => '',
            'company_size_estimate' => '',
            'operational_area_type' => null,
            'branch_count' => null,
            'office_locations' => [],
            'business_model' => '',
            'target_market' => '',
            'corporate_structure' => null,
            'manufacturing_capability' => null,
            'product_brands' => [],
            'certifications_or_registrations' => null,
            'customer_story' => '',
            'presales_perspective' => '',
            'sales_notes' => [
                'potential_needs' => [],
                'departments_to_approach' => [],
                'pain_points' => [],
                'solution_angles' => [],
                'discovery_questions' => [],
            ],
            'discrepancies' => [],
            'source_validation' => [],
            'confidence' => 'medium',
            'evidence' => [],
            'sources' => [],
            'candidates' => [],
        ];

        $next = ((int) $template->versions()->max('version')) + 1;

        $version = $template->versions()->create([
            'version' => $next,
            'content' => $system."\n\n".$user,
            'system_prompt' => $system,
            'user_prompt' => $user,
            'output_contract_json' => $contract,
            'variables_schema_json' => [
                'company_name',
                'available_industries',
                'available_sub_industries',
                'available_business_categories',
                'web_research',
            ],
            'is_active' => false,
            'is_enabled' => true,
        ]);

        $template->versions()->where('id', '!=', $version->id)->update(['is_active' => false]);
        $version->update(['is_active' => true, 'activated_at' => now()]);

        // Tune max_tokens to 5000 to accommodate rich B2B Sales Notes and discovery questions
        $template->update([
            'active_version_id' => $version->id,
            'is_active' => true,
            'max_tokens' => max((int) ($template->max_tokens ?? 4096), 5000),
            'timeout_seconds' => max((int) ($template->timeout_seconds ?? 60), 90),
        ]);
    }

    public function down(): void
    {
        // Versions are history; re-activate an earlier version from the UI if rolled back
    }
};
