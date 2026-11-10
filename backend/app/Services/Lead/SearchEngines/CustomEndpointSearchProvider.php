<?php

namespace App\Services\Lead\SearchEngines;

use App\Models\Lead;
use App\Services\Lead\SearchEngines\Concerns\SearchEngineResultParserTrait;
use App\Services\Lead\SearchEngines\Contracts\SearchEngineProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CustomEndpointSearchProvider implements SearchEngineProviderInterface
{
    use SearchEngineResultParserTrait;

    public function getKey(): string
    {
        return 'custom';
    }

    public function getName(): string
    {
        return 'Custom Search Endpoint (BYOE / SearXNG / Proxy)';
    }

    public function isConfigured(?int $tenantId = null): bool
    {
        return $this->isConfigEnabled(['CUSTOM_SEARCH_ENABLED'], $tenantId, false)
            && !empty($this->getEndpointUrl($tenantId));
    }

    public function getEndpointUrl(?int $tenantId = null): string
    {
        return (string) $this->getConfigValue(['CUSTOM_SEARCH_ENDPOINT'], $tenantId, '');
    }

    public function getApiKey(?int $tenantId = null): string
    {
        return (string) $this->getConfigValue(['CUSTOM_SEARCH_API_KEY'], $tenantId, '');
    }

    public function getHeaderName(?int $tenantId = null): string
    {
        return (string) $this->getConfigValue(['CUSTOM_SEARCH_HEADER_NAME'], $tenantId, 'Authorization');
    }

    public function getAuthType(?int $tenantId = null): string
    {
        return (string) $this->getConfigValue(['CUSTOM_SEARCH_AUTH_TYPE'], $tenantId, 'Bearer');
    }

    public function getHttpMethod(?int $tenantId = null): string
    {
        return strtoupper((string) $this->getConfigValue(['CUSTOM_SEARCH_METHOD'], $tenantId, 'POST'));
    }

    public function search(Lead $lead, ?int $tenantId = null): array
    {
        $endpoint = $this->getEndpointUrl($tenantId);
        if (empty($endpoint)) {
            return [
                'success' => false,
                'candidates' => [],
                'queries' => [],
                'error' => 'Custom search endpoint URL is not configured.',
            ];
        }

        $queries = $this->buildSearchQueries($lead);
        $candidates = [];
        $executedQueries = [];

        foreach ($queries as $query) {
            $executedQueries[] = $query;
            try {
                $client = Http::timeout(20);
                $apiKey = $this->getApiKey($tenantId);
                $headerName = $this->getHeaderName($tenantId);
                $authType = $this->getAuthType($tenantId);

                if (!empty($apiKey)) {
                    if (strcasecmp($authType, 'Bearer') === 0) {
                        $client = $client->withToken($apiKey);
                    } elseif (strcasecmp($authType, 'Header') === 0 || !empty($headerName)) {
                        $client = $client->withHeaders([$headerName => $apiKey]);
                    }
                }

                $method = $this->getHttpMethod($tenantId);
                if ($method === 'GET') {
                    $params = ['q' => $query, 'format' => 'json'];
                    if (strcasecmp($authType, 'QueryParam') === 0 && !empty($apiKey)) {
                        $params['key'] = $apiKey;
                    }
                    $response = $client->get($endpoint, $params);
                } else {
                    $payload = ['q' => $query, 'query' => $query, 'format' => 'json'];
                    $response = $client->asJson()->post($endpoint, $payload);
                }

                if (!$response->successful()) {
                    Log::warning("[CustomEndpointSearchProvider] Request failed HTTP {$response->status()}: {$response->body()}");
                    continue;
                }

                $json = $response->json();
                $items = $this->extractItemsFromResponse($json);

                foreach ($items as $item) {
                    $link = (string) ($item['url'] ?? $item['link'] ?? '');
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

                    $snippet = trim((string) ($item['snippet'] ?? $item['content'] ?? $item['description'] ?? ''));
                    $snippetEmails = $this->extractEmailsFromText($snippet);

                    $candidates[] = [
                        'name' => $parsed['name'],
                        'title' => $parsed['title'],
                        'linkedin_url' => $normalizedUrl,
                        'linkedin_id' => $id ?: hash('sha256', strtolower($normalizedUrl)),
                        'snippet' => $snippet,
                        'snippet_emails' => $snippetEmails,
                        'source_query' => $query,
                        'source_engine' => 'Custom Endpoint',
                        'source_type' => 'linkedin',
                    ];
                }

                if (count($candidates) >= 15) {
                    break;
                }
            } catch (\Throwable $e) {
                Log::error("[CustomEndpointSearchProvider] Exception: {$e->getMessage()}", ['query' => $query]);
            }
        }

        return [
            'success' => true,
            'candidates' => $candidates,
            'queries' => $executedQueries,
            'error' => empty($candidates) ? 'No candidates discovered via custom search endpoint.' : null,
        ];
    }

    private function extractItemsFromResponse(mixed $json): array
    {
        if (!is_array($json)) {
            return [];
        }

        // Standard patterns in search APIs
        if (isset($json['results']) && is_array($json['results'])) {
            return $json['results'];
        }
        if (isset($json['organic']) && is_array($json['organic'])) {
            return $json['organic'];
        }
        if (isset($json['items']) && is_array($json['items'])) {
            return $json['items'];
        }
        if (isset($json['data']) && is_array($json['data'])) {
            return $json['data'];
        }

        // If root is indexed array
        if (array_is_list($json)) {
            return $json;
        }

        return [];
    }

    public function testConnection(array $credentials = [], ?int $tenantId = null): array
    {
        $endpoint = $credentials['CUSTOM_SEARCH_ENDPOINT'] ?? $this->getEndpointUrl($tenantId);
        if (empty($endpoint)) {
            return [
                'success' => false,
                'message' => 'Custom Search Endpoint URL belum diisi.',
            ];
        }

        $apiKey = $credentials['CUSTOM_SEARCH_API_KEY'] ?? $this->getApiKey($tenantId);
        $headerName = $credentials['CUSTOM_SEARCH_HEADER_NAME'] ?? $this->getHeaderName($tenantId);
        $authType = $credentials['CUSTOM_SEARCH_AUTH_TYPE'] ?? $this->getAuthType($tenantId);
        $method = strtoupper($credentials['CUSTOM_SEARCH_METHOD'] ?? $this->getHttpMethod($tenantId));

        try {
            $client = Http::timeout(10);
            if (!empty($apiKey)) {
                if (strcasecmp($authType, 'Bearer') === 0) {
                    $client = $client->withToken($apiKey);
                } elseif (strcasecmp($authType, 'Header') === 0 || !empty($headerName)) {
                    $client = $client->withHeaders([$headerName => $apiKey]);
                }
            }

            if ($method === 'GET') {
                $params = ['q' => 'ping test', 'format' => 'json'];
                if (strcasecmp($authType, 'QueryParam') === 0 && !empty($apiKey)) {
                    $params['key'] = $apiKey;
                }
                $response = $client->get($endpoint, $params);
            } else {
                $response = $client->asJson()->post($endpoint, ['q' => 'ping test', 'format' => 'json']);
            }

            if ($response->successful()) {
                $items = $this->extractItemsFromResponse($response->json());
                $count = count($items);
                return [
                    'success' => true,
                    'message' => "Koneksi ke Custom Search Endpoint Berhasil! (HTTP {$response->status()}, {$count} item terdeteksi).",
                ];
            }

            return [
                'success' => false,
                'message' => "Endpoint merespons dengan HTTP {$response->status()}: " . substr($response->body(), 0, 200),
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message' => "Gagal menghubungi Custom Search Endpoint: {$e->getMessage()}",
            ];
        }
    }
}

