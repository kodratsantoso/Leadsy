<?php

namespace App\Services\Lead;

use App\Models\AiGeneratedOutput;
use App\Models\Industry;
use App\Models\Lead;
use App\Models\LeadBantcQuestionGuide;
use App\Models\LeadDiscoveryRecord;
use App\Models\LeadOfficeLocation;
use App\Models\SubIndustry;
use App\Models\BusinessCategory;
use App\Services\AI\AiOrchestrationService;
use App\Services\Enrichment\LeadMasterDataMapperService;
use App\Services\Presales\DiscoveryCompletenessService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;

class AiLeadProfilingService
{
    public function __construct(
        private readonly AiOrchestrationService $ai,
        private readonly LeadDiscoveryService $discovery,
        private readonly LeadMasterDataMapperService $mapper,
        private readonly \App\Services\Search\CompanyWebResearchService $webResearch
    ) {}

    /**
     * Start the AI lead profiling process.
     *
     * @param string $companyName
     * @param string|null $website
     * @param int|null $leadId
     * @param int|null $userId
     * @return AiGeneratedOutput
     */
    public function startProfiling(string $companyName, ?string $website = null, ?int $leadId = null, ?int $userId = null): AiGeneratedOutput
    {
        $output = $this->createPlaceholderOutput($companyName, $website, $leadId, $userId);

        // Trigger async profiling
        \App\Jobs\RunAiLeadProfilingJob::dispatch($output, $companyName, $website, $leadId);

        return $output;
    }

    /**
     * Same as startProfiling(), but runs inline instead of dispatching to
     * the queue. A queued RunAiLeadProfilingJob silently never completes if
     * the queue worker is down — the dispatch call still succeeds, so the
     * caller sees no error, just a "researching" status that never
     * advances. A single profiling call is one AI round-trip (~20-60s
     * historically), short enough to run inline within the HTTP request
     * without needing the queue's retry/backoff machinery.
     */
    public function startProfilingSync(string $companyName, ?string $website = null, ?int $leadId = null, ?int $userId = null): AiGeneratedOutput
    {
        $output = $this->createPlaceholderOutput($companyName, $website, $leadId, $userId);

        try {
            $this->performProfiling($output, $companyName, $website, $leadId);
        } catch (\Throwable $e) {
            Log::error("[AiLeadProfiling] Profiling failed for {$companyName}", ['error' => $e->getMessage()]);

            $original = $output->original_output_json ?? [];
            $current = $output->current_output_json ?? [];

            $output->update([
                'status' => 'failed',
                'original_output_json' => array_merge(is_array($original) ? $original : [], ['error' => $e->getMessage()]),
                'current_output_json' => array_merge(is_array($current) ? $current : [], ['error' => $e->getMessage()]),
            ]);
        }

        return $output->fresh();
    }

    private function createPlaceholderOutput(string $companyName, ?string $website = null, ?int $leadId = null, ?int $userId = null): AiGeneratedOutput
    {
        $payload = ['company_name' => $companyName];
        if (!empty($website)) {
            $payload['website'] = $website;
        }

        return AiGeneratedOutput::create([
            'entity_type' => 'App\Models\Lead',
            'entity_id' => $leadId ?? 0,
            'feature_key' => 'lead_ai_profiling',
            'status' => 'researching',
            'generated_by' => $userId,
            'generated_at' => Carbon::now(),
            'original_output_json' => $payload,
            'current_output_json' => $payload,
        ]);
    }

