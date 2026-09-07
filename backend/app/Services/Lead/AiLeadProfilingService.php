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
        // 1. Retrieve taxonomies to pass as constraints
        $industries = Industry::where('is_active', true)->pluck('name')->toArray();
        $subIndustries = SubIndustry::where('is_active', true)->pluck('name')->toArray();
        $businessCategories = BusinessCategory::where('is_active', true)->pluck('name')->toArray();

        // 2. Call AI with Web Search
        $response = $this->ai->call('lead_ai_profiling', '', [
            'company_name' => $companyName,
            'available_industries' => implode(', ', $industries),
            'available_sub_industries' => implode(', ', $subIndustries),
            'available_business_categories' => implode(', ', $businessCategories),
        ]);

        if (!$response['success'] || empty($response['content'])) {
            throw new \Exception($response['error'] ?? 'AI Profiling call failed or returned empty content.');
        }

        $profileData = json_decode($response['content'], true);
        if (!is_array($profileData)) {
            throw new \Exception('Failed to parse AI profiling response JSON.');
        }

        // If response is nested inside a candidates array, extract the first candidate
        if (!empty($profileData['candidates']) && is_array($profileData['candidates'])) {
            $candidate = $profileData['candidates'][0] ?? [];
            $bestMatch = $profileData['best_match'] ?? [];
            // Map keys from candidates/best_match block structure (e.g. brand_name -> brand)
            $profileData = array_merge($profileData, [
                'company_name' => $candidate['legal_company_name'] ?? $candidate['legal_name'] ?? $candidate['company_name'] ?? $bestMatch['legal_company_name'] ?? $bestMatch['legal_name'] ?? $bestMatch['company_name'] ?? null,
                'brand' => $candidate['brand_name'] ?? $candidate['brand'] ?? $bestMatch['brand_name'] ?? $bestMatch['brand'] ?? $profileData['brand_name'] ?? $profileData['brand'] ?? null,
                'website' => $candidate['website'] ?? $bestMatch['website'] ?? $profileData['website'] ?? null,
                'address' => (is_array($candidate['physical_hq_address'] ?? null) ? ($candidate['physical_hq_address']['address'] ?? null) : ($candidate['physical_hq_address'] ?? $candidate['address'] ?? null))
                    ?? (is_array($bestMatch['physical_hq_address'] ?? null) ? ($bestMatch['physical_hq_address']['address'] ?? null) : ($bestMatch['physical_hq_address'] ?? $bestMatch['address'] ?? null))
                    ?? (is_array($profileData['physical_hq_address'] ?? null) ? ($profileData['physical_hq_address']['address'] ?? null) : ($profileData['physical_hq_address'] ?? $profileData['address'] ?? null)),
                'phone' => (is_array($candidate['phone'] ?? null) ? ($candidate['phone']['primary'] ?? null) : ($candidate['phone'] ?? null))
                    ?? (is_array($bestMatch['phone'] ?? null) ? ($bestMatch['phone']['primary'] ?? null) : ($bestMatch['phone'] ?? null))
                    ?? (is_array($profileData['phone'] ?? null) ? ($profileData['phone']['primary'] ?? null) : ($profileData['phone'] ?? null)),
                'email' => (is_array($candidate['email'] ?? null) ? ($candidate['email']['primary'] ?? null) : ($candidate['email'] ?? null))
                    ?? (is_array($bestMatch['email'] ?? null) ? ($bestMatch['email']['primary'] ?? null) : ($bestMatch['email'] ?? null))
                    ?? (is_array($profileData['email'] ?? null) ? ($profileData['email']['primary'] ?? null) : ($profileData['email'] ?? null)),
                'industry' => $candidate['industry'] ?? $bestMatch['industry'] ?? $profileData['industry'] ?? null,
                'sub_industry' => $candidate['sub_industry'] ?? $bestMatch['sub_industry'] ?? $profileData['sub_industry'] ?? null,
                'business_category' => $candidate['business_category'] ?? $bestMatch['business_category'] ?? $profileData['business_category'] ?? null,
                'company_size' => $candidate['company_size_range'] ?? $candidate['company_size'] ?? $bestMatch['company_size_range'] ?? $bestMatch['company_size'] ?? $profileData['company_size_range'] ?? $profileData['company_size'] ?? null,
                'customer_story' => $candidate['brief_customer_story'] ?? $candidate['customer_story'] ?? $bestMatch['brief_customer_story'] ?? $bestMatch['customer_story'] ?? $profileData['brief_customer_story'] ?? $profileData['customer_story'] ?? null,
                'evidence' => [
                    'website_sources' => $candidate['sources'] ?? $bestMatch['sources'] ?? $profileData['sources'] ?? [],
                ],
            ]);
        }

        // 3. Resolve location using Google Maps Places API if address is provided or using company name
        $mapsDetails = null;
        $searchQuery = !empty($profileData['address']) ? $profileData['address'] : $companyName;
        $geocodeResult = $this->discovery->geocodeArea($searchQuery);
        if ($geocodeResult && !empty($geocodeResult['place_id'])) {
            $mapsDetails = $this->discovery->getPlaceDetails($geocodeResult['place_id']);
        }

        // Merge maps details if resolved (only overwrite if the resolved values are non-empty)
        if ($mapsDetails) {
            $profileData['address'] = !empty($mapsDetails['address']) ? $mapsDetails['address'] : ($profileData['address'] ?? null);
            $profileData['phone'] = !empty($mapsDetails['phone']) ? $mapsDetails['phone'] : ($profileData['phone'] ?? null);
            $profileData['website'] = !empty($mapsDetails['website']) ? $mapsDetails['website'] : ($profileData['website'] ?? null);
            $profileData['lat'] = $mapsDetails['lat'] ?? ($profileData['lat'] ?? null);
            $profileData['lng'] = $mapsDetails['lng'] ?? ($profileData['lng'] ?? null);
            $profileData['external_place_id'] = $mapsDetails['external_place_id'] ?? ($profileData['external_place_id'] ?? null);
        }

        // 4. Map to Leadsy master taxonomies
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

        // Save original and current JSON payloads
        $output->update([
            'status' => 'ready_for_review',
            'ai_provider' => $response['model'] ?? 'OpenAI',
            'ai_model' => $response['model'] ?? 'gpt-4o',
            'original_output_json' => $profileData,
            'current_output_json' => $profileData,
        ]);
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

        // 1. Retrieve taxonomies to pass as constraints
        $industries = Industry::where('is_active', true)->pluck('name')->toArray();
        $subIndustries = SubIndustry::where('is_active', true)->pluck('name')->toArray();
        $businessCategories = BusinessCategory::where('is_active', true)->pluck('name')->toArray();

        // 2. Call AI with Web Search
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

        // Flatten candidates if response is nested
        if (!empty($profileData['candidates']) && is_array($profileData['candidates'])) {
            $candidate = $profileData['candidates'][0] ?? [];
            $bestMatch = $profileData['best_match'] ?? [];
            $profileData = array_merge($profileData, [
                'company_name' => $candidate['legal_company_name'] ?? $candidate['legal_name'] ?? $candidate['company_name'] ?? $bestMatch['legal_company_name'] ?? $bestMatch['legal_name'] ?? $bestMatch['company_name'] ?? ($profileData['company_name'] ?? null),
                'brand' => $candidate['brand_name'] ?? $candidate['brand'] ?? $bestMatch['brand_name'] ?? $bestMatch['brand'] ?? $profileData['brand_name'] ?? ($profileData['brand'] ?? null),
                'website' => $candidate['website'] ?? $bestMatch['website'] ?? ($profileData['website'] ?? null),
                'address' => (is_array($candidate['physical_hq_address'] ?? null) ? ($candidate['physical_hq_address']['address'] ?? null) : ($candidate['physical_hq_address'] ?? $candidate['address'] ?? null))
                    ?? (is_array($bestMatch['physical_hq_address'] ?? null) ? ($bestMatch['physical_hq_address']['address'] ?? null) : ($bestMatch['physical_hq_address'] ?? $bestMatch['address'] ?? null))
                    ?? (is_array($profileData['physical_hq_address'] ?? null) ? ($profileData['physical_hq_address']['address'] ?? null) : ($profileData['physical_hq_address'] ?? ($profileData['address'] ?? null))),
                'phone' => (is_array($candidate['phone'] ?? null) ? ($candidate['phone']['primary'] ?? null) : ($candidate['phone'] ?? null))
                    ?? (is_array($bestMatch['phone'] ?? null) ? ($bestMatch['phone']['primary'] ?? null) : ($bestMatch['phone'] ?? null))
                    ?? (is_array($profileData['phone'] ?? null) ? ($profileData['phone']['primary'] ?? null) : ($profileData['phone'] ?? null)),
                'email' => (is_array($candidate['email'] ?? null) ? ($candidate['email']['primary'] ?? null) : ($candidate['email'] ?? null))
                    ?? (is_array($bestMatch['email'] ?? null) ? ($bestMatch['email']['primary'] ?? null) : ($bestMatch['email'] ?? null))
                    ?? (is_array($profileData['email'] ?? null) ? ($profileData['email']['primary'] ?? null) : ($profileData['email'] ?? null)),
                'industry' => $candidate['industry'] ?? $bestMatch['industry'] ?? ($profileData['industry'] ?? null),
                'sub_industry' => $candidate['sub_industry'] ?? $bestMatch['sub_industry'] ?? ($profileData['sub_industry'] ?? null),
                'business_category' => $candidate['business_category'] ?? $bestMatch['business_category'] ?? ($profileData['business_category'] ?? null),
                'company_size' => $candidate['company_size_range'] ?? $candidate['company_size'] ?? $bestMatch['company_size_range'] ?? $bestMatch['company_size'] ?? $profileData['company_size_range'] ?? ($profileData['company_size'] ?? null),
                'customer_story' => $candidate['brief_customer_story'] ?? $candidate['customer_story'] ?? $bestMatch['brief_customer_story'] ?? $bestMatch['customer_story'] ?? $profileData['brief_customer_story'] ?? ($profileData['customer_story'] ?? null),
            ]);
        }

        // 3. Resolve location and place details using Google Maps Places API
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

        // 4. Map to Leadsy master taxonomies
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

        // 5. Save all discovered metadata directly to Lead model
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
