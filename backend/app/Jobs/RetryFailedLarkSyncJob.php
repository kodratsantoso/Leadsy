<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

use App\Models\LarkBaseRecordMapping;
use Carbon\Carbon;

class RetryFailedLarkSyncJob implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $failedMappings = LarkBaseRecordMapping::where('sync_status', 'failed')
            ->whereNotNull('lark_record_id')
            ->where('updated_at', '<=', Carbon::now()->subMinutes(5)) // only retry after 5 mins
            ->limit(50)
            ->get();

        foreach ($failedMappings as $mapping) {
            if ($mapping->leadsy_entity_type === 'lead') {
                SyncLeadToLarkBaseJob::dispatch($mapping->leadsy_entity_id);
            }
        }
    }
}
