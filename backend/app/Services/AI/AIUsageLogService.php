<?php

namespace App\Services\AI;

use App\Models\AiRequest;
use App\Models\AiProvider;
use Illuminate\Support\Facades\Log;

/**
 * AI Usage Log Service — Module C: Token Tracking & Cost Analysis
 *
 * Responsibilities:
 *   - Log all AI requests with tokens and costs
 *   - Calculate cost per feature and provider
 *   - Detect cost anomalies
 *   - Generate usage reports
 *   - Track fallback usage
 *   - Identify cost-inefficient patterns
 *
 * Usage:
 *   $logger = app(AIUsageLogService::class);
 *   $logger->recordRequest($provider, $model, $feature, $tokens, $costUsd);
 *   $summary = $logger->getMonthlySummary();
 */
class AIUsageLogService
{
    /**
     * Record an AI request with tokens and cost.
     *
     * @param AiProvider $provider
     * @param int $modelId
     * @param string $featureName
     * @param int $inputTokens
     * @param int $outputTokens
     * @param float $costUsd
     * @param array $metadata
     * @return AiRequest
     */
    public function recordRequest(
        AiProvider $provider,
        int $modelId,
        string $featureName,
        int $inputTokens,
        int $outputTokens,
        float $costUsd,
        array $metadata = []
    ): AiRequest {
        $request = AiRequest::create([
            'feature_name' => $featureName,
            'provider_id' => $provider->id,
            'ai_model_id' => $modelId,
            'entity_type' => $metadata['entity_type'] ?? null,
            'entity_id' => $metadata['entity_id'] ?? null,
            'request_tokens' => $inputTokens,
            'response_tokens' => $outputTokens,
            'cost_usd' => $costUsd,
            'status' => $metadata['status'] ?? 'success',
            'error_message' => $metadata['error'] ?? null,
            'latency_ms' => $metadata['latency_ms'] ?? null,
            'used_fallback' => $metadata['used_fallback'] ?? false,
            'user_id' => auth()->id(),
        ]);

        Log::info("[AIUsage] Request recorded", [
            'provider' => $provider->slug,
            'feature' => $featureName,
            'tokens' => $inputTokens + $outputTokens,
            'cost' => $costUsd,
        ]);

        return $request;
    }

    /**
     * Record a failed request.
     *
     * @param AiProvider $provider
     * @param int $modelId
     * @param string $featureName
     * @param string $errorMessage
     * @param array $metadata
     * @return AiRequest
     */
    public function recordFailure(
        AiProvider $provider,
        int $modelId,
        string $featureName,
        string $errorMessage,
        array $metadata = []
    ): AiRequest {
        return AiRequest::create([
            'feature_name' => $featureName,
            'provider_id' => $provider->id,
            'ai_model_id' => $modelId,
            'entity_type' => $metadata['entity_type'] ?? null,
            'entity_id' => $metadata['entity_id'] ?? null,
            'request_tokens' => $metadata['request_tokens'] ?? 0,
            'response_tokens' => 0,
            'cost_usd' => 0,
            'status' => 'failed',
            'error_message' => $errorMessage,
            'latency_ms' => $metadata['latency_ms'] ?? null,
            'used_fallback' => $metadata['used_fallback'] ?? false,
            'user_id' => auth()->id(),
        ]);
    }

    /**
     * Get monthly usage summary (last 30 days).
     *
     * @return array
     */
    public function getMonthlySummary(): array
    {
        $startDate = now()->subDays(30);
        return $this->getUsageSummary($startDate, now());
    }

