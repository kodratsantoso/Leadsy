<?php

namespace App\Jobs;

use App\Models\Lead;
use App\Services\Sales\PreMeetingAiScreeningOrchestratorService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
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
            Cache::put("lead_screening_{$this->leadId}", [
                'status' => 'failed',
                'error' => 'Lead not found.',
            ], 600);
            return;
        }

        try {
            Cache::put("lead_screening_{$this->leadId}", [
                'status' => 'processing',
                'lead_id' => $this->leadId,
                'company_name' => $lead->company_name,
                'started_at' => now()->toIso8601String(),
            ], 600);

            $result = $orchestrator->screenLead($lead, $this->userId);
            
            Cache::put("lead_screening_{$this->leadId}", array_merge($result, [
                'status' => 'completed',
                'completed_at' => now()->toIso8601String(),
            ]), 600);

            Log::info("[RunPreMeetingAiScreeningJob] Completed screening for lead {$this->leadId}", $result);
        } catch (\Throwable $e) {
            Log::error("[RunPreMeetingAiScreeningJob] Failed screening for lead {$this->leadId}: " . $e->getMessage());
            Cache::put("lead_screening_{$this->leadId}", [
                'status' => 'failed',
                'lead_id' => $this->leadId,
                'error' => $e->getMessage(),
            ], 600);
        }
    }
}
