<?php

namespace App\Services\Enrichment;

use App\Models\Lead;
use App\Models\LeadActivity;
use App\Services\AI\AiOrchestrationService;
use App\Services\AI\AIPromptTemplateService;
use Illuminate\Support\Facades\Log;

class LeadEnrichmentAiOrchestrator
{
    public function __construct(
        private readonly AiOrchestrationService $aiOrchestration,
        private readonly AIPromptTemplateService $promptService
    ) {}

    public function runEnrichment(Lead $lead, ?array $googleMapsDetails = null): void
    {
        Log::info("[LeadEnrichmentAiOrchestrator] Starting AI enrichment for lead {$lead->id}");
        
        $updates = [];
        $mappedFields = [];

        // 1. Company Enrichment
        $companyRes = $this->runFeature('lead_company_enrichment', [
            'company_name' => $lead->company_name,
            'existing_address' => $lead->address,
            'existing_website' => $lead->website,
            'google_maps_result' => $googleMapsDetails,
            'website_result' => null, // Future website scraping result
            'lark_sync_payload' => $lead->lark_sync_raw,
        ]);

        if ($companyRes && !empty($companyRes['company_name'])) {
            // Update basic fields if not already populated
            // Depending on business rules, we could override, but usually we just fill in blanks
            if (empty($lead->description) && !empty($companyRes['description'])) {
                $updates['description'] = $companyRes['description'];
            }
            if (empty($lead->address) && !empty($companyRes['address'])) {
                $updates['address'] = $companyRes['address'];
                $mappedFields[] = 'address';
            }
            if (empty($lead->phone) && !empty($companyRes['phone'])) {
                $updates['phone'] = $companyRes['phone'];
                $mappedFields[] = 'phone';
            }
            if (empty($lead->email) && !empty($companyRes['email'])) {
                $updates['email'] = $companyRes['email'];
                $mappedFields[] = 'email';
            }
            if (empty($lead->website) && !empty($companyRes['website'])) {
                $updates['website'] = $companyRes['website'];
                $mappedFields[] = 'website';
            }
        }

        // We prepare master data context
        $masterDataIndustries = \App\Models\Industry::pluck('name')->toArray();
        $masterDataSubIndustries = \App\Models\SubIndustry::pluck('name')->toArray();
        $masterDataCategories = \App\Models\BusinessCategory::pluck('name')->toArray();
        $companySizes = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'];

        // 2. Industry Classification
        if (empty($lead->industry_id)) {
            $industryRes = $this->runFeature('lead_industry_classification', [
                'company_name' => $lead->company_name,
                'company_description' => $updates['description'] ?? $lead->description,
                'available_industries' => $masterDataIndustries,
                'available_sub_industries' => $masterDataSubIndustries,
            ]);

            if ($industryRes && !empty($industryRes['industry'])) {
                $industry = \App\Models\Industry::where('name', $industryRes['industry'])->first();
                if ($industry) {
                    $updates['industry_id'] = $industry->id;
                    $mappedFields[] = 'industry_id';
                    
                    if (!empty($industryRes['sub_industry'])) {
                        $subIndustry = \App\Models\SubIndustry::where('name', $industryRes['sub_industry'])->first();
                        if ($subIndustry) {
                            $updates['sub_industry_id'] = $subIndustry->id;
                        }
                    }

                    LeadActivity::create([
                        'lead_id' => $lead->id,
                        'activity_type' => 'system',
                        'description' => "AI mapped Industry to '{$industry->name}'" . (!empty($industryRes['confidence']) ? " (Confidence: {$industryRes['confidence']})" : ""),
                        'activity_date' => now(),
                    ]);
                }
            }
        }

        // 3. Business Category
        if (empty($lead->business_category_id)) {
            $catRes = $this->runFeature('lead_business_category_classification', [
                'company_name' => $lead->company_name,
                'company_description' => $updates['description'] ?? $lead->description,
                'available_business_categories' => $masterDataCategories,
            ]);

            if ($catRes && !empty($catRes['business_category'])) {
                $cat = \App\Models\BusinessCategory::where('name', $catRes['business_category'])->first();
                if ($cat) {
                    $updates['business_category_id'] = $cat->id;
                    $updates['business_category'] = $cat->name;
                    $mappedFields[] = 'business_category_id';

                    LeadActivity::create([
                        'lead_id' => $lead->id,
                        'activity_type' => 'system',
                        'description' => "AI mapped Business Category to '{$cat->name}'" . (!empty($catRes['confidence']) ? " (Confidence: {$catRes['confidence']})" : ""),
                        'activity_date' => now(),
                    ]);
                }
            }
        }

        // 4. Company Size
        if (!empty($lead->company_size_estimate)) {
            $sizeRes = $this->runFeature('lead_company_size_classification', [
                'company_name' => $lead->company_name,
                'existing_company_size' => $lead->company_size_estimate,
                'available_company_sizes' => $companySizes,
            ]);

            if ($sizeRes && !empty($sizeRes['company_size']) && in_array($sizeRes['company_size'], $companySizes)) {
                $updates['company_size_estimate'] = $sizeRes['company_size'];
                $mappedFields[] = 'company_size_estimate';
            }
        }

        // Apply intermediate updates before scoring and requalification
        if (!empty($updates)) {
            $lead->update($updates);
            $lead = $lead->fresh();
        }

        // 5. Initial Rescore
        $scoreRes = $this->runFeature('lead_initial_rescore', [
            'company_name' => $lead->company_name,
            'existing_industry' => $lead->industry?->name,
            'existing_company_size' => $lead->company_size_estimate,
            'initial_product' => $lead->product?->name,
        ]);

        if ($scoreRes && isset($scoreRes['score'])) {
            $lead->update(['score' => $scoreRes['score']]);
        }

        // 6. Initial Requalification
        $qualRes = $this->runFeature('lead_initial_requalification', [
            'company_name' => $lead->company_name,
            'existing_lead_score' => $lead->score,
        ]);

        if ($qualRes && !empty($qualRes['status'])) {
            // e.g. "Marketing Qualified" -> "marketing_qualified"
            $statusMapping = [
                'Marketing Qualified' => 'marketing_qualified',
                'Sales Qualified' => 'sales_qualified',
                'Unqualified' => 'unqualified',
            ];
            $mappedStatus = $statusMapping[$qualRes['status']] ?? null;
            if ($mappedStatus) {
                $lead->update(['qualification_status' => $mappedStatus]);
            }
        }

        // 7. Initial ICP Match
        $icpRules = \App\Models\IcpProfile::where('is_active', true)->get()->toJson();
        $icpRes = $this->runFeature('lead_initial_icp_match', [
            'company_name' => $lead->company_name,
            'existing_industry' => $lead->industry?->name,
            'existing_company_size' => $lead->company_size_estimate,
            'existing_icp_rules' => $icpRules,
        ]);

        if ($icpRes && isset($icpRes['icp_match'])) {
            $lead->update(['is_icp_matched' => $icpRes['icp_match']]);
        }

        // 8. Enrichment Summary
        $summaryRes = $this->runFeature('lead_enrichment_summary', [
            'company_name' => $lead->company_name,
            'existing_industry' => $lead->industry?->name,
            'existing_company_size' => $lead->company_size_estimate,
        ]);

        if ($summaryRes && !empty($summaryRes['summary'])) {
            LeadActivity::create([
                'lead_id' => $lead->id,
                'activity_type' => 'system',
                'description' => $summaryRes['summary'],
                'activity_date' => now(),
            ]);
        }

        Log::info("[LeadEnrichmentAiOrchestrator] AI enrichment completed for lead {$lead->id}");
    }

    private function runFeature(string $featureName, array $variables): ?array
    {
        try {
            $context = array_merge($variables, ['response_format' => ['type' => 'json_object']]);
            $response = $this->aiOrchestration->call(
                $featureName,
                '', // $input
                $context
            );

            if (!empty($response['content'])) {
                // Ensure it's valid JSON
                $json = json_decode($response['content'], true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    return $json;
                }
            }
        } catch (\Exception $e) {
            Log::error("[LeadEnrichmentAiOrchestrator] Error running feature {$featureName}: " . $e->getMessage());
        }

        return null;
    }
}
