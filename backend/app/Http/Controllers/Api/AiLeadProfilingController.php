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

        $output = $this->profilingService->startProfiling($companyName, $userId);

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
