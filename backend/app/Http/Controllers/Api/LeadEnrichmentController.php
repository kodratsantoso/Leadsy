<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\Industry;
use App\Models\SubIndustry;
use App\Models\BusinessCategory;
use App\Services\AI\AiOrchestrationService;
use Illuminate\Http\Request;

class LeadEnrichmentController extends Controller
{
    public function __construct(
        private AiOrchestrationService $ai,
        private \App\Services\Enrichment\LeadEnrichmentTriggerService $triggerService
    ) {}

    public function retry(Lead $lead)
    {
        $this->triggerService->trigger($lead, 'manual_retry');
        
        return response()->json([
            'success' => true,
            'message' => 'Enrichment job has been queued.',
            'data' => $lead->fresh(),
        ]);
    }

    public function enrich(Request $request, Lead $lead)
    {
        $prompt = "Act as a B2B company firmographic research analyst.

Perform a web search to identify and validate the company profile using reliable public sources such as the official website, Google Business/Profile, LinkedIn, business directories, company registry, and credible references.

Input:
Company Name / Brand: {$lead->company_name}
Address: {$lead->address}
Website: {$lead->website}

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
* Do not include markdown, tables, explanations, or source list outside the JSON.";

        $result = $this->ai->call('lead_enrichment', $prompt, ['lead_id' => $lead->id]);

        if (!$result['success']) {
            return response()->json(['success' => false, 'error' => $result['error']], 500);
        }

        $content = $result['content'];
        $content = preg_replace('/```json\s*/i', '', $content);
        $content = preg_replace('/```\s*/', '', $content);
        
        $parsed = json_decode(trim($content), true);
        if (!$parsed) {
            return response()->json(['success' => false, 'error' => 'AI returned invalid JSON: ' . substr($content, 0, 100)], 500);
        }

        // Fill empty fields only (as per instruction #2)
        if (empty($lead->website) && !empty($parsed['website'])) {
            $lead->website = $parsed['website'];
            $lead->website_domain = parse_url($parsed['website'], PHP_URL_HOST) ?? $parsed['website'];
        }
        if (empty($lead->company_size_estimate) && !empty($parsed['company_size_estimate'])) {
            $lead->company_size_estimate = $parsed['company_size_estimate'];
        }
        if (empty($lead->address) && !empty($parsed['address'])) {
            $lead->address = $parsed['address'];
        }
        if (empty($lead->phone) && !empty($parsed['phone'])) {
            $lead->phone = $parsed['phone'];
        }
        if (empty($lead->email) && !empty($parsed['company_email'])) {
            $lead->email = $parsed['company_email'];
        }
        // If company_name was empty or very generic, we could use brand, but we'll leave company_name intact to avoid overriding user input.

        // Mapping Taxonomy (Auto-create as per instruction #1)
        if (!empty($parsed['industry_name'])) {
            $industry = Industry::firstOrCreate(['name' => $parsed['industry_name']]);
            $lead->industry_id = $industry->id;
        }

        if (!empty($parsed['sub_industry_name']) && !empty($lead->industry_id)) {
            $subIndustry = SubIndustry::firstOrCreate([
                'name' => $parsed['sub_industry_name'],
                'industry_id' => $lead->industry_id
            ]);
            $lead->sub_industry_id = $subIndustry->id;
        }

        if (!empty($parsed['business_category_name'])) {
            $cat = BusinessCategory::firstOrCreate(['name' => $parsed['business_category_name']]);
            $lead->business_category_id = $cat->id;
            // Clear the old string field to avoid confusion, or keep it synced
            $lead->business_category = null;
        }

        $lead->save();
        $lead->load(['industry', 'subIndustry', 'businessCategory']);

        // Log AI reasoning and extra fields as Lead Activity
        $activityNotes = collect([
            !empty($parsed['notes']) ? "Notes: {$parsed['notes']}" : null,
            !empty($parsed['confidence_level']) ? "Confidence: {$parsed['confidence_level']}" : null,
            !empty($parsed['address_google_maps_url']) ? "Google Maps: {$parsed['address_google_maps_url']}" : null,
        ])->filter()->implode("\n");

        if ($activityNotes) {
            \App\Models\LeadActivity::create([
                'lead_id' => $lead->id,
                'activity_type' => 'system',
                'description' => "AI Enrichment Summary:\n" . $activityNotes,
                'activity_date' => now(),
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $lead,
            'ai_result' => $parsed
        ]);
    }
}
