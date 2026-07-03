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
        // 1. Trigger Lark Base Sync for Evaluation fields (Skip for Transcripts, handled by job chain)
        if ($leadAiEvaluation->lead_id && $leadAiEvaluation->source_type !== \App\Models\LeadTranscript::class) {
            \App\Jobs\SyncLeadToLarkBaseJob::dispatch($leadAiEvaluation->lead_id);
        }

        // 2. Trigger PDF Generation (Skip for Transcripts, handled by job chain)
        // We now rely on the Job Chain started by AnalyzeTranscriptJob for transcripts.
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
