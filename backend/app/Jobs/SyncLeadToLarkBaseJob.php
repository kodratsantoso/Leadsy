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
    }
}
