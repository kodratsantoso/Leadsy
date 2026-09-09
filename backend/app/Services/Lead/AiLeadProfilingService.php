<?php

namespace App\Services\Lead;

use App\Models\AiGeneratedOutput;
use App\Models\Industry;
use App\Models\SubIndustry;
use App\Models\BusinessCategory;
use App\Services\AI\AiOrchestrationService;
use App\Services\Enrichment\LeadMasterDataMapperService;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class AiLeadProfilingService
{
    public function __construct(
        private readonly AiOrchestrationService $ai,
        private readonly LeadDiscoveryService $discovery,
        private readonly LeadMasterDataMapperService $mapper
    ) {}

    /**
     * Start the AI lead profiling process.
     *
     * @param string $companyName
     * @param int|null $userId
     * @return AiGeneratedOutput
     */
    public function startProfiling(string $companyName, ?int $userId = null): AiGeneratedOutput
    {
        // 1. Create a placeholder output record
        $output = AiGeneratedOutput::create([
            'entity_type' => 'App\Models\Lead',
            'entity_id' => 0, // Placeholder before actual Lead creation
            'feature_key' => 'lead_ai_profiling',
            'status' => 'researching',
            'generated_by' => $userId,
            'generated_at' => Carbon::now(),
            'original_output_json' => ['company_name' => $companyName],
            'current_output_json' => ['company_name' => $companyName],
        ]);

        // 2. Trigger async profiling
        \App\Jobs\RunAiLeadProfilingJob::dispatch($output, $companyName);

        return $output;
    }

    /**
     * Perform the actual profiling process.
     */
    public function performProfiling(AiGeneratedOutput $output, string $companyName): void
    {
        $industries = Industry::where('is_active', true)->pluck('name')->toArray();
        $subIndustries = SubIndustry::where('is_active', true)->pluck('name')->toArray();
        $businessCategories = BusinessCategory::where('is_active', true)->pluck('name')->toArray();

        $response = $this->ai->call('lead_ai_profiling', '', [
            'company_name' => $companyName,
            'available_industries' => implode(', ', $industries),
            'available_sub_industries' => implode(', ', $subIndustries),
            'available_business_categories' => implode(', ', $businessCategories),
            'web_search' => true,
        ]);

        if (!$response['success'] || empty($response['content'])) {
            throw new \Exception($response['error'] ?? 'AI Profiling call failed or returned empty content.');
        }

        $rawJson = preg_replace('/^```(?:json)?\s*|\s*```$/s', '', trim($response['content']));
        $profileData = json_decode($rawJson, true);
        if (!is_array($profileData)) {
            throw new \Exception('Failed to parse AI profiling response JSON.');
        }

        if (!empty($profileData['candidates']) && is_array($profileData['candidates'])) {
            $candidate = $profileData['candidates'][0] ?? [];
            $bestMatch = $profileData['best_match'] ?? [];
            $profileData = array_merge($profileData, $this->extractCandidateFields($candidate, $bestMatch, $profileData));
        }

        if (empty($profileData['company_name']) && !empty($profileData['legal_name'])) {
            $profileData['company_name'] = $profileData['legal_name'];
        }

        $profileData['evidence'] = [
            'website_sources' => $profileData['sources'] ?? [],
        ];

        $mapsDetails = null;
        $searchQuery = !empty($profileData['address']) ? $profileData['address'] : $companyName;
        $geocodeResult = $this->discovery->geocodeArea($searchQuery);
        if ($geocodeResult && !empty($geocodeResult['place_id'])) {
            $mapsDetails = $this->discovery->getPlaceDetails($geocodeResult['place_id']);
        }

        if ($mapsDetails) {
            $profileData['address'] = !empty($mapsDetails['address']) ? $mapsDetails['address'] : ($profileData['address'] ?? null);
            $profileData['phone'] = !empty($mapsDetails['phone']) ? $mapsDetails['phone'] : ($profileData['phone'] ?? null);
            $profileData['website'] = !empty($mapsDetails['website']) ? $mapsDetails['website'] : ($profileData['website'] ?? null);
            $profileData['lat'] = $mapsDetails['lat'] ?? ($profileData['lat'] ?? null);
            $profileData['lng'] = $mapsDetails['lng'] ?? ($profileData['lng'] ?? null);
            $profileData['external_place_id'] = $mapsDetails['external_place_id'] ?? ($profileData['external_place_id'] ?? null);
        }

        if (!empty($profileData['industry'])) {
            $industryInput = is_array($profileData['industry'])
                ? implode(', ', $profileData['industry'])
                : (string) $profileData['industry'];
            $matchedInd = $this->mapper->mapIndustry($industryInput);
            if ($matchedInd) {
                $profileData['industry_id'] = $matchedInd->id;
                $profileData['industry_name'] = $matchedInd->name;
                
                if (!empty($profileData['sub_industry'])) {
                    $subIndustryInput = is_array($profileData['sub_industry'])
                        ? implode(', ', $profileData['sub_industry'])
                        : (string) $profileData['sub_industry'];
                    $matchedSub = $this->mapper->mapSubIndustry($subIndustryInput, $matchedInd->id);
                    if ($matchedSub) {
                        $profileData['sub_industry_id'] = $matchedSub->id;
                        $profileData['sub_industry_name'] = $matchedSub->name;
                    }
                }
            }
        }

        if (!empty($profileData['business_category'])) {
            $catInput = is_array($profileData['business_category']) 
                ? implode(', ', $profileData['business_category']) 
                : (string) $profileData['business_category'];
            $matchedCat = $this->mapper->mapBusinessCategory($catInput);
            if ($matchedCat) {
                $profileData['business_category_id'] = $matchedCat->id;
                $profileData['business_category_name'] = $matchedCat->name;
            }
        }

        $output->update([
            'status' => 'ready_for_review',
            'ai_provider' => $response['model'] ?? 'OpenAI',
            'ai_model' => $response['model'] ?? 'gpt-4o',
            'original_output_json' => $profileData,
            'current_output_json' => $profileData,
        ]);
    }

    private function extractCandidateFields(array $candidate, array $bestMatch, array $root): array
    {
        $pick = function (string ...$keys) use ($candidate, $bestMatch, $root) {
            foreach ($keys as $key) {
                foreach ([$candidate, $bestMatch, $root] as $source) {
                    if (isset($source[$key]) && $source[$key] !== null && $source[$key] !== '') {
                        return $source[$key];
                    }
                }
            }
            return null;
        };

        $pickNested = function (string $arrayKey, string $nestedKey) use ($candidate, $bestMatch, $root) {
            foreach ([$candidate, $bestMatch, $root] as $source) {
                if (isset($source[$arrayKey]) && is_array($source[$arrayKey]) && isset($source[$arrayKey][$nestedKey])) {
                    return $source[$arrayKey][$nestedKey];
                }
            }
            return null;
        };

        return [
            'company_name' => $pick('legal_company_name', 'legal_name', 'company_name'),
            'legal_name' => $pick('legal_name', 'legal_company_name', 'company_name'),
            'brand' => $pick('brand_name', 'brand'),
            'abbreviation' => $pick('abbreviation'),
            'year_established' => $pick('year_established'),
            'ownership_type' => $pick('ownership_type'),
            'website' => $pick('website'),
            'address' => $pickNested('physical_hq_address', 'address') ?? $pick('physical_hq_address', 'address'),
            'city' => $pick('city'),
            'province' => $pick('province'),
            'phone' => $pickNested('phone', 'primary') ?? $pick('phone'),
            'whatsapp' => $pick('whatsapp'),
            'email' => $pickNested('email', 'primary') ?? $pick('email'),
            'lat' => $pick('lat'),
            'lng' => $pick('lng'),
            'industry' => $pick('industry'),
            'sub_industry' => $pick('sub_industry'),
            'business_category' => $pick('business_category'),
            'primary_sector' => $pick('primary_sector'),
            'vertical' => $pick('vertical'),
            'core_product' => $pick('core_product'),
            'specialization' => $pick('specialization'),
            'company_size' => $pick('company_size_range', 'company_size'),
            'company_size_estimate' => $pick('company_size_estimate'),
            'operational_area_type' => $pick('operational_area_type'),
            'branch_count' => $pick('branch_count'),
            'business_model' => $pick('business_model'),
            'target_market' => $pick('target_market'),
            'corporate_structure' => $pick('corporate_structure'),
            'manufacturing_capability' => $pick('manufacturing_capability'),
            'product_brands' => $pick('product_brands'),
            'certifications_or_registrations' => $pick('certifications_or_registrations'),
            'customer_story' => $pick('brief_customer_story', 'customer_story'),
            'presales_perspective' => $pick('presales_perspective'),
            'confidence' => $pick('confidence'),
            'sources' => $pick('sources') ?? [],
        ];
    }

    /**
     * Run full AI profiling and save directly to Lead model.
     *
     * @param \App\Models\Lead $lead
     * @return array
     */
    public function profileAndEnrichLead(\App\Models\Lead $lead): array
    {
        $companyName = $lead->company_name;

        $industries = Industry::where('is_active', true)->pluck('name')->toArray();
        $subIndustries = SubIndustry::where('is_active', true)->pluck('name')->toArray();
        $businessCategories = BusinessCategory::where('is_active', true)->pluck('name')->toArray();

        $response = $this->ai->call('lead_ai_profiling', '', [
            'company_name' => $companyName,
            'available_industries' => implode(', ', $industries),
            'available_sub_industries' => implode(', ', $subIndustries),
            'available_business_categories' => implode(', ', $businessCategories),
            'web_search' => true,
        ]);

        $profileData = [];
        if ($response['success'] && !empty($response['content'])) {
            $rawJson = preg_replace('/^```(?:json)?\s*|\s*```$/s', '', trim($response['content']));
            $profileData = json_decode($rawJson, true) ?: [];
        }

        if (!empty($profileData['candidates']) && is_array($profileData['candidates'])) {
            $candidate = $profileData['candidates'][0] ?? [];
            $bestMatch = $profileData['best_match'] ?? [];
            $profileData = array_merge($profileData, $this->extractCandidateFields($candidate, $bestMatch, $profileData));
        }

        if (empty($profileData['company_name']) && !empty($profileData['legal_name'])) {
            $profileData['company_name'] = $profileData['legal_name'];
        }

        $mapsDetails = null;
        if (!empty($lead->external_place_id)) {
            $mapsDetails = $this->discovery->getPlaceDetails($lead->external_place_id);
        } else {
            $searchQuery = !empty($profileData['address']) ? $profileData['address'] : (!empty($profileData['brand']) ? $profileData['brand'] . ' ' . $companyName : $companyName);
            $geocodeResult = $this->discovery->geocodeArea($searchQuery);
            if ($geocodeResult && !empty($geocodeResult['place_id'])) {
                $mapsDetails = $this->discovery->getPlaceDetails($geocodeResult['place_id']);
            }
        }

        if ($mapsDetails) {
            $profileData['address'] = !empty($mapsDetails['address']) ? $mapsDetails['address'] : ($profileData['address'] ?? null);
            $profileData['phone'] = !empty($mapsDetails['phone']) ? $mapsDetails['phone'] : ($profileData['phone'] ?? null);
            $profileData['website'] = !empty($mapsDetails['website']) ? $mapsDetails['website'] : ($profileData['website'] ?? null);
            $profileData['lat'] = $mapsDetails['lat'] ?? ($profileData['lat'] ?? null);
            $profileData['lng'] = $mapsDetails['lng'] ?? ($profileData['lng'] ?? null);
            $profileData['external_place_id'] = $mapsDetails['external_place_id'] ?? ($profileData['external_place_id'] ?? null);
        }

        $industryId = $lead->industry_id;
        $subIndustryId = $lead->sub_industry_id;
        $businessCategoryId = $lead->business_category_id;
        $businessCategoryName = $lead->business_category;

        if (!empty($profileData['industry'])) {
            $industryInput = is_array($profileData['industry'])
                ? implode(', ', $profileData['industry'])
                : (string) $profileData['industry'];
            $matchedInd = $this->mapper->mapIndustry($industryInput);
            if ($matchedInd) {
                $industryId = $matchedInd->id;
                
                if (!empty($profileData['sub_industry'])) {
                    $subIndustryInput = is_array($profileData['sub_industry'])
                        ? implode(', ', $profileData['sub_industry'])
                        : (string) $profileData['sub_industry'];
                    $matchedSub = $this->mapper->mapSubIndustry($subIndustryInput, $matchedInd->id);
                    if ($matchedSub) {
                        $subIndustryId = $matchedSub->id;
                    }
                }
            }
        }

        if (!empty($profileData['business_category'])) {
            $catInput = is_array($profileData['business_category']) 
                ? implode(', ', $profileData['business_category']) 
                : (string) $profileData['business_category'];
            $matchedCat = $this->mapper->mapBusinessCategory($catInput);
            if ($matchedCat) {
                $businessCategoryId = $matchedCat->id;
                $businessCategoryName = $matchedCat->name;
            }
        }

        $companySize = !empty($profileData['company_size']) ? (string) $profileData['company_size'] : $lead->company_size_estimate;

        $lead->update([
            'brand' => !empty($profileData['brand']) ? $profileData['brand'] : ($lead->brand ?: null),
            'website' => !empty($profileData['website']) ? $profileData['website'] : ($lead->website ?: null),
            'phone' => !empty($profileData['phone']) ? $profileData['phone'] : ($lead->phone ?: null),
            'email' => !empty($profileData['email']) ? $profileData['email'] : ($lead->email ?: null),
            'address' => !empty($profileData['address']) ? $profileData['address'] : ($lead->address ?: null),
            'industry_id' => $industryId,
            'sub_industry_id' => $subIndustryId,
            'business_category_id' => $businessCategoryId,
            'business_category' => $businessCategoryName,
            'company_size_estimate' => $companySize,
            'customer_story' => !empty($profileData['customer_story']) ? $profileData['customer_story'] : ($lead->customer_story ?: null),
            'lat' => $profileData['lat'] ?? $lead->lat,
            'lng' => $profileData['lng'] ?? $lead->lng,
            'external_place_id' => $profileData['external_place_id'] ?? $lead->external_place_id,
            'enrichment_status' => 'completed',
            'last_enriched_at' => now(),
        ]);

        return $profileData;
    }
}
