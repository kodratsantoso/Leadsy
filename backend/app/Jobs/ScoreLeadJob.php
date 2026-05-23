<?php

namespace App\Jobs;

use App\Models\Lead;
use App\Services\AuditService;
use App\Services\Lead\LeadScoringService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Queue job: Deterministic Lead Scoring
 *
 * Dispatched after lead creation or on-demand re-scoring.
 * Uses the deterministic LeadScoringService to evaluate and score a lead.
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

    public function handle(LeadScoringService $scoring): void
    {
        $lead = Lead::with(['industry', 'subIndustry', 'product', 'territory', 'contacts', 'sources', 'activities'])
            ->find($this->leadId);

        if (! $lead) {
            Log::warning("[ScoreLeadJob] Lead {$this->leadId} not found, skipping.");

            return;
        }

        // Mark as processing
        $lead->update(['ai_processing_status' => 'processing']);

        try {
            $scoreRecord = $scoring->scoreLead($lead);

            $lead->update([
                'ai_processing_status' => 'completed',
            ]);

            AuditService::log('lead_scored', 'leads', $lead, null, [
                'score' => $scoreRecord->score,
                'grade' => $scoreRecord->grade,
                'mode' => 'deterministic',
            ]);

            Log::info("[ScoreLeadJob] Lead {$this->leadId} scored deterministically: {$scoreRecord->score}");
        } catch (\Throwable $exception) {
            $lead->update(['ai_processing_status' => 'failed']);
            Log::error("[ScoreLeadJob] Failed for lead {$this->leadId}", ['error' => $exception->getMessage()]);
        }
    }
}
