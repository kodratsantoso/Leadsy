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
        return (string) $this->getConfigValue(['SERPER_API_KEY'], $tenantId, '');
    }

    public function search(Lead $lead, ?int $tenantId = null): array
    {
        $apiKey = $this->getApiKey($tenantId);
        if (empty($apiKey)) {
            return [
                'success' => false,
                'candidates' => [],
                'queries' => [],
                'error' => 'Serper API Key is not configured.',
            ];
        }

        $queries = $this->buildSearchQueries($lead);
        $candidates = [];
        $executedQueries = [];

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
                        'num' => 20,
                        'gl' => 'id',
                        'hl' => 'id',
                    ]);

                if (!$response->successful()) {
                    Log::warning("[SerperSearchProvider] Query failed HTTP {$response->status()}: {$response->body()}");
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

                // If this primary query returned at least 5 candidates, stop to avoid eating excess quota
                if (count($candidates) >= 15) {
                    break;
                }
            } catch (\Throwable $e) {
                Log::error("[SerperSearchProvider] Exception: {$e->getMessage()}", ['query' => $query]);
            }
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
        $apiKey = $credentials['SERPER_API_KEY'] ?? $this->getApiKey($tenantId);
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
