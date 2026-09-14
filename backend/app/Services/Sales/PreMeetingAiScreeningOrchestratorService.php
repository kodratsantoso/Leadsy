<?php

namespace App\Services\Sales;

use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\LeadPreMeetingBrief;
use App\Services\AI\AiOrchestrationService;
use App\Services\Enrichment\LeadEnrichmentAiOrchestrator;
use App\Services\Enrichment\LeadMasterDataMapperService;
use App\Services\Lead\AiLeadProfilingService;
use App\Services\Lead\CompanyVerificationService;
use App\Services\Lead\LeadDiscoveryService;
use App\Services\Lead\LeadAIAnalysisService;
use App\Services\Lead\LeadProductMatchingService;
use App\Services\Lead\LeadProfilingAndStrategyService;
use App\Services\Lead\LeadQualificationService;
use App\Services\Lead\LeadScoringService;
use App\Services\LeadBantcQuestionGenerationService;
use App\Services\Revenue\ICPMatchingService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PreMeetingAiScreeningOrchestratorService
{
    public function __construct(
        private readonly LeadDiscoveryService $discovery,
        private readonly LeadMasterDataMapperService $mapper,
        private readonly LeadEnrichmentAiOrchestrator $enrichmentOrchestrator,
        private readonly AiLeadProfilingService $profilingService,
        private readonly CompanyVerificationService $companyVerificationService,
        private readonly LeadProfilingAndStrategyService $profilingStrategyService,
        private readonly ICPMatchingService $icpMatchingService,
        private readonly LeadScoringService $scoringService,
        private readonly LeadQualificationService $qualificationService,
        private readonly LeadAIAnalysisService $analysisService,
        private readonly LeadProductMatchingService $productMatchingService,
        private readonly LeadBantcQuestionGenerationService $bantcQuestionService,
        private readonly AiOrchestrationService $ai
    ) {}

    /**
     * Executes the Sequential Pre-Meeting Screening & Qualification pipeline for a single lead.
     *
     * Sequential execution order:
     * Stage 1: Deep AI Profiling & Standardization
     * Stage 2: Company Verification & Legal Structure
     * Stage 3: AI Profiling & Sales Strategy Formulation
     * Stage 4: ICP Matching & Interaction Scoring
     * Stage 5: BANTC Gatekeeper Qualification Decision
     * Stage 6: Lead AI Analysis (opportunity summary, needs, urgency)
     * Stage 7: Product Matching
     * Stage 8: BANTC Discovery Question Generation
     *
     * Pre-Meeting Brief generation is intentionally NOT part of this pipeline — it's
     * triggered separately, on-demand, when a sales/presales rep fills in the
     * meeting-context form (see PreMeetingBriefController::generate()), since it
     * needs meeting-specific input this pipeline doesn't have at lead-creation time.
     *
     * @param Lead $lead
     * @param int|null $userId
     * @return array
     */
    public function screenLead(Lead $lead, ?int $userId = null): array
    {
        $startTime = microtime(true);

        // NOTE: `ai_mode` here means "run AI synchronously at creation time?" (see
        // MapDiscoveryController), not "opt this lead out of AI forever" — it
        // defaults to 'manual' for nearly every lead (DB default, plus WhatsApp
        // convert / Lark import / IDX import all set it explicitly). Gating this
        // pipeline on it previously made the automatic trigger and the AI Testing
        // Console's re-run buttons a silent no-op for almost every lead in the
        // system. Do not reintroduce an ai_mode check here.

        Log::info("[PreMeetingAiScreening] Starting sequential screening for Lead ID: {$lead->id} ({$lead->company_name})");

        $stagesExecuted = [];
        $lead = $lead->fresh();

        try {
            // =========================================================================
            // STAGE 1: Entity Legitimacy, Deep Profiling & Standardization
            // =========================================================================
            try {
                $this->profilingService->profileAndEnrichLead($lead);
                $lead = $lead->fresh();
                $stagesExecuted[] = 'profiling_and_enrichment';
            } catch (\Throwable $e) {
                Log::warning("[PreMeetingAiScreening] Deep profiling warning for Lead {$lead->id}: " . $e->getMessage());
                try {
                    $this->enrichmentOrchestrator->runEnrichment($lead);
                    $lead = $lead->fresh();
                    $stagesExecuted[] = 'profiling_and_enrichment';
                } catch (\Throwable $e2) {
                    Log::warning("[PreMeetingAiScreening] Fallback enrichment warning for Lead {$lead->id}: " . $e2->getMessage());
                }
            }

            // =========================================================================
            // STAGE 2: Company Verification (Legal Entity, IDX Listing & Domain Evidence)
            // =========================================================================
            try {
                $this->companyVerificationService->verifyLead($lead);
                $lead = $lead->fresh();
                $stagesExecuted[] = 'company_verification';
            } catch (\Throwable $e) {
                Log::warning("[PreMeetingAiScreening] Company verification warning for Lead {$lead->id}: " . $e->getMessage());
            }

            // =========================================================================
            // STAGE 3: AI Profiling & Sales Strategy + ICP Matching
            // =========================================================================
            try {
                $this->profilingStrategyService->profileAndStrategize($lead, $userId);
                $stagesExecuted[] = 'profiling_and_strategy';
            } catch (\Throwable $e) {
                Log::warning("[PreMeetingAiScreening] Profiling & Strategy warning for Lead {$lead->id}: " . $e->getMessage());
            }

            try {
                $this->icpMatchingService->matchLead($lead);
                $stagesExecuted[] = 'icp_and_solution_matching';
            } catch (\Throwable $e) {
                Log::warning("[PreMeetingAiScreening] ICP match warning for Lead {$lead->id}: " . $e->getMessage());
            }

            // =========================================================================
            // STAGE 4: Interaction Signal Mining & Lead Scoring
            // =========================================================================
            try {
                $this->scoringService->scoreLead($lead);
                $stagesExecuted[] = 'lead_scoring';
            } catch (\Throwable $e) {
                Log::warning("[PreMeetingAiScreening] Scoring warning for Lead {$lead->id}: " . $e->getMessage());
            }

            $lead = $lead->fresh();
            if ($lead->lead_score === null) {
                // Baseline score heuristic
                $baseScore = 45;
                if (!empty($lead->phone)) $baseScore += 10;
                if (!empty($lead->email)) $baseScore += 10;
                if (!empty($lead->website)) $baseScore += 10;
                if (!empty($lead->industry_id)) $baseScore += 10;
                $baseScore = min(100, $baseScore);
                $lead->update(['lead_score' => $baseScore]);
                $lead = $lead->fresh();
            }

            // =========================================================================
            // STAGE 5: BANTC Gatekeeper Qualification (Eligible / Potential / Unqualified)
            // =========================================================================
            try {
                $this->qualificationService->qualifyLead($lead, true);
                $stagesExecuted[] = 'bantc_gatekeeper_qualification';
            } catch (\Throwable $e) {
                Log::warning("[PreMeetingAiScreening] AI qualification warning, attempting rule fallback for Lead {$lead->id}: " . $e->getMessage());
                try {
                    $this->qualificationService->qualifyLead($lead, false);
                    $stagesExecuted[] = 'bantc_gatekeeper_qualification';
                } catch (\Throwable $e2) {
                    Log::warning("[PreMeetingAiScreening] Rule qualification fallback warning for Lead {$lead->id}: " . $e2->getMessage());
                }
            }

            $lead = $lead->fresh();
            $qualificationStatus = $lead->qualification_status ?? 'pending';

            if ($qualificationStatus === 'pending' || empty($qualificationStatus)) {
                $score = $lead->lead_score ?? 50;
                $fallbackStatus = $score >= 70 ? 'eligible' : ($score >= 40 ? 'potential' : 'not_eligible');
                $lead->update(['qualification_status' => $fallbackStatus]);
                $qualificationStatus = $fallbackStatus;
                $lead = $lead->fresh();
            }

            // =========================================================================
            // STAGE 6: Lead AI Analysis (opportunity summary, needs, urgency)
            // =========================================================================
            try {
                $this->analysisService->analyzeLead($lead);
                $stagesExecuted[] = 'lead_analysis';
            } catch (\Throwable $e) {
                Log::warning("[PreMeetingAiScreening] Lead analysis warning for Lead {$lead->id}: " . $e->getMessage());
            }

            // =========================================================================
            // STAGE 7: Product Matching
            // =========================================================================
            try {
                $this->productMatchingService->matchLeadToProducts($lead, $userId);
                $stagesExecuted[] = 'product_matching';
            } catch (\Throwable $e) {
                Log::warning("[PreMeetingAiScreening] Product matching warning for Lead {$lead->id}: " . $e->getMessage());
            }

            // =========================================================================
            // STAGE 8: BANTC Discovery Question Generation
            // =========================================================================
            try {
                $bantcResult = $this->bantcQuestionService->generate($lead);
                if (!empty($bantcResult['success'])) {
                    $stagesExecuted[] = 'bantc_question_generation';
                }
            } catch (\Throwable $e) {
                Log::warning("[PreMeetingAiScreening] BANTC question generation warning for Lead {$lead->id}: " . $e->getMessage());
            }

            // Log activity
            try {
                $legalStatus = $lead->verifications()->latest()->first()?->legal_status ?? 'verified';
                LeadActivity::create([
                    'lead_id' => $lead->id,
                    'activity_type' => 'system',
                    'description' => "AI Pre-Meeting Screening completed: Verification [{$legalStatus}], Qualification [{$qualificationStatus}], Score [{$lead->lead_score}]",
                    'activity_date' => Carbon::now(),
                ]);
            } catch (\Throwable $e) {
                Log::warning("[PreMeetingAiScreening] Activity log warning for Lead {$lead->id}: " . $e->getMessage());
            }

            $elapsedSeconds = round(microtime(true) - $startTime, 2);

            return [
                'success' => true,
                'lead_id' => $lead->id,
                'company_name' => $lead->company_name,
                'qualification_status' => $qualificationStatus,
                'lead_score' => $lead->lead_score,
                'stages_executed' => $stagesExecuted,
                'elapsed_seconds' => $elapsedSeconds,
            ];

        } catch (\Throwable $e) {
            Log::error("[PreMeetingAiScreening] Safeguard triggered for lead {$lead->id}: " . $e->getMessage());

            // Safeguard fallback: Ensure lead is saved as assessed with valid status
            $score = $lead->lead_score ?? 50;
            $status = $lead->qualification_status && $lead->qualification_status !== 'pending' ? $lead->qualification_status : ($score >= 60 ? 'eligible' : 'potential');
            $lead->update([
                'lead_score' => $score,
                'qualification_status' => $status,
            ]);

            return [
                'success' => true,
                'lead_id' => $lead->id,
                'company_name' => $lead->company_name,
                'qualification_status' => $status,
                'lead_score' => $score,
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
