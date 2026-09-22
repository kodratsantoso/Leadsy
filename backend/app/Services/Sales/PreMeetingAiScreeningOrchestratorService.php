<?php

namespace App\Services\Sales;

use App\Models\AiScreeningRun;
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
use App\Services\Lead\LeadQualificationService;
use App\Services\Lead\LeadScoringService;
use App\Services\LeadBantcQuestionGenerationService;
use App\Services\Revenue\ICPMatchingService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PreMeetingAiScreeningOrchestratorService
{
    /** Canonical stage list — used to detect which stages silently failed/were skipped for the AiScreeningRun audit trail. */
    private const ALL_STAGES = [
        'profiling_and_enrichment',
        'company_verification',
        'icp_and_solution_matching',
        'lead_scoring',
        'lead_analysis',
        'bantc_gatekeeper_qualification',
        'product_matching',
        'bantc_question_generation',
    ];

    public function __construct(
        private readonly LeadDiscoveryService $discovery,
        private readonly LeadMasterDataMapperService $mapper,
        private readonly LeadEnrichmentAiOrchestrator $enrichmentOrchestrator,
        private readonly AiLeadProfilingService $profilingService,
        private readonly CompanyVerificationService $companyVerificationService,
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
     * Stage 3: ICP Matching & Interaction Scoring
     * Stage 4: Lead Scoring
     * Stage 5: Lead AI Analysis (opportunity summary, needs, urgency)
     *          — also yields a lightweight qualification hint (see Stage 6)
     * Stage 6: BANTC Gatekeeper Qualification Decision
     * Stage 7: Product Matching
     * Stage 8: BANTC Discovery Question Generation
     *
     * A former "Profiling & Strategy" stage used to run here (between Company
     * Verification and ICP Matching) and made its own AI call, but its output
     * — a LeadAiAnalysis row and a set of LeadProductMatch rows — was always
     * immediately overwritten by Stage 5 and Stage 7 respectively before the
     * pipeline finished. It's been removed entirely; nothing downstream ever
     * saw its result. Its endpoint (LeadController::runProfilingStrategy(),
     * still used by the AI Testing Console's manual re-run button) is
     * unaffected — only this automatic pipeline stopped calling it.
     *
     * Qualification (Stage 6) used to make its own small AI call
     * (qualification_analysis) after its rule engine ran. That's been folded
     * into Stage 5's call instead — LeadAIAnalysisService now also asks for
     * a qualified/business_type/company_size_band hint in the same request,
     * which Stage 6 feeds into the same merge logic the standalone AI call
     * used to. Net effect: 2 fewer AI round-trips per lead with no feature
     * loss.
     *
     * Pre-Meeting Brief generation is intentionally NOT part of this pipeline — it's
     * triggered separately, on-demand, when a sales/presales rep fills in the
     * meeting-context form (see PreMeetingBriefController::generate()), since it
     * needs meeting-specific input this pipeline doesn't have at lead-creation time.
     *
     * @param Lead $lead
     * @param int|null $userId
     * @param string $triggeredBy Who/what invoked this run — recorded on the
     *   AiScreeningRun audit row so the "AI Screening Monitor" page can show
     *   whether a given result came from the scheduler, a manual button, the
     *   automatic on-creation trigger, etc. This is the single choke point
     *   every caller of screenLead() goes through, so logging lives here
     *   rather than being duplicated (and inevitably missed) in each caller.
     * @return array
     */
    public function screenLead(Lead $lead, ?int $userId = null, string $triggeredBy = 'unspecified'): array
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
            // STAGE 3: ICP Matching & Interaction Scoring
            // =========================================================================
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
                // Baseline score heuristic — routed through applyFallbackScore()
                // so a LeadScore history record backs it too (see that method's
                // docblock for why a raw $lead->update() isn't enough here).
                $baseScore = 45;
                if (!empty($lead->phone)) $baseScore += 10;
                if (!empty($lead->email)) $baseScore += 10;
                if (!empty($lead->website)) $baseScore += 10;
                if (!empty($lead->industry_id)) $baseScore += 10;
                $baseScore = min(100, $baseScore);
                $this->scoringService->applyFallbackScore(
                    $lead,
                    $baseScore,
                    'Deterministic scoring failed for this run; baseline heuristic score applied.'
                );
                $lead = $lead->fresh();
            }

            // =========================================================================
            // STAGE 5: Lead AI Analysis (opportunity summary, needs, urgency)
            // Also yields a lightweight qualification hint (qualified/business_type/
            // company_size_band) in the same AI call, which Stage 6 uses instead of
            // making its own separate AI round-trip.
            // =========================================================================
            $qualificationHint = null;
            try {
                $analysisResult = $this->analysisService->analyzeLeadWithQualificationHint($lead);
                $qualificationHint = $analysisResult['qualification_hint'];
                $stagesExecuted[] = 'lead_analysis';
            } catch (\Throwable $e) {
                Log::warning("[PreMeetingAiScreening] Lead analysis warning for Lead {$lead->id}: " . $e->getMessage());
            }

            // =========================================================================
            // STAGE 6: BANTC Gatekeeper Qualification (Eligible / Potential / Unqualified)
            // =========================================================================
            try {
                if ($qualificationHint && !empty($qualificationHint['success'])) {
                    $this->qualificationService->qualifyLeadWithAiHint($lead, $qualificationHint);
                } else {
                    $this->qualificationService->qualifyLead($lead, false);
                }
                $stagesExecuted[] = 'bantc_gatekeeper_qualification';
            } catch (\Throwable $e) {
                Log::warning("[PreMeetingAiScreening] Qualification warning for Lead {$lead->id}: " . $e->getMessage());
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

            $this->recordRun($lead, $stagesExecuted, $lead->lead_score, $qualificationStatus, $triggeredBy, $elapsedSeconds, null);

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

            // Safeguard fallback: Ensure lead is saved as assessed with valid status.
            // Only fabricate a score if none exists yet — and route it through
            // applyFallbackScore() so it leaves a real LeadScore history record
            // behind it, same as the in-pipeline fallback above.
            $lead = $lead->fresh();
            if ($lead->lead_score === null) {
                $this->scoringService->applyFallbackScore(
                    $lead,
                    50,
                    'Pipeline safeguard triggered before scoring completed; baseline score applied.'
                );
                $lead = $lead->fresh();
            }
            $score = $lead->lead_score;
            $status = $lead->qualification_status && $lead->qualification_status !== 'pending' ? $lead->qualification_status : ($score >= 60 ? 'eligible' : 'potential');
            $lead->update([
                'qualification_status' => $status,
            ]);

            $elapsedSeconds = round(microtime(true) - $startTime, 2);
            $this->recordRun($lead, $stagesExecuted, $score, $status, $triggeredBy, $elapsedSeconds, $e->getMessage());

            return [
                'success' => true,
                'lead_id' => $lead->id,
                'company_name' => $lead->company_name,
                'qualification_status' => $status,
                'lead_score' => $score,
                'stages_executed' => $stagesExecuted,
                'elapsed_seconds' => $elapsedSeconds,
            ];
        }
    }

    /**
     * Writes the AiScreeningRun audit row every screenLead() call produces —
     * success, partial (some stages silently failed but a fallback score
     * still landed), or failed (the outer safeguard had to step in).
     */
    private function recordRun(
        Lead $lead,
        array $stagesExecuted,
        ?int $leadScore,
        ?string $qualificationStatus,
        string $triggeredBy,
        float $elapsedSeconds,
        ?string $safeguardError
    ): void {
        $missingStages = array_values(array_diff(self::ALL_STAGES, $stagesExecuted));

        $status = $safeguardError !== null ? 'failed' : (empty($missingStages) ? 'success' : 'partial');

        $errorMessage = match (true) {
            $safeguardError !== null => $safeguardError,
            ! empty($missingStages) => 'Stage(s) failed or were skipped: '.implode(', ', $missingStages)
                .'. Score/qualification used a fallback where needed — check storage/logs/laravel.log around this lead\'s ID for the underlying error.',
            default => null,
        };

        try {
            AiScreeningRun::create([
                'lead_id' => $lead->id,
                'company_name' => $lead->company_name,
                'status' => $status,
                'error_message' => $errorMessage,
                'stages_executed' => $stagesExecuted,
                'lead_score' => $leadScore,
                'qualification_status' => $qualificationStatus,
                'triggered_by' => $triggeredBy,
                'elapsed_seconds' => $elapsedSeconds,
            ]);
        } catch (\Throwable $e) {
            // Never let audit-logging itself break the actual screening result.
            Log::warning("[PreMeetingAiScreening] Failed to write AiScreeningRun for lead {$lead->id}: {$e->getMessage()}");
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
