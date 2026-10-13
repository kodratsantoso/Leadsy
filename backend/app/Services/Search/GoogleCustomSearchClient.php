<?php

namespace App\Services\Search;

use App\Services\Search\Contracts\WebSearchProvider;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * A plain Google Programmable Search call — no AI anywhere in it.
 *
 * Leadsy already takes this approach for contacts: the AI writes a query, and Google
 * finds the facts. Company profiling did the opposite, asking the model to recall
 * Indonesian company details from training data while instructing it to "check Kemendag
 * and JobStreet" — something it cannot do, because a web-search tool is only wired on the
 * Gemini branch and routing sends these calls to BytePlus. This client exists so the same
 * division of labour can apply there: search finds, the model only organises.
 *
 * Deliberately not built on LeadContactGoogleSearchService. That service is shaped
 * entirely around parsing LinkedIn profile results, and widening it would put company
 * research and contact discovery in one place where a change to either can break the
 * other. Only the credential lookup is shared in spirit, reading the same config keys.
 */
class GoogleCustomSearchClient implements WebSearchProvider
{
    private const ENDPOINT = 'https://customsearch.googleapis.com/customsearch/v1';

    private const API_KEY_KEYS = ['GOOGLE_SEARCH_API_KEY', 'GOOGLE_CUSTOM_SEARCH_API_KEY', 'GOOGLE_MAPS_BROWSER_API_KEY'];

    private const ENGINE_ID_KEYS = ['GOOGLE_SEARCH_ENGINE_ID', 'GOOGLE_CUSTOM_SEARCH_ENGINE_ID', 'GOOGLE_CSE_ID'];

    public function __construct(private readonly SearchConfig $config) {}

    public function key(): string
    {
        return 'google';
    }

    public function label(): string
    {
        return 'Google Custom Search';
    }

    public function isConfigured(?int $tenantId = null): bool
    {
        return $this->config->value(self::API_KEY_KEYS, $tenantId) !== null
            && $this->config->value(self::ENGINE_ID_KEYS, $tenantId) !== null;
    }

    /**
     * Run one query.
     *
     * @return array{success: bool, results: list<array{title: string, link: string, snippet: string}>, error?: string}
     */
    public function search(string $query, ?int $tenantId = null, int $limit = 5): array
    {
        $query = trim($query);

        if ($query === '') {
            return ['success' => false, 'results' => [], 'error' => 'Empty search query.'];
        }

        $apiKey = $this->config->value(self::API_KEY_KEYS, $tenantId);

        $searchEngineId = $this->config->value(self::ENGINE_ID_KEYS, $tenantId);

        if (! $apiKey || ! $searchEngineId) {
            return [
                'success' => false,
                'results' => [],
                'error' => 'Google Programmable Search is not configured. Set it up in Settings → Integration Setting → Google → Custom Search JSON API.',
            ];
        }

        try {
            $response = Http::timeout(15)->get(self::ENDPOINT, array_filter([
                'key' => $apiKey,
                'cx' => $searchEngineId,
                'q' => $query,
                'num' => max(1, min(10, $limit)),
                // Indonesian companies are the subject, so bias the index accordingly.
                'gl' => $this->config->value(['GOOGLE_SEARCH_GL'], $tenantId) ?: 'id',
                'hl' => $this->config->value(['GOOGLE_SEARCH_HL'], $tenantId) ?: 'id',
                'safe' => 'off',
            ], fn ($v) => $v !== null && $v !== ''));
        } catch (\Throwable $e) {
            Log::warning('[GoogleCustomSearch] request failed', ['query' => $query, 'error' => $e->getMessage()]);

            return ['success' => false, 'results' => [], 'error' => 'Search request could not be sent.'];
        }

        if (! $response->successful()) {
            Log::warning('[GoogleCustomSearch] non-success response', ['query' => $query, 'status' => $response->status()]);

            return ['success' => false, 'results' => [], 'error' => "Search returned HTTP {$response->status()}."];
        }

        $results = collect($response->json('items') ?? [])
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
