<?php

namespace App\Services\Search;

use App\Services\Search\Contracts\WebSearchProvider;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/** Brave Search API (independent web index). */
class BraveSearchClient implements WebSearchProvider
{
    private const ENDPOINT = 'https://api.search.brave.com/res/v1/web/search';

    private const KEYS = ['BRAVE_SEARCH_API_KEY'];

    public function __construct(private readonly SearchConfig $config) {}

    public function key(): string
    {
        return 'brave';
    }

    public function label(): string
    {
        return 'Brave Search';
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
            return ['success' => false, 'results' => [], 'error' => 'Brave Search is not configured.'];
        }

        try {
            $response = Http::timeout(15)
                ->acceptJson()
                ->withHeaders(['X-Subscription-Token' => $apiKey])
                ->get(self::ENDPOINT, [
                    'q' => $query,
                    'count' => max(1, min(20, $limit)),
                    'country' => 'ID',
                ]);
        } catch (\Throwable $e) {
            Log::warning('[BraveSearch] request failed', ['query' => $query, 'error' => $e->getMessage()]);

            return ['success' => false, 'results' => [], 'error' => 'Brave Search request could not be sent.'];
        }

        if (! $response->successful()) {
            Log::warning('[BraveSearch] non-success response', ['query' => $query, 'status' => $response->status()]);

            return ['success' => false, 'results' => [], 'error' => "Brave Search returned HTTP {$response->status()}."];
        }

        $results = collect($response->json('web.results') ?? [])
            ->map(fn ($item) => [
                'title' => (string) ($item['title'] ?? ''),
                'link' => (string) ($item['url'] ?? ''),
                'snippet' => trim(strip_tags((string) ($item['description'] ?? ''))),
            ])
            ->filter(fn (array $r) => $r['link'] !== '')
            ->values()
            ->all();

        return ['success' => true, 'results' => $results];
    }
}
