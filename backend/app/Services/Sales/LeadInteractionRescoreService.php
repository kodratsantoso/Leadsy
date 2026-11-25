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

        // Debounce: prevent duplicate queue barrage if triggered multiple times within 15 seconds for the same lead,
        // unless it is an explicit high-priority trigger like transcript analysis.
        $cacheKey = "lead_rescore_cooldown:{$lead->id}";
        $isHighPriority = in_array($source, ['transcript_analysis', 'transcript_analyzed', 'manual_run'], true);

        if (! $isHighPriority && \Illuminate\Support\Facades\Cache::has($cacheKey)) {
            Log::info("[LeadInteractionRescore] Cooldown active for Lead {$lead->id}. Skipping duplicate rescore from {$source}.");
            return;
        }

        \Illuminate\Support\Facades\Cache::put($cacheKey, true, now()->addSeconds(15));

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
