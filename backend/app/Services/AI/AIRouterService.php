<?php

namespace App\Services\AI;

use App\Models\AiFeatureRoute;
use App\Models\AiModel;
use App\Models\AiProvider;
use App\Models\AiRequest;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Log;

/**
 * AI Router Service — Module C: AI Provider Settings & Priority Engine
 *
 * Responsibilities:
 *   - Select AI provider/model based on feature routing priorities
 *   - Implement cost-aware routing (prefer cheap models for light tasks)
 *   - Detect and prevent duplicate AI requests (collision detection)
 *   - Handle provider priority fallback (1-4)
 *   - Support feature-specific routing overrides
 *
 * Usage:
 *   $router = app(AIRouterService::class);
 *   $provider = $router->selectProviderAndModel('lead_scoring', ['cost_sensitive' => false]);
 */
class AIRouterService
{
    const COLLISION_WINDOW = 30; // seconds

    const COST_SENSITIVITY_THRESHOLD = 0.05; // 5 cents

    /**
     * Select the best provider/model for a feature based on priority routing.
     *
     * @param  string  $featureName  e.g. 'lead_scoring', 'product_matching'
     * @param  array  $context  Context about the request (cost_sensitive, entity_id, etc)
     * @return array{provider: AiProvider, model: AiModel, route: AiFeatureRoute, priority: int}
     */
    public function selectProviderAndModel(string $featureName, array $context = []): array
    {
        // Get all active routes for this feature, ordered by priority
        $routes = AiFeatureRoute::where('feature_name', $featureName)
            ->where('is_active', true)
            ->with(['aiModel', 'aiModel.aiProvider'])
            ->orderBy('priority', 'asc')
            ->get();

        if ($routes->isEmpty()) {
            Log::warning("[AIRouter] No active routes for feature: {$featureName}");
            throw new \Exception("No AI routing configured for feature: {$featureName}");
        }

        // Cost sensitivity from context
        $isCostSensitive = $context['cost_sensitive'] ?? false;
        $entityId = $context['entity_id'] ?? null;
        $entityType = $context['entity_type'] ?? null;

        // Check for duplicate requests if collision detection enabled
        if ($context['check_collision'] ?? true) {
            $isDuplicate = $this->isDuplicateRequest($featureName, $entityType, $entityId);
            if ($isDuplicate) {
                Log::info('[AIRouter] Duplicate request detected, avoiding duplicate call', [
                    'feature' => $featureName,
                    'entity' => "{$entityType}:{$entityId}",
                ]);
                // Return the last successful route for this feature
                $lastRoute = $routes->first();

                return [
                    'provider' => $lastRoute->aiModel->aiProvider,
                    'model' => $lastRoute->aiModel,
                    'route' => $lastRoute,
                    'priority' => $lastRoute->priority,
                    'is_cached' => true,
                ];
            }
        }

        // If cost sensitive, prefer cheaper models first
        if ($isCostSensitive) {
            $bestRoute = $this->selectCheaperRoute($routes);
            if ($bestRoute) {
                return [
                    'provider' => $bestRoute->aiModel->aiProvider,
                    'model' => $bestRoute->aiModel,
                    'route' => $bestRoute,
                    'priority' => $bestRoute->priority,
                    'is_cached' => false,
                ];
            }
        }

        // Default: use highest priority route
        $firstRoute = $routes->first();

        return [
            'provider' => $firstRoute->aiModel->aiProvider,
            'model' => $firstRoute->aiModel,
            'route' => $firstRoute,
            'priority' => $firstRoute->priority,
            'is_cached' => false,
        ];
    }

    /**
     * Get the next fallback provider/model if primary fails.
     *
     * @param  int  $currentPriority  Current priority level
     */
    public function getNextFallback(string $featureName, int $currentPriority): ?array
    {
        $nextRoute = AiFeatureRoute::where('feature_name', $featureName)
            ->where('is_active', true)
            ->where('priority', '>', $currentPriority)
            ->with(['aiModel', 'aiModel.aiProvider'])
            ->orderBy('priority', 'asc')
            ->first();

        if (! $nextRoute) {
            return null;
        }

        return [
            'provider' => $nextRoute->aiModel->aiProvider,
            'model' => $nextRoute->aiModel,
            'route' => $nextRoute,
            'priority' => $nextRoute->priority,
        ];
    }

    /**
     * Check if a request is likely a duplicate within the collision window.
     *
     * Returns true if:
     *   - Same feature, same entity, within COLLISION_WINDOW seconds
     *   - And last request was successful
     *
     * @param  int|string|null  $entityId
     */
    public function isDuplicateRequest(string $featureName, ?string $entityType, $entityId): bool
    {
        if (! $entityType || ! $entityId) {
            return false; // Can't detect duplicates without entity info
        }

        $recentRequest = AiRequest::where('feature_name', $featureName)
            ->where('entity_type', $entityType)
            ->where('entity_id', $entityId)
            ->where('status', 'success')
            ->where('created_at', '>=', now()->subSeconds(self::COLLISION_WINDOW))
            ->latest('created_at')
            ->first();

        return $recentRequest !== null;
    }

