<?php

namespace App\Observers;

use App\Models\LeadAiEvaluation;

class LeadAiEvaluationObserver
{
    /**
     * Handle the LeadAiEvaluation "created" event.
     */
    public function created(LeadAiEvaluation $leadAiEvaluation): void
    {
        $this->handleEvaluationChange($leadAiEvaluation);
    }

    /**
     * Handle the LeadAiEvaluation "updated" event.
     */
    public function updated(LeadAiEvaluation $leadAiEvaluation): void
    {
        $this->handleEvaluationChange($leadAiEvaluation);
    }

    private function handleEvaluationChange(LeadAiEvaluation $leadAiEvaluation): void
    {
        // 1. Trigger Lark Base Sync for Evaluation fields
        if ($leadAiEvaluation->lead_id) {
            \App\Jobs\SyncLeadToLarkBaseJob::dispatch($leadAiEvaluation->lead_id);
        }

        // 2. Trigger PDF Generation if this evaluation is from a Transcript AND BANTC is present
        if ($leadAiEvaluation->source_type === \App\Models\LeadTranscript::class && $leadAiEvaluation->source_id) {
            if (!empty($leadAiEvaluation->bantc_extracted)) {
                \App\Jobs\GenerateMeetingSummaryPdfJob::dispatch($leadAiEvaluation->source_id, $leadAiEvaluation->id);
            }
        }
    }

    /**
     * Handle the LeadAiEvaluation "deleted" event.
     */
    public function deleted(LeadAiEvaluation $leadAiEvaluation): void
    {
        //
    }

    /**
     * Handle the LeadAiEvaluation "restored" event.
     */
    public function restored(LeadAiEvaluation $leadAiEvaluation): void
    {
        //
    }

    /**
     * Handle the LeadAiEvaluation "force deleted" event.
     */
    public function forceDeleted(LeadAiEvaluation $leadAiEvaluation): void
    {
        //
    }
}
