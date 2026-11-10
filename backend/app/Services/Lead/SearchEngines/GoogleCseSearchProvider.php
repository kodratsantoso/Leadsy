<?php

namespace App\Services\Lead\SearchEngines;

use App\Models\Lead;
use App\Services\Lead\LeadContactGoogleSearchService;
use App\Services\Lead\SearchEngines\Concerns\SearchEngineResultParserTrait;
use App\Services\Lead\SearchEngines\Contracts\SearchEngineProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GoogleCseSearchProvider implements SearchEngineProviderInterface
{
    use SearchEngineResultParserTrait;

    public function __construct(
        private ?LeadContactGoogleSearchService $googleService = null
    ) {
        $this->googleService = $googleService ?: app(LeadContactGoogleSearchService::class);
    }

    public function getKey(): string
    {
        return 'google_cse';
    }

    public function getName(): string
    {
        return 'Google Custom Search (JSON API / CSE)';
    }

    public function isConfigured(?int $tenantId = null): bool
    {
        $enabled = $this->isConfigEnabled(['GOOGLE_CSE_ENABLED'], $tenantId, false);
        $apiKey = $this->getApiKey($tenantId);
        $cx = $this->getSearchEngineId($tenantId);

        return $enabled && !empty($apiKey) && !empty($cx);
    }

    public function getApiKey(?int $tenantId = null): string
    {
        return (string) $this->getConfigValue([
            'GOOGLE_CUSTOM_SEARCH_API_KEY',
            'GOOGLE_SEARCH_API_KEY',
            'GOOGLE_MAPS_BROWSER_API_KEY',
        ], $tenantId, '');
    }

    public function getSearchEngineId(?int $tenantId = null): string
    {
        return (string) $this->getConfigValue([
            'GOOGLE_CUSTOM_SEARCH_ENGINE_ID',
            'GOOGLE_SEARCH_ENGINE_ID',
            'GOOGLE_CSE_ID',
        ], $tenantId, '');
    }

    public function search(Lead $lead, ?int $tenantId = null): array
    {
        try {
            $result = $this->googleService->search($lead, $tenantId);
            if (!$result['success'] || empty($result['candidates'])) {
                return [
                    'success' => false,
                    'candidates' => [],
                    'queries' => isset($result['query']) ? [$result['query']] : [],
                    'error' => $result['error'] ?? 'Google CSE did not return candidates.',
                ];
            }

            $candidates = [];
            foreach ($result['candidates'] as $gc) {
                $candidates[] = [
                    'name' => $gc['name'],
                    'title' => $gc['title'] ?? null,
                    'linkedin_url' => $gc['linkedin_url'] ?? null,
                    'linkedin_id' => $gc['linkedin_id'] ?? hash('sha256', strtolower($gc['linkedin_url'] ?? $gc['name'])),
                    'snippet' => $gc['raw_preview']['snippet'] ?? $gc['evidence'] ?? '',
                    'snippet_emails' => [],
                    'source_query' => $result['query'] ?? 'Google CSE',
                    'source_engine' => 'Google Custom Search (CSE)',
                    'source_type' => 'linkedin',
                ];
            }

            return [
                'success' => true,
                'candidates' => $candidates,
                'queries' => isset($result['query']) ? [$result['query']] : [],
            ];
        } catch (\Throwable $e) {
            Log::error("[GoogleCseSearchProvider] Search failed: {$e->getMessage()}");
            return [
                'success' => false,
                'candidates' => [],
                'queries' => [],
                'error' => $e->getMessage(),
            ];
        }
    }

    public function testConnection(array $credentials = [], ?int $tenantId = null): array
    {
        $apiKey = $credentials['GOOGLE_CUSTOM_SEARCH_API_KEY'] ?? $this->getApiKey($tenantId);
        $cx = $credentials['GOOGLE_CUSTOM_SEARCH_ENGINE_ID'] ?? $this->getSearchEngineId($tenantId);

        if (empty($apiKey) || empty($cx)) {
            return [
                'success' => false,
                'message' => 'Google API Key dan Programmable Search Engine ID (cx) wajib diisi.',
            ];
        }

        try {
            $response = Http::timeout(10)->get('https://customsearch.googleapis.com/customsearch/v1', [
                'key' => $apiKey,
                'cx' => $cx,
                'q' => 'test',
                'num' => 1,
            ]);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'message' => 'Koneksi ke Google Custom Search JSON API Berhasil!',
                ];
            }

            $err = $response->json('error.message') ?: $response->body();
            return [
                'success' => false,
                'message' => "Google API merespons dengan HTTP {$response->status()}: {$err}",
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message' => "Gagal menghubungi Google Custom Search API: {$e->getMessage()}",
            ];
        }
    }
}
