<?php

namespace App\Services\Lead\SearchEngines;

use App\Models\IntegrationConfig;
use App\Models\Lead;
use App\Services\Lead\SearchEngines\Contracts\SearchEngineProviderInterface;
use Illuminate\Support\Facades\Log;

class SearchEnginePipelineManager
{
    public const DEFAULT_PRIORITY = ['serper', 'custom', 'google_cse', 'tavily', 'lusha'];

    /**
     * @var array<string, SearchEngineProviderInterface>
     */
    private array $providers = [];

    public function __construct(
        SerperSearchProvider $serper,
        CustomEndpointSearchProvider $custom,
        GoogleCseSearchProvider $googleCse,
        TavilySearchProvider $tavily,
        LushaSearchProvider $lusha,
    ) {
        $this->providers = [
            'serper' => $serper,
            'custom' => $custom,
            'google_cse' => $googleCse,
            'tavily' => $tavily,
            'lusha' => $lusha,
        ];
    }

    /**
     * Get a specific provider by key.
     */
    public function getProvider(string $key): ?SearchEngineProviderInterface
    {
        return $this->providers[$key] ?? null;
    }

    /**
     * Get all registered providers.
     *
     * @return array<string, SearchEngineProviderInterface>
     */
    public function getAllProviders(): array
    {
        return $this->providers;
    }

    /**
     * Get the configured priority list for a tenant.
     *
     * @return string[]
     */
    public function getPriorityOrder(?int $tenantId = null): array
    {
        $config = IntegrationConfig::query()
            ->where('key', 'SEARCH_ENGINE_PRIORITY')
            ->where(function ($query) use ($tenantId) {
                $query->whereNull('tenant_id');
                if ($tenantId !== null) {
                    $query->orWhere('tenant_id', $tenantId);
                }
            })
            ->where('is_active', true)
            ->orderByRaw('tenant_id IS NOT NULL DESC')
            ->first();

        if ($config && !empty($config->value)) {
            $parsed = is_array($config->value) ? $config->value : json_decode((string) $config->value, true);
            if (is_array($parsed) && !empty($parsed)) {
                return array_values(array_filter($parsed, fn ($k) => isset($this->providers[$k])));
            }
        }

        return self::DEFAULT_PRIORITY;
    }

    /**
     * Execute the sequential priority pipeline.
     * Tries P1. If no results or not configured, moves to P2, then P3, etc.
     *
     * @return array{
     *     success: bool,
     *     provider_key?: string,
     *     provider_name?: string,
     *     priority_rank?: int,
     *     candidates: array,
     *     queries: string[],
     *     tried_engines: array,
     *     message?: string,
     *     error?: string
     * }
     */
    public function executeSequentialSearch(Lead $lead, ?int $tenantId = null): array
    {
        $priorityOrder = $this->getPriorityOrder($tenantId);
        $triedEngines = [];
        $allQueries = [];

        foreach ($priorityOrder as $index => $key) {
            $rank = $index + 1;
            $provider = $this->providers[$key] ?? null;
            if (!$provider) {
                continue;
            }

            $providerName = $provider->getName();
            $isConfigured = $provider->isConfigured($tenantId);

            if (!$isConfigured) {
                $triedEngines[] = [
                    'rank' => $rank,
                    'key' => $key,
                    'name' => $providerName,
                    'status' => 'skipped_not_configured',
                ];
                continue;
            }

            Log::info("[SearchEnginePipeline] Executing Priority {$rank} engine: {$providerName} for lead #{$lead->id} ({$lead->company_name})");

            $result = $provider->search($lead, $tenantId);
            $queries = $result['queries'] ?? [];
            $allQueries = array_merge($allQueries, $queries);
            $candidates = $result['candidates'] ?? [];

            if ($result['success'] && !empty($candidates)) {
                Log::info("[SearchEnginePipeline] Priority {$rank} ({$providerName}) SUCCESS: Found " . count($candidates) . " candidate(s)!");

                $triedEngines[] = [
                    'rank' => $rank,
                    'key' => $key,
                    'name' => $providerName,
                    'status' => 'success',
                    'count' => count($candidates),
                ];

                return [
                    'success' => true,
                    'provider_key' => $key,
                    'provider_name' => $providerName,
                    'priority_rank' => $rank,
                    'candidates' => $candidates,
                    'queries' => $allQueries,
                    'tried_engines' => $triedEngines,
                    'message' => count($candidates) . " PIC candidate(s) discovered via P{$rank} ({$providerName}).",
                ];
            }

            $isSuccessZero = $result['success'] && empty($candidates);
            $triedEngines[] = [
                'rank' => $rank,
                'key' => $key,
                'name' => $providerName,
                'status' => $isSuccessZero ? 'zero_results' : 'failed',
                'error' => $result['error'] ?? null,
            ];

            Log::warning("[SearchEnginePipeline] Priority {$rank} ({$providerName}) returned 0 results or failed (" . ($result['error'] ?? 'no error') . "). Cascading to next priority...");
        }

        return [
            'success' => false,
            'candidates' => [],
            'queries' => $allQueries,
            'tried_engines' => $triedEngines,
            'error' => 'None of the configured search engines returned PIC candidates.',
        ];
    }
}

