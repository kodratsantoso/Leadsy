<?php

namespace App\Services\Sales;

use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\LeadPreMeetingBrief;
use App\Services\AI\AiOrchestrationService;
use App\Services\Enrichment\LeadEnrichmentAiOrchestrator;
use App\Services\Enrichment\LeadMasterDataMapperService;
use App\Services\Lead\LeadDiscoveryService;
use App\Services\Lead\LeadQualificationService;
use App\Services\Lead\LeadScoringService;
use App\Services\Revenue\ICPMatchingService;
use App\Services\Sales\PreMeetingBriefService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PreMeetingAiScreeningOrchestratorService
{
    public function __construct(
        private readonly LeadDiscoveryService $discovery,
        private readonly LeadMasterDataMapperService $mapper,
        private readonly LeadEnrichmentAiOrchestrator $enrichmentOrchestrator,
        private readonly ICPMatchingService $icpMatchingService,
        private readonly LeadScoringService $scoringService,
        private readonly LeadQualificationService $qualificationService,
        private readonly PreMeetingBriefService $preMeetingBriefService,
        private readonly AiOrchestrationService $ai
    ) {}

    /**
     * Executes the 5-Stage Sequential Pre-Meeting Screening & Qualification pipeline for a single lead.
     *
     * @param Lead $lead
     * @param int|null $userId
     * @return array
     */
    public function screenLead(Lead $lead, ?int $userId = null): array
    {
        $startTime = microtime(true);
        Log::info("[PreMeetingAiScreening] Starting sequential screening for Lead ID: {$lead->id} ({$lead->company_name})");

        $stagesExecuted = [];
        $lead = $lead->fresh();

        try {
            // =========================================================================
            // STAGE 1: Entity Legitimacy, Deep Profiling & Standardization
            // =========================================================================
            if (empty($lead->industry_id) || empty($lead->business_category_id) || empty($lead->company_size_estimate) || empty($lead->address)) {
                $placeDetails = null;
                if (!empty($lead->external_place_id)) {
                    $placeDetails = $this->discovery->getPlaceDetails($lead->external_place_id);
                } elseif (!empty($lead->company_name)) {
                    $geo = $this->discovery->geocodeArea($lead->company_name);
                    if (!empty($geo['place_id'])) {
                        $placeDetails = $this->discovery->getPlaceDetails($geo['place_id']);
                        if ($placeDetails) {
                            $lead->update([
                                'external_place_id' => $placeDetails['external_place_id'] ?? null,
                                'address' => $lead->address ?: ($placeDetails['address'] ?? null),
                                'phone' => $lead->phone ?: ($placeDetails['phone'] ?? null),
                                'website' => $lead->website ?: ($placeDetails['website'] ?? null),
                                'lat' => $lead->lat ?: ($placeDetails['lat'] ?? null),
                                'lng' => $lead->lng ?: ($placeDetails['lng'] ?? null),
                            ]);
                        }
                    }
                }

                $this->enrichmentOrchestrator->runEnrichment($lead, $placeDetails);
                $lead = $lead->fresh();
                $stagesExecuted[] = 'profiling_and_enrichment';
            }

            // =========================================================================
            // STAGE 2: ICP & Solution Matching
            // =========================================================================
            $icpResult = null;
            try {
                $icpResult = $this->icpMatchingService->evaluateLead($lead);
                $stagesExecuted[] = 'icp_and_solution_matching';
            } catch (\Throwable $e) {
                Log::warning("[PreMeetingAiScreening] ICP match warning for Lead {$lead->id}: " . $e->getMessage());
            }

            // =========================================================================
            // STAGE 3: Interaction Sinyal Mining & Lead Scoring
            // =========================================================================
            $scoreRecord = null;
            try {
                $scoreRecord = $this->scoringService->scoreLead($lead);
                $stagesExecuted[] = 'lead_scoring';
            } catch (\Throwable $e) {
                Log::warning("[PreMeetingAiScreening] Scoring warning for Lead {$lead->id}: " . $e->getMessage());
            }

            // =========================================================================
            // STAGE 4: BANTC Gatekeeper Qualification (Eligible / Potential / Unqualified)
            // =========================================================================
            $qualificationRecord = $this->qualificationService->qualifyLead($lead, true);
            $stagesExecuted[] = 'bantc_gatekeeper_qualification';

            $lead = $lead->fresh();
            $qualificationStatus = $lead->qualification_status ?? 'pending';

            // =========================================================================
            // STAGE 5: Pre-Meeting Battle Plan & Discovery Questions (If Eligible / Potential)
            // =========================================================================
            $briefGenerated = false;
            $briefId = null;

            if (in_array($qualificationStatus, ['eligible', 'potential']) || ($lead->lead_score ?? 0) >= 50) {
                try {
                    $brief = $this->preMeetingBriefService->generateBrief($lead, [
                        'meeting_type' => 'First Discovery Meeting'
                    ]);
                    $briefGenerated = true;
                    $briefId = $brief->id;
                    $stagesExecuted[] = 'pre_meeting_brief_generation';
                } catch (\Throwable $e) {
                    Log::warning("[PreMeetingAiScreening] Pre-meeting brief generation warning for Lead {$lead->id}: " . $e->getMessage());
                }
            }

            // Log activity
            LeadActivity::create([
                'lead_id' => $lead->id,
                'activity_type' => 'system',
                'description' => "AI Pre-Meeting Screening completed by Superadmin: Qualification [{$qualificationStatus}], Score [{$lead->lead_score}]",
                'activity_date' => Carbon::now(),
            ]);

            $elapsedSeconds = round(microtime(true) - $startTime, 2);

            return [
                'success' => true,
                'lead_id' => $lead->id,
                'company_name' => $lead->company_name,
                'qualification_status' => $qualificationStatus,
                'lead_score' => $lead->lead_score,
                'stages_executed' => $stagesExecuted,
                'pre_meeting_brief_generated' => $briefGenerated,
                'pre_meeting_brief_id' => $briefId,
                'elapsed_seconds' => $elapsedSeconds,
            ];

        } catch (\Throwable $e) {
            Log::error("[PreMeetingAiScreening] Fatal error screening lead {$lead->id}: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);

            return [
                'success' => false,
                'lead_id' => $lead->id,
                'company_name' => $lead->company_name,
                'error' => $e->getMessage(),
                'stages_executed' => $stagesExecuted,
                'elapsed_seconds' => round(microtime(true) - $startTime, 2),
            ];
        }
    }

    /**
     * Get count of unassessed leads that need pre-meeting screening.
     *
     * @return int
     */
    public function getUnassessedLeadsCount(): int
    {
        return Lead::whereNull('deleted_at')
            ->where(function ($query) {
                $query->whereNull('qualification_status')
                    ->orWhere('qualification_status', 'pending')
                    ->orWhereNull('lead_score');
            })
            ->whereNotIn('qualification_status', ['not_eligible', 'disqualified'])
            ->count();
    }

    /**
     * Query unassessed leads.
     *
     * @param int $limit
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getUnassessedLeads(int $limit = 500)
    {
        return Lead::whereNull('deleted_at')
            ->where(function ($query) {
                $query->whereNull('qualification_status')
                    ->orWhere('qualification_status', 'pending')
                    ->orWhereNull('lead_score');
            })
            ->whereNotIn('qualification_status', ['not_eligible', 'disqualified'])
            ->orderBy('id', 'desc')
            ->limit($limit)
            ->get();
    }
}
