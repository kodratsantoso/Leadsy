<?php

namespace App\Services\Enrichment\Providers;

use App\Contracts\ContactEnrichmentProviderInterface;
use App\Models\IntegrationConfig;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class LushaProvider implements ContactEnrichmentProviderInterface
{
    private bool $enabled;
    private string $apiKey;

    public function __construct()
    {
        $this->enabled  = (bool) (IntegrationConfig::where('key', 'LUSHA_ENABLED')->first()?->value ?? false);
        $this->apiKey   = (string) (IntegrationConfig::where('key', 'LUSHA_API_KEY')->first()?->value ?? '');
    }

    public function isEnabled(): bool
    {
        return $this->enabled;
    }

    public function getIdentifier(): string
    {
        return 'LUSHA';
    }

    public function searchContacts(string $companyName, ?string $domain): array
    {
        Log::info("[LushaProvider] Querying contacts for {$companyName} ({$domain})");

        // Use real API if a real key is configured, otherwise use mock data
        if (!empty($this->apiKey) && $this->apiKey !== 'mock_key') {
            return $this->liveSearch($companyName, $domain);
        }

        return $this->mockResponse($domain);
    }

    private function liveSearch(string $companyName, ?string $domain): array
    {
        try {
            $response = Http::withHeaders([
                'api_key'      => $this->apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(10)->post('https://api.lusha.com/v2/company/contacts', [
                'company' => $companyName,
                'domain'  => $domain,
            ]);

            if (!$response->successful()) {
                Log::warning("[LushaProvider] API returned {$response->status()} for {$domain}");
                return [];
            }

            return $this->normalizeResponse($response->json());

        } catch (\Throwable $e) {
            Log::error("[LushaProvider] HTTP call failed: " . $e->getMessage());
            return [];
        }
    }

    private function normalizeResponse(array $data): array
    {
        $contacts = $data['contacts'] ?? $data['data'] ?? [];

        return collect($contacts)->map(function ($c) {
            $phones = $c['phone_numbers'] ?? $c['phones'] ?? [];
            return [
                'first_name'   => $c['first_name'] ?? '',
                'last_name'    => $c['last_name']  ?? '',
                'job_title'    => $c['job_title']  ?? $c['title'] ?? null,
                'email'        => $c['email']       ?? ($c['emails'][0] ?? null),
                'phoneNumbers' => collect($phones)->map(fn($p) => [
                    'number' => is_array($p) ? ($p['number'] ?? $p['value'] ?? '') : $p,
                ])->toArray(),
                'confidence'   => $c['confidence']  ?? 75,
            ];
        })->filter(fn($c) => !empty($c['first_name']) || !empty($c['last_name']))->values()->toArray();
    }

    private function mockResponse(?string $domain): array
    {
        Log::info("[LushaProvider] Using mock contacts for {$domain} — configure LUSHA_API_KEY for live data");
        return [
            [
                'first_name'   => 'John',
                'last_name'    => 'Doe',
                'job_title'    => 'Director of Sales',
                'email'        => 'john.doe@' . ($domain ?: 'example.com'),
                'phoneNumbers' => [['number' => '+12345678901']],
                'confidence'   => 90,
            ],
            [
                'first_name'   => 'Jane',
                'last_name'    => 'Smith',
                'job_title'    => 'VP of Operations',
                'email'        => 'jane.smith@' . ($domain ?: 'example.com'),
                'phoneNumbers' => [['number' => '+19876543210']],
                'confidence'   => 85,
            ],
        ];
    }
}
