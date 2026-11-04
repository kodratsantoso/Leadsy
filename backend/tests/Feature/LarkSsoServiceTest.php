<?php

namespace Tests\Feature;

use App\Models\LarkIntegration;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Lark\LarkSsoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class LarkSsoServiceTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private LarkIntegration $integration;
    private LarkSsoService $ssoService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::firstOrCreate(
            ['slug' => 'test-tenant'],
            ['name' => 'Test Tenant', 'status' => 'active']
        );

        $this->integration = LarkIntegration::create([
            'tenant_id' => $this->tenant->id,
            'app_id' => 'cli_test_app',
            'app_secret_encrypted' => encrypt('test_secret'),
            'is_active' => true,
        ]);

        $this->ssoService = new LarkSsoService($this->integration);
    }

    public function test_provisions_new_user_on_first_lark_login(): void
    {
        $role = Role::firstOrCreate(
            ['name' => 'Sales'],
            ['display_name' => 'Sales', 'is_system' => true]
        );

        $larkUserInfo = [
            'user_id' => 'lark_uid_123',
            'email' => 'new.user@example.com',
            'name' => 'New User',
        ];

        $user = $this->ssoService->createOrUpdateUserFromLark($larkUserInfo, $this->tenant, 'Sales');

        $this->assertInstanceOf(User::class, $user);
        $this->assertEquals('new.user@example.com', $user->email);
        $this->assertEquals($this->tenant->id, $user->tenant_id);
        $this->assertEquals($role->id, $user->role_id);
    }

    public function test_links_existing_user_with_null_tenant_without_duplicate_key_error(): void
    {
        // Simulate existing user created without tenant_id (e.g. legacy or external registration)
        // Insert directly to bypass TenantScope or model restrictions
        $existingUserId = DB::table('users')->insertGetId([
            'name' => 'Existing Unassigned User',
            'email' => 'unassigned@example.com',
            'password' => bcrypt('password123'),
            'tenant_id' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $larkUserInfo = [
            'user_id' => 'lark_uid_456',
            'email' => 'unassigned@example.com',
            'name' => 'Existing User Updated',
        ];

        // This would previously fail with SQLSTATE[23505] Unique violation on users_email_unique
        $user = $this->ssoService->createOrUpdateUserFromLark($larkUserInfo, $this->tenant, 'Sales');

        $this->assertEquals($existingUserId, $user->id);
        $this->assertEquals($this->tenant->id, $user->fresh()->tenant_id);
        $this->assertEquals('Existing User Updated', $user->fresh()->name);
    }
}
