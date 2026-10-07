<?php

namespace App\Services\AI;

use App\Models\AiFeatureRoute;
use Illuminate\Support\Collection;

class AIPriorityResolverService
{
    /**
     * The provider chain to try for a feature, best first.
     *
     * A feature's own rows used to REPLACE the global chain — global was consulted only
     * when the feature had none. One stale row was therefore enough to pin a feature to a
     * single provider with no fallback, invisibly, no matter what Global AI Routing said.
     * Now the global chain is always appended behind any feature-specific preference, so
     * every feature can reach every configured provider and nothing is ever stranded.
     *
     * Deduplicated by model: a model already reachable via the feature's own rows is not
     * retried further down the chain.
     */
    public function getRoutesForFeature(string $featureName): Collection
    {
        $featureRoutes = $featureName === 'global'
            ? collect()
            : $this->activeRoutes($featureName);

        $globalRoutes = $this->activeRoutes('global');

        return $featureRoutes
            ->concat($globalRoutes)
            ->unique(fn (AiFeatureRoute $route) => $route->ai_model_id)
            ->values();
    }

    /** Routes for one feature_name, in priority order, that can actually be called. */
    private function activeRoutes(string $featureName): Collection
    {
        return AiFeatureRoute::with(['aiModel.provider'])
            ->where('feature_name', $featureName)
            ->where('is_active', true)
            ->orderBy('priority')
            ->get()
            ->filter(function (AiFeatureRoute $route): bool {
                return $route->aiModel
                    && $route->aiModel->status === 'active'
                    && $route->aiModel->provider
                    && $route->aiModel->provider->status === 'active'
                    && $route->aiModel->provider->hasConfiguredKey();
            })
            ->values();
    }

    public function getNextFallback(string $featureName, int $currentPriority): ?AiFeatureRoute
    {
        return $this->getRoutesForFeature($featureName)
            ->first(fn (AiFeatureRoute $route) => $route->priority > $currentPriority);
    }
}
