<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiGeneratedOutput;
use App\Services\Lead\AiLeadProfilingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiLeadProfilingController extends Controller
{
    public function __construct(
        private readonly AiLeadProfilingService $profilingService
    ) {}

    /**
     * POST /api/leads/ai-profiling/start
     */
    public function start(Request $request): JsonResponse
    {
        $request->validate([
            'company_name' => 'required|string|max:255',
        ]);

        $companyName = $request->input('company_name');
        $userId = $request->user()?->id;

        // Default path dispatches to the queue (fast response, no gateway
        // timeout risk). `sync: true` runs inline instead — see
        // AiLeadProfilingService::startProfilingSync() docblock — which the
        // frontend uses as a manual fallback when the queue looks stuck.
        // Inline mode holds the request open for the whole AI call (can be
        // 60-100+s for data-rich companies), which is long enough to hit
        // Cloudflare's ~100s edge timeout (524) — it's a fallback, not the
        // default, for exactly that reason.
        if ($request->boolean('sync')) {
            @set_time_limit(120);
            $output = $this->profilingService->startProfilingSync($companyName, $userId);
        } else {
            $output = $this->profilingService->startProfiling($companyName, $userId);
        }

        return response()->json([
            'success' => true,
            'data' => $output,
        ]);
    }

    /**
     * GET /api/leads/ai-profiling/{id}/status
     */
    public function status(Request $request, int $id): JsonResponse
    {
        $output = AiGeneratedOutput::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $output,
        ]);
    }
}
