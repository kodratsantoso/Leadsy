<?php

namespace App\Jobs;

use App\Models\IndustryNewsSyncLog;
use App\Services\News\IndustryNewsSyncService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncIndustryNewsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 180;

    public function __construct(
        public int $syncLogId,
        public ?string $focusKeyword = null,
    ) {}

    public function handle(IndustryNewsSyncService $syncService): void
    {
        $syncLog = IndustryNewsSyncLog::withoutGlobalScopes()->find($this->syncLogId);
        if (! $syncLog) {
            return;
        }

        try {
            $syncService->performSync($syncLog, $this->focusKeyword);
        } catch (\Throwable $e) {
            Log::error('[SyncIndustryNewsJob] Failed executing news sync', [
                'sync_log_id' => $this->syncLogId,
                'error' => $e->getMessage(),
            ]);

            $syncLog->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'completed_at' => now(),
            ]);
        }
    }

    public function failed(?\Throwable $e = null): void
    {
        $syncLog = IndustryNewsSyncLog::withoutGlobalScopes()->find($this->syncLogId);
        if (! $syncLog) {
            return;
        }

        $syncLog->update([
            'status' => 'failed',
            'error_message' => $e?->getMessage() ?? 'News sync job terminated unexpectedly before completion.',
            'completed_at' => now(),
        ]);
    }
}
