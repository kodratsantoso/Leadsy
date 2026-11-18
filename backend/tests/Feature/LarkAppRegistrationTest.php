<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Lark\LarkAppRegistrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class LarkAppRegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::firstOrCreate(['name' => 'super_admin'], ['display_name' => 'Super Admin', 'description' => 'Super Admin']);
        Role::firstOrCreate(['name' => 'sales_director'], ['display_name' => 'Sales Director', 'description' => 'Sales Director']);
    }

    public function test_encode_addons_generates_valid_url_safe_gzip_base64()
    {
        $addons = [
            'preset' => false,
            'scopes' => [
                'tenant' => ['bitable:app', 'docx:document'],
            ],
        ];

        $encoded = LarkAppRegistrationService::encodeAddons($addons);
        $this->assertNotEmpty($encoded);
        $this->assertStringNotContainsString('+', $encoded);
        $this->assertStringNotContainsString('/', $encoded);
        $this->assertStringNotContainsString('=', $encoded);

        // Decompress to verify integrity
        $b64 = strtr($encoded, '-_', '+/');
        $decompressed = gzdecode(base64_decode($b64));
        $decoded = json_decode($decompressed, true);
        $this->assertEquals($addons, $decoded);
    }

    public function test_initiate_app_registration_returns_verification_url()
    {
        Http::fake([
            'https://accounts.larksuite.com/oauth/v1/app/registration*' => Http::response([
                'device_code' => 'dev_code_123',
                'user_code' => 'ABCD-1234',
                'verification_uri' => 'https://open.larksuite.com/page/launcher',
                'verification_uri_complete' => 'https://open.larksuite.com/page/launcher?user_code=ABCD-1234',
                'expires_in' => 3600,
                'interval' => 5,
            ], 200),
        ]);

        $response = $this->postJson('/api/auth/lark/register-app/start', [
            'brand' => 'lark',
            'app_name' => 'Leadsy AI Test',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'device_code' => 'dev_code_123',
            'user_code' => 'ABCD-1234',
        ]);

        $this->assertStringContainsString('https://open.larksuite.com/page/launcher', $response->json('verification_url'));
        $this->assertStringContainsString('user_code=ABCD-1234', $response->json('verification_url'));
        $this->assertStringContainsString('addons=', $response->json('verification_url'));
    }

    public function test_poll_app_registration_pending()
    {
        Cache::put('lark_app_reg:dev_code_pending', [
            'device_code' => 'dev_code_pending',
            'user_code' => 'ABCD-1234',
            'brand' => 'lark',
            'created_at' => now()->timestamp,
        ], 3600);

        Http::fake([
            'https://accounts.larksuite.com/oauth/v1/app/registration*' => Http::response([
                'error' => 'authorization_pending',
                'error_description' => '',
            ], 400),
        ]);

        $response = $this->postJson('/api/auth/lark/register-app/poll', [
            'device_code' => 'dev_code_pending',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'pending',
        ]);
    }

    public function test_poll_app_registration_success_provisions_tenant()
    {
        $tenant = Tenant::create(['name' => 'Existing Test Tenant', 'slug' => 'existing-test-tenant']);

        Cache::put('lark_app_reg:dev_code_success', [
            'device_code' => 'dev_code_success',
            'user_code' => 'ABCD-1234',
            'brand' => 'lark',
            'tenant_id' => $tenant->id,
            'created_at' => now()->timestamp,
        ], 3600);

        Http::fake([
            'https://accounts.larksuite.com/oauth/v1/app/registration*' => Http::response([
                'client_id' => 'cli_test_123456789',
                'client_secret' => 'sec_test_secret_key_987',
                'user_info' => [
                    'open_id' => 'ou_test_user_id',
                    'tenant_brand' => 'lark',
                ],
            ], 200),
        ]);

        $response = $this->postJson('/api/auth/lark/register-app/poll', [
            'device_code' => 'dev_code_success',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'success',
            'app_id' => 'cli_test_123456789',
            'tenant_id' => $tenant->id,
        ]);

        $this->assertDatabaseHas('lark_integrations', [
            'tenant_id' => $tenant->id,
            'app_id' => 'cli_test_123456789',
            'is_active' => true,
        ]);
    }
}
