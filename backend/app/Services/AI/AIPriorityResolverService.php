<?php

namespace App\Services\AI;

use App\Models\AiFeatureRoute;
use Illuminate\Support\Collection;

class AIPriorityResolverService
{
    public function getRoutesForFeature(string $featureName): Collection
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