    /**
     * Get usage summary for a date range.
     *
     * @param \DateTime $startDate
     * @param \DateTime $endDate
     * @return array
     */
    public function getUsageSummary(\DateTime $startDate, \DateTime $endDate): array
    {
        $requests = AiRequest::whereBetween('created_at', [$startDate, $endDate])->get();
        $successRequests = $requests->where('status', 'success');

        $summary = [
            'period' => [
                'start' => $startDate->toIso8601String(),
                'end' => $endDate->toIso8601String(),
            ],
            'totals' => [
                'total_requests' => $requests->count(),
                'successful_requests' => $successRequests->count(),
                'failed_requests' => $requests->where('status', 'failed')->count(),
                'success_rate' => $requests->count() > 0 
                    ? round($successRequests->count() / $requests->count() * 100, 2)
                    : 0,
                'total_tokens' => $successRequests->sum(fn($r) => $r->request_tokens + $r->response_tokens),
                'total_cost' => $successRequests->sum('cost_usd'),
                'avg_cost_per_request' => $successRequests->count() > 0
                    ? round($successRequests->sum('cost_usd') / $successRequests->count(), 4)
                    : 0,
                'avg_latency_ms' => $successRequests->avg('latency_ms'),
                'fallback_count' => $requests->where('used_fallback', true)->count(),
            ],
            'by_feature' => $this->summarizeByFeature($successRequests),
            'by_provider' => $this->summarizeByProvider($successRequests),
            'by_status' => $this->summarizeByStatus($requests),
            'anomalies' => $this->detectAnomalies($successRequests),
        ];

        return $summary;
    }

    /**
     * Get cost breakdown by feature.
     *
     * @param \Illuminate\Database\Eloquent\Collection $requests
     * @return array
     */
    protected function summarizeByFeature($requests): array
    {
        $byFeature = [];

        foreach ($requests->groupBy('feature_name') as $feature => $featureRequests) {
            $byFeature[$feature] = [
                'count' => $featureRequests->count(),
                'total_tokens' => $featureRequests->sum(fn($r) => $r->request_tokens + $r->response_tokens),
                'total_cost' => $featureRequests->sum('cost_usd'),
                'avg_cost' => round($featureRequests->sum('cost_usd') / $featureRequests->count(), 4),
                'avg_latency_ms' => $featureRequests->avg('latency_ms'),
            ];
        }

        return $byFeature;
    }

    /**
     * Get cost breakdown by provider.
     *
     * @param \Illuminate\Database\Eloquent\Collection $requests
     * @return array
     */
    protected function summarizeByProvider($requests): array
    {
        $byProvider = [];

        foreach ($requests->groupBy('provider_id') as $providerId => $providerRequests) {
            $provider = AiProvider::find($providerId);
            if (!$provider) continue;

            $byProvider[$provider->slug] = [
                'provider_id' => $providerId,
                'provider_name' => $provider->name,
                'count' => $providerRequests->count(),
                'total_tokens' => $providerRequests->sum(fn($r) => $r->request_tokens + $r->response_tokens),
                'total_cost' => $providerRequests->sum('cost_usd'),
                'avg_cost_per_request' => round($providerRequests->sum('cost_usd') / $providerRequests->count(), 4),
                'avg_latency_ms' => $providerRequests->avg('latency_ms'),
            ];
        }

        return $byProvider;
    }

    /**
     * Get request status breakdown.
     *
     * @param \Illuminate\Database\Eloquent\Collection $requests
     * @return array
     */
    protected function summarizeByStatus($requests): array
    {
        $byStatus = [];

        foreach ($requests->groupBy('status') as $status => $statusRequests) {
            $byStatus[$status] = $statusRequests->count();
        }

        return $byStatus;
    }

    /**
     * Detect cost anomalies and inefficiencies.
     *
     * Returns patterns like:
     *   - Features with suspiciously high cost
     *   - Providers with high latency
     *   - Repeated failed requests from same entity
     *
     * @param \Illuminate\Database\Eloquent\Collection $requests
     * @return array
     */
    protected function detectAnomalies($requests): array
    {
        $anomalies = [];

        // Find high-cost requests
        $highCostRequests = $requests
            ->filter(fn($r) => $r->cost_usd > 0.10) // > 10 cents
            ->sortByDesc('cost_usd')
            ->take(5);

        if ($highCostRequests->isNotEmpty()) {
            $anomalies['high_cost_requests'] = $highCostRequests->map(fn($r) => [
                'feature' => $r->feature_name,
                'provider' => $r->aiModel->aiProvider->slug,
                'cost' => $r->cost_usd,
                'date' => $r->created_at->toIso8601String(),
            ])->values();
        }

        // Find slow responses
        $slowRequests = $requests
            ->filter(fn($r) => $r->latency_ms && $r->latency_ms > 5000) // > 5 seconds
            ->sortByDesc('latency_ms')
            ->take(5);

        if ($slowRequests->isNotEmpty()) {
            $anomalies['slow_requests'] = $slowRequests->map(fn($r) => [
                'feature' => $r->feature_name,
                'provider' => $r->aiModel->aiProvider->slug,
                'latency_ms' => $r->latency_ms,
                'date' => $r->created_at->toIso8601String(),
            ])->values();
        }

        // Find high token usage
        $highTokenRequests = $requests
            ->map(fn($r) => [
                'request' => $r,
                'tokens' => $r->request_tokens + $r->response_tokens,
            ])
            ->filter(fn($x) => $x['tokens'] > 4000)
            ->sortByDesc('tokens')
            ->take(5)
            ->map(fn($x) => [
                'feature' => $x['request']->feature_name,
                'tokens' => $x['tokens'],
                'cost' => $x['request']->cost_usd,
            ]);

        if ($highTokenRequests->isNotEmpty()) {
            $anomalies['high_token_requests'] = $highTokenRequests->values();
        }

        return $anomalies;
    }

