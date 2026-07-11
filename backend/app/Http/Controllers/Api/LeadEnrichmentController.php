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
        $prompt = "Please perform a web search to identify the firmographics of the following company:
Name: {$lead->company_name}
Address: {$lead->address}
Website: {$lead->website}

Return ONLY a JSON object with:
- industry_name: (string) General industry e.g., 'Technology'
- sub_industry_name: (string) Specific niche e.g., 'SaaS'
- business_category_name: (string) Company type e.g., 'B2B Software'
- website: (string) Website URL if you found one and it was missing
- company_size_estimate: (string) e.g., '1-50', '51-200', '1000+'";

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

        return response()->json([
            'success' => true,
            'data' => $lead,
            'ai_result' => $parsed
        ]);
    }
}
