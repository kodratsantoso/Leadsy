<?php

namespace App\Services\Search;

use App\Models\IntegrationConfig;
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
class GoogleCustomSearchClient
{
    private const ENDPOINT = 'https://customsearch.googleapis.com/customsearch/v1';

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

        $apiKey = $this->configValue([
            'GOOGLE_SEARCH_API_KEY',
            'GOOGLE_CUSTOM_SEARCH_API_KEY',
            'GOOGLE_MAPS_BROWSER_API_KEY',
        ], $tenantId);

        $searchEngineId = $this->configValue([
            'GOOGLE_SEARCH_ENGINE_ID',
            'GOOGLE_CUSTOM_SEARCH_ENGINE_ID',
            'GOOGLE_CSE_ID',
        ], $tenantId);

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
                'gl' => $this->configValue(['GOOGLE_SEARCH_GL'], $tenantId) ?: 'id',
                'hl' => $this->configValue(['GOOGLE_SEARCH_HL'], $tenantId) ?: 'id',
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

    /** Reads an integration setting, preferring an env override. */
    private function configValue(array $keys, ?int $tenantId): ?string
    {
        foreach ($keys as $key) {
            $value = env($key);
            if (is_string($value) && trim($value) !== '') {
                return trim($value);
            }

            $record = IntegrationConfig::query()
                ->where('key', $key)
                ->where('is_active', true)
                ->where(function ($query) use ($tenantId) {
                    $query->whereNull('tenant_id');
                    if ($tenantId !== null) {
                        $query->orWhere('tenant_id', $tenantId);
                    }
                })
                ->orderByRaw('tenant_id is null')
                ->latest()
                ->first();

            if (is_string($record?->value) && trim($record->value) !== '') {
                return trim($record->value);
            }
        }

        return null;
    }
}
