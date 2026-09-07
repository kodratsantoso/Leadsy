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
     * POST /api/v1/leads/{id}/ai-screening
     * Runs sequential screening synchronously for a single lead.
     */
    public function screenSingle(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403, 'Unauthorized. Superadmin only.');

        $lead = Lead::findOrFail($id);
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
