<?php

namespace Tests\Feature;

use App\Http\Middleware\CheckPermission;
use App\Models\IntegrationConfig;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class IntegrationPlatformApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_hunter_connection_test_uses_configured_api_key(): void
    {
        $this->withoutMiddleware(CheckPermission::class);
        Http::fake([
            'api.hunter.io/v2/account*' => Http::response([
                'data' => ['email' => 'ops@example.com', 'calls' => ['used' => 1]],
            ]),
        ]);

        $user = $this->makeUser();
        IntegrationConfig::create([
            'tenant_id' => $user->tenant_id,
            'category' => 'lead_platforms',
            'key' => 'HUNTER_API_KEY',
            'value' => 'hunter-secret',
            'is_secret' => true,
            'value_type' => 'string',
            'is_active' => true,
        ]);

        $this->actingAs($user)
            ->postJson('/api/settings/integration-platforms/hunter/test')
            ->assertOk()
            ->assertJsonPath('data.status', 'connected');

        Http::assertSent(fn ($request) => $request->url() === 'https://api.hunter.io/v2/account?api_key=hunter-secret');
    }

    public function test_webhook_platform_connection_test_validates_url_without_calling_provider(): void
    {
        $this->withoutMiddleware(CheckPermission::class);

        $user = $this->makeUser();
        IntegrationConfig::create([
            'tenant_id' => $user->tenant_id,
            'category' => 'lead_platforms',
            'key' => 'ZAPIER_WEBHOOK_URL',
            'value' => 'https://hooks.zapier.com/hooks/catch/123/example/',
            'is_secret' => true,
            'value_type' => 'string',
            'is_active' => true,
        ]);

        $this->actingAs($user)
            ->postJson('/api/settings/integration-platforms/zapier/test')
            ->assertOk()
            ->assertJsonPath('data.status', 'configured');
    }

    public function test_oauth_url_requires_client_id_and_redirect_uri(): void
    {
        $this->withoutMiddleware(CheckPermission::class);

        $user = $this->makeUser();

        $this->actingAs($user)
            ->postJson('/api/settings/integration-platforms/hubspot/oauth-url')
            ->assertStatus(422);
    }

    public function test_google_ads_oauth_url_uses_adwords_scope(): void
    {
        $this->withoutMiddleware(CheckPermission::class);

        $user = $this->makeUser();
        $this->saveConfig($user, 'GOOGLE_ADS_CLIENT_ID', 'google-client-id.apps.googleusercontent.com');
        $this->saveConfig($user, 'GOOGLE_ADS_REDIRECT_URI', 'https://example.test/oauth/google-ads/callback');

        $response = $this->actingAs($user)
            ->postJson('/api/settings/integration-platforms/google_ads/oauth-url')
            ->assertOk();

        $url = $response->json('data.authorization_url');
        $this->assertStringContainsString('accounts.google.com/o/oauth2/v2/auth', $url);
        $this->assertStringContainsString(rawurlencode('https://www.googleapis.com/auth/adwords'), $url);
        $this->assertStringContainsString('access_type=offline', $url);
        $this->assertStringContainsString('prompt=consent', $url);
    }

    public function test_google_ads_connection_refreshes_token_and_lists_accessible_customers(): void
    {
        $this->withoutMiddleware(CheckPermission::class);
        Http::fake([
            'oauth2.googleapis.com/token' => Http::response([
                'access_token' => 'fresh-access-token',
                'expires_in' => 3600,
                'token_type' => 'Bearer',
            ]),
            'googleads.googleapis.com/v22/customers:listAccessibleCustomers' => Http::response([
                'resourceNames' => ['customers/5208653582'],
            ]),
        ]);

        $user = $this->makeUser();
        $this->saveConfig($user, 'GOOGLE_ADS_API_MODE', 'webhook', false);
        $this->saveConfig($user, 'GOOGLE_ADS_DEVELOPER_TOKEN', 'developer-token');
        $this->saveConfig($user, 'GOOGLE_ADS_CLIENT_CUSTOMER_ID', '520-865-3582', false);
        $this->saveConfig($user, 'GOOGLE_ADS_CLIENT_ID', 'google-client-id.apps.googleusercontent.com', false);
        $this->saveConfig($user, 'GOOGLE_ADS_CLIENT_SECRET', 'client-secret');
        $this->saveConfig($user, 'GOOGLE_ADS_REFRESH_TOKEN', 'refresh-token');

        $this->actingAs($user)
            ->postJson('/api/settings/integration-platforms/google_ads/test')
            ->assertOk()
            ->assertJsonPath('data.status', 'connected')
            ->assertJsonPath('data.token_refreshed', true)
            ->assertJsonPath('data.customer_id', '5208653582');

        Http::assertSent(fn ($request) => $request->url() === 'https://oauth2.googleapis.com/token'
            && $request['grant_type'] === 'refresh_token');
        Http::assertSent(fn ($request) => $request->url() === 'https://googleads.googleapis.com/v22/customers:listAccessibleCustomers'
            && $request->hasHeader('developer-token', 'developer-token')
            && $request->hasHeader('Authorization', 'Bearer fresh-access-token'));
    }

    public function test_google_ads_connection_surfaces_oauth_provider_error(): void
    {
        $this->withoutMiddleware(CheckPermission::class);
        Http::fake([
            'oauth2.googleapis.com/token' => Http::response([
                'error' => 'invalid_grant',
                'error_description' => 'Token has been expired or revoked.',
            ], 400),
        ]);

        $user = $this->makeUser();
        $this->saveConfig($user, 'GOOGLE_ADS_DEVELOPER_TOKEN', 'developer-token,');
        $this->saveConfig($user, 'GOOGLE_ADS_CLIENT_CUSTOMER_ID', '520-865-3582', false);
        $this->saveConfig($user, 'GOOGLE_ADS_CLIENT_ID', 'google-client-id.apps.googleusercontent.com,', false);
        $this->saveConfig($user, 'GOOGLE_ADS_CLIENT_SECRET', 'client-secret,');
        $this->saveConfig($user, 'GOOGLE_ADS_REFRESH_TOKEN', 'refresh-token,');

        $this->actingAs($user)
            ->postJson('/api/settings/integration-platforms/google_ads/test')
            ->assertOk()
            ->assertJsonPath('data.status', 'error')
            ->assertJsonPath('data.provider_error.error', 'invalid_grant')
            ->assertJsonPath('data.provider_error.error_description', 'Token has been expired or revoked.');

        Http::assertSent(fn ($request) => $request->url() === 'https://oauth2.googleapis.com/token'
            && $request['client_id'] === 'google-client-id.apps.googleusercontent.com'
            && $request['client_secret'] === 'client-secret'
            && $request['refresh_token'] === 'refresh-token');
    }

    private function makeUser(): User
    {
        $tenant = Tenant::query()->first() ?? Tenant::create([
            'name' => 'Default Workspace',
            'slug' => 'default-workspace',
            'status' => 'active',
        ]);

        return User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Integration Admin',
            'email' => 'integration-admin@example.com',
            'password' => bcrypt('password'),
        ]);
    }

    private function saveConfig(User $user, string $key, string $value, bool $secret = true): void
    {
        IntegrationConfig::create([
            'tenant_id' => $user->tenant_id,
            'category' => 'lead_platforms',
            'key' => $key,
            'value' => $value,
            'is_secret' => $secret,
            'value_type' => 'string',
            'is_active' => true,
        ]);
    }
}
