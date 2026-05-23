<?php

namespace App\Jobs;

use App\Models\Lead;
use App\Services\AuditService;
use App\Services\DeduplicationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Queue job: Deduplication Check — BRD §3.7
 *
 * Runs the 4-tier dedup engine against a newly created lead.
 * Updates duplicate_status and duplicate_of_id.
 */
class DeduplicateLeadJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public function __construct(
        private readonly int $leadId,
    ) {}

    public function handle(DeduplicationService $dedup): void
    {
        $lead = Lead::find($this->leadId);

        if (! $lead) {
            return;
        }

        $result = $dedup->check([
            'company_name' => $lead->company_name,
            'website_domain' => $lead->website_domain,
            'email' => $lead->email,
            'phone' => $lead->phone,
            'lat' => $lead->lat,
            'lng' => $lead->lng,
        ]);

        // Don't match against itself
        if ($result->matchedLeadId === $lead->id) {
            $lead->update(['duplicate_status' => 'new']);

            return;
        }

        $lead->update([
            'duplicate_status' => $result->status,
            'duplicate_of_id' => $result->matchedLeadId,
        ]);

        if ($result->isDuplicate) {
            AuditService::log('duplicate_detected', 'leads', $lead, null, $result->toArray());
            Log::info("[DeduplicateLeadJob] Lead {$this->leadId} → {$result->status} of #{$result->matchedLeadId} ({$result->matchReason})");
        }
    }
}
