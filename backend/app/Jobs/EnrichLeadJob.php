<?php

namespace App\Jobs;

use App\Models\Lead;
use App\Models\LeadActivity;
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

    public function handle(LeadDiscoveryService $discovery): void
    {
        $lead = Lead::find($this->leadId);

        if (! $lead) {
            Log::warning("[EnrichLeadJob] Lead {$this->leadId} not found, skipping.");
            return;
        }

        try {
            $details = null;
            $updates = [];
            $mappedFields = [];
            
            // 1. Resolve Location via Google Maps if we have an explicit place ID
            if ($lead->external_place_id) {
                $details = $discovery->getPlaceDetails($lead->external_place_id);
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

            $lead->update([
                'enrichment_status' => 'completed',
                'last_enriched_at' => now(),
                'enrichment_metadata' => [
                    'fields_updated' => $mappedFields,
                    'source' => $details ? 'google_maps' : 'none',
                    'orchestrated_by_ai' => true,
                ],
            ]);

            Log::info("[EnrichLeadJob] Mapped Google Maps fields for lead {$this->leadId}: " . implode(', ', $mappedFields));

            LeadActivity::create([
                'lead_id' => $lead->id,
                'activity_type' => 'system',
                'description' => "Enrichment completed successfully",
                'activity_date' => now(),
            ]);

            // 3. Hand off to the unified Pre-Meeting AI pipeline — this now
            // covers deep AI enrichment (which used to run inline here via
            // LeadEnrichmentAiOrchestrator), scoring, qualification, ICP matching,
            // and everything else. Do NOT also call the old
            // LeadPostEnrichmentAIService chain here — it would duplicate AI calls
            // and race on lead_score/qualification_status writes.
            RunLeadAiPipelineJob::dispatch($this->leadId);

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
