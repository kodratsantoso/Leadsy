<?php

namespace App\Services\Enrichment;

use App\Models\Lead;
use App\Models\LeadActivity;
use App\Jobs\EnrichLeadJob;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class LeadEnrichmentTriggerService
{
    /**
     * Trigger enrichment for a lead.
     */
    public function trigger(Lead $lead, string $source): void
    {
        if (!$lead->id) {
            Log::warning("[EnrichmentTrigger] Attempted to trigger enrichment for lead without ID.");
            return;
        }

        // Prevent duplicate concurrent enrichment
        if ($lead->enrichment_status === 'running') {
            // Check if it's been running for more than 10 minutes (stale job)
            if ($lead->last_enriched_at && $lead->last_enriched_at->diffInMinutes(now()) < 10) {
                Log::info("[EnrichmentTrigger] Lead {$lead->id} is already being enriched. Skipping.");
                return;
            }
        }

        // Skip if recently enriched and it was successful, unless forced or key fields changed
        // For this implementation, we just trigger if it hasn't been enriched recently
        if ($lead->enrichment_status === 'completed' && $lead->last_enriched_at && $lead->last_enriched_at->diffInHours(now()) < 24) {
            if ($source !== 'manual_retry') {
                Log::info("[EnrichmentTrigger] Lead {$lead->id} was recently enriched. Skipping.");
                return;
            }
        }

        // Update status
        $lead->update([
            'enrichment_status' => 'running',
            'last_enriched_at' => now(),
        ]);

        // Log activity
        LeadActivity::create([
            'lead_id' => $lead->id,
            'activity_type' => 'system',
            'description' => "Enrichment started (Source: {$source})",
            'activity_date' => now(),
        ]);

        // Dispatch job
        EnrichLeadJob::dispatch($lead->id)->onQueue('enrichment');
        
        Log::info("[EnrichmentTrigger] Dispatched EnrichLeadJob for Lead {$lead->id} (Source: {$source})");
    }
}
