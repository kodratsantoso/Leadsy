<?php

namespace App\Services\Search;

use App\Services\Search\Contracts\WebSearchProvider;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Tavily Search API — a search endpoint built for feeding LLMs.
 *
 * Results come back with a longer `content` extract than a Google snippet, which is the
 * main reason it is the default first choice for company research.
 */
class TavilySearchClient implements WebSearchProvider
{
    private const ENDPOINT = 'https://api.tavily.com/search';

    private const KEYS = ['TAVILY_API_KEY'];

    public function __construct(private readonly SearchConfig $config) {}

    public function key(): string
    {
        return 'tavily';
    }

    public function label(): string
    {
        return 'Tavily';
    }

    public function isConfigured(?int $tenantId = null): bool
    {
        return $this->config->value(self::KEYS, $tenantId) !== null;
    }

    public function search(string $query, ?int $tenantId = null, int $limit = 5): array
    {
        $query = trim($query);
        if ($query === '') {
            return ['success' => false, 'results' => [], 'error' => 'Empty search query.'];
        }

        $apiKey = $this->config->value(self::KEYS, $tenantId);
        if (! $apiKey) {
            return ['success' => false, 'results' => [], 'error' => 'Tavily is not configured.'];
        }

        try {
            $response = Http::timeout(20)
                ->withToken($apiKey)
                ->acceptJson()
                ->post(self::ENDPOINT, [
                    'query' => $query,
                    'max_results' => max(1, min(10, $limit)),
                    'search_depth' => 'basic',
                    'include_answer' => false,
                ]);
        } catch (\Throwable $e) {
            Log::warning('[TavilySearch] request failed', ['query' => $query, 'error' => $e->getMessage()]);

            return ['success' => false, 'results' => [], 'error' => 'Tavily request could not be sent.'];
        }

        if (! $response->successful()) {
            Log::warning('[TavilySearch] non-success response', ['query' => $query, 'status' => $response->status()]);

            return ['success' => false, 'results' => [], 'error' => "Tavily returned HTTP {$response->status()}."];
        }

        $results = collect($response->json('results') ?? [])
            ->map(fn ($item) => [
                'title' => (string) ($item['title'] ?? ''),
                'link' => (string) ($item['url'] ?? ''),
                'snippet' => trim((string) ($item['content'] ?? '')),
            ])
            ->filter(fn (array $r) => $r['link'] !== '')
            ->values()
            ->all();

        return ['success' => true, 'results' => $results];
    }
}
