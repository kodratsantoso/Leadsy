<?php

namespace App\Jobs;

use App\Models\LarkBaseTable;
use App\Models\LarkIntegration;
use App\Services\Lark\LarkBaseService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class PullLarkBaseJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 600;

    protected $baseTableId;
    protected $limit;

    /**
     * Create a new job instance.
     */
    public function __construct(int $baseTableId, int $limit = 3000)
    {
        $this->baseTableId = $baseTableId;
        $this->limit = $limit;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $baseTable = LarkBaseTable::find($this->baseTableId);
        if (!$baseTable) return;

        $integration = LarkIntegration::where('tenant_id', $baseTable->tenant_id)
            ->where('is_active', true)
            ->first();

        if (!$integration) return;

        $service = new LarkBaseService($integration);
        $pageToken = null;
        $items = [];
        $limit = $this->limit;

        try {
            do {
                $records = $service->searchRecords($baseTable->app_token, $baseTable->table_id, [], [
                    'page_size' => min(500, $limit - count($items)),
                    'page_token' => $pageToken,
                ]);

                $fetchedItems = $records['items'] ?? [];
                $items = array_merge($items, $fetchedItems);
                $pageToken = $records['page_token'] ?? null;
                $hasMore = $records['has_more'] ?? false;
            } while ($pageToken && $hasMore && count($items) < $limit);
        } catch (\Throwable $e) {
            Log::error('PullLarkBaseJob failed to fetch records', ['error' => $e->getMessage(), 'table_id' => $baseTable->id]);
            return;
        }

        // Get all existing mappings for this table to filter the pulled items
        $existingMappings = \App\Models\LarkBaseRecordMapping::where('lark_base_table_id', $baseTable->id)
            ->where('leadsy_entity_type', 'lead')
            ->pluck('lark_record_id')
            ->flip(); // allows fast O(1) lookup using isset

        foreach ($items as $record) {
            $recordId = $record['record_id'] ?? null;
            if (!$recordId) {
                continue;
            }

            // Skip records that do not have an existing mapping in Leadsy (User approved: keep skipping to avoid duplicates)
            if (!isset($existingMappings[$recordId])) {
                continue;
            }

            try {
                $service->syncRecordToLeadWithResult($baseTable, $recordId, $record);
            } catch (\Exception $exception) {
                Log::error('PullLarkBaseJob failed to sync record', [
                    'record_id' => $recordId,
                    'error' => $exception->getMessage()
                ]);
            }
        }
    }
}
