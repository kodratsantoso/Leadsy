<?php

namespace App\Jobs;

use App\Models\Lead;
use App\Services\Revenue\ICPMatchingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ICPMatchLeadJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 30;

    public function __construct(
        private readonly int $leadId
    ) {}

    public function handle(ICPMatchingService $icpService): void
    {
        $lead = Lead::find($this->leadId);

        if (! $lead) {
            Log::warning("[ICPMatchLeadJob] Lead {$this->leadId} not found, skipping.");
            return;
        }

        try {
            $icpService->evaluateLead($lead);
            Log::info("[ICPMatchLeadJob] Lead {$this->leadId} ICP matched successfully.");
        } catch (\Throwable $exception) {
            Log::error("[ICPMatchLeadJob] Failed for lead {$this->leadId}", ['error' => $exception->getMessage()]);
        }
    }
}
