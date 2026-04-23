<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiProvider;
use App\Models\AiModel;
use App\Models\AiModelRoute;
use App\Models\AiRequest;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AiProviderController extends Controller
{
    /* ── Providers ── */

    public function index(): JsonResponse
    {
        $providers = AiProvider::with('models')->get()->map(function ($p) {
            $p->api_key_masked = str_repeat('•', 20) . substr($p->decrypted_api_key, -4);
            return $p;
        });

        return response()->json(['data' => $providers]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'            => 'required|string|max:255',
            'slug'            => 'required|string|max:100|unique:ai_providers',
            'base_url'        => 'nullable|url',
            'api_key'         => 'required|string',
            'organization_id' => 'nullable|string',
            'region'          => 'nullable|string',
            'status'          => 'nullable|in:active,inactive',
            'environments'    => 'nullable|array',
        ]);

        $data['api_key_encrypted'] = $data['api_key'];
        unset($data['api_key']);

        $provider = AiProvider::create($data);

        AuditService::logCreated('ai_providers', $provider);

        return response()->json(['data' => $provider], 201);
    }

    public function update(Request $request, AiProvider $aiProvider): JsonResponse
    {
        $original = $aiProvider->getAttributes();

        $data = $request->validate([
            'name'            => 'sometimes|string|max:255',
            'base_url'        => 'nullable|url',
            'api_key'         => 'nullable|string',
            'organization_id' => 'nullable|string',
            'region'          => 'nullable|string',
            'status'          => 'nullable|in:active,inactive',
            'environments'    => 'nullable|array',
        ]);

        if (! empty($data['api_key'])) {
            $data['api_key_encrypted'] = $data['api_key'];
            unset($data['api_key']);
        }

        $aiProvider->update($data);
        AuditService::logUpdated('ai_providers', $aiProvider, $original);

        return response()->json(['data' => $aiProvider]);
    }

    public function destroy(AiProvider $aiProvider): JsonResponse
    {
        AuditService::logDeleted('ai_providers', $aiProvider);
        $aiProvider->delete();
        return response()->json(null, 204);
    }

    /** POST /api/ai-providers/{aiProvider}/test – test connectivity */
    public function testConnection(AiProvider $aiProvider): JsonResponse
    {
        // Simple ping based on provider type
        try {
            $key = $aiProvider->decrypted_api_key;
            $url = $aiProvider->base_url ?? $this->defaultUrl($aiProvider->slug);

            $ch = curl_init();
            curl_setopt_array($ch, [
                CURLOPT_URL            => $url . '/models',
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 10,
                CURLOPT_HTTPHEADER     => [
                    "Authorization: Bearer {$key}",
                    'Content-Type: application/json',
                ],
            ]);
            $body = curl_exec($ch);
            $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            $success = $code >= 200 && $code < 300;

            return response()->json([
                'success'    => $success,
                'status'     => $code,
                'latency_ms' => null,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error'   => $e->getMessage(),
            ], 502);
        }
    }

    /* ── Models ── */

    public function storeModel(Request $request, AiProvider $aiProvider): JsonResponse
    {
        $data = $request->validate([
            'name'               => 'required|string|max:255',
            'context_window'     => 'nullable|integer',
            'capabilities'       => 'nullable|array',
            'cost_tier'          => 'nullable|in:low,medium,high',
            'default_usage_type' => 'nullable|string',
            'status'             => 'nullable|in:active,deprecated',
        ]);

        $model = $aiProvider->models()->create($data);
        AuditService::logCreated('ai_models', $model);

        return response()->json(['data' => $model], 201);
    }

    public function destroyModel(AiProvider $aiProvider, AiModel $model): JsonResponse
    {
        AuditService::logDeleted('ai_models', $model);
        $model->delete();
        return response()->json(null, 204);
    }

    /* ── Usage Summary ── */

    /** GET /api/ai-providers/usage-summary */
    public function usageSummary(): JsonResponse
    {
        // Aggregate from ai_requests table — grouped by provider via ai_models
        $perProvider = DB::table('ai_requests')
            ->join('ai_models', 'ai_requests.ai_model_id', '=', 'ai_models.id')
            ->join('ai_providers', 'ai_models.ai_provider_id', '=', 'ai_providers.id')
            ->select(
                'ai_providers.id as provider_id',
                'ai_providers.name as provider_name',
                'ai_providers.slug as provider_slug',
                DB::raw('COUNT(*) as total_calls'),
                DB::raw('COALESCE(SUM(estimated_cost_usd), 0) as total_cost_usd'),
                DB::raw('AVG(latency_ms) as avg_latency_ms'),
                DB::raw("SUM(CASE WHEN ai_requests.status = 'success' THEN 1 ELSE 0 END) as success_count")
            )
            ->groupBy('ai_providers.id', 'ai_providers.name', 'ai_providers.slug')
            ->get();

        $totalCalls   = $perProvider->sum('total_calls');
        $totalCost    = $perProvider->sum('total_cost_usd');
        $successCount = $perProvider->sum('success_count');
        $avgLatency   = $perProvider->avg('avg_latency_ms');

        return response()->json([
            'data' => [
                'summary' => [
                    'total_calls'    => (int) $totalCalls,
                    'total_cost_usd' => round((float) $totalCost, 4),
                    'success_rate'   => $totalCalls > 0 ? round($successCount / $totalCalls * 100, 1) : null,
                    'avg_latency_ms' => $avgLatency ? round((float) $avgLatency) : null,
                    'has_data'       => $totalCalls > 0,
                ],
                'per_provider' => $perProvider->map(fn ($row) => [
                    'provider_id'    => $row->provider_id,
                    'provider_name'  => $row->provider_name,
                    'provider_slug'  => $row->provider_slug,
                    'total_calls'    => (int) $row->total_calls,
                    'total_cost_usd' => round((float) $row->total_cost_usd, 4),
                    'avg_latency_ms' => $row->avg_latency_ms ? round((float) $row->avg_latency_ms) : null,
                    'success_rate'   => $row->total_calls > 0
                        ? round($row->success_count / $row->total_calls * 100, 1)
                        : null,
                ]),
            ],
        ]);
    }

    /* ── Routes ── */

    public function routes(): JsonResponse
    {
        return response()->json([
            'data' => AiModelRoute::with(['primaryModel.provider', 'fallbackModel.provider'])->get(),
        ]);
    }

    public function storeRoute(Request $request): JsonResponse
    {
        $data = $request->validate([
            'function_name'     => 'required|string|unique:ai_model_routes',
            'primary_model_id'  => 'required|exists:ai_models,id',
            'fallback_model_id' => 'nullable|exists:ai_models,id',
            'retry_count'       => 'nullable|integer|min:0|max:10',
            'timeout_seconds'   => 'nullable|integer|min:5|max:120',
        ]);

        $route = AiModelRoute::create($data);
        AuditService::logCreated('ai_model_routes', $route);

        return response()->json(['data' => $route], 201);
    }

    private function defaultUrl(string $slug): string
    {
        return match ($slug) {
            'openai'    => 'https://api.openai.com/v1',
            'anthropic' => 'https://api.anthropic.com/v1',
            'google'    => 'https://generativelanguage.googleapis.com/v1beta',
            default     => '',
        };
    }
}
