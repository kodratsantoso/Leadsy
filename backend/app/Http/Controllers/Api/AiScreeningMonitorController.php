<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiScreeningRun;
use App\Models\Lead;
use App\Services\Sales\PreMeetingAiScreeningOrchestratorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * Backs the "AI Screening Monitor" page: overall backlog progress, whether
 * the background process is actually alive, and a real per-lead history
 * (including error detail) — everything needed to answer "is the AI
 * pipeline running, and if not, why did it stop" from inside the app,
 * without server/log access.
 */
class AiScreeningMonitorController extends Controller
{
    public function __construct(
        private readonly PreMeetingAiScreeningOrchestratorService $orchestrator
    ) {}

    /**
     * GET /api/v1/leads/ai-screening/progress
     */
    public function progress(Request $request): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403, 'Unauthorized. Superadmin only.');

        $totalCount = Lead::whereNull('deleted_at')->count();
        $unassessedCount = $this->orchestrator->getUnassessedLeadsCount();
        $assessedCount = max(0, $totalCount - $unassessedCount);

        $heartbeat = Cache::get('leadsy_scheduler_heartbeat');
        $heartbeatStatus = 'never_seen';
        $minutesAgo = null;

        if ($heartbeat) {
            $lastSeenAt = Carbon::parse($heartbeat['completed_at'] ?? $heartbeat['invoked_at']);
            $minutesAgo = $lastSeenAt->diffInMinutes(now());
            $heartbeatStatus = match (true) {
                $minutesAgo <= 15 => 'healthy',
                $minutesAgo <= 60 => 'stale',
                default => 'dead',
            };
        }

        $lastHour = AiScreeningRun::where('created_at', '>=', now()->subHour());

        return response()->json([
            'success' => true,
            'total_leads' => $totalCount,
            'assessed_count' => $assessedCount,
            'unassessed_count' => $unassessedCount,
            'percent_assessed' => $totalCount > 0 ? round(($assessedCount / $totalCount) * 100, 1) : 0,
            'scheduler' => [
                'status' => $heartbeatStatus,
                'minutes_ago' => $minutesAgo,
                'detail' => $heartbeat,
            ],
            'last_hour' => [
                'success' => (clone $lastHour)->where('status', 'success')->count(),
                'partial' => (clone $lastHour)->where('status', 'partial')->count(),
                'failed' => (clone $lastHour)->where('status', 'failed')->count(),
            ],
        ]);
    }

    /**
     * GET /api/v1/leads/ai-screening/recent-runs
     */
    public function recentRuns(Request $request): JsonResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403, 'Unauthorized. Superadmin only.');

        $limit = min(max((int) $request->query('limit', 30), 1), 100);

        $runs = AiScreeningRun::query()
            ->latest('created_at')
            ->limit($limit)
            ->get()
            ->map(fn (AiScreeningRun $run) => [
                'id' => $run->id,
                'lead_id' => $run->lead_id,
                'company_name' => $run->company_name,
                'status' => $run->status,
                'error_message' => $run->error_message,
                'stages_executed' => $run->stages_executed,
                'lead_score' => $run->lead_score,
                'qualification_status' => $run->qualification_status,
                'triggered_by' => $run->triggered_by,
                'elapsed_seconds' => $run->elapsed_seconds,
                'created_at' => $run->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'success' => true,
            'data' => $runs,
        ]);
    }
}
