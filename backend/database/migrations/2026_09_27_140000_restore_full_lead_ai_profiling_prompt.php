<?php

use App\Models\AiPromptTemplate;
use Illuminate\Database\Migrations\Migration;

/**
 * Restores the AI Lead Profiler to asking for everything its own screen displays.
 *
 * The active prompt had been replaced with a 763-character version whose output contract
 * listed 14 fields, while AiProfilingPanel renders 38. Anything absent from the contract
 * was never requested, so it never came back: business_model (shown as "Business Type"),
 * primary_sector, vertical, core_product, specialization, target_market,
 * presales_perspective ("Business Intelligence"), year_established, ownership_type and
 * the rest. The short prompt also asked for "a brief customer story", which is exactly
 * what it got where a full company overview was wanted.
 *
 * Industry, sub-industry and company size were in that 14-field contract and still went
 * missing, for a second reason fixed alongside this: buildRequestBody() read only the
 * system and user prompts and silently dropped the contract, so a prompt ending "conform
 * strictly to the contract" was asking the model to match a shape it was never shown.
 *
 * Additive: this adds a new version and activates it. The previous version stays in
 * history and can be re-activated from Settings → AI Defaults → Prompt Templates.
 */
return new class extends Migration
{
    public function up(): void
    {
        $template = AiPromptTemplate::where('feature_name', 'lead_ai_profiling')
            ->orderBy('id')
            ->first();

        if (! $template) {
            return;
        }

        $system = <<<'TXT'
You are an expert senior commercial intelligence researcher specialising in Indonesian B2B enterprise profiling.

Cross-reference multiple public sources before asserting a fact: the company's official website, Indonesian business registries (Kemendag, AHU Online), job platforms (JobStreet, Glints, LinkedIn), news articles and industry reports. Prefer official sources, and where two sources disagree, prefer the more authoritative and say so in the evidence.

Rules that matter more than completeness:
- Never invent a value. If a field cannot be verified from public sources, return null for it.
- Do not guess phone numbers, emails or addresses. These are used to contact real companies.
- Choose industry, sub_industry and business_category ONLY from the provided lists. If nothing fits, return null rather than inventing a category.
- Reflect genuine uncertainty in `confidence`.

This profile is used by sales and presales teams to prepare for real meetings, so be specific and concrete rather than generic.
TXT;

        $user = <<<'TXT'
Research Request:
Company/Brand Name: {{company_name}}

Available Industries: {{available_industries}}
Available Sub-Industries: {{available_sub_industries}}
Available Business Categories: {{available_business_categories}}

Guidance on the harder fields:
- customer_story: 3-5 sentences describing what the company actually does, what it sells, who it sells to, and anything a salesperson should know before the first meeting. Not a slogan.
- presales_perspective: 2-4 sentences on likely business needs, probable pain points for this industry, and a plausible solution angle.
- company_size: pick one of 1-10, 11-50, 51-200, 201-500, 501-1000, 1001-5000, 5000+.
- company_size_estimate: the headcount figure you found, with where it came from.
- business_model: e.g. B2B Manufacturer, B2B Distributor, B2B Service Provider, B2C Retailer, Holding Company, Contractor, SaaS / Technology Provider.
- evidence / sources: the URLs you actually used.

If several different companies match the name, put them in `candidates` and mark the best match.
TXT;

        // Mirrors what AiProfilingPanel renders. A field missing here is a field the
        // model is never asked for, which is how the previous contract lost 24 of them.
        $contract = [
            'company_name' => '', 'legal_name' => '', 'brand' => '', 'abbreviation' => null,
            'year_established' => null, 'ownership_type' => null,
            'website' => '', 'address' => '', 'city' => '', 'province' => '',
            'phone' => '', 'whatsapp' => null, 'email' => '',
            'industry' => '', 'sub_industry' => '', 'business_category' => '',
            'primary_sector' => '', 'vertical' => '', 'core_product' => '', 'specialization' => '',
            'company_size' => '', 'company_size_estimate' => '',
            'operational_area_type' => null, 'branch_count' => null,
            'business_model' => '', 'target_market' => '',
            'corporate_structure' => null, 'manufacturing_capability' => null,
            'product_brands' => [], 'certifications_or_registrations' => null,
            'customer_story' => '', 'presales_perspective' => '',
            'confidence' => 'medium', 'evidence' => [], 'sources' => [], 'candidates' => [],
        ];

        $next = ((int) $template->versions()->max('version')) + 1;

        $version = $template->versions()->create([
            'version' => $next,
            'content' => $system."\n\n".$user,
            'system_prompt' => $system,
            'user_prompt' => $user,
            'output_contract_json' => $contract,
            'variables_schema_json' => ['company_name', 'available_industries', 'available_sub_industries', 'available_business_categories'],
            'is_active' => false,
            'is_enabled' => true,
        ]);

        $template->versions()->where('id', '!=', $version->id)->update(['is_active' => false]);
        $version->update(['is_active' => true, 'activated_at' => now()]);
        $template->update(['active_version_id' => $version->id, 'is_active' => true]);
    }

    public function down(): void
    {
        // Prompt versions are history. Re-activate an earlier one from the UI instead.
    }
};
