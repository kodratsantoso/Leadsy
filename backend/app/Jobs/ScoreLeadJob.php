<?php

namespace App\Jobs;

use App\Models\Lead;
use App\Services\AiOrchestrationService;
use App\Services\AuditService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Queue job: AI Lead Scoring — BRD §3.10
 *
 * Dispatched after lead creation or on-demand re-scoring.
 * Uses the AI Orchestration Service to evaluate and score a lead.
 */
class ScoreLeadJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 30;

    public function __construct(
        private readonly int $leadId,
        private readonly ?string $productReference = null,
    ) {}

    public function handle(AiOrchestrationService $ai): void
    {
        $lead = Lead::with(['industry', 'subIndustry', 'product'])->find($this->leadId);

        if (! $lead) {
            Log::warning("[ScoreLeadJob] Lead {$this->leadId} not found, skipping.");
            return;
        }

        // Mark as processing
        $lead->update(['ai_processing_status' => 'processing']);

        $productRef = $this->productReference;
        if (! $productRef && $lead->product) {
            $productRef = $lead->product->ai_reference_material;
        }

        $result = $ai->scoreLead($lead->toArray(), $productRef);

        if ($result['success']) {
            $lead->update([
                'lead_score'           => $result['score'],
                'qualification_status' => $result['qualification_status'],
                'ai_explanation'       => $result['explanation'],
                'ai_processing_status' => 'completed',
            ]);

            AuditService::log('ai_scored', 'leads', $lead, null, [
                'score'  => $result['score'],
                'status' => $result['qualification_status'],
                'cost'   => $result['cost'],
            ]);

            Log::info("[ScoreLeadJob] Lead {$this->leadId} scored: {$result['score']}");
        } else {
            $lead->update(['ai_processing_status' => 'failed']);
            Log::error("[ScoreLeadJob] Failed for lead {$this->leadId}", ['error' => $result['error'] ?? 'unknown']);
        }
    }
}
