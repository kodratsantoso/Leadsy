<?php

// backend/app/Jobs/SyncMekariQontakRoomsJob.php

namespace App\Jobs;

use App\Services\MekariQontakService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncMekariQontakRoomsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected ?int $tenantId;

    /**
     * Create a new job instance.
     */
    public function __construct(?int $tenantId = null)
    {
        $this->tenantId = $tenantId;
    }

    /**
     * Execute the job.
     */
    public function handle(MekariQontakService $service): void
    {
        Log::info('[Qontak Sync Job] Starting sync rooms for tenant: '.($this->tenantId ?? 'global'));

        try {
            $service->syncRooms($this->tenantId);
            Log::info('[Qontak Sync Job] Rooms sync completed successfully.');
        } catch (\Throwable $e) {
            Log::error('[Qontak Sync Job] Failed during room sync: '.$e->getMessage(), [
                'exception' => $e,
            ]);
        }
    }
}
