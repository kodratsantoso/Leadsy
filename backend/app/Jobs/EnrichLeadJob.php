<?php

namespace App\Jobs;

use App\Models\Lead;
use App\Models\LeadActivity;
use App\Services\Enrichment\LeadEnrichmentAiOrchestrator;
use App\Services\Enrichment\LeadMasterDataMapperService;
use App\Services\Enrichment\LeadPostEnrichmentAIService;
use App\Services\Lead\LeadDiscoveryService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Queue job: Lead Enrichment — BRD §3.3.3
 *
 * Enriches a lead with company information, Google Maps, and AI-driven data standardisation.
 */
class EnrichLeadJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 15;

    public function __construct(
        private readonly int $leadId,
    ) {}

    public function handle(
        LeadDiscoveryService $discovery,
        LeadEnrichmentAiOrchestrator $aiOrchestrator,
        LeadPostEnrichmentAIService $postEnrichment
    ): void {
        $lead = Lead::find($this->leadId);

        if (! $lead) {
            Log::warning("[EnrichLeadJob] Lead {$this->leadId} not found, skipping.");
            return;
        }

        try {
            $details = null;
            $updates = [];
            $mappedFields = [];
            
            // 1. Resolve Location via Google Maps if not explicitly set but we have a name
            if ($lead->external_place_id) {
                $details = $discovery->getPlaceDetails($lead->external_place_id);
            } elseif ($lead->company_name) {
                // Try to find place by text search using company name and location
                $query = $lead->company_name;
                if ($lead->address) {
                    $query .= ' ' . $lead->address;
                }
                
                $searchResult = $discovery->geocodeArea($query);
                if ($searchResult && !empty($searchResult['place_id'])) {
                    $details = $discovery->getPlaceDetails($searchResult['place_id']);
                }
            }

            // 2. Extract Data from Maps details
            if ($details) {
                foreach (['phone', 'website', 'website_domain', 'operating_hours', 'address', 'lat', 'lng', 'external_place_id'] as $field) {
                    if (empty($lead->$field) && !empty($details[$field])) {
                        $updates[$field] = $details[$field];
                        $mappedFields[] = $field;
                        
                        if (in_array($field, ['phone', 'website', 'address'])) {
                            LeadActivity::create([
                                'lead_id' => $lead->id,
                                'activity_type' => 'system',
                                'description' => ucfirst($field) . " updated from Google Maps enrichment",
                                'activity_date' => now(),
                            ]);
                        }
                    }
                }
                
                if (!empty($updates)) {
                    $lead->update($updates);
                    $lead = $lead->fresh();
                }
            }

            // 3. Run AI Orchestration Pipeline
            $aiOrchestrator->runEnrichment($lead, $details);

            $lead->update([
                'enrichment_status' => 'completed',
                'last_enriched_at' => now(),
                'enrichment_metadata' => [
                    'fields_updated' => $mappedFields,
                    'source' => $details ? 'google_maps' : 'none',
                    'orchestrated_by_ai' => true,
                ],
            ]);

            Log::info("[EnrichLeadJob] Enriched lead {$this->leadId} with fields: " . implode(', ', $mappedFields));

            LeadActivity::create([
                'lead_id' => $lead->id,
                'activity_type' => 'system',
                'description' => "Enrichment completed successfully",
                'activity_date' => now(),
            ]);

            // 4. Trigger Post-Enrichment AI actions
            $postEnrichment->trigger($lead);

            // Chain Contact Discovery Enrichment
            EnrichLeadContactsJob::dispatch($this->leadId)
                ->delay(now()->addSeconds(5))
                ->onQueue('enrichment');

        } catch (\Throwable $e) {
            $lead->update([
                'enrichment_status' => 'failed',
                'enrichment_metadata' => ['error' => $e->getMessage()],
            ]);
            
            LeadActivity::create([
                'lead_id' => $lead->id,
                'activity_type' => 'system',
                'description' => "Enrichment failed: " . Str::limit($e->getMessage(), 200),
                'activity_date' => now(),
            ]);
            
            Log::error("[EnrichLeadJob] Failed for Lead {$this->leadId}", ['error' => $e->getMessage()]);
            throw $e;
        }
    }
}
