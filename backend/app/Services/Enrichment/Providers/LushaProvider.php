<?php

namespace App\Services\Enrichment\Providers;

use App\Contracts\ContactEnrichmentProviderInterface;
use Illuminate\Support\Facades\Log;

class LushaProvider implements ContactEnrichmentProviderInterface
{
    private bool $enabled;
    private string $apiKey;

    public function __construct()
    {
        // Typically read from the dynamic IntegrationConfig service in real life
        $this->enabled = config('services.lusha.enabled', true);
        $this->apiKey = config('services.lusha.key', 'mock_key');
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
        Log::info("[LushaProvider] Querying Lusha Endpoint for {$companyName} ({$domain})");

        // Real integration: Http::withToken($this->apiKey)->post('api.lusha.com/v2/person/search', [...])
        // Here we mock a standard 50% hit density response format for Development verification.
        return [
            [
                'first_name' => 'John',
                'last_name' => 'Doe',
                'job_title' => 'Director of Sales',
                'email' => 'john.doe@' . ($domain ?: 'example.com'),
                'phoneNumbers' => [['number' => '+12345678901']],
                'confidence' => 90
            ],
            [
                'first_name' => 'Jane',
                'last_name' => 'Smith',
                'job_title' => 'VP of Operations',
                'email' => 'jane.smith@' . ($domain ?: 'example.com'),
                'phoneNumbers' => [['number' => '+19876543210']],
                'confidence' => 85
            ]
        ];
    }
}
