<?php

namespace App\Services\Sales;

use App\Jobs\ICPMatchLeadJob;
use App\Jobs\QualifyLeadJob;
use App\Jobs\RunLeadIntelligenceJob;
use App\Jobs\ScoreLeadJob;
use App\Models\Lead;
use App\Models\LeadActivity;
use Illuminate\Support\Facades\Log;

class LeadInteractionRescoreService
{
    /**
     * Trigger rescoring and re-qualification for a lead after an interaction.
     *
     * @param Lead $lead
     * @param string $source Context of the trigger (e.g. 'activity:Meeting', 'transcript_analysis')
     * @param bool $logActivity Whether to create a system activity record
     */
    public function triggerRescore(Lead $lead, string $source = 'interaction', bool $logActivity = false): void
    {
        if (! $lead->id) {
            Log::warning('[LeadInteractionRescore] Attempted to rescore lead without ID.');
            return;
        }

        Log::info("[LeadInteractionRescore] Triggering automated rescore for Lead {$lead->id} (Source: {$source})");

        if ($logActivity) {
            LeadActivity::create([
                'lead_id' => $lead->id,
                'activity_type' => 'system',
                'description' => "Automated re-score & intelligence evaluation triggered (Source: {$source})",
                'activity_date' => now(),
            ]);
        }

        // 1. Dispatch Deterministic Lead Scoring
        ScoreLeadJob::dispatch($lead->id)->onQueue('intelligence');

        // 2. Dispatch Qualification Job
        QualifyLeadJob::dispatch($lead->id)->onQueue('intelligence');

        // 3. Dispatch ICP Matching Job
        ICPMatchLeadJob::dispatch($lead->id)->onQueue('intelligence');

        // 4. Dispatch Revenue Intelligence & Conversion Prediction
        RunLeadIntelligenceJob::dispatch($lead->id)->onQueue('intelligence');
    }
}
