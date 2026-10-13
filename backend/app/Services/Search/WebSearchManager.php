<?php

namespace App\Services\Search;

use App\Services\Search\Contracts\WebSearchProvider;

/**
 * Picks which web search backend answers, in the order an admin chose.
 *
 * Profiling used to depend on Google Programmable Search alone. When its key or engine
 * ID was missing — or the 100-queries/day quota ran out — every profile came back empty.
 * The manager tries each configured backend in WEB_RESEARCH_PROVIDER_ORDER and moves to
 * the next when one fails, so one broken integration no longer empties the profiler.
 */
class WebSearchManager
{
    public const ORDER_KEY = 'WEB_RESEARCH_PROVIDER_ORDER';

    public const DEFAULT_ORDER = ['tavily', 'google', 'serper', 'brave'];

    /** @var array<string, WebSearchProvider> */
    private array $providers;

    public function __construct(
        private readonly SearchConfig $config,
        GoogleCustomSearchClient $google,
        TavilySearchClient $tavily,
        BraveSearchClient $brave,
        SerperSearchClient $serper,
    ) {
        foreach ([$tavily, $google, $serper, $brave] as $provider) {
            $this->providers[$provider->key()] = $provider;
        }
    }

    /**
     * Configured providers, in the admin's order. Unknown names are ignored, and any
     * known provider missing from the setting is appended so it still acts as a fallback.
     *
     * @return list<WebSearchProvider>
     */
    public function configuredProviders(?int $tenantId = null): array
    {
        $raw = $this->config->value([self::ORDER_KEY], $tenantId);
        $order = $raw
            ? array_values(array_filter(array_map(fn ($v) => strtolower(trim($v)), explode(',', $raw))))
            : self::DEFAULT_ORDER;

        $order = array_values(array_unique(array_merge($order, self::DEFAULT_ORDER)));

        $ordered = [];
        foreach ($order as $key) {
            $provider = $this->providers[$key] ?? null;
            if ($provider && $provider->isConfigured($tenantId)) {
                $ordered[] = $provider;
            }
        }

        return $ordered;
    }

    /**
     * Run one query against the first provider that answers.
     *
     * @param  list<string>  $exclude  Provider keys that already failed in this research run.
     * @return array{success: bool, results: list<array{title: string, link: string, snippet: string}>, provider: ?string, failed: list<string>, error?: string}
     */
    public function search(string $query, ?int $tenantId = null, int $limit = 5, array $exclude = []): array
    {
        $providers = $this->configuredProviders($tenantId);

        if ($providers === []) {
            return [
                'success' => false,
                'results' => [],
                'provider' => null,
                'failed' => [],
                'error' => 'No web search provider is configured. Add a Tavily, Google Custom Search, Serper or Brave key in Settings → Integration Setting → Google → Web Research Providers.',
            ];
        }

        $failed = [];
        $lastError = null;

        foreach ($providers as $provider) {
            if (in_array($provider->key(), $exclude, true)) {
                continue;
            }

            $result = $provider->search($query, $tenantId, $limit);

            if ($result['success'] ?? false) {
                return [
                    'success' => true,
                    'results' => $result['results'] ?? [],
                    'provider' => $provider->key(),
                    'failed' => $failed,
                ];
            }

            $failed[] = $provider->key();
            $lastError = $provider->label().': '.($result['error'] ?? 'search failed');
        }

        return [
            'success' => false,
            'results' => [],
            'provider' => null,
            'failed' => $failed,
            'error' => $lastError ?? 'Every configured web search provider has already failed in this run.',
        ];
    }

    public function label(string $key): string
    {
        return isset($this->providers[$key]) ? $this->providers[$key]->label() : $key;
    }
}
