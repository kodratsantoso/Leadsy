<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IntegrationConfig;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class IntegrationConfigController extends Controller
{
    private function currentTenantId(Request $request): ?int
    {
        return $request->user()?->tenant_id
            ?? auth('sanctum')->user()?->tenant_id;
    }

    /**
     * Return all active settings securely (masked if secret).
     * Grouped by category for easier frontend ingestion.
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = $this->currentTenantId($request);

        $configs = IntegrationConfig::query()
            ->where(function ($query) use ($tenantId) {
                $query->whereNull('tenant_id');

                if ($tenantId !== null) {
                    $query->orWhere('tenant_id', $tenantId);
                }
            })
            ->orderBy('category')
            ->orderBy('key')
            ->get()
            ->map(function ($config) {
                return [
                    'id' => $config->id,
                    'category' => $config->category,
                    'key' => $config->key,
                    'value' => $config->safe_value,
                    'is_secret' => $config->is_secret,
                    'is_active' => $config->is_active,
                    'value_type' => $config->value_type,
                ];
            });

        $grouped = $configs->groupBy('category');

        return response()->json(['data' => $grouped]);
    }

    /**
     * Public endpoint to grab safe/browser-facing keys (e.g., Google Maps Browser Key).
     * Also returns APP_NAME and APP_ENV for the environment page.
     */
    public function publicSettings(Request $request): JsonResponse
    {
        $publicKeys = [
            'GOOGLE_MAPS_ENABLED',
            'GOOGLE_MAPS_BROWSER_API_KEY',
            'GOOGLE_MAPS_DEFAULT_CENTER_LAT',
            'GOOGLE_MAPS_DEFAULT_CENTER_LNG',
        ];

        $tenantId = $this->currentTenantId($request);

        $configs = IntegrationConfig::whereIn('key', $publicKeys)
            ->where(function ($query) use ($tenantId) {
                $query->whereNull('tenant_id');

                if ($tenantId !== null) {
                    $query->orWhere('tenant_id', $tenantId);
                }
            })
            ->where('is_active', true)
            ->get()
            ->sortBy(fn ($config) => $config->tenant_id === $tenantId ? 0 : 1)
            ->groupBy('key')
            ->map(fn ($rows) => $rows->first()->value);

        // Augment with runtime environment values (not stored in DB)
        $configs['APP_NAME'] = config('app.name', 'Leadsy');
        $configs['APP_ENV'] = config('app.env', 'production');

        return response()->json(['data' => $configs]);
    }

    public function googlePermissions(Request $request): JsonResponse
    {
        $tenantId = $this->currentTenantId($request);
        $apiKey = $this->integrationValue([
            'GOOGLE_MAPS_BROWSER_API_KEY',
            'GOOGLE_SEARCH_API_KEY',
            'GOOGLE_CUSTOM_SEARCH_API_KEY',
        ], $tenantId);
        $searchApiKey = $this->integrationValue([
            'GOOGLE_SEARCH_API_KEY',
            'GOOGLE_CUSTOM_SEARCH_API_KEY',
            'GOOGLE_MAPS_BROWSER_API_KEY',
        ], $tenantId);
        $searchEngineId = $this->integrationValue([
            'GOOGLE_SEARCH_ENGINE_ID',
            'GOOGLE_CUSTOM_SEARCH_ENGINE_ID',
            'GOOGLE_CSE_ID',
        ], $tenantId);

        $saEmail = $this->integrationValue(['GOOGLE_SEARCH_SERVICE_ACCOUNT_EMAIL'], $tenantId);
        $saPrivateKey = $this->integrationValue(['GOOGLE_SEARCH_SERVICE_ACCOUNT_PRIVATE_KEY'], $tenantId);
        $saProjectId = $this->integrationValue(['GOOGLE_SEARCH_SERVICE_ACCOUNT_PROJECT_ID'], $tenantId);

        $vectorEnabled = $this->integrationValue(['VERTEX_AI_VECTOR_SEARCH_ENABLED'], $tenantId) === 'true';
        $vectorEndpoint = $this->integrationValue(['VERTEX_AI_VECTOR_SEARCH_API_ENDPOINT'], $tenantId);
        $vectorLocation = $this->integrationValue(['VERTEX_AI_VECTOR_SEARCH_LOCATION'], $tenantId);
        $vectorIndexEndpointId = $this->integrationValue(['VERTEX_AI_VECTOR_SEARCH_INDEX_ENDPOINT_ID'], $tenantId);
        $vectorDeployedIndexId = $this->integrationValue(['VERTEX_AI_VECTOR_SEARCH_DEPLOYED_INDEX_ID'], $tenantId);

        $permissions = [];

        // 1. Maps Javascript
        $permissions[] = $apiKey
            ? $this->checkGoogleMapsJavascript($apiKey)
            : [
                'id' => 'maps_javascript',
                'label' => 'Maps JavaScript API',
                'description' => 'Used for rendering interactive maps in browser pages.',
                'status' => 'not_configured',
                'message' => 'Google API key is not configured.',
            ];

        // 2. Geocoding
        $permissions[] = $apiKey
            ? $this->checkGoogleJsonApi(
                'geocoding',
                'Geocoding API',
                'Used to convert area names into map coordinates for territory discovery.',
                'https://maps.googleapis.com/maps/api/geocode/json',
                ['address' => 'Jakarta, Indonesia', 'key' => $apiKey]
            )
            : [
                'id' => 'geocoding',
                'label' => 'Geocoding API',
                'description' => 'Used to convert area names into map coordinates for territory discovery.',
                'status' => 'not_configured',
                'message' => 'Google API key is not configured.',
            ];

        // 3. Places
        $permissions[] = $apiKey
            ? $this->checkGoogleJsonApi(
                'places',
                'Places API',
                'Used by Lead Discovery to search business places and retrieve place details.',
                'https://maps.googleapis.com/maps/api/place/textsearch/json',
                ['query' => 'Jakarta business', 'key' => $apiKey]
            )
            : [
                'id' => 'places',
                'label' => 'Places API',
                'description' => 'Used by Lead Discovery to search business places and retrieve place details.',
                'status' => 'not_configured',
                'message' => 'Google API key is not configured.',
            ];

        // 4. Custom Search
        $permissions[] = ($searchApiKey || $apiKey)
            ? $this->checkCustomSearch($searchApiKey ?: $apiKey, $searchEngineId)
            : [
                'id' => 'custom_search',
                'label' => 'Custom Search JSON API',
                'description' => 'Used by Search by Google to find public LinkedIn profile results.',
                'status' => 'not_configured',
                'message' => 'Google Search API key or shared key is not configured.',
            ];

        // 5. Vertex AI Vector Search
        $permissions[] = $this->checkVertexAiVectorSearch(
            $saEmail,
            $saPrivateKey,
            $saProjectId,
            $vectorEnabled,
            $vectorEndpoint,
            $vectorLocation,
            $vectorIndexEndpointId,
            $vectorDeployedIndexId
        );

        return response()->json([
            'data' => [
                'api_key_present' => (bool) $apiKey,
                'search_engine_id_present' => (bool) $searchEngineId,
                'checked_at' => now()->toIso8601String(),
                'permissions' => $permissions,
            ],
        ]);
    }

    /**
     * Upsert a single integration config entry.
     * Accepts either a single object OR bulk { category, configs[] } format.
     */
    public function store(Request $request): JsonResponse
    {
        // Detect single-item format (key + value + category at root level)
        if ($request->has('key') && ! $request->has('configs')) {
            $data = $request->validate([
                'key' => 'required|string',
                'value' => 'nullable',
                'category' => 'required|string',
                'is_secret' => 'nullable|boolean',
                'value_type' => 'nullable|string',
                'is_active' => 'nullable|boolean',
            ]);

            $tenantId = $this->currentTenantId($request);
            $existing = IntegrationConfig::where('key', $data['key'])
                ->where('tenant_id', $tenantId)
                ->first();

            // Skip secret if masked value passed back
            if ($existing && $existing->is_secret) {
                if (empty($data['value']) || str_starts_with((string) $data['value'], '••••')) {
                    if (isset($data['is_active'])) {
                        $existing->update(['is_active' => $data['is_active']]);
                    }

                    return response()->json(['message' => 'Secret unchanged', 'data' => $existing]);
                }
            }

            $originalValues = $existing ? $existing->getAttributes() : [];

            $model = IntegrationConfig::updateOrCreate(
                ['tenant_id' => $tenantId, 'key' => $data['key']],
                [
                    'tenant_id' => $tenantId,
                    'category' => $data['category'],
                    'value' => $data['value'],
                    'is_secret' => $data['is_secret'] ?? ($existing->is_secret ?? false),
                    'value_type' => $data['value_type'] ?? ($existing->value_type ?? 'string'),
                    'is_active' => $data['is_active'] ?? true,
                ]
            );

            $existing
                ? AuditService::logUpdated('integration_configs', $model, $originalValues)
                : AuditService::logCreated('integration_configs', $model);

            return response()->json(['message' => 'Setting saved', 'data' => $model], 201);
        }

        // Bulk format: { category, configs: [{key, value, ...}] }
        $data = $request->validate([
            'category' => 'required|string',
            'configs' => 'required|array',
            'configs.*.key' => 'required|string',
            'configs.*.value' => 'nullable',
            'configs.*.is_secret' => 'nullable|boolean',
            'configs.*.value_type' => 'nullable|string',
            'configs.*.is_active' => 'nullable|boolean',
        ]);

        $category = $data['category'];
        $updated = [];

        foreach ($data['configs'] as $conf) {
            $tenantId = $this->currentTenantId($request);
            $existing = IntegrationConfig::where('key', $conf['key'])
                ->where('tenant_id', $tenantId)
                ->first();

            if ($existing && $existing->is_secret) {
                if (empty($conf['value']) || str_starts_with((string) $conf['value'], '••••')) {
                    if (isset($conf['is_active'])) {
                        $existing->update(['is_active' => $conf['is_active']]);
                        $updated[] = $existing;
                    }

                    continue;
                }
            }

            $originalValues = $existing ? $existing->getAttributes() : [];

            $model = IntegrationConfig::updateOrCreate(
                ['tenant_id' => $tenantId, 'key' => $conf['key']],
                [
                    'tenant_id' => $tenantId,
                    'category' => $category,
                    'value' => $conf['value'],
                    'is_secret' => $conf['is_secret'] ?? ($existing->is_secret ?? false),
                    'value_type' => $conf['value_type'] ?? ($existing->value_type ?? 'string'),
                    'is_active' => $conf['is_active'] ?? true,
                ]
            );

            $existing
                ? AuditService::logUpdated('integration_configs', $model, $originalValues)
                : AuditService::logCreated('integration_configs', $model);

            $updated[] = $model;
        }

        return response()->json(['message' => 'Settings updated successfully', 'data' => $updated]);
    }

    /**
     * Delete a single integration config entry.
     */
    public function destroy(IntegrationConfig $integrationConfig): JsonResponse
    {
        AuditService::logDeleted('integration_configs', $integrationConfig);
        $integrationConfig->delete();

        return response()->json(null, 204);
    }

    private function googlePermissionDefinitions()
    {
        return collect([
            [
                'id' => 'maps_javascript',
                'label' => 'Maps JavaScript API',
                'description' => 'Used for rendering interactive maps in browser pages.',
            ],
            [
                'id' => 'geocoding',
                'label' => 'Geocoding API',
                'description' => 'Used to convert area names into map coordinates for territory discovery.',
            ],
            [
                'id' => 'places',
                'label' => 'Places API',
                'description' => 'Used by Lead Discovery to search business places and retrieve place details.',
            ],
            [
                'id' => 'custom_search',
                'label' => 'Custom Search JSON API',
                'description' => 'Used by Search by Google to find public LinkedIn profile results.',
            ],
            [
                'id' => 'vertex_ai_vector_search',
                'label' => 'Vertex AI Vector Search',
                'description' => 'Used for high-performance approximate nearest neighbor (ANN) vector searches.',
            ],
        ]);
    }

    private function checkGoogleMapsJavascript(string $apiKey): array
    {
        $base = [
            'id' => 'maps_javascript',
            'label' => 'Maps JavaScript API',
            'description' => 'Used for rendering interactive maps in browser pages.',
        ];

        try {
            $response = Http::timeout(12)->get('https://maps.googleapis.com/maps/api/js', [
                'key' => $apiKey,
                'callback' => '__leadsyGooglePermissionCheck',
            ]);
            $body = (string) $response->body();

            if ($response->successful() && ! str_contains($body, 'Google Maps JavaScript API error')) {
                return $base + ['status' => 'available', 'message' => 'API accepted this key.'];
            }

            return $base + $this->googleDeniedStatus($body ?: 'Maps JavaScript API rejected this key.');
        } catch (\Throwable $exception) {
            return $base + ['status' => 'unknown', 'message' => $exception->getMessage()];
        }
    }

    private function checkGoogleJsonApi(string $id, string $label, string $description, string $url, array $params): array
    {
        $base = compact('id', 'label', 'description');

        try {
            $response = Http::timeout(12)->get($url, $params);
            $json = $response->json();
            $status = $json['status'] ?? null;

            if ($response->successful() && in_array($status, ['OK', 'ZERO_RESULTS'], true)) {
                return $base + ['status' => 'available', 'message' => 'API accepted this key.'];
            }

            return $base + $this->googleDeniedStatus((string) ($json['error_message'] ?? $status ?? $response->body()));
        } catch (\Throwable $exception) {
            return $base + ['status' => 'unknown', 'message' => $exception->getMessage()];
        }
    }

    private function checkCustomSearch(string $apiKey, ?string $searchEngineId): array
    {
        $base = [
            'id' => 'custom_search',
            'label' => 'Custom Search JSON API',
            'description' => 'Used by Search by Google to find public LinkedIn profile results.',
        ];

        if (! $searchEngineId) {
            return $base + [
                'status' => 'not_configured',
                'message' => 'GOOGLE_SEARCH_ENGINE_ID is required to test and use Custom Search.',
            ];
        }

        try {
            $response = Http::timeout(12)->get('https://customsearch.googleapis.com/customsearch/v1', [
                'key' => $apiKey,
                'cx' => $searchEngineId,
                'q' => 'site:linkedin.com/in',
                'num' => 1,
            ]);

            if ($response->successful()) {
                return $base + ['status' => 'available', 'message' => 'API accepted this key and search engine ID.'];
            }

            return $base + $this->googleDeniedStatus((string) ($response->json('error.message') ?: $response->body()));
        } catch (\Throwable $exception) {
            return $base + ['status' => 'unknown', 'message' => $exception->getMessage()];
        }
    }

    private function googleDeniedStatus(string $message): array
    {
        $lower = strtolower($message);
        $status = match (true) {
            str_contains($lower, 'referer') || str_contains($lower, 'referrer') || str_contains($lower, 'restriction') => 'restricted',
            str_contains($lower, 'not authorized') || str_contains($lower, 'not enabled') || str_contains($lower, 'api has not been used') => 'not_enabled',
            str_contains($lower, 'invalid') || str_contains($lower, 'api key not valid') => 'invalid_key',
            default => 'not_available',
        };

        return [
            'status' => $status,
            'message' => $message ?: 'Google API rejected this key.',
        ];
    }

    private function integrationValue(array $keys, ?int $tenantId): ?string
    {
        foreach ($keys as $key) {
            $envValue = env($key);
            if (is_string($envValue) && trim($envValue) !== '') {
                return trim($envValue);
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

    private function checkVertexAiVectorSearch(
        ?string $saEmail,
        ?string $saPrivateKey,
        ?string $saProjectId,
        bool $enabled,
        ?string $endpoint,
        ?string $location,
        ?string $indexEndpointId,
        ?string $deployedIndexId
    ): array {
        $base = [
            'id' => 'vertex_ai_vector_search',
            'label' => 'Vertex AI Vector Search',
            'description' => 'Used for high-performance approximate nearest neighbor (ANN) vector searches.',
        ];

        if (! $enabled) {
            return $base + [
                'status' => 'not_configured',
                'message' => 'Vertex AI Vector Search is currently disabled.',
            ];
        }

        if (! $saEmail || ! $saPrivateKey || ! $saProjectId) {
            return $base + [
                'status' => 'not_configured',
                'message' => 'Google Service Account credentials (Email, Private Key, Project ID) are required to authenticate with Vertex AI Vector Search.',
            ];
        }

        if (! $endpoint || ! $location || ! $indexEndpointId || ! $deployedIndexId) {
            return $base + [
                'status' => 'not_configured',
                'message' => 'Endpoint, Location, Index Endpoint ID, and Deployed Index ID are required to verify Vector Search.',
            ];
        }

        // Get Access Token
        $accessToken = $this->getGoogleAccessToken($saEmail, $saPrivateKey);
        if (! $accessToken) {
            return $base + [
                'status' => 'invalid_key',
                'message' => 'Failed to generate OAuth 2.0 access token using the Service Account credentials. Verify Email and Private Key.',
            ];
        }

        // Make query call
        // Ensure endpoint does not have prefix path, but must have scheme if needed.
        $cleanEndpoint = preg_replace('#^https?://#', '', trim($endpoint));
        $url = "https://{$cleanEndpoint}/v1/projects/{$saProjectId}/locations/{$location}/indexEndpoints/{$indexEndpointId}:findNeighbors";

        try {
            // Send request with an empty query vector
            $response = Http::timeout(12)
                ->withToken($accessToken)
                ->post($url, [
                    'deployed_index_id' => $deployedIndexId,
                    'queries' => [
                        [
                            'datapoint' => [
                                'datapoint_id' => 'ping_check_id',
                                'feature_vector' => array_fill(0, 128, 0.0),
                            ],
                            'neighbor_count' => 1,
                        ],
                    ],
                ]);

            $status = $response->status();
            $body = $response->json();

            if ($response->successful()) {
                return $base + [
                    'status' => 'available',
                    'message' => 'API accepted the access token and connected to the Deployed Index.',
                ];
            }

            // If we got a 400 Bad Request with a dimension mismatch, it still means authentication and connectivity worked!
            $errorMsg = $response->json('error.message') ?: $response->body();
            if ($status === 400 && (str_contains(strtolower($errorMsg), 'dimension') || str_contains(strtolower($errorMsg), 'mismatch'))) {
                return $base + [
                    'status' => 'available',
                    'message' => 'Connected successfully! API authenticated the credentials (returned dimension validation: '.$errorMsg.').',
                ];
            }

            if ($status === 401 || $status === 403) {
                return $base + [
                    'status' => 'restricted',
                    'message' => 'Authentication rejected: '.$errorMsg,
                ];
            }

            if ($status === 404) {
                return $base + [
                    'status' => 'not_enabled',
                    'message' => 'Resource not found. Verify Project ID, Location, Index Endpoint ID, and Deployed Index ID: '.$errorMsg,
                ];
            }

            return $base + [
                'status' => 'not_available',
                'message' => 'API call returned HTTP '.$status.': '.$errorMsg,
            ];

        } catch (\Throwable $exception) {
            return $base + [
                'status' => 'unknown',
                'message' => 'Connection failed: '.$exception->getMessage(),
            ];
        }
    }

    private function getGoogleAccessToken(string $clientEmail, string $privateKey): ?string
    {
        try {
            $header = json_encode(['alg' => 'RS256', 'typ' => 'JWT']);
            $now = time();
            $claimSet = json_encode([
                'iss' => $clientEmail,
                'scope' => 'https://www.googleapis.com/auth/cloud-platform',
                'aud' => 'https://oauth2.googleapis.com/token',
                'exp' => $now + 3600,
                'iat' => $now,
            ]);

            $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
            $base64UrlClaimSet = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($claimSet));

            $signatureInput = $base64UrlHeader.'.'.$base64UrlClaimSet;

            // Load private key
            $pkeyId = openssl_pkey_get_private($privateKey);
            if (! $pkeyId) {
                return null;
            }

            openssl_sign($signatureInput, $signature, $pkeyId, OPENSSL_ALGO_SHA256);
            openssl_free_key($pkeyId);

            $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
            $jwt = $signatureInput.'.'.$base64UrlSignature;

            $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt,
            ]);

            if ($response->successful()) {
                return $response->json('access_token');
            }

            return null;
        } catch (\Throwable $e) {
            return null;
        }
    }
}