    /**
     * Select a cheaper route if available.
     *
     * Prefers models with 'low' cost tier, then 'medium'.
     *
     * @param  Collection  $routes
     */
    protected function selectCheaperRoute($routes): ?AiFeatureRoute
    {
        // Try low-cost models first
        $cheapRoute = $routes
            ->filter(fn ($r) => $r->aiModel->cost_tier === 'low')
            ->first();

        if ($cheapRoute) {
            return $cheapRoute;
        }

        // Fall back to medium-cost
        return $routes
            ->filter(fn ($r) => $r->aiModel->cost_tier === 'medium')
            ->first();
    }

    /**
     * Log an AI request for usage tracking and collision detection.
     */
    public function logRequest(array $data): AiRequest
    {
        return AiRequest::create([
            'feature_name' => $data['feature_name'],
            'provider_id' => $data['provider_id'],
            'ai_model_id' => $data['ai_model_id'],
            'entity_type' => $data['entity_type'] ?? null,
            'entity_id' => $data['entity_id'] ?? null,
            'request_tokens' => $data['request_tokens'] ?? 0,
            'response_tokens' => $data['response_tokens'] ?? 0,
            'cost_usd' => $data['cost_usd'] ?? 0,
            'status' => $data['status'] ?? 'pending',
            'error_message' => $data['error_message'] ?? null,
            'latency_ms' => $data['latency_ms'] ?? null,
            'used_fallback' => $data['used_fallback'] ?? false,
            'user_id' => auth()->id(),
        ]);
    }

    /**
     * Mark a request as completed.
     */
    public function markRequestComplete(AiRequest $request, array $result): AiRequest
    {
        $request->update([
            'status' => $result['success'] ? 'success' : 'failed',
            'response_tokens' => $result['response_tokens'] ?? 0,
            'cost_usd' => $result['cost_usd'] ?? 0,
            'latency_ms' => $result['latency_ms'] ?? 0,
            'error_message' => $result['error'] ?? null,
        ]);

        return $request;
    }

    /**
     * Get provider usage summary for a date range.
     */
    public function getUsageSummary(?\DateTime $startDate = null, ?\DateTime $endDate = null): array
    {
        $startDate ??= now()->subDays(30);
        $endDate ??= now();

        $requests = AiRequest::whereBetween('created_at', [$startDate, $endDate])
            ->where('status', 'success')
            ->get();

        $summary = [
            'total_requests' => $requests->count(),
            'total_cost' => $requests->sum('cost_usd'),
            'total_input_tokens' => $requests->sum('request_tokens'),
            'total_output_tokens' => $requests->sum('response_tokens'),
            'avg_latency_ms' => $requests->avg('latency_ms'),
            'by_feature' => [],
            'by_provider' => [],
            'by_status' => [],
        ];

        // Group by feature
        foreach ($requests->groupBy('feature_name') as $feature => $featureRequests) {
            $summary['by_feature'][$feature] = [
                'count' => $featureRequests->count(),
                'cost' => $featureRequests->sum('cost_usd'),
                'avg_latency' => $featureRequests->avg('latency_ms'),
            ];
        }

        // Group by provider
        foreach ($requests->groupBy('provider_id') as $providerId => $providerRequests) {
            $provider = AiProvider::find($providerId);
            if ($provider) {
                $summary['by_provider'][$provider->slug ?? $providerId] = [
                    'count' => $providerRequests->count(),
                    'cost' => $providerRequests->sum('cost_usd'),
                    'avg_latency' => $providerRequests->avg('latency_ms'),
                ];
            }
        }

        // Group by status
        $allRequests = AiRequest::whereBetween('created_at', [$startDate, $endDate])->get();
        foreach ($allRequests->groupBy('status') as $status => $statusRequests) {
            $summary['by_status'][$status] = $statusRequests->count();
        }

        return $summary;
    }

    /**
     * Check if a provider is available (enabled and has valid API key).
     */
    public function isProviderAvailable(AiProvider $provider): bool
    {
        if (! $provider->is_active) {
            return false;
        }

        // Check if API key is set (decrypted by Laravel)
        $apiKey = $provider->api_key;

        return ! empty($apiKey);
    }

    /**
     * Get all active providers with their models.
     *
     * @return Collection
     */
    public function getActiveProviders()
    {
        return AiProvider::where('is_active', true)
            ->with(['models' => fn ($q) => $q->where('is_active', true)])
            ->get();
    }

    /**
     * Get feature routing configuration.
     *
     * @param  string|null  $featureName  Filter by feature name
     * @return Collection
     */
    public function getFeatureRouting(?string $featureName = null)
    {
        $query = AiFeatureRoute::where('is_active', true)
            ->with(['aiModel', 'aiModel.aiProvider'])
            ->orderBy('feature_name', 'asc')
            ->orderBy('priority', 'asc');

        if ($featureName) {
            $query->where('feature_name', $featureName);
        }

        return $query->get();
    }
}
