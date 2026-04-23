<?php

namespace App\Services\AI;

use App\Models\AiProvider;
use App\Models\AiRequest;
use Illuminate\Support\Facades\DB;

class AIUsageLogService
{
    public function usageOverview(): array
    {
        $perProvider = DB::table('ai_requests')
            ->join('ai_models', 'ai_requests.ai_model_id', '=', 'ai_models.id')
            ->join('ai_providers', 'ai_models.ai_provider_id', '=', 'ai_providers.id')
            ->select(
                'ai_providers.id as provider_id',
                'ai_providers.name as provider_name',
                'ai_providers.slug as provider_slug',
                DB::raw('COUNT(*) as total_calls'),
                DB::raw('COALESCE(SUM(ai_requests.estimated_cost_usd), 0) as total_cost_usd'),
                DB::raw('AVG(ai_requests.latency_ms) as avg_latency_ms'),
                DB::raw("SUM(CASE WHEN ai_requests.status = 'success' THEN 1 ELSE 0 END) as success_count"),
                DB::raw('SUM(CASE WHEN ai_requests.fallback_used IS TRUE THEN 1 ELSE 0 END) as fallback_count'),
                DB::raw('MAX(ai_requests.created_at) as last_used_at')
            )
            ->groupBy('ai_providers.id', 'ai_providers.name', 'ai_providers.slug')
            ->get();

        $latestRequest = AiRequest::with('aiModel.provider')->latest()->first();
        $totalCalls = (int) $perProvider->sum('total_calls');
        $successCount = (int) $perProvider->sum('success_count');
        $totalCost = (float) $perProvider->sum('total_cost_usd');
        $fallbackCount = (int) $perProvider->sum('fallback_count');

        return [
            'summary' => [
                'total_calls' => $totalCalls,
                'total_cost_usd' => round($totalCost, 4),
                'success_rate' => $totalCalls > 0 ? round(($successCount / $totalCalls) * 100, 1) : null,
                'avg_latency_ms' => $perProvider->avg('avg_latency_ms') ? round((float) $perProvider->avg('avg_latency_ms')) : null,
                'fallback_count' => $fallbackCount,
                'has_data' => $totalCalls > 0,
                'last_used_provider' => $latestRequest?->aiModel?->provider?->name,
                'last_used_model' => $latestRequest?->aiModel?->name,
                'last_used_at' => optional($latestRequest?->created_at)->toIso8601String(),
            ],
            'per_provider' => $perProvider->map(fn ($row) => [
                'provider_id' => $row->provider_id,
                'provider_name' => $row->provider_name,
                'provider_slug' => $row->provider_slug,
                'total_calls' => (int) $row->total_calls,
                'total_cost_usd' => round((float) $row->total_cost_usd, 4),
                'avg_latency_ms' => $row->avg_latency_ms ? round((float) $row->avg_latency_ms) : null,
                'success_rate' => $row->total_calls > 0 ? round(($row->success_count / $row->total_calls) * 100, 1) : null,
                'fallback_count' => (int) $row->fallback_count,
                'last_used_at' => $row->last_used_at,
            ])->values()->all(),
        ];
    }

    public function providersHealth(): array
    {
        return AiProvider::orderBy('name')->get()->map(fn (AiProvider $provider) => [
            'provider_id' => $provider->id,
            'provider_name' => $provider->name,
            'enabled' => $provider->status === 'active',
            'last_test_status' => $provider->last_test_status,
            'last_tested_at' => optional($provider->last_tested_at)->toIso8601String(),
            'last_used_at' => optional($provider->last_used_at)->toIso8601String(),
            'last_used_model' => $provider->last_used_model,
        ])->values()->all();
    }
}
