<?php

namespace App\Services\Lead\SearchEngines;

use App\Models\Lead;
use App\Services\Enrichment\Providers\LushaProvider;
use App\Services\Lead\SearchEngines\Concerns\SearchEngineResultParserTrait;
use App\Services\Lead\SearchEngines\Contracts\SearchEngineProviderInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class LushaSearchProvider implements SearchEngineProviderInterface
{
    use SearchEngineResultParserTrait;

    public function __construct(
        private ?LushaProvider $lusha = null
    ) {
        $this->lusha = $lusha ?: app(LushaProvider::class);
    }

    public function getKey(): string
    {
        return 'lusha';
    }

    public function getName(): string
    {
        return 'Lusha B2B People Discovery';
    }

    public function isConfigured(?int $tenantId = null): bool
    {
        return $this->isConfigEnabled(['LUSHA_SEARCH_ENABLED', 'LUSHA_ENABLED'], $tenantId, false)
            && !empty($this->getApiKey($tenantId));
    }

    public function getApiKey(?int $tenantId = null): string
    {
        return (string) $this->getConfigValue(['LUSHA_API_KEY'], $tenantId, '');
    }

    public function search(Lead $lead, ?int $tenantId = null): array
    {
        $apiKey = $this->getApiKey($tenantId);
        if (empty($apiKey)) {
            return [
                'success' => false,
                'candidates' => [],
                'queries' => [],
                'error' => 'Lusha API Key is not configured.',
            ];
        }

        $domain = $lead->website_domain ?: parse_url((string) $lead->website, PHP_URL_HOST);
        $candidates = [];
        $queryUsed = $lead->company_name . ($domain ? " ({$domain})" : '');

        try {
            // Lusha V3 search endpoint
            $payload = [
                'filters' => array_filter([
                    'companyName' => $lead->company_name,
                    'companyDomain' => $domain ?: null,
                ]),
                'pagination' => [
                    'page' => 1,
                    'pageSize' => 15,
                ],
            ];

            $response = Http::withHeaders([
                'api_key' => $apiKey,
                'Content-Type' => 'application/json',
            ])
                ->timeout(15)
                ->post('https://api.lusha.com/v3/contacts/search', $payload);

            if ($response->successful()) {
                $contacts = $response->json('contacts') ?? $response->json('data') ?? [];
                foreach ($contacts as $c) {
                    $fullName = trim(($c['firstName'] ?? '') . ' ' . ($c['lastName'] ?? ''));
                    if (empty($fullName)) {
                        $fullName = $c['fullName'] ?? $c['name'] ?? '';
                    }

                    if (empty($fullName)) {
                        continue;
                    }

                    $linkedinUrl = $c['linkedinUrl'] ?? $c['linkedin_url'] ?? null;
                    if ($linkedinUrl) {
                        $linkedinUrl = $this->normalizeLinkedinUrl($linkedinUrl);
                    }

                    $candidates[] = [
                        'name' => $fullName,
                        'title' => $c['jobTitle'] ?? $c['title'] ?? null,
                        'linkedin_url' => $linkedinUrl,
                        'linkedin_id' => $linkedinUrl ? $this->extractLinkedinId($linkedinUrl) : hash('sha256', strtolower($fullName)),
                        'snippet' => 'Discovered via Lusha B2B directory for ' . $lead->company_name,
                        'snippet_emails' => [],
                        'source_query' => $queryUsed,
                        'source_engine' => 'Lusha B2B Discovery',
                        'source_type' => 'lusha',
                    ];
                }
            } else {
                Log::info("[LushaSearchProvider] Lusha search returned HTTP {$response->status()}: " . substr($response->body(), 0, 200));
            }
        } catch (\Throwable $e) {
            Log::warning("[LushaSearchProvider] Exception: {$e->getMessage()}");
        }

        return [
            'success' => true,
            'candidates' => $candidates,
            'queries' => [$queryUsed],
            'error' => empty($candidates) ? 'No candidates discovered via Lusha.' : null,
        ];
    }

    public function testConnection(array $credentials = [], ?int $tenantId = null): array
    {
        $apiKey = $credentials['LUSHA_API_KEY'] ?? $this->getApiKey($tenantId);
        if (empty($apiKey)) {
            return [
                'success' => false,
                'message' => 'Lusha API Key belum diisi.',
            ];
        }

        try {
            // Check Lusha credentials via user/account endpoint or lightweight search
            $response = Http::withHeaders([
                'api_key' => $apiKey,
                'Content-Type' => 'application/json',
            ])
                ->timeout(10)
                ->get('https://api.lusha.com/v3/user/credits');

            if ($response->successful()) {
                $credits = $response->json('credits') ?? $response->json();
                return [
                    'success' => true,
                    'message' => 'Koneksi ke Lusha API Berhasil!',
                    'details' => $credits,
                ];
            }

            // Fallback check
            $responseFallback = Http::withHeaders([
                'api_key' => $apiKey,
                'Content-Type' => 'application/json',
            ])
                ->timeout(10)
                ->post('https://api.lusha.com/v3/contacts/search', [
                    'filters' => ['companyName' => 'Google'],
                    'pagination' => ['pageSize' => 1],
                ]);

            if ($responseFallback->successful() || $responseFallback->status() === 200) {
                return [
                    'success' => true,
                    'message' => 'Koneksi ke Lusha API Berhasil!',
                ];
            }

            return [
                'success' => false,
                'message' => "Lusha API menolak permintaan (HTTP {$responseFallback->status()}): " . ($responseFallback->json('message') ?: $responseFallback->body()),
            ];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'message' => "Gagal menghubungi Lusha API: {$e->getMessage()}",
            ];
        }
    }
}
