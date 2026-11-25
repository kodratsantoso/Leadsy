<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class LoginRateLimitingAndSuspensionTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        \App\Support\TenantContext::clear();
        Cache::flush();

        $this->tenant = Tenant::create([
            'name' => 'Acme Corp Workspace',
            'slug' => 'acme-corp',
            'is_active' => true,
        ]);

        $role = Role::firstOrCreate(['name' => 'sales_rep'], ['display_name' => 'Sales Representative', 'is_active' => true]);

        $this->user = User::factory()->create([
            'email' => 'sales.lead@acme.com',
            'password' => Hash::make('Secret123!'),
            'role_id' => $role->id,
            'tenant_id' => $this->tenant->id,
            'is_active' => true,
        ]);
    }

    protected function tearDown(): void
    {
        \App\Support\TenantContext::clear();
        parent::tearDown();
    }

    public function test_login_succeeds_with_valid_credentials_and_resolves_workspace()
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'sales.lead@acme.com',
            'password' => 'Secret123!',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'token',
                'user' => ['id', 'email', 'name'],
                'workspace' => ['id', 'name', 'slug'],
            ]);

        $this->assertEquals($this->tenant->id, $response->json('workspace.id'));
        $this->assertEquals('Acme Corp Workspace', $response->json('workspace.name'));
    }

    public function test_round1_three_failures_trigger_10_minute_lockout()
    {
        // Attempt 1: Failed
        $res1 = $this->postJson('/api/auth/login', [
            'email' => 'sales.lead@acme.com',
            'password' => 'WrongPass1',
        ]);
        $res1->assertStatus(401);
        $this->assertEquals(2, $res1->json('attempts_left'));
        $this->assertEquals(1, $res1->json('round'));

        // Attempt 2: Failed
        $res2 = $this->postJson('/api/auth/login', [
            'email' => 'sales.lead@acme.com',
            'password' => 'WrongPass2',
        ]);
        $res2->assertStatus(401);
        $this->assertEquals(1, $res2->json('attempts_left'));

        // Attempt 3: Failed -> Must trigger 10-minute lockout (HTTP 429)
        $res3 = $this->postJson('/api/auth/login', [
            'email' => 'sales.lead@acme.com',
            'password' => 'WrongPass3',
        ]);
        $res3->assertStatus(429);
        $this->assertEquals('temporarily_locked', $res3->json('status'));
        $this->assertGreaterThan(550, $res3->json('retry_after_seconds'));

        // Attempt 4 while locked: Still 429
        $res4 = $this->postJson('/api/auth/login', [
            'email' => 'sales.lead@acme.com',
            'password' => 'Secret123!',
        ]);
        $res4->assertStatus(429);
        $this->assertEquals('temporarily_locked', $res4->json('status'));
    }

    public function test_round2_three_more_failures_permanently_suspend_user()
    {
        $email = 'sales.lead@acme.com';

        // Simulate that user already failed Round 1 (3 times)
        Cache::put("login_attempts:round1:{$email}", 3, 3600);
        Cache::put("login_round:{$email}", 2, 86400);
        // And the 10-minute cooldown has now expired:
        Cache::forget("login_lockout:round1:{$email}");

        // Round 2 - Attempt 1: Failed
        $r2_1 = $this->postJson('/api/auth/login', [
            'email' => $email,
            'password' => 'WrongPassR2_1',
        ]);
        $r2_1->assertStatus(401);
        $this->assertEquals(2, $r2_1->json('attempts_left'));
        $this->assertEquals(2, $r2_1->json('round'));

        // Round 2 - Attempt 2: Failed
        $r2_2 = $this->postJson('/api/auth/login', [
            'email' => $email,
            'password' => 'WrongPassR2_2',
        ]);
        $r2_2->assertStatus(401);
        $this->assertEquals(1, $r2_2->json('attempts_left'));

        // Round 2 - Attempt 3 (6th overall): SUSPEND ACCOUNT (HTTP 403)!
        $r2_3 = $this->postJson('/api/auth/login', [
            'email' => $email,
            'password' => 'WrongPassR2_3',
        ]);
        $r2_3->assertStatus(403);
        $this->assertEquals('account_suspended', $r2_3->json('status'));
        $this->assertStringContainsString('ditangguhkan', strtolower($r2_3->json('message')));

        // Verify in database: user is now inactive (suspended)
        $this->assertFalse((bool) $this->user->fresh()->is_active);

        // Even with correct password, user is blocked because suspended:
        $resBlocked = $this->postJson('/api/auth/login', [
            'email' => $email,
            'password' => 'Secret123!',
        ]);
        $resBlocked->assertStatus(403);
        $this->assertEquals('account_suspended', $resBlocked->json('status'));
    }

    public function test_admin_reactivation_clears_login_suspension()
    {
        $email = 'sales.lead@acme.com';

        // Suspend user
        $this->user->update(['is_active' => false]);
        Cache::put("login_suspended:{$email}", true, 86400);

        // Admin user
        $adminRole = Role::firstOrCreate(['name' => 'super_admin'], ['display_name' => 'Super Admin', 'is_active' => true]);
        $admin = User::factory()->create([
            'role_id' => $adminRole->id,
            'tenant_id' => $this->tenant->id,
        ]);

        // Admin updates user to active
        $resp = $this->actingAs($admin)->putJson("/api/users/{$this->user->id}", [
            'is_active' => true,
        ]);
        $resp->assertStatus(200);

        // User can now log in successfully with correct credentials
        $loginResp = $this->postJson('/api/auth/login', [
            'email' => $email,
            'password' => 'Secret123!',
        ]);
        $loginResp->assertStatus(200);
        $this->assertNotNull($loginResp->json('token'));
    }
}
