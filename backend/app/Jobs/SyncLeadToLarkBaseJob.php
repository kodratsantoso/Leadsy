<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use App\Models\Lead;
use App\Models\LarkBaseTable;
use App\Models\LarkIntegration;
use App\Services\Lark\LarkBaseService;

class SyncLeadToLarkBaseJob implements ShouldQueue
{
    use Queueable;

    protected $leadId;

    /**
     * Create a new job instance.
     */
    public function __construct($leadId)
    {
        $this->leadId = $leadId;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $lead = Lead::find($this->leadId);
        if (!$lead) return;

        $integration = LarkIntegration::where('tenant_id', $lead->tenant_id)->where('is_active', true)->first();
        if (!$integration) return;

        $larkBaseService = new LarkBaseService($integration);
        $baseTables = LarkBaseTable::where('tenant_id', $lead->tenant_id)->where('is_active', true)->get();

        foreach ($baseTables as $baseTable) {
            $fieldDefinitions = [];
            try {
                $fieldDefinitions = $larkBaseService->listFields($baseTable->app_token, $baseTable->table_id)['items'] ?? [];
            } catch (\Exception $e) {
                // proceed without exact definitions
            }
            $larkBaseService->upsertLeadWithResult($lead, $baseTable, $fieldDefinitions);
        }

        // Also sync the latest PDF document if available
        $latestDocument = \App\Models\MeetingSummaryDocument::where('lead_id', $this->leadId)
            ->where('generation_status', 'success')
            ->latest()
            ->first();

        if ($latestDocument && $latestDocument->transcript_id) {
            \App\Jobs\SyncMeetingSummaryPdfToLarkBaseJob::dispatchSync($latestDocument->transcript_id);
        }
    }
}
