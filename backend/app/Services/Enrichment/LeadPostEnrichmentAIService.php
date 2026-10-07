<?php

namespace App\Services\Enrichment;

use App\Models\Lead;
use Illuminate\Support\Facades\Log;

/**
 * @deprecated This service used to dispatch ScoreLeadJob/QualifyLeadJob/
 * ICPMatchLeadJob independently after enrichment. That's now covered by
 * the unified Pre-Meeting AI pipeline (RunLeadAiPipelineJob ->
 * PreMeetingAiScreeningOrchestratorService), which EnrichLeadJob dispatches
 * directly. Keeping this class (emptied) rather than deleting it in case
 * anything still type-hints it via the container — no code calls trigger()
 * anymore as of this change.
 */
class LeadPostEnrichmentAIService
{
    public function trigger(Lead $lead): void
    {
        Log::info("[PostEnrichment] trigger() is deprecated and no-ops — see RunLeadAiPipelineJob (lead {$lead->id}).");
    }
}
