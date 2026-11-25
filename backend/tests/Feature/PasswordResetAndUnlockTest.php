<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PasswordResetAndUnlockTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $targetUser;
    protected Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        TenantContext::clear();

        $this->tenant = Tenant::firstOrCreate(
            ['slug' => 'test-pwd-tenant'],
            ['name' => 'Password Test Tenant', 'is_active' => true]
        );

        $adminRole = Role::firstOrCreate(['name' => 'superadmin'], ['display_name' => 'Superadmin', 'is_active' => true]);
        $pManage = Permission::firstOrCreate(['name' => 'users.manage'], ['module' => 'users', 'display_name' => 'Manage Users']);
        $adminRole->permissions()->syncWithoutDetaching([$pManage->id]);

        $this->adminUser = User::factory()->create([
            'role_id' => $adminRole->id,
            'tenant_id' => $this->tenant->id,
            'email' => 'admin@leadsy.test',
            'is_active' => true,
        ]);

        $this->targetUser = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'sales@leadsy.test',
            'password' => Hash::make('OldPassword123!'),
            'is_active' => false,
        ]);
    }

    protected function tearDown(): void
    {
        TenantContext::clear();
        parent::tearDown();
    }

    public function test_send_password_reset_otp(): void
    {
        $resp = $this->postJson('/api/auth/forgot-password/send-otp', [
            'email' => 'sales@leadsy.test',
        ]);

        $resp->assertStatus(200);
        $resp->assertJsonPath('status', 'success');

        $this->assertTrue(Cache::has('pwd_reset_otp:sales@leadsy.test'));
    }

    public function test_verify_otp_and_reset_password_success(): void
    {
        Cache::put('pwd_reset_otp:sales@leadsy.test', '123456', now()->addMinutes(10));
        Cache::put('login_lockout:round1:sales@leadsy.test', true, 600);
        Cache::put('login_suspended:sales@leadsy.test', true, 86400);

        $resp = $this->postJson('/api/auth/forgot-password/verify-and-reset', [
            'email' => 'sales@leadsy.test',
            'otp' => '123456',
            'password' => 'NewSecurePassword123!',
        ]);

        $resp->assertStatus(200);
        $resp->assertJsonPath('status', 'success');

        $this->targetUser->refresh();
        $this->assertTrue($this->targetUser->is_active);
        $this->assertTrue(Hash::check('NewSecurePassword123!', $this->targetUser->password));

        // Lockout caches cleared
        $this->assertFalse(Cache::has('login_lockout:round1:sales@leadsy.test'));
        $this->assertFalse(Cache::has('login_suspended:sales@leadsy.test'));
        $this->assertFalse(Cache::has('pwd_reset_otp:sales@leadsy.test'));
    }

    public function test_verify_otp_fails_with_invalid_code(): void
    {
        Cache::put('pwd_reset_otp:sales@leadsy.test', '123456', now()->addMinutes(10));

        $resp = $this->postJson('/api/auth/forgot-password/verify-and-reset', [
            'email' => 'sales@leadsy.test',
            'otp' => '999999',
            'password' => 'NewSecurePassword123!',
        ]);

        $resp->assertStatus(422);
    }

    public function test_admin_can_unlock_user(): void
    {
        Cache::put('login_lockout:round1:sales@leadsy.test', true, 600);
        Cache::put('login_suspended:sales@leadsy.test', true, 86400);

        $resp = $this->actingAs($this->adminUser)->postJson("/api/users/{$this->targetUser->id}/unlock");

        $resp->assertStatus(200);
        $resp->assertJsonPath('status', 'success');

        $this->targetUser->refresh();
        $this->assertTrue($this->targetUser->is_active);
        $this->assertFalse(Cache::has('login_lockout:round1:sales@leadsy.test'));
        $this->assertFalse(Cache::has('login_suspended:sales@leadsy.test'));
    }
}
