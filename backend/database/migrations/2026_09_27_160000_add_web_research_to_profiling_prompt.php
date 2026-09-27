<?php

use App\Models\AiPromptTemplate;
use Illuminate\Database\Migrations\Migration;

/**
 * Feeds real search results into the profiler's prompt.
 *
 * The prompt told the model to consult the official website, Kemendag and JobStreet. It
 * never could: a web-search tool is wired only on the Gemini branch of
 * AiOrchestrationService, and Global AI Routing sends these calls to BytePlus, where the
 * web_search flag is dropped without comment. So it answered from training data — thin
 * for an Indonesian SME, and confidently wrong where it filled gaps.
 *
 * CompanyWebResearchService now runs the searches itself and passes the snippets in as
 * {{web_research}}. This version makes the prompt use them, and forbids the fallback that
 * caused the invented values: anything not supported by the material provided is null.
 */
return new class extends Migration
{
    public function up(): void
    {
        $template = AiPromptTemplate::where('feature_name', 'lead_ai_profiling')->orderBy('id')->first();
        $current = $template?->versions()->where('is_active', true)->first();

        if (! $template || ! $current) {
            return;
        }

        $system = <<<'TXT'
You are an expert senior commercial intelligence researcher specialising in Indonesian B2B enterprise profiling.

You are given real search results gathered for this company. Work from that material, not from memory.

Rules that matter more than completeness:
- A field must be supported by the supplied research. If it is not, return null.
- Never invent a phone number, email or address. These are used to contact real companies.
- Choose industry, sub_industry and business_category ONLY from the provided lists. If nothing fits, return null rather than inventing one.
- Where sources disagree, prefer the company's own site or a government registry, and note the conflict in evidence.
- Set confidence honestly: "high" only when several independent sources agree.

This profile is used by sales and presales teams to prepare for real meetings, so be specific and concrete rather than generic.
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

Base every field on the research above. Where it is silent, return null — a null is more
useful to a salesperson than a plausible guess they will repeat to a customer.

Guidance on the harder fields:
- customer_story: 3-5 sentences on what the company actually does, what it sells and to whom, plus anything worth knowing before a first meeting. Not a slogan.
- presales_perspective: 2-4 sentences on likely business needs, probable pain points in this industry, and a plausible solution angle.
- company_size: one of 1-10, 11-50, 51-200, 201-500, 501-1000, 1001-5000, 5000+.
- company_size_estimate: the headcount figure found, and where it came from.
- business_model: e.g. B2B Manufacturer, B2B Distributor, B2B Service Provider, B2C Retailer, Holding Company, Contractor, SaaS / Technology Provider.
- evidence / sources: the URLs from the research that you actually relied on.

If several different companies match the name, put them in `candidates` and mark the best match.
TXT;

        $next = ((int) $template->versions()->max('version')) + 1;

        $version = $template->versions()->create([
            'version' => $next,
            'content' => $system."\n\n".$user,
            'system_prompt' => $system,
            'user_prompt' => $user,
            // Unchanged from the version this supersedes — it already mirrors the panel.
            'output_contract_json' => $current->output_contract_json,
            'variables_schema_json' => [
                'company_name', 'available_industries', 'available_sub_industries',
                'available_business_categories', 'web_research',
            ],
            'is_active' => false,
            'is_enabled' => true,
        ]);

        $template->versions()->where('id', '!=', $version->id)->update(['is_active' => false]);
        $version->update(['is_active' => true, 'activated_at' => now()]);
        $template->update(['active_version_id' => $version->id, 'is_active' => true]);
    }

    public function down(): void
    {
        // Versions are history; re-activate an earlier one from the UI instead.
    }
};
