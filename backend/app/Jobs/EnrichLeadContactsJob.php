<?php

namespace App\Jobs;

use App\Models\Lead;
use App\Services\Enrichment\ContactEnrichmentOrchestrator;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Queue job: Lead Contact Enrichment
 * Tier 2.5: Enrich leads with Contact Person (PIC) information
 */
class EnrichLeadContactsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public int $backoff = 30; // Handle API limits gracefully

    public function __construct(
        private readonly int $leadId,
    ) {}

    public function handle(ContactEnrichmentOrchestrator $orchestrator): void
    {
        $lead = Lead::find($this->leadId);

        if (! $lead) {
            return;
        }

        $wasModified = $orchestrator->enrichLeadContacts($lead);

        if ($wasModified) {
            Log::info("[EnrichLeadContactsJob] Enrichment successful for {$this->leadId}. Triggering AI Qualification pipeline.");
            // Trigger: scoring, qualification, AI analysis (Tier 3)
            ScoreLeadJob::dispatch($this->leadId)->onQueue('scoring');
        } else {
            Log::info("[EnrichLeadContactsJob] No new contacts added for {$this->leadId}.");
        }
    }
}