    /**
     * Perform the actual profiling process.
     */
    public function performProfiling(AiGeneratedOutput $output, string $companyName, ?string $website = null, ?int $leadId = null): void
    {
        if (empty($website) && !empty($leadId)) {
            $lead = \App\Models\Lead::find($leadId);
            $website = $lead?->website ?: $lead?->website_domain;
        }

        $industries = Industry::where('is_active', true)->pluck('name')->toArray();
        $subIndustries = SubIndustry::where('is_active', true)->pluck('name')->toArray();
        $businessCategories = BusinessCategory::where('is_active', true)->pluck('name')->toArray();

        // Search and crawl official site first, then ask AI. Leadsy fetches the official
        // homepage, about, and service pages directly so the model receives real facts.
        $research = $this->webResearch->research($companyName, $website);

        $response = $this->ai->call('lead_ai_profiling', '', [
            'company_name' => $companyName,
            'available_industries' => implode(', ', $industries),
            'available_sub_industries' => implode(', ', $subIndustries),
            'available_business_categories' => implode(', ', $businessCategories),
            'web_research' => $research['available']
                ? $research['findings']
                : 'No web research is available for this company ('.($research['reason'] ?? 'unknown').'). '
                    .'Return null for anything you cannot verify — do not fill gaps from memory.',
            'web_search' => true,
        ]);

        if (!$response['success'] || empty($response['content'])) {
            throw new \Exception($response['error'] ?? 'AI Profiling call failed or returned empty content.');
        }

        $rawJson = preg_replace('/^```(?:json)?\s*|\s*```$/s', '', trim($response['content']));
        $profileData = json_decode($rawJson, true);
        if (!is_array($profileData)) {
            // Surface why parsing failed (e.g. truncated output from hitting
            // max_tokens) instead of a bare generic message — this is stored
            // on the AiGeneratedOutput record and is otherwise the only clue
            // available without direct server log access.
            throw new \Exception(sprintf(
                'Failed to parse AI profiling response JSON (%s). Raw response (last 500 chars): %s',
                json_last_error_msg(),
                mb_substr($rawJson, -500)
            ));
        }

        if (!empty($profileData['candidates']) && is_array($profileData['candidates'])) {
            $candidate = $profileData['candidates'][0] ?? [];
            $bestMatch = $profileData['best_match'] ?? [];
            $profileData = array_merge($profileData, $this->extractCandidateFields($candidate, $bestMatch, $profileData));
        }

        if (empty($profileData['company_name']) && !empty($profileData['legal_name'])) {
            $profileData['company_name'] = $profileData['legal_name'];
        }

        // Carry the state of the research through to the screen.
        $profileData['research_status'] = [
            'available' => $research['available'],
            'reason' => $research['reason'] ?? null,
            'source_count' => count($research['sources'] ?? []),
            'providers' => $research['providers'] ?? [],
            'provider_labels' => $research['provider_labels'] ?? [],
            'pages_read' => $research['pages_read'] ?? 0,
            'official_website' => $research['official_website'] ?? null,
        ];

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

        if (empty($profileData['website']) && !empty($research['official_website'])) {
            $profileData['website'] = $research['official_website'];
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
            'entity_selection_note' => $pick('entity_selection_note'),
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
            'secondary_industries' => $pick('secondary_industries') ?? [],
            'secondary_business_categories' => $pick('secondary_business_categories') ?? [],
            'primary_sector' => $pick('primary_sector'),
            'vertical' => $pick('vertical'),
            'core_product' => $pick('core_product'),
            'specialization' => $pick('specialization'),
            'company_size' => $pick('company_size_range', 'company_size'),
            'company_size_estimate' => $pick('company_size_estimate'),
            'operational_area_type' => $pick('operational_area_type'),
            'branch_count' => $pick('branch_count'),
            'office_locations' => $pick('office_locations') ?? [],
            'business_model' => $pick('business_model'),
            'target_market' => $pick('target_market'),
            'corporate_structure' => $pick('corporate_structure'),
            'manufacturing_capability' => $pick('manufacturing_capability'),
            'product_brands' => $pick('product_brands'),
            'certifications_or_registrations' => $pick('certifications_or_registrations'),
            'customer_story' => $pick('brief_customer_story', 'customer_story'),
            'presales_perspective' => $pick('presales_perspective'),
            'sales_notes' => $pick('sales_notes') ?? [],
            'discrepancies' => $pick('discrepancies') ?? [],
            'source_validation' => $pick('source_validation') ?? [],
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

        // Stage 1 of the screening pipeline runs this path, so it needs the same real
        // sources as the standalone profiler — otherwise every automatically screened
        // lead is profiled from the model's memory alone.
        $research = $this->webResearch->research($companyName, $lead->tenant_id);

        $response = $this->ai->call('lead_ai_profiling', '', [
            'company_name' => $companyName,
            'available_industries' => implode(', ', $industries),
            'available_sub_industries' => implode(', ', $subIndustries),
            'available_business_categories' => implode(', ', $businessCategories),
            'web_research' => $research['available']
                ? $research['findings']
                : 'No web research is available for this company ('.($research['reason'] ?? 'unknown').'). '
                    .'Return null for anything you cannot verify — do not fill gaps from memory.',
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

        $companySize = !empty($profileData['company_size'])
            ? (string) $profileData['company_size']
            : (!empty($profileData['company_size_estimate']) ? (string) $profileData['company_size_estimate'] : $lead->company_size_estimate);

        $parsedBranchCount = $this->parseBranchCount(
            $profileData['branch_count'] ?? null,
            is_array($profileData['office_locations'] ?? null) ? $profileData['office_locations'] : []
        );

        $lead->update([
            'legal_name' => !empty($profileData['legal_name']) ? mb_substr((string) $profileData['legal_name'], 0, 255) : ($lead->legal_name ?: null),
            'brand' => !empty($profileData['brand']) ? $profileData['brand'] : ($lead->brand ?: null),
            'ownership_type' => !empty($profileData['ownership_type']) ? mb_substr((string) $profileData['ownership_type'], 0, 120) : ($lead->ownership_type ?: null),
            'year_established' => !empty($profileData['year_established']) ? mb_substr((string) $profileData['year_established'], 0, 16) : ($lead->year_established ?: null),
            'website' => !empty($profileData['website']) ? $profileData['website'] : ($lead->website ?: null),
            'phone' => !empty($profileData['phone']) ? $profileData['phone'] : ($lead->phone ?: null),
            'whatsapp' => !empty($profileData['whatsapp']) ? mb_substr((string) $profileData['whatsapp'], 0, 40) : ($lead->whatsapp ?: null),
            'email' => !empty($profileData['email']) ? $profileData['email'] : ($lead->email ?: null),
            'address' => !empty($profileData['address']) ? $profileData['address'] : ($lead->address ?: null),
            'industry_id' => $industryId,
            'sub_industry_id' => $subIndustryId,
            'business_category_id' => $businessCategoryId,
            'business_category' => $businessCategoryName,
            'company_size_estimate' => $companySize,
            'operational_scope' => !empty($profileData['operational_area_type'])
                ? mb_substr((string) $profileData['operational_area_type'], 0, 120)
                : ($lead->operational_scope ?: null),
            'branch_count' => $parsedBranchCount ?? $lead->branch_count,
            'customer_story' => !empty($profileData['customer_story']) ? $profileData['customer_story'] : ($lead->customer_story ?: null),
            'ai_profile_json' => $profileData,
            'lat' => $profileData['lat'] ?? $lead->lat,
            'lng' => $profileData['lng'] ?? $lead->lng,
            'external_place_id' => $profileData['external_place_id'] ?? $lead->external_place_id,
            'enrichment_status' => 'completed',
            'last_enriched_at' => now(),
        ]);

        $this->hydrateLeadFromProfile($lead, $profileData);

        return $profileData;
    }

    /**
     * Hydrate relational office locations, link standalone AiGeneratedOutput records,
     * and non-destructively seed Presales Discovery & BANTC questions from AI Profiling data.
     *
     * @return array{office_locations_synced: int, discovery_sections_seeded: array<int, string>, questions_seeded: int}
     */
    public function hydrateLeadFromProfile(
        Lead $lead,
        array $profileData,
        ?int $aiOutputId = null,
        ?int $userId = null,
        bool $forcePlaybookSync = false,
        ?array $explicitLocations = null
    ): array {
        $summary = [
            'office_locations_synced' => 0,
            'discovery_sections_seeded' => [],
            'questions_seeded' => 0,
        ];

        // 1. Link standalone AiGeneratedOutput (created when lead_id was 0 during New Lead modal)
        if ($aiOutputId) {
            AiGeneratedOutput::whereKey($aiOutputId)
                ->where('feature_key', 'lead_ai_profiling')
                ->whereIn('entity_id', [0, $lead->id])
                ->update([
                    'entity_id' => $lead->id,
                    'status' => 'applied',
                ]);
        }

        // 2. Sync scalar fields on Lead if missing on the model when applied manually
        $scalarUpdates = [];
        if (empty($lead->legal_name) && !empty($profileData['legal_name'])) {
            $scalarUpdates['legal_name'] = mb_substr((string) $profileData['legal_name'], 0, 255);
        }
        if (empty($lead->ownership_type) && !empty($profileData['ownership_type'])) {
            $scalarUpdates['ownership_type'] = mb_substr((string) $profileData['ownership_type'], 0, 120);
        }
        if (empty($lead->year_established) && !empty($profileData['year_established'])) {
            $scalarUpdates['year_established'] = mb_substr((string) $profileData['year_established'], 0, 16);
        }
        if (empty($lead->operational_scope) && !empty($profileData['operational_area_type'])) {
            $scalarUpdates['operational_scope'] = mb_substr((string) $profileData['operational_area_type'], 0, 120);
        }
        if (empty($lead->whatsapp) && !empty($profileData['whatsapp'])) {
            $scalarUpdates['whatsapp'] = mb_substr((string) $profileData['whatsapp'], 0, 40);
        }
        if (empty($lead->customer_story) && !empty($profileData['customer_story'])) {
            $scalarUpdates['customer_story'] = (string) $profileData['customer_story'];
        }

        $locationsInput = $explicitLocations ?? (is_array($profileData['office_locations'] ?? null) ? $profileData['office_locations'] : []);
        $parsedBranch = $this->parseBranchCount($profileData['branch_count'] ?? null, $locationsInput);
        if ($lead->branch_count === null && $parsedBranch !== null) {
            $scalarUpdates['branch_count'] = $parsedBranch;
        }

        if (!empty($scalarUpdates)) {
            $lead->update($scalarUpdates);
        }

        // 3. Sync relational lead_office_locations (preserving any manual entries)
        if (!empty($locationsInput) && Schema::hasTable('lead_office_locations')) {
            $summary['office_locations_synced'] = $this->syncOfficeLocations($lead, $locationsInput);
        }

        // 4. Non-destructively hydrate Presales Discovery & BANTC Question Guide
        $salesNotes = is_array($profileData['sales_notes'] ?? null) ? $profileData['sales_notes'] : [];
        if (!empty($salesNotes)) {
            $summary['discovery_sections_seeded'] = $this->seedDiscoveryRecord($lead, $salesNotes, $profileData, $userId, $forcePlaybookSync);
            $summary['questions_seeded'] = $this->seedDiscoveryQuestions($lead, $salesNotes['discovery_questions'] ?? [], $userId, $forcePlaybookSync);
        }

        return $summary;
    }

    /**
     * Sync AI-discovered office/plant/branch locations into relational `lead_office_locations`
     * without touching user-created (`source = 'manual'`) records.
     */
    public function syncOfficeLocations(Lead $lead, array $locations): int
    {
        if (!Schema::hasTable('lead_office_locations')) {
            return 0;
        }

        LeadOfficeLocation::withoutGlobalScopes()
            ->where('lead_id', $lead->id)
            ->where('source', 'ai_profiling')
            ->delete();

        $inserted = 0;
        $seenKeys = [];

        foreach ($locations as $idx => $loc) {
            if (is_string($loc)) {
                $loc = ['address' => $loc];
            }
            if (!is_array($loc)) {
                continue;
            }

            $city = trim((string) ($loc['city'] ?? ''));
            $province = trim((string) ($loc['province'] ?? ''));
            $country = trim((string) ($loc['country'] ?? 'Indonesia')) ?: 'Indonesia';
            $address = trim((string) ($loc['address'] ?? ''));
            $type = trim((string) ($loc['location_type'] ?? $loc['type'] ?? ''));
            $label = trim((string) ($loc['label'] ?? $loc['name'] ?? ''));

            if ($city === '' && $address === '' && $label === '') {
                continue;
            }

            $dedupKey = mb_strtolower("{$type}|{$city}|{$address}|{$label}");
            if (isset($seenKeys[$dedupKey])) {
                continue;
            }
            $seenKeys[$dedupKey] = true;

            $isHq = $idx === 0 || preg_match('/\b(hq|headquarter|pusat|head office)\b/i', $type . ' ' . $label) === 1;

            LeadOfficeLocation::create([
                'tenant_id' => $lead->tenant_id,
                'lead_id' => $lead->id,
                'location_type' => $type !== '' ? mb_substr($type, 0, 80) : ($idx === 0 ? 'Headquarters' : 'Branch / Site'),
                'label' => $label !== '' ? mb_substr($label, 0, 180) : ($city !== '' ? "{$city} Office" : null),
                'address' => $address !== '' ? $address : null,
                'city' => $city !== '' ? mb_substr($city, 0, 120) : null,
                'province' => $province !== '' ? mb_substr($province, 0, 120) : null,
                'country' => mb_substr($country, 0, 100),
                'lat' => isset($loc['lat']) && is_numeric($loc['lat']) ? (float) $loc['lat'] : null,
                'lng' => isset($loc['lng']) && is_numeric($loc['lng']) ? (float) $loc['lng'] : null,
                'source' => 'ai_profiling',
                'is_primary' => $isHq && $inserted === 0,
            ]);

            $inserted++;
        }

        return $inserted;
    }

    /**
     * Seed empty sections in `lead_discovery_records` with `ai_suggested` provenance.
     * Never overwrites human `confirmed` sections.
     *
     * @return array<int, string>
     */
    private function seedDiscoveryRecord(
        Lead $lead,
        array $salesNotes,
        array $profileData,
        ?int $userId,
        bool $forceRefreshAiSuggested
    ): array {
        if (!Schema::hasTable('lead_discovery_records')) {
            return [];
        }

        $record = LeadDiscoveryRecord::firstOrNew(['lead_id' => $lead->id]);
        $sections = is_array($record->sections) ? $record->sections : [];
        $fieldSources = is_array($record->field_sources) ? $record->field_sources : [];

        $candidates = [
            'pain_points' => $this->formatBulletText($salesNotes['pain_points'] ?? []),
            'stakeholders' => $this->formatBulletText($salesNotes['departments_to_approach'] ?? []),
            'business_objectives' => $this->formatBulletText($salesNotes['potential_needs'] ?? []),
            'functional_requirements' => $this->formatBulletText($salesNotes['solution_angles'] ?? []),
        ];

        if (!empty($profileData['manufacturing_capability']) || !empty($profileData['core_product'])) {
            $opsLines = array_filter([
                !empty($profileData['core_product']) ? 'Core Product/Service: ' . $profileData['core_product'] : null,
                !empty($profileData['manufacturing_capability']) ? 'Operational Capability: ' . $profileData['manufacturing_capability'] : null,
                !empty($profileData['corporate_structure']) ? 'Corporate Structure: ' . $profileData['corporate_structure'] : null,
            ]);
            if (!empty($opsLines)) {
                $candidates['current_process'] = implode("\n", array_map(fn ($l) => "• {$l}", $opsLines));
            }
        }

        $seededKeys = [];
        foreach ($candidates as $sectionKey => $text) {
            if ($text === '') {
                continue;
            }
            $currentVal = isset($sections[$sectionKey]) && is_string($sections[$sectionKey])
                ? trim($sections[$sectionKey])
                : '';
            $currentSource = $fieldSources[$sectionKey] ?? null;

            $canWrite = $currentVal === '' || ($forceRefreshAiSuggested && $currentSource === 'ai_suggested');
            if ($canWrite) {
                $sections[$sectionKey] = $text;
                $fieldSources[$sectionKey] = 'ai_suggested';
                $seededKeys[] = $sectionKey;
            }
        }

        if (!empty($seededKeys)) {
            if (!$record->exists && $userId) {
                $record->created_by = $userId;
            }
            if ($userId) {
                $record->updated_by = $userId;
            }
            $record->sections = $sections;
            $record->field_sources = $fieldSources;
            if (empty($record->qualification_status)) {
                $record->qualification_status = 'in_progress';
            }
            $record->save();

            app(DiscoveryCompletenessService::class)->applyEvaluation($record);
        }

        return $seededKeys;
    }

    /**
     * Seed initial discovery questions into `lead_bantc_question_guides` if none exist yet
     * (or append unique questions when explicitly triggered via Playbook Sync).
     */
    private function seedDiscoveryQuestions(Lead $lead, mixed $rawQuestions, ?int $userId, bool $appendIfExisting): int
    {
        if (!is_array($rawQuestions) || empty($rawQuestions) || !Schema::hasTable('lead_bantc_question_guides')) {
            return 0;
        }

        $cleanQuestions = array_values(array_filter(
            array_map(fn ($q) => is_string($q) ? trim($q) : '', $rawQuestions),
            fn ($q) => $q !== ''
        ));

        if (empty($cleanQuestions)) {
            return 0;
        }

        $guide = LeadBantcQuestionGuide::firstOrNew(['lead_id' => $lead->id]);
        $existing = is_array($guide->questions) ? $guide->questions : [];

        if (!empty($existing) && !$appendIfExisting) {
            return 0;
        }

        $existingTexts = array_map(
            fn ($item) => mb_strtolower(trim((string) ($item['text'] ?? ''))),
            $existing
        );

        $added = 0;
        $nextOrder = count($existing) + 1;
        foreach ($cleanQuestions as $qText) {
            $norm = mb_strtolower($qText);
            if (in_array($norm, $existingTexts, true)) {
                continue;
            }
            $existing[] = [
                'id' => 'prof-q-' . substr(md5($norm), 0, 8),
                'text' => mb_substr($qText, 0, 1000),
                'category' => $this->inferQuestionCategory($qText),
                'order' => $nextOrder++,
            ];
            $existingTexts[] = $norm;
            $added++;
        }

        if ($added > 0) {
            $guide->questions = $existing;
            $guide->ai_generated = true;
            $guide->ai_model = $guide->ai_model ?: 'ai_lead_profiling';
            if ($userId) {
                $guide->updated_by = $userId;
            }
            $guide->save();
        }

        return $added;
    }

    private function inferQuestionCategory(string $question): string
    {
        $lower = mb_strtolower($question);
        if (preg_match('/\b(budget|anggaran|investasi|capex|opex|biaya)\b/', $lower)) {
            return 'Budget';
        }
        if (preg_match('/\b(keputusan|direktur|manajemen|approval|stakeholder|pic|departemen)\b/', $lower)) {
            return 'Authority';
        }
        if (preg_match('/\b(target|jadwal|kuartal|tahun ini|go-live|timeline|kapan)\b/', $lower)) {
            return 'Timeline';
        }
        if (preg_match('/\b(vendor|kompetitor|eksisting|sistem saat ini|erp|software)\b/', $lower)) {
            return 'Competition';
        }

        return 'Need';
    }

    private function formatBulletText(mixed $items): string
    {
        if (is_string($items)) {
            return trim($items);
        }
        if (!is_array($items)) {
            return '';
        }

        $lines = array_values(array_filter(
            array_map(fn ($item) => is_string($item) ? trim($item) : '', $items),
            fn ($line) => $line !== ''
        ));

        if (empty($lines)) {
            return '';
        }

        return implode("\n", array_map(fn ($line) => "• {$line}", $lines));
    }

    private function parseBranchCount(mixed $rawBranchCount, array $locations = []): ?int
    {
        if (is_int($rawBranchCount) && $rawBranchCount >= 0) {
            return $rawBranchCount;
        }
        if (is_string($rawBranchCount) || is_float($rawBranchCount)) {
            if (preg_match('/\d+/', (string) $rawBranchCount, $matches)) {
                return (int) $matches[0];
            }
        }
        if (!empty($locations)) {
            return count($locations);
        }

        return null;
    }
}