    /**
     * Get estimated monthly cost projection.
     *
     * Uses last 7 days of data to project monthly cost.
     *
     * @return array
     */
    public function getMonthlyProjection(): array
    {
        $sevenDaysAgo = now()->subDays(7);
        $requests = AiRequest::where('created_at', '>=', $sevenDaysAgo)
            ->where('status', 'success')
            ->get();

        $costLast7Days = $requests->sum('cost_usd');
        $projectedMonthlyCost = round($costLast7Days * (30 / 7), 2);

        return [
            'period' => 'Last 7 days',
            'actual_cost_7d' => $costLast7Days,
            'request_count_7d' => $requests->count(),
            'avg_cost_per_request' => $requests->count() > 0 
                ? round($costLast7Days / $requests->count(), 4)
                : 0,
            'projected_monthly_cost' => $projectedMonthlyCost,
        ];
    }

    /**
     * Get cost efficiency metrics.
     *
     * Calculates cost per token, cost per feature, etc.
     *
     * @return array
     */
    public function getCostEfficiency(): array
    {
        $thirtyDaysAgo = now()->subDays(30);
        $requests = AiRequest::where('created_at', '>=', $thirtyDaysAgo)
            ->where('status', 'success')
            ->get();

        $totalCost = $requests->sum('cost_usd');
        $totalTokens = $requests->sum(fn($r) => $r->request_tokens + $r->response_tokens);

        $efficiency = [
            'total_cost' => $totalCost,
            'total_tokens' => $totalTokens,
            'cost_per_1k_tokens' => $totalTokens > 0 ? round(($totalCost / $totalTokens) * 1000, 4) : 0,
            'cost_per_request' => $requests->count() > 0 ? round($totalCost / $requests->count(), 4) : 0,
            'request_count' => $requests->count(),
        ];

        // Add efficiency by provider
        $efficiency['by_provider'] = [];
        foreach ($requests->groupBy('provider_id') as $providerId => $providerRequests) {
            $provider = AiProvider::find($providerId);
            if (!$provider) continue;

            $providerCost = $providerRequests->sum('cost_usd');
            $providerTokens = $providerRequests->sum(fn($r) => $r->request_tokens + $r->response_tokens);

            $efficiency['by_provider'][$provider->slug] = [
                'total_cost' => $providerCost,
                'total_tokens' => $providerTokens,
                'cost_per_1k_tokens' => $providerTokens > 0 ? round(($providerCost / $providerTokens) * 1000, 4) : 0,
                'request_count' => $providerRequests->count(),
            ];
        }

        return $efficiency;
    }

    /**
     * Get feature-specific costs.
     *
     * Useful for understanding which features are most expensive.
     *
     * @return array
     */
    public function getFeatureCosts(): array
    {
        $thirtyDaysAgo = now()->subDays(30);
        $requests = AiRequest::where('created_at', '>=', $thirtyDaysAgo)
            ->where('status', 'success')
            ->get();

        $costs = [];

        foreach ($requests->groupBy('feature_name') as $feature => $featureRequests) {
            $costs[$feature] = [
                'total_cost' => $featureRequests->sum('cost_usd'),
                'avg_cost_per_request' => round($featureRequests->sum('cost_usd') / $featureRequests->count(), 4),
                'request_count' => $featureRequests->count(),
                'total_tokens' => $featureRequests->sum(fn($r) => $r->request_tokens + $r->response_tokens),
            ];
        }

        // Sort by cost descending
        arsort($costs);

        return $costs;
    }
}
