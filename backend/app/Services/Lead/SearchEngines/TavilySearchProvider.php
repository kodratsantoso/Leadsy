<?php

namespace App\Services\Lead\SearchEngines;

use App\Models\Lead;
use App\Services\Lead\SearchEngines\Concerns\SearchEngineResultParserTrait;
use App\Services\Lead\SearchEngines\Contracts\SearchEngineProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TavilySearchProvider implements SearchEngineProviderInterface
{
    use SearchEngineResultParserTrait;

    public function getKey(): string
    {
        return 'tavily';
    }

    public function getName(): string
    {
        return 'Tavily AI Search (Agentic Web Search)';
    }

    public function isConfigured(?int $tenantId = null): bool
    {
        return $this->isConfigEnabled(['TAVILY_ENABLED'], $tenantId, false)
            && !empty($this->getApiKey($tenantId));
    }

    public function getApiKey(?int $tenantId = null): string
    {
        return trim((string) $this->getConfigValue(['TAVILY_API_KEY'], $tenantId, ''));
    }

    public function search(Lead $lead, ?int $tenantId = null): array
    {
        $apiKey = $this->getApiKey($tenantId);
        if (empty($apiKey) || str_starts_with($apiKey, '••••')) {
            return [
                'success' => false,
                'candidates' => [],
                'queries' => [],
                'error' => 'Tavily API Key is not configured or masked.',
            ];
        }

        $queries = $this->buildSearchQueries($lead);
        $candidates = [];
        $executedQueries = [];

        foreach ($queries as $query) {
            $executedQueries[] = $query;
            try {
                $response = Http::timeout(20)
                    ->post('https://api.tavily.com/search', [
                        'api_key' => $apiKey,
                        'query' => $query,
                        'search_depth' => 'advanced',
                        'include_domains' => ['linkedin.com'],
                        'max_results' => 15,
                    ]);

                if (!$response->successful()) {
                    Log::warning("[TavilySearchProvider] Query failed HTTP {$response->status()}: {$response->body()}");
                    continue;
                }

                $data = $response->json();
                $results = $data['results'] ?? [];

                foreach ($results as $item) {
                    $url = (string) ($item['url'] ?? '');
                    $normalizedUrl = $this->normalizeLinkedinUrl($url);
                    if (!$normalizedUrl) {
                        continue;
                    }

                    $id = $this->extractLinkedinId($normalizedUrl);
                    $titleRaw = (string) ($item['title'] ?? '');
                    $parsed = $this->parseLinkedinTitle($titleRaw);

                    if (empty($parsed['name'])) {
                        continue;
                    }

                    $snippet = trim((string) ($item['content'] ?? ''));
                    $snippetEmails = $this->extractEmailsFromText($snippet);

                    $candidates[] = [
                        'name' => $parsed['name'],
                        'title' => $parsed['title'],
                        'linkedin_url' => $normalizedUrl,
                        'linkedin_id' => $id ?: hash('sha256', strtolower($normalizedUrl)),
                        'snippet' => $snippet,
                        'snippet_emails' => $snippetEmails,
                        'source_query' => $query,
                        'source_engine' => 'Tavily AI Search',
                        'source_type' => 'linkedin',
                    ];
                }

                if (count($candidates) >= 12) {
                    break;
                }
            } catch (\Throwable $e) {
                Log::error("[TavilySearchProvider] Exception: {$e->getMessage()}", ['query' => $query]);
            }
        }

        return [
            'success' => true,
            'candidates' => $candidates,
            'queries' => $executedQueries,
            'error' => empty($candidates) ? 'No candidates discovered via Tavily AI Search.' : null,
        ];
    }

    public function testConnection(array $credentials = [], ?int $tenantId = null): array
    {
        $apiKey = trim((string) ($credentials['TAVILY_API_KEY'] ?? ''));
        if (empty($apiKey) || str_starts_with($apiKey, '••••')) {
            $apiKey = $this->getApiKey($tenantId);
        }

        if (empty($apiKey)) {
            return [
                'success' => false,
                'message' => 'Tavily API Key belum diisi.',
            ];
        }

        try {
            $response = Http::timeout(10)->post('https://api.tavily.com/search', [
                'api_key' => $apiKey,
                'query' => 'site:linkedin.com/in "Google"',
                'max_results' => 2,
            ]);

            if ($response->successful()) {
                $count = count($response->json('results') ?? []);
                return [
                    'success' => true,
                    'message' => "Koneksi ke Tavily AI Search Berhasil! ({$count} hasil teruji).",
                ];
            }

            return [
                'success' => false,
                'message' => "Tavily API merespons dengan HTTP {$response->status()}: " . ($response->json('message') ?: $response->body()),
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message' => "Gagal menghubungi Tavily AI API: {$e->getMessage()}",
            ];
        }
    }
}

