<?php

namespace App\Services\Enrichment;

use App\Models\Lead;
use App\Models\LeadActivity;
use App\Jobs\ScoreLeadJob;
use Illuminate\Support\Facades\Log;

class LeadPostEnrichmentAIService
{
    /**
     * Trigger post-enrichment AI actions: Rescore, Requality, ICP Match.
     */
    public function trigger(Lead $lead): void
    {
        Log::info("[PostEnrichment] Triggering post-enrichment actions for lead {$lead->id}");
        
        // Log Activity
        LeadActivity::create([
            'lead_id' => $lead->id,
            'activity_type' => 'system',
            'description' => 'Triggering post-enrichment AI analysis (Rescore, Requality, ICP Match)',
            'activity_date' => now(),
        ]);

        // ScoreLeadJob already evaluates ICP inside the scoring service (LeadScoringService::evaluateIndustryMatch, etc.)
        // and does the necessary deterministic score update. 
        // If there are specific jobs for Qualification or ICP Match, they would be chained here.
        // For now, dispatching ScoreLeadJob is the unified entrypoint for scoring and ICP evaluation in Leadsy.
        ScoreLeadJob::dispatch($lead->id)->onQueue('intelligence');
        
        // Automate Qualification and ICP matching
        \App\Jobs\QualifyLeadJob::dispatch($lead->id)->onQueue('intelligence');
        \App\Jobs\ICPMatchLeadJob::dispatch($lead->id)->onQueue('intelligence');
    }
}
