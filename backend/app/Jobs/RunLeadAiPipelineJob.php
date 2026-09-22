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

/**
 * Runs the unified Pre-Meeting AI pipeline (9 stages — see
 * PreMeetingAiScreeningOrchestratorService) automatically whenever a lead is
 * created, regardless of source. This replaces the old, narrower automatic
 * chain (EnrichLeadJob -> LeadPostEnrichmentAIService -> Score/Qualify/ICPMatch
 * jobs) as the single automatic entrypoint, so scoring/qualification/ICP are
 * never run twice for the same lead.
 */
class RunLeadAiPipelineJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    // Same reasoning as RunPreMeetingAiScreeningJob: 9 sequential AI-calling
    // stages can easily exceed 3 minutes.
    public int $timeout = 600;

    public function __construct(public readonly int $leadId) {}

    public function handle(PreMeetingAiScreeningOrchestratorService $orchestrator): void
    {
        if (! config('features.lead_ai_pipeline_enabled', true)) {
            Log::info("[RunLeadAiPipelineJob] Skipped for lead {$this->leadId} — lead_ai_pipeline_enabled is false.");
            return;
        }

        $lead = Lead::find($this->leadId);
        if (! $lead) {
            Log::warning("[RunLeadAiPipelineJob] Lead {$this->leadId} not found, skipping.");
            Cache::put("lead_ai_pipeline_{$this->leadId}", [
                'status' => 'failed',
                'error' => 'Lead not found.',
            ], 600);
            return;
        }

        $lead->update(['ai_processing_status' => 'processing']);

        try {
            Cache::put("lead_ai_pipeline_{$this->leadId}", [
                'status' => 'processing',
                'lead_id' => $this->leadId,
                'company_name' => $lead->company_name,
                'started_at' => now()->toIso8601String(),
            ], 600);

            $result = $orchestrator->screenLead($lead, null, 'auto_on_creation');

            $lead->update(['ai_processing_status' => 'completed']);

            Cache::put("lead_ai_pipeline_{$this->leadId}", array_merge($result, [
                'status' => 'completed',
                'completed_at' => now()->toIso8601String(),
            ]), 600);

            Log::info("[RunLeadAiPipelineJob] Completed pipeline for lead {$this->leadId}", $result);
        } catch (\Throwable $e) {
            Log::error("[RunLeadAiPipelineJob] Failed pipeline for lead {$this->leadId}: " . $e->getMessage());
            $lead->update(['ai_processing_status' => 'failed']);
            Cache::put("lead_ai_pipeline_{$this->leadId}", [
                'status' => 'failed',
                'lead_id' => $this->leadId,
                'error' => $e->getMessage(),
            ], 600);
        }
    }
}
