<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IntegrationConfig;
use Illuminate\Http\Client\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class IntegrationPlatformController extends Controller
{
    private const CATEGORY = 'lead_platforms';

    public function registry(): JsonResponse
    {
        return response()->json(['data' => array_values($this->platforms())]);
    }

    public function oauthUrl(Request $request, string $platform): JsonResponse
    {
        $definition = $this->platform($platform);
        if (! $definition || ! isset($definition['oauth'])) {
            return response()->json(['message' => 'OAuth is not available for this platform.'], 422);
        }

        $values = $this->values($request, $platform);
        $clientId = $values['client_id'] ?? null;
        $redirectUri = $values['redirect_uri'] ?? null;

        if (! $clientId || ! $redirectUri) {
            return response()->json(['message' => 'Client ID and Redirect URI are required before starting OAuth.'], 422);
        }

        $query = [
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'state' => Str::random(40),
        ];

        if (($definition['oauth']['scope_param'] ?? 'scope') !== null && ! empty($definition['oauth']['scopes'])) {
            $query[$definition['oauth']['scope_param'] ?? 'scope'] = implode($definition['oauth']['scope_separator'] ?? ' ', $definition['oauth']['scopes']);
        }

        if (! empty($definition['oauth']['extra_query'])) {
            $query = array_merge($query, $definition['oauth']['extra_query']);
        }

        return response()->json([
            'data' => [
                'authorization_url' => $definition['oauth']['authorize_url'].'?'.http_build_query($query),
                'callback_status' => 'pending_backend_exchange',
            ],
        ]);
    }

    public function test(Request $request, string $platform): JsonResponse
    {
        $definition = $this->platform($platform);
        if (! $definition) {
            return response()->json(['message' => 'Unknown integration platform.'], 404);
        }

        $values = $this->values($request, $platform);

        try {
            $result = match ($platform) {
                'facebook', 'instagram' => $this->testMeta($values),
                'tiktok' => $this->testTiktok($values),
                'youtube' => $this->testGoogleToken($values),
                'hubspot' => $this->testBearer('https://api.hubapi.com/crm/v3/objects/contacts?limit=1&archived=false', $values),
                'salesforce' => $this->testSalesforce($values),
                'pipedrive' => $this->testPipedrive($values),
                'hunter' => $this->testHunter($values),
                'zapier', 'make' => $this->validateWebhookUrl($values, $platform),
                'google_ads' => $this->validateGoogleAds($values),
                'mekari_qontak' => $this->validateRequired($values, ['access_token', 'base_url']),
                default => ['status' => 'unsupported', 'message' => 'Connection test is not implemented for this platform yet.'],
            };
        } catch (\Throwable $exception) {
            return response()->json([
                'message' => 'Connection test failed.',
                'error' => $exception->getMessage(),
            ], 502);
        }

        return response()->json(['data' => $result]);
    }

    public function preview(Request $request, string $platform): JsonResponse
    {
        $values = $this->values($request, $platform);

        try {
            $result = match ($platform) {
                'hubspot' => $this->previewBearer('https://api.hubapi.com/crm/v3/objects/contacts?limit=5&archived=false', $values, 'results'),
                'hunter' => $this->previewHunter($values),
                'pipedrive' => $this->previewPipedrive($values),
                default => ['status' => 'unsupported', 'message' => 'Preview is available after the provider-specific ingestion phase is implemented.'],
            };
        } catch (\Throwable $exception) {
            return response()->json([
                'message' => 'Preview failed.',
                'error' => $exception->getMessage(),
            ], 502);
        }

        return response()->json(['data' => $result]);
    }

    private function testMeta(array $values): array
    {
        $this->requireFields($values, ['client_id', 'client_secret', 'access_token']);

        $response = Http::timeout(15)->get('https://graph.facebook.com/v25.0/debug_token', [
            'input_token' => $values['access_token'],
            'access_token' => $values['client_id'].'|'.$values['client_secret'],
        ]);

        return $this->responseSummary($response, 'Meta token debug');
    }

    private function testTiktok(array $values): array
    {
        $this->requireFields($values, ['client_id', 'client_secret', 'access_token']);

        $response = Http::timeout(15)->get('https://business-api.tiktok.com/open_api/v1.3/oauth2/advertiser/get/', [
            'app_id' => $values['client_id'],
            'secret' => $values['client_secret'],
            'access_token' => $values['access_token'],
        ]);

        return $this->responseSummary($response, 'TikTok advertiser authorization');
    }

    private function testGoogleToken(array $values): array
    {
        $this->requireFields($values, ['access_token']);

        $response = Http::timeout(15)->get('https://oauth2.googleapis.com/tokeninfo', [
            'access_token' => $values['access_token'],
        ]);

        return $this->responseSummary($response, 'Google OAuth token');
    }

    private function testSalesforce(array $values): array
    {
        $this->requireFields($values, ['access_token', 'instance_url']);

        return $this->testBearer(rtrim($values['instance_url'], '/').'/services/oauth2/userinfo', $values);
    }

    private function testPipedrive(array $values): array
    {
        $this->requireFields($values, ['api_domain']);
        $request = Http::timeout(15);

        if (! empty($values['api_token'])) {
            $request = $request->withHeaders(['x-api-token' => $values['api_token']]);
        } elseif (! empty($values['access_token'])) {
            $request = $request->withToken($values['access_token']);
        } else {
            $this->requireFields($values, ['api_token']);
        }

        $response = $request->get(rtrim($values['api_domain'], '/').'/api/v2/users/me');

        return $this->responseSummary($response, 'Pipedrive user profile');
    }

    private function testHunter(array $values): array
    {
        $this->requireFields($values, ['api_key']);

        $response = Http::timeout(15)->get('https://api.hunter.io/v2/account', [
            'api_key' => $values['api_key'],
        ]);

        return $this->responseSummary($response, 'Hunter account');
    }

    private function validateWebhookUrl(array $values, string $platform): array
    {
        $this->requireFields($values, ['webhook_url']);

        if (! filter_var($values['webhook_url'], FILTER_VALIDATE_URL)) {
            return ['status' => 'error', 'message' => 'Webhook URL is not valid.'];
        }

        return [
            'status' => 'configured',
            'message' => ucfirst($platform).' webhook URL is configured. Live delivery is verified from the provider scenario history.',
        ];
    }

    private function validateGoogleAds(array $values): array
    {
        $required = ['google_key'];
        if (! empty($values['api_mode']) && $values['api_mode'] === 'api') {
            $required = ['developer_token', 'client_customer_id', 'access_token'];
        }

        return $this->validateRequired($values, $required);
    }

    private function validateRequired(array $values, array $fields): array
    {
        $this->requireFields($values, $fields);

        return [
            'status' => 'configured',
            'message' => 'Required credentials are present. Provider-specific live verification is handled in the next ingestion phase.',
        ];
    }

    private function previewBearer(string $url, array $values, string $itemsKey): array
    {
        $this->requireFields($values, ['access_token']);

        $response = Http::timeout(15)->withToken($values['access_token'])->get($url);
        $summary = $this->responseSummary($response, 'Preview');
        $body = $response->json();

        return $summary + ['items' => $body[$itemsKey] ?? []];
    }

    private function previewHunter(array $values): array
    {
        $this->requireFields($values, ['api_key']);

        $response = Http::timeout(15)->get('https://api.hunter.io/v2/account', [
            'api_key' => $values['api_key'],
        ]);

        return $this->responseSummary($response, 'Hunter account preview') + ['items' => [$response->json('data')]];
    }

    private function previewPipedrive(array $values): array
    {
        $this->requireFields($values, ['api_domain']);

        $request = Http::timeout(15);
        if (! empty($values['api_token'])) {
            $request = $request->withHeaders(['x-api-token' => $values['api_token']]);
        } elseif (! empty($values['access_token'])) {
            $request = $request->withToken($values['access_token']);
        }

        $response = $request->get(rtrim($values['api_domain'], '/').'/api/v2/persons', ['limit' => 5]);

        return $this->responseSummary($response, 'Pipedrive persons preview') + ['items' => $response->json('data') ?? []];
    }

    private function testBearer(string $url, array $values): array
    {
        $this->requireFields($values, ['access_token']);

        $response = Http::timeout(15)->withToken($values['access_token'])->get($url);

        return $this->responseSummary($response, 'Bearer token');
    }

    private function responseSummary(Response $response, string $label): array
    {
        return [
            'status' => $response->successful() ? 'connected' : 'error',
            'message' => $response->successful()
                ? "{$label} verified."
                : "{$label} returned HTTP {$response->status()}.",
            'http_status' => $response->status(),
            'sample' => $response->successful() ? $response->json() : null,
        ];
    }

    private function requireFields(array $values, array $fields): void
    {
        $missing = collect($fields)
            ->filter(fn (string $field): bool => empty($values[$field]))
            ->values()
            ->all();

        if ($missing !== []) {
            throw new \InvalidArgumentException('Missing required credential fields: '.implode(', ', $missing));
        }
    }

    private function values(Request $request, string $platform): array
    {
        $tenantId = $this->currentTenantId($request);
        $prefix = Str::upper($platform).'_';

        return IntegrationConfig::query()
            ->where('category', self::CATEGORY)
            ->where('key', 'like', $prefix.'%')
            ->where(function ($query) use ($tenantId) {
                $query->whereNull('tenant_id');

                if ($tenantId !== null) {
                    $query->orWhere('tenant_id', $tenantId);
                }
            })
            ->get()
            ->sortBy(fn (IntegrationConfig $config) => $config->tenant_id === $tenantId ? 0 : 1)
            ->groupBy('key')
            ->map(fn ($rows) => $rows->first()->value)
            ->mapWithKeys(function ($value, string $key) use ($prefix) {
                return [Str::lower(Str::after($key, $prefix)) => $value];
            })
            ->all();
    }

    private function platform(string $platform): ?array
    {
        return $this->platforms()[$platform] ?? null;
    }

    private function currentTenantId(Request $request): ?int
    {
        return $request->user()?->tenant_id
            ?? auth('sanctum')->user()?->tenant_id;
    }

    private function platforms(): array
    {
        return [
            'facebook' => [
                'id' => 'facebook',
                'name' => 'Facebook Lead Ads',
                'docs_url' => 'https://developers.facebook.com/docs/marketing-api/guides/lead-ads/',
                'oauth' => [
                    'authorize_url' => 'https://www.facebook.com/v25.0/dialog/oauth',
                    'scopes' => ['pages_show_list', 'pages_read_engagement', 'leads_retrieval', 'business_management'],
                ],
            ],
            'instagram' => [
                'id' => 'instagram',
                'name' => 'Instagram Graph API',
                'docs_url' => 'https://developers.facebook.com/docs/instagram-api/',
                'oauth' => [
                    'authorize_url' => 'https://www.facebook.com/v25.0/dialog/oauth',
                    'scopes' => ['instagram_basic', 'instagram_manage_messages', 'pages_show_list', 'pages_read_engagement', 'business_management'],
                ],
            ],
            'tiktok' => [
                'id' => 'tiktok',
                'name' => 'TikTok Business API',
                'docs_url' => 'https://business-api.tiktok.com/portal/docs',
                'oauth' => [
                    'authorize_url' => 'https://ads.tiktok.com/marketing_api/auth',
                    'scopes' => [],
                ],
            ],
            'youtube' => [
                'id' => 'youtube',
                'name' => 'YouTube Analytics',
                'docs_url' => 'https://developers.google.com/youtube/reporting/guides/authorization',
                'oauth' => [
                    'authorize_url' => 'https://accounts.google.com/o/oauth2/v2/auth',
                    'scopes' => ['https://www.googleapis.com/auth/yt-analytics.readonly', 'https://www.googleapis.com/auth/youtube.readonly'],
                    'extra_query' => ['access_type' => 'offline', 'prompt' => 'consent'],
                ],
            ],
            'linkedin' => [
                'id' => 'linkedin',
                'name' => 'LinkedIn Marketing',
                'docs_url' => 'https://learn.microsoft.com/en-us/linkedin/marketing/lead-sync/leadsync?view=li-lms-2026-05',
                'oauth' => [
                    'authorize_url' => 'https://www.linkedin.com/oauth/v2/authorization',
                    'scopes' => ['r_ads', 'r_marketing_leadgen_automation'],
                ],
            ],
            'hubspot' => [
                'id' => 'hubspot',
                'name' => 'HubSpot CRM',
                'docs_url' => 'https://developers.hubspot.com/docs/api/intro-to-auth',
                'oauth' => [
                    'authorize_url' => 'https://app.hubspot.com/oauth/authorize',
                    'scopes' => ['crm.objects.contacts.read', 'crm.objects.contacts.write'],
                ],
            ],
            'salesforce' => [
                'id' => 'salesforce',
                'name' => 'Salesforce',
                'docs_url' => 'https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_flows.htm',
                'oauth' => [
                    'authorize_url' => 'https://login.salesforce.com/services/oauth2/authorize',
                    'scopes' => ['api', 'refresh_token'],
                ],
            ],
            'pipedrive' => [
                'id' => 'pipedrive',
                'name' => 'Pipedrive',
                'docs_url' => 'https://pipedrive.readme.io/docs/core-api-concepts-authentication',
                'oauth' => [
                    'authorize_url' => 'https://oauth.pipedrive.com/oauth/authorize',
                    'scopes' => [],
                ],
            ],
            'google_ads' => [
                'id' => 'google_ads',
                'name' => 'Google Ads Lead Forms',
                'docs_url' => 'https://developers.google.com/google-ads/webhook/docs/implementation',
            ],
            'mekari_qontak' => [
                'id' => 'mekari_qontak',
                'name' => 'Mekari Qontak',
                'docs_url' => 'https://docs.qontak.com/',
            ],
            'zapier' => [
                'id' => 'zapier',
                'name' => 'Zapier Webhooks',
                'docs_url' => 'https://help.zapier.com/hc/en-us/articles/8496288690317-Trigger-Zaps-from-webhooks',
            ],
            'make' => [
                'id' => 'make',
                'name' => 'Make Webhooks',
                'docs_url' => 'https://apps.make.com/gateway',
            ],
            'hunter' => [
                'id' => 'hunter',
                'name' => 'Hunter.io',
                'docs_url' => 'https://help.hunter.io/en/articles/1970956-hunter-api',
            ],
        ];
    }
}
