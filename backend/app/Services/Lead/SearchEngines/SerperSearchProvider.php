<?php

namespace App\Services\Lead\SearchEngines;

use App\Models\Lead;
use App\Services\Lead\SearchEngines\Concerns\SearchEngineResultParserTrait;
use App\Services\Lead\SearchEngines\Contracts\SearchEngineProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SerperSearchProvider implements SearchEngineProviderInterface
{
    use SearchEngineResultParserTrait;

    public function getKey(): string
    {
        return 'serper';
    }

    public function getName(): string
    {
        return 'Serper.dev (Google SERP JSON API)';
    }

    public function isConfigured(?int $tenantId = null): bool
    {
        return $this->isConfigEnabled(['SERPER_ENABLED'], $tenantId, false)
            && !empty($this->getApiKey($tenantId));
    }

    public function getApiKey(?int $tenantId = null): string
    {
        return trim((string) $this->getConfigValue(['SERPER_API_KEY'], $tenantId, ''));
    }

    public function search(Lead $lead, ?int $tenantId = null): array
    {
        $apiKey = $this->getApiKey($tenantId);
        if (empty($apiKey) || str_starts_with($apiKey, '••••')) {
            return [
                'success' => false,
                'candidates' => [],
                'queries' => [],
                'error' => 'Serper API Key is not configured or masked.',
            ];
        }

        $queries = $this->buildSearchQueries($lead);
        $candidates = [];
        $executedQueries = [];
        $lastError = null;

        $tokens = $this->extractBrandTokens($lead);
        $primaryBrand = !empty($tokens) ? $tokens[0] : $lead->company_name;

        foreach ($queries as $query) {
            $executedQueries[] = $query;
            try {
                $response = Http::withHeaders([
                    'X-API-KEY' => $apiKey,
                    'Content-Type' => 'application/json',
                ])
                    ->timeout(15)
                    ->post('https://google.serper.dev/search', [
                        'q' => $query,
                        'num' => 10,
                        'gl' => 'id',
                    ]);

                // Free-tier safety: if Serper rejects complex query patterns, instantly fallback to a clean natural search
                if ($response->status() === 400 && str_contains($response->body(), 'Query pattern not allowed')) {
                    $cleanQuery = "linkedin {$primaryBrand} director manager";
                    Log::info("[SerperSearchProvider] Query pattern rejected by free tier, retrying with natural query: {$cleanQuery}");
                    $response = Http::withHeaders([
                        'X-API-KEY' => $apiKey,
                        'Content-Type' => 'application/json',
                    ])
                        ->timeout(15)
                        ->post('https://google.serper.dev/search', [
                            'q' => $cleanQuery,
                            'num' => 10,
                            'gl' => 'id',
                        ]);
                }

                if (!$response->successful()) {
                    $status = $response->status();
                    $body = substr($response->body(), 0, 300);
                    Log::warning("[SerperSearchProvider] Query failed HTTP {$status}: {$body}", ['query' => $query]);
                    $lastError = "Serper HTTP {$status}: {$body}";

                    // If unauthorized or forbidden, do not continue trying subsequent queries with invalid key
                    if ($status === 401 || $status === 403) {
                        break;
                    }

                    continue;
                }

                $data = $response->json();
                $organic = $data['organic'] ?? [];

                foreach ($organic as $item) {
                    $link = (string) ($item['link'] ?? '');
                    $normalizedUrl = $this->normalizeLinkedinUrl($link);
                    if (!$normalizedUrl) {
                        continue;
                    }

                    $id = $this->extractLinkedinId($normalizedUrl);
                    $titleRaw = (string) ($item['title'] ?? '');
                    $parsed = $this->parseLinkedinTitle($titleRaw);

                    if (empty($parsed['name'])) {
                        continue;
                    }

                    $snippet = trim((string) ($item['snippet'] ?? ''));
                    $snippetEmails = $this->extractEmailsFromText($snippet);

                    $candidates[] = [
                        'name' => $parsed['name'],
                        'title' => $parsed['title'],
                        'linkedin_url' => $normalizedUrl,
                        'linkedin_id' => $id ?: hash('sha256', strtolower($normalizedUrl)),
                        'snippet' => $snippet,
                        'snippet_emails' => $snippetEmails,
                        'source_query' => $query,
                        'source_engine' => 'Serper.dev (Google SERP)',
                        'source_type' => 'linkedin',
                    ];
                }

                // If this primary query returned at least 10 candidates, stop to avoid eating excess quota
                if (count($candidates) >= 10) {
                    break;
                }
            } catch (\Throwable $e) {
                Log::error("[SerperSearchProvider] Exception: {$e->getMessage()}", ['query' => $query]);
                $lastError = "Connection error: {$e->getMessage()}";
            }
        }

        // If no candidates discovered and an explicit HTTP error occurred, return error
        if (empty($candidates) && $lastError !== null) {
            return [
                'success' => false,
                'candidates' => [],
                'queries' => $executedQueries,
                'error' => $lastError,
            ];
        }

        return [
            'success' => true,
            'candidates' => $candidates,
            'queries' => $executedQueries,
            'error' => empty($candidates) ? 'No LinkedIn profile results found for this lead via Serper.' : null,
        ];
    }

    public function testConnection(array $credentials = [], ?int $tenantId = null): array
    {
        $apiKey = trim((string) ($credentials['SERPER_API_KEY'] ?? ''));
        if (empty($apiKey) || str_starts_with($apiKey, '••••')) {
            $apiKey = $this->getApiKey($tenantId);
        }

        if (empty($apiKey)) {
            return [
                'success' => false,
                'message' => 'API Key Serper.dev belum diisi.',
            ];
        }

        try {
            $response = Http::withHeaders([
                'X-API-KEY' => $apiKey,
                'Content-Type' => 'application/json',
            ])
                ->timeout(10)
                ->post('https://google.serper.dev/search', [
                    'q' => 'site:linkedin.com/in "Google"',
                    'num' => 2,
                    'gl' => 'id',
                ]);

            if ($response->successful()) {
                $count = count($response->json('organic') ?? []);
                return [
                    'success' => true,
                    'message' => "Koneksi ke Serper.dev Berhasil! (Response OK, {$count} data teruji).",
                    'details' => [
                        'credits_left' => $response->header('X-Credits-Remaining'),
                    ],
                ];
            }

            return [
                'success' => false,
                'message' => "Serper.dev menolak permintaan (HTTP {$response->status()}): " . ($response->json('message') ?: $response->body()),
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message' => "Gagal menghubungi server Serper.dev: {$e->getMessage()}",
            ];
        }
    }
}

