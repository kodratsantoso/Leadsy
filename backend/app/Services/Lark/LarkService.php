<?php

namespace App\Services\Lark;

use App\Models\LarkIntegration;
use Exception;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class LarkService
{
    protected LarkIntegration $integration;

    protected string $baseUrl = 'https://open.larksuite.com/open-apis';

    protected array $openApiBaseUrls = [];

    protected ?string $accessToken = null;

    protected ?string $authError = null;

    public function __construct(LarkIntegration $integration)
    {
        $this->integration = $integration;
        $this->openApiBaseUrls = $this->resolveOpenApiBaseUrls();
        $this->baseUrl = $this->openApiBaseUrls[0];
        $this->initializeAccessToken();
    }

    protected function resolveOpenApiBaseUrls(): array
    {
        $configured = env('LARK_OPEN_API_BASE_URLS', env('LARK_OPEN_API_BASE_URL'));
        $urls = $configured
            ? array_map('trim', explode(',', $configured))
            : [
                'https://open.larksuite.com/open-apis',
                'https://open.larkoffice.com/open-apis',
            ];

        return array_values(array_filter(array_map(
            fn (string $url) => rtrim($url, '/'),
            $urls
        )));
    }

    /**
     * Initialize access token from integration config
     */
    private function initializeAccessToken(): void
    {
        try {
            try {
                $appSecret = decrypt($this->integration->app_secret_encrypted);
            } catch (DecryptException $e) {
                throw new Exception('Stored Lark App Secret cannot be decrypted. Re-enter the App Secret and save the configuration.');
            }

            $this->accessToken = $this->getAccessToken($appSecret);
        } catch (Exception $e) {
            $this->authError = $e->getMessage();
            Log::error('Failed to initialize Lark access token', [
                'integration_id' => $this->integration->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Get access token from Lark API
     */
    protected function getAccessToken(string $appSecret): string
    {
        try {
            $appId = $this->integration->app_id;

            $lastError = null;

            foreach ($this->openApiBaseUrls as $baseUrl) {
                try {
                    $response = Http::withHeaders([
                        'Content-Type' => 'application/json; charset=utf-8',
                    ])->post($baseUrl.'/auth/v3/tenant_access_token/internal', [
                        'app_id' => $appId,
                        'app_secret' => $appSecret,
                    ]);

                    if (! $response->successful()) {
                        throw new Exception('Failed to get Lark access token: '.$response->body());
                    }

                    $data = $response->json();

                    if ((string) ($data['code'] ?? '1') !== '0') {
                        throw new Exception('Lark API error: '.($data['msg'] ?? 'Unknown error'));
                    }

                    $this->baseUrl = $baseUrl;

                    return $data['tenant_access_token'];
                } catch (Exception $e) {
                    $lastError = $e;
                    Log::warning('Lark tenant token endpoint failed', [
                        'base_url' => $baseUrl,
                        'app_id' => $this->integration->app_id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            throw $lastError ?: new Exception('Unable to retrieve Lark tenant access token');
        } catch (Exception $e) {
            Log::error('Error getting Lark access token', [
                'app_id' => $this->integration->app_id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Make authenticated request to Lark API
     */
    protected function request(
        string $method,
        string $endpoint,
        array $data = [],
        array $query = []
    ) {
        try {
            if (! $this->accessToken) {
                throw new Exception('Access token not available');
            }

            $url = $this->baseUrl.'/'.ltrim($endpoint, '/');

            $pending = Http::withHeaders([
                'Authorization' => 'Bearer '.$this->accessToken,
                'Content-Type' => 'application/json; charset=utf-8',
            ]);

            if ($method === 'GET') {
                $response = $pending->get($url, $query);
            } elseif ($method === 'POST') {
                $response = $pending->post($url, $data);
            } elseif ($method === 'PUT') {
                $response = $pending->put($url, $data);
            } elseif ($method === 'DELETE') {
                $response = $pending->delete($url);
            } else {
                throw new Exception('Unsupported Lark API method: '.$method);
            }

            if (! $response->successful()) {
                throw new Exception('Lark API error: '.$response->body());
            }

            $result = $response->json();

            if (($result['code'] ?? 1) !== 0) {
                throw new Exception('Lark API returned error: '.($result['msg'] ?? 'Unknown error'));
            }

            return $result['data'] ?? $result;
        } catch (Exception $e) {
            Log::error('Lark API request failed', [
                'method' => $method,
                'endpoint' => $endpoint,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Test connection to Lark
     */
    public function testConnection(): array
    {
        try {
            if (! $this->accessToken) {
                return [
                    'success' => false,
                    'error' => $this->authError ?: 'Unable to retrieve Lark tenant access token',
                ];
            }

            return ['success' => true, 'message' => 'Lark tenant access token retrieved successfully'];
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Update sync status
     */
    public function updateSyncStatus(string $status, ?string $message = null): void
    {
        $this->integration->update([
            'last_sync_at' => now(),
            'sync_status' => $message ?? $status,
        ]);
    }

    /**
     * Get access token for external use
     */
    public function getToken(): ?string
    {
        return $this->accessToken;
    }

    /**
     * Set custom base URL (for testing or different endpoints)
     */
    public function setBaseUrl(string $url): self
    {
        $this->baseUrl = $url;

        return $this;
    }
}
