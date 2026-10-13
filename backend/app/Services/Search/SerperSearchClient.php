<?php

namespace App\Services\Search;

use App\Services\Search\Contracts\WebSearchProvider;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/** Serper.dev — Google results through a paid API, no Programmable Search Engine needed. */
class SerperSearchClient implements WebSearchProvider
{
    private const ENDPOINT = 'https://google.serper.dev/search';

    private const KEYS = ['SERPER_API_KEY'];

    public function __construct(private readonly SearchConfig $config) {}

    public function key(): string
    {
        return 'serper';
    }

    public function label(): string
    {
        return 'Serper';
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
            return ['success' => false, 'results' => [], 'error' => 'Serper is not configured.'];
        }

        try {
            $response = Http::timeout(15)
                ->acceptJson()
                ->withHeaders(['X-API-KEY' => $apiKey])
                ->post(self::ENDPOINT, [
                    'q' => $query,
                    'num' => max(1, min(10, $limit)),
                    'gl' => 'id',
                    'hl' => 'id',
                ]);
        } catch (\Throwable $e) {
            Log::warning('[SerperSearch] request failed', ['query' => $query, 'error' => $e->getMessage()]);

            return ['success' => false, 'results' => [], 'error' => 'Serper request could not be sent.'];
        }

        if (! $response->successful()) {
            Log::warning('[SerperSearch] non-success response', ['query' => $query, 'status' => $response->status()]);

            return ['success' => false, 'results' => [], 'error' => "Serper returned HTTP {$response->status()}."];
        }

        $results = collect($response->json('organic') ?? [])
            ->map(fn ($item) => [
                'title' => (string) ($item['title'] ?? ''),
                'link' => (string) ($item['link'] ?? ''),
                'snippet' => trim((string) ($item['snippet'] ?? '')),
            ])
            ->filter(fn (array $r) => $r['link'] !== '')
            ->values()
            ->all();

        return ['success' => true, 'results' => $results];
    }
}
