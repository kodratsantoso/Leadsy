<?php

namespace App\Jobs;

use App\Models\Lead;
use App\Services\Sales\PreMeetingAiScreeningOrchestratorService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class RunPreMeetingAiScreeningJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $timeout = 180;

    public function __construct(
        public readonly int $leadId,
        public readonly ?int $userId = null
    ) {}

    public function handle(PreMeetingAiScreeningOrchestratorService $orchestrator): void
    {
        $lead = Lead::find($this->leadId);
        if (!$lead) {
            Log::warning("[RunPreMeetingAiScreeningJob] Lead {$this->leadId} not found, skipping.");
            return;
        }

        try {
            $result = $orchestrator->screenLead($lead, $this->userId);
            Log::info("[RunPreMeetingAiScreeningJob] Completed screening for lead {$this->leadId}", $result);
        } catch (\Throwable $e) {
            Log::error("[RunPreMeetingAiScreeningJob] Failed screening for lead {$this->leadId}: " . $e->getMessage());
        }
    }
}
