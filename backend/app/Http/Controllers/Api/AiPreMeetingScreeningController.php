<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\RunPreMeetingAiScreeningJob;
use App\Models\Lead;
use App\Services\Sales\PreMeetingAiScreeningOrchestratorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiPreMeetingScreeningController extends Controller
{
    public function __construct(
        private readonly PreMeetingAiScreeningOrchestratorService $orchestrator
    ) {}

    /**
     * GET /api/v1/leads/ai-screening/unassessed-count
     * Returns count of unassessed leads that need pre-meeting screening.
     */
    public function unassessedCount(Request $request): JsonResponse
    {
        $count = $this->orchestrator->getUnassessedLeadsCount();

        return response()->json([
            'success' => true,
            'unassessed_count' => $count,
        ]);
    }

    /**
     * GET /api/v1/leads/ai-screening/stats
     * Returns overall screening counts (total, assessed, unassessed, eligible, potential, not_eligible).
     */
    public function stats(Request $request): JsonResponse
    {
        $unassessedCount = $this->orchestrator->getUnassessedLeadsCount();
        $totalCount = Lead::whereNull('deleted_at')->count();
        $assessedCount = max(0, $totalCount - $unassessedCount);

        $eligibleCount = Lead::whereNull('deleted_at')->where('qualification_status', 'eligible')->count();
        $potentialCount = Lead::whereNull('deleted_at')->where('qualification_status', 'potential')->count();
        $notEligibleCount = Lead::whereNull('deleted_at')->whereIn('qualification_status', ['not_eligible', 'disqualified'])->count();

        return response()->json([
            'success' => true,
            'total_leads' => $totalCount,
            'assessed_count' => $assessedCount,
            'unassessed_count' => $unassessedCount,
            'eligible_count' => $eligibleCount,
            'potential_count' => $potentialCount,
            'not_eligible_count' => $notEligibleCount,
        ]);
    }

    /**
     * GET /api/v1/leads/ai-screening/pending-leads
     * Returns list of unassessed leads for live processing HUD.
     */
    public function pendingLeads(Request $request): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403, 'Unauthorized. Superadmin only.');
        $limit = min((int) $request->query('limit', 500), 1000);
        $leads = $this->orchestrator->getUnassessedLeads($limit);

        return response()->json([
            'success' => true,
            'total_unassessed' => $this->orchestrator->getUnassessedLeadsCount(),
            'data' => $leads->map(function ($lead) {
                return [
                    'id' => $lead->id,
                    'company_name' => $lead->company_name,
                    'contact_name' => $lead->contact_name,
                    'email' => $lead->email,
                    'phone' => $lead->phone,
                    'website' => $lead->website,
                    'lead_score' => $lead->lead_score,
                    'qualification_status' => $lead->qualification_status,
                ];
            }),
        ]);
    }

    /**
     * POST /api/v1/leads/{lead}/ai-screening/dispatch
     * Dispatches AI screening to queue worker for background processing.
     */
    public function dispatchSingle(Request $request, Lead $lead): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403, 'Unauthorized. Superadmin only.');

        \Illuminate\Support\Facades\Cache::put("lead_screening_{$lead->id}", [
            'status' => 'processing',
            'lead_id' => $lead->id,
            'company_name' => $lead->company_name,
            'started_at' => now()->toIso8601String(),
        ], 600);

        RunPreMeetingAiScreeningJob::dispatch($lead->id, $request->user()->id);

        return response()->json([
            'success' => true,
            'status' => 'processing',
            'lead_id' => $lead->id,
            'company_name' => $lead->company_name,
            'message' => 'AI pre-meeting screening job dispatched.',
        ]);
    }

    /**
     * GET /api/v1/leads/{lead}/ai-screening/status
     * Returns real-time status of lead screening from cache and database.
     */
    public function statusSingle(Request $request, Lead $lead): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403, 'Unauthorized. Superadmin only.');

        $cacheData = \Illuminate\Support\Facades\Cache::get("lead_screening_{$lead->id}");
        $lead = $lead->fresh();

        $isCompletedInDb = $lead->lead_score !== null 
            && !empty($lead->qualification_status) 
            && !in_array($lead->qualification_status, ['pending', 'unassessed']);

        if ($isCompletedInDb || ($cacheData['status'] ?? '') === 'completed') {
            $score = $lead->lead_score ?? ($cacheData['lead_score'] ?? 50);
            $status = $lead->qualification_status ?? ($cacheData['qualification_status'] ?? 'potential');
            $grade = $score >= 80 ? 'Grade A' : ($score >= 60 ? 'Grade B' : 'Grade C');

            return response()->json([
                'success' => true,
                'status' => 'completed',
                'data' => [
                    'lead_id' => $lead->id,
                    'company_name' => $lead->company_name,
                    'lead_score' => $score,
                    'qualification_status' => $status,
                    'grade' => $grade,
                    'brand' => $lead->brand,
                    'website' => $lead->website,
                    'phone' => $lead->phone,
                    'email' => $lead->email,
                    'industry' => $lead->industry?->name,
                    'sub_industry' => $lead->subIndustry?->name,
                    'business_category' => $lead->business_category,
                    'company_size' => $lead->company_size,
                    'elapsed_seconds' => $cacheData['elapsed_seconds'] ?? null,
                ],
            ]);
        }

        if (($cacheData['status'] ?? '') === 'failed') {
            return response()->json([
                'success' => false,
                'status' => 'failed',
                'error' => $cacheData['error'] ?? 'AI Screening failed.',
                'lead_id' => $lead->id,
            ]);
        }

        return response()->json([
            'success' => true,
            'status' => ($cacheData['status'] ?? 'processing'),
            'lead_id' => $lead->id,
            'company_name' => $lead->company_name,
        ]);
    }

    /**
     * POST /api/v1/leads/{lead}/ai-screening
     * Runs sequential screening synchronously or dispatches if async=1.
     */
    public function screenSingle(Request $request, Lead $lead): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403, 'Unauthorized. Superadmin only.');

        if ($request->boolean('async')) {
            return $this->dispatchSingle($request, $lead);
        }

        @set_time_limit(180);

        $result = $this->orchestrator->screenLead($lead, $request->user()->id);

        return response()->json([
            'success' => $result['success'] ?? false,
            'data' => $result,
        ], ($result['success'] ?? false) ? 200 : 422);
    }

    /**
     * POST /api/v1/leads/ai-screening/bulk-unassessed
     * Dispatches pre-meeting screening queue jobs for all unassessed leads.
     */
    public function screenAllUnassessed(Request $request): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403, 'Unauthorized. Superadmin only.');

        $leads = $this->orchestrator->getUnassessedLeads(500);
        $dispatchedCount = 0;

        foreach ($leads as $lead) {
            RunPreMeetingAiScreeningJob::dispatch($lead->id, $request->user()->id);
            $dispatchedCount++;
        }

        return response()->json([
            'success' => true,
            'message' => "Successfully dispatched {$dispatchedCount} leads to AI Pre-Meeting Screening queue.",
            'dispatched_count' => $dispatchedCount,
        ]);
    }

    /**
     * POST /api/v1/leads/ai-screening/bulk-selected
     * Dispatches pre-meeting screening queue jobs for selected lead IDs.
     */
    public function screenSelected(Request $request): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403, 'Unauthorized. Superadmin only.');

        $request->validate([
            'lead_ids' => 'required|array|min:1',
            'lead_ids.*' => 'integer|exists:leads,id',
        ]);

        $leadIds = $request->input('lead_ids', []);
        $dispatchedCount = 0;

        foreach ($leadIds as $leadId) {
            RunPreMeetingAiScreeningJob::dispatch((int) $leadId, $request->user()->id);
            $dispatchedCount++;
        }

        return response()->json([
            'success' => true,
            'message' => "Successfully dispatched {$dispatchedCount} selected leads to AI Pre-Meeting Screening queue.",
            'dispatched_count' => $dispatchedCount,
        ]);
    }
}
