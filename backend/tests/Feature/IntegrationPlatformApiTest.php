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
}
