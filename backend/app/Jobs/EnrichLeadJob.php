<?php

namespace App\Jobs;

use App\Models\Lead;
use App\Models\LeadContact;
use App\Services\LeadDiscoveryService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Queue job: Lead Enrichment — BRD §3.3.3
 *
 * Uses Google Places detail API to enrich a lead with
 * additional company information (phone, website, hours).
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

        if (! $lead || empty($lead->external_place_id)) {
            Log::info("[EnrichLeadJob] Lead {$this->leadId} has no external_place_id, skipping.");
            return;
        }

        $details = $discovery->getPlaceDetails($lead->external_place_id);

        if (! $details) {
            Log::warning("[EnrichLeadJob] Could not fetch details for lead {$this->leadId}");
            return;
        }

        // Update lead with enriched data (only fill blank fields)
        $updates = [];
        foreach (['phone', 'website', 'website_domain', 'operating_hours', 'address'] as $field) {
            if (empty($lead->$field) && ! empty($details[$field])) {
                $updates[$field] = $details[$field];
            }
        }

        if (! empty($updates)) {
            $lead->update($updates);
            Log::info("[EnrichLeadJob] Enriched lead {$this->leadId} with fields: " . implode(', ', array_keys($updates)));
        }

        // Chain Contact Discovery Enrichment
        \App\Jobs\EnrichLeadContactsJob::dispatch($this->leadId)
            ->delay(now()->addSeconds(5))
            ->onQueue('enrichment');
    }
}
