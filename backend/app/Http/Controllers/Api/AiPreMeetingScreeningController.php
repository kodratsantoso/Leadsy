<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\RunPreMeetingAiScreeningJob;
use App\Models\Lead;
use App\Services\Sales\PreMeetingAiScreeningOrchestratorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Carbon;

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
     * GET /api/v1/leads/ai-screening/scheduler-heartbeat
     * Reports whether `leadsy:screen-unassessed` has actually been invoked
     * recently — by anything (the scheduler container, a manual run, the
     * "Screen a Few Now" button). This is the one thing that kept being
     * impossible to answer from inside the app during past outages: is the
     * scheduler container even running? Now it's a read from this endpoint
     * instead of needing server/container access.
     */
    public function schedulerHeartbeat(Request $request): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403, 'Unauthorized. Superadmin only.');

        $heartbeat = Cache::get('leadsy_scheduler_heartbeat');

        if (! $heartbeat) {
            return response()->json([
                'success' => true,
                'status' => 'never_seen',
                'message' => 'leadsy:screen-unassessed has not run since this cache key\'s TTL — either it has never run, or it hasn\'t run in over 7 days.',
            ]);
        }

        $lastSeenAt = Carbon::parse($heartbeat['completed_at'] ?? $heartbeat['invoked_at']);
        $minutesAgo = $lastSeenAt->diffInMinutes(now());

        // The command is scheduled every 10 minutes; anything comfortably
        // past that without a fresh heartbeat means whatever should be
        // invoking it (the scheduler container) has stopped.
        $status = match (true) {
            $minutesAgo <= 15 => 'healthy',
            $minutesAgo <= 60 => 'stale',
            default => 'dead',
        };

        return response()->json([
            'success' => true,
            'status' => $status,
            'minutes_ago' => $minutesAgo,
            'detail' => $heartbeat,
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

        $result = $this->orchestrator->screenLead($lead, $request->user()->id, 'manual_force_run_sync');

        return response()->json([
            'success' => $result['success'] ?? false,
            'data' => $result,
        ], ($result['success'] ?? false) ? 200 : 422);
    }

    /**
     * POST /api/v1/leads/ai-screening/run-backfill
     * Manual "run now" button for the backlog: screens a small, bounded
     * batch of unassessed leads in-process and returns the result.
     *
     * Deliberately does NOT shell out (no exec()/proc_open()) — an
     * HTTP-reachable endpoint that constructs and runs a shell command is a
     * remote-code-execution risk surface even with careful escaping, and
     * isn't worth it here. It also does NOT use terminating()/afterResponse
     * — confirmed via live testing on this deployment that the response
     * doesn't actually detach early, so anything registered there still
     * blocks the caller for its full duration.
     *
     * Given both of those are off the table, this just runs synchronously
     * and keeps the batch small enough (default 2 leads, ~35s budget) to
     * usually finish inside typical reverse-proxy gateway timeouts. A slow
     * lead can still make this time out client-side — that's an
     * acceptable failure mode (nothing is lost; just click it again or
     * wait for the next scheduled run), unlike exec()'s risk profile.
     */
    public function runBackfillNow(Request $request): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403, 'Unauthorized. Superadmin only.');

        $limit = min(max((int) $request->input('limit', 2), 1), 3);
        $maxSeconds = min(max((int) $request->input('max_seconds', 35), 10), 60);

        @set_time_limit($maxSeconds + 15);

        Artisan::call('leadsy:screen-unassessed', [
            '--limit' => $limit,
            '--max-seconds' => $maxSeconds,
            '--source' => 'manual_button',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Backfill batch complete.',
            'output' => Artisan::output(),
        ]);
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
