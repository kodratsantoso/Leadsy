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
use Illuminate\Support\Facades\Queue;
use Throwable;

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

        // The heartbeat lives in the cache, and the cache is Redis in production. A page
        // whose entire job is to report that the pipeline is broken must not go dark when
        // one of the pipeline's own dependencies is the thing that broke — which is exactly
        // what happened: an unreachable Redis threw out of Cache::get(), the whole endpoint
        // 500'd, and the screen showed nothing at all rather than "Redis is down".
        $cacheReachable = true;
        $cacheError = null;
        $heartbeat = null;

        try {
            $heartbeat = Cache::get('leadsy_scheduler_heartbeat');
        } catch (Throwable $e) {
            $cacheReachable = false;
            $cacheError = class_basename($e);
        }

        $heartbeatStatus = $cacheReachable ? 'never_seen' : 'unknown';
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
            'dependencies' => $this->dependencyReport($cacheReachable, $cacheError, $heartbeatStatus),
            'last_hour' => [
                'success' => (clone $lastHour)->where('status', 'success')->count(),
                'partial' => (clone $lastHour)->where('status', 'partial')->count(),
                'failed' => (clone $lastHour)->where('status', 'failed')->count(),
            ],
        ]);
    }

    /**
     * Which moving part is actually missing, named the way it is named in the cluster.
     *
     * The screening pipeline needs three things beyond the API itself: Redis (cache and
     * queue), the `leadsy-scheduler` deployment running `php artisan schedule:work` — which
     * is what fires `leadsy:screen-unassessed` every ten minutes and writes the heartbeat —
     * and the `leadsy-worker` deployment running Horizon. Nothing in the app could report
     * on any of them before, so a stopped deployment looked identical to an idle pipeline.
     *
     * @return array<string, array{name:string, workload:?string, status:string, detail:string}>
     */
    private function dependencyReport(bool $cacheReachable, ?string $cacheError, string $heartbeatStatus): array
    {
        $queueDepth = null;
        $queueReachable = $cacheReachable;

        if ($cacheReachable) {
            try {
                $queueDepth = Queue::size();
            } catch (Throwable) {
                $queueReachable = false;
            }
        }

        return [
            'cache' => [
                'name' => 'Redis (cache & queue)',
                'workload' => 'deployment/leadsy-redis',
                'status' => $cacheReachable ? 'ok' : 'down',
                'detail' => $cacheReachable
                    ? 'Reachable.'
                    : "Not reachable ({$cacheError}). The heartbeat and the job queue both live here, so the scheduler's status cannot be read while it is down.",
            ],
            'scheduler' => [
                'name' => 'Background scheduler',
                'workload' => 'deployment/leadsy-scheduler',
                'status' => match ($heartbeatStatus) {
                    'healthy' => 'ok',
                    'stale' => 'degraded',
                    'unknown' => 'unknown',
                    default => 'down',
                },
                'detail' => match ($heartbeatStatus) {
                    'healthy' => 'Reported in within the last 15 minutes.',
                    'stale' => 'Last reported over 15 minutes ago — it may have stalled mid-run.',
                    'unknown' => 'Cannot be determined while Redis is unreachable.',
                    'never_seen' => 'Has never reported in. The leadsy-scheduler deployment is most likely not running: it is applied only after the backend rollout succeeds, so a failed backend deploy skips creating it entirely.',
                    default => 'Stopped reporting more than an hour ago.',
                },
            ],
            'queue' => [
                'name' => 'Queue worker (Horizon)',
                'workload' => 'deployment/leadsy-worker',
                'status' => $queueReachable ? 'ok' : 'unknown',
                'detail' => $queueReachable
                    ? ($queueDepth === null
                        ? 'Reachable.'
                        : "{$queueDepth} job(s) waiting. A number that only grows means the worker is not consuming.")
                    : 'Cannot be determined while Redis is unreachable.',
            ],
        ];
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
