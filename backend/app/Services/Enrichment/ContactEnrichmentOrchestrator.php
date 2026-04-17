<?php

namespace App\Services\Enrichment;

use App\Contracts\ContactEnrichmentProviderInterface;
use App\Models\Lead;
use App\Models\LeadContact;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class ContactEnrichmentOrchestrator
{
    /** @var ContactEnrichmentProviderInterface[] */
    private array $providers;

    public function __construct(iterable $providers)
    {
        $this->providers = is_array($providers) ? $providers : iterator_to_array($providers);
    }

    /**
     * Executes the contact enrichment workflow for a lead.
     * Retries and tracks limits. Returns true if modified.
     */
    public function enrichLeadContacts(Lead $lead): bool
    {
        if (empty($lead->company_name) || empty($lead->website_domain)) {
            Log::info("[Orchestrator] Lead {$lead->id} lacks company name or domain, skipping.");
            return false;
        }

        $domain = $lead->website_domain;
        $modified = false;

        foreach ($this->providers as $provider) {
            if (!$provider->isEnabled()) {
                continue;
            }

            $providerId = $provider->getIdentifier();
            $cacheKey = "enrichment_domain_{$providerId}_{$domain}";

            // Rate / Cost limit constraints check
            $dailyLimitKey = "{$providerId}_daily_requests_" . date('Y_m_d');
            $dailyLimit = config("services." . strtolower($providerId) . ".max_daily_requests", 50);

            // 1. Domain Cache Check (don't hit API if we already resolved this domain within 30 days)
            if (Cache::has($cacheKey)) {
                Log::info("[Orchestrator] Using cached {$providerId} contacts for {$domain}");
                $results = Cache::get($cacheKey);
            } else {
                // 2. Daily Cost Quota Check
                $currentUsage = Cache::get($dailyLimitKey, 0);
                if ($currentUsage >= $dailyLimit) {
                    Log::warning("[Orchestrator] Daily API Quota exceeded for {$providerId} ($currentUsage/$dailyLimit). Halting dispatch.");
                    continue; // Delegate to another provider if available
                }

                // Fire provider
                $results = $provider->searchContacts($lead->company_name, $domain);
                
                // Track usage properly
                Cache::increment($dailyLimitKey);
                
                // Save domain cache for 30 days
                Cache::put($cacheKey, $results, now()->addDays(30));
            }

            if (empty($results)) {
                continue; // Try next provider
            }

            $successMerge = $this->mergeContactsIntoLead($lead, $results, $providerId);
            if ($successMerge) {
                $modified = true;
            }
        }

        return $modified;
    }

    private function mergeContactsIntoLead(Lead $lead, array $results, string $sourceIdentifier): bool
    {
        $existingPrimary = $lead->contacts()->where('is_primary', true)->exists();
        $hasMerged = false;

        foreach ($results as $index => $contactData) {
            $name = trim(($contactData['first_name'] ?? '') . ' ' . ($contactData['last_name'] ?? ''));
            $email = $contactData['email'] ?? null;
            $phone = $contactData['phoneNumbers'][0]['number'] ?? null;

            if (empty($name)) {
                continue;
            }

            // Conflict Check
            $existingQuery = $lead->contacts()->where('name', $name);
            if ($email) { $existingQuery->orWhere('email', $email); }
            if ($phone) { $existingQuery->orWhere('phone', $phone); }
            $existingContact = $existingQuery->first();

            // Core Rules engine limit: Never overwrite verified or manual
            if ($existingContact) {
                if ($existingContact->source === 'manual' || $existingContact->confidence === 'high') {
                    continue;
                }
            }

            $confidenceRaw = $contactData['confidence'] ?? 50;

            $isPrimaryForThisPayload = false;
            // Mark the very first high confidence hit as primary if there's no primary yet
            if (!$existingPrimary && $index === 0 && $confidenceRaw > 80) {
                $isPrimaryForThisPayload = true;
                $existingPrimary = true;
            }

            $contact = LeadContact::create([
                'lead_id' => $lead->id,
                'name' => $name,
                'title' => $contactData['job_title'] ?? null,
                'email' => $email,
                'phone' => $phone,
                'confidence_score' => $confidenceRaw,
                'confidence' => $confidenceRaw > 80 ? 'high' : 'medium',
                'source' => $sourceIdentifier,
                'is_primary' => $isPrimaryForThisPayload,
            ]);

            $contact->payloads()->create([
                'source_type' => $sourceIdentifier,
                'raw_payload' => $contactData,
            ]);
            
            Log::info("[Orchestrator] Enriched lead {$lead->id} with contact: " . $name);
            $hasMerged = true;
        }

        return $hasMerged;
    }
}
