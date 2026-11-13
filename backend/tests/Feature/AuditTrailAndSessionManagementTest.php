<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\PersonalAccessToken;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\AuditService;
use App\Services\Security\ClientTelemetryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditTrailAndSessionManagementTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected Tenant $tenantB;
    protected User $adminUser;
    protected User $regularUser;
    protected User $otherTenantUser;
    protected User $superAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        $roleAdmin = Role::firstOrCreate(['name' => 'admin'], ['display_name' => 'Admin']);
        $roleSales = Role::firstOrCreate(['name' => 'sales'], ['display_name' => 'Sales']);
        $roleSuper = Role::firstOrCreate(['name' => 'super_admin'], ['display_name' => 'Super Admin']);

        $permAudit = \App\Models\Permission::firstOrCreate(['name' => 'audit.view'], ['module' => 'audit', 'display_name' => 'View Audit']);
        $permUsers = \App\Models\Permission::firstOrCreate(['name' => 'users.manage'], ['module' => 'users', 'display_name' => 'Manage Users']);
        $roleAdmin->permissions()->syncWithoutDetaching([$permAudit->id, $permUsers->id]);

        $this->tenantA = Tenant::create(['name' => 'Acme Corp', 'slug' => 'acme']);
        $this->tenantB = Tenant::create(['name' => 'Beta Industries', 'slug' => 'beta']);

        $this->adminUser = User::create([
            'tenant_id' => $this->tenantA->id,
            'role_id' => $roleAdmin->id,
            'name' => 'Admin Alice',
            'email' => 'alice@acme.com',
            'password' => bcrypt('password123'),
            'is_active' => true,
        ]);

        $this->regularUser = User::create([
            'tenant_id' => $this->tenantA->id,
            'role_id' => $roleSales->id,
            'name' => 'Bob Sales',
            'email' => 'bob@acme.com',
            'password' => bcrypt('password123'),
            'is_active' => true,
        ]);

        $this->otherTenantUser = User::create([
            'tenant_id' => $this->tenantB->id,
            'role_id' => $roleAdmin->id,
            'name' => 'Charlie Beta',
            'email' => 'charlie@beta.com',
            'password' => bcrypt('password123'),
            'is_active' => true,
        ]);

        $this->superAdmin = User::create([
            'tenant_id' => $this->tenantA->id,
            'role_id' => $roleSuper->id,
            'name' => 'Platform Root',
            'email' => 'superadmin@leadsy.tech',
            'password' => bcrypt('password123'),
            'is_active' => true,
            'is_super_admin' => true,
        ]);
    }

    public function test_client_telemetry_service_parses_edge_headers_and_user_agent(): void
    {
        $service = app(ClientTelemetryService::class);
        $req = \Illuminate\Http\Request::create('/api/test', 'GET', [], [], [], [
            'HTTP_CF_CONNECTING_IP' => '103.28.12.50',
            'HTTP_CF_IPCOUNTRY' => 'ID',
            'HTTP_CF_IPCITY' => 'Surabaya',
            'HTTP_USER_AGENT' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ]);

        $telemetry = $service->captureFromRequest($req);

        $this->assertEquals('103.28.12.50', $telemetry['ip_address']);
        $this->assertEquals('ID', $telemetry['country_code']);
        $this->assertEquals('Surabaya', $telemetry['city']);
        $this->assertEquals('Indonesia', $telemetry['country_name']);
        $this->assertEquals('🇮🇩', $telemetry['flag']);
        $this->assertEquals('desktop', $telemetry['device_type']);
        $this->assertEquals('Google Chrome', $telemetry['browser']);
        $this->assertEquals('macOS', $telemetry['os']);
    }

    public function test_audit_service_enriches_log_with_actor_and_location(): void
    {
        $this->actingAs($this->adminUser);

        $log = AuditService::log(
            action: 'password_changed',
            module: 'security',
            status: 'success',
            metadata: ['test' => true]
        );

        $this->assertEquals($this->tenantA->id, $log->tenant_id);
        $this->assertEquals('Acme Corp', $log->tenant_name);
        $this->assertEquals($this->adminUser->id, $log->user_id);
        $this->assertEquals('Admin Alice', $log->actor_name);
        $this->assertEquals('alice@acme.com', $log->actor_email);
        $this->assertEquals('admin', $log->actor_role);
        $this->assertEquals('high', $log->risk_level);
        $this->assertEquals('security_auth', $log->event_category);
    }

    public function test_audit_log_index_enforces_tenant_scoping_for_tenant_users(): void
    {
        // Create an audit log for Tenant A
        AuditLog::create([
            'tenant_id' => $this->tenantA->id,
            'tenant_name' => 'Acme Corp',
            'user_id' => $this->adminUser->id,
            'actor_name' => 'Admin Alice',
            'action' => 'login',
            'module' => 'auth',
            'ip_address' => '127.0.0.1',
        ]);

        // Create an audit log for Tenant B
        AuditLog::create([
            'tenant_id' => $this->tenantB->id,
            'tenant_name' => 'Beta Industries',
            'user_id' => $this->otherTenantUser->id,
            'actor_name' => 'Charlie Beta',
            'action' => 'login',
            'module' => 'auth',
            'ip_address' => '127.0.0.1',
        ]);

        // Query as Admin Alice (Tenant A)
        $response = $this->actingAs($this->adminUser)->getJson('/api/audit-logs');
        $response->assertOk();

        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('Acme Corp', $data[0]['tenant_name']);
        $this->assertEquals('Admin Alice', $data[0]['actor_name']);
    }

    public function test_session_management_lists_sessions_and_detects_idle_state(): void
    {
        // Active session for Bob (< 15 mins)
        $activeToken = $this->regularUser->createToken('api');
        $activeToken->accessToken->forceFill([
            'ip_address' => '103.10.10.1',
            'city' => 'Jakarta',
            'country_code' => 'ID',
            'country_name' => 'Indonesia',
            'device_type' => 'desktop',
            'browser' => 'Google Chrome',
            'os' => 'macOS',
            'last_active_at' => now()->subMinutes(2),
        ])->save();

        // Idle session for Alice (> 15 mins)
        $idleToken = $this->adminUser->createToken('api');
        $idleToken->accessToken->forceFill([
            'ip_address' => '103.10.10.2',
            'city' => 'Bandung',
            'country_code' => 'ID',
            'country_name' => 'Indonesia',
            'device_type' => 'mobile',
            'browser' => 'Apple Safari',
            'os' => 'iOS (iPhone)',
            'last_active_at' => now()->subMinutes(35),
        ])->save();

        $response = $this->actingAs($this->adminUser)->getJson('/api/settings/sessions');
        $response->assertOk();

        $sessions = $response->json('data');
        $this->assertCount(2, $sessions);

        $summary = $response->json('summary');
        $this->assertEquals(2, $summary['total_sessions']);
        $this->assertEquals(1, $summary['active_sessions']);
        $this->assertEquals(1, $summary['idle_sessions']);
    }

    public function test_terminate_session_deletes_token_and_logs_audit(): void
    {
        $token = $this->regularUser->createToken('api');
        $tokenId = $token->accessToken->id;

        $response = $this->actingAs($this->adminUser)->deleteJson("/api/settings/sessions/{$tokenId}");
        $response->assertOk();

        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $tokenId]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'session_terminated',
            'module' => 'security',
            'risk_level' => 'critical',
        ]);
    }

    public function test_terminate_idle_sessions_cleans_up_stale_sessions(): void
    {
        // Stale session
        $idleToken = $this->regularUser->createToken('api');
        $idleToken->accessToken->forceFill([
            'last_active_at' => now()->subMinutes(45),
        ])->save();

        // Active session
        $activeToken = $this->regularUser->createToken('api');
        $activeToken->accessToken->forceFill([
            'last_active_at' => now()->subMinutes(1),
        ])->save();

        $response = $this->actingAs($this->adminUser)->postJson('/api/settings/sessions/terminate-idle');
        $response->assertOk();
        $this->assertEquals(1, $response->json('count'));

        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $idleToken->accessToken->id]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $activeToken->accessToken->id]);
    }

    public function test_enforce_session_timeout_middleware_handles_string_and_carbon_dates_without_error(): void
    {
        $token = $this->adminUser->createToken('api');
        
        // Emulate database returning raw string or timestamp
        \Illuminate\Support\Facades\DB::table('personal_access_tokens')
            ->where('id', $token->accessToken->id)
            ->update([
                'last_active_at' => now()->subMinutes(5)->toDateTimeString(),
                'ip_address' => '103.188.177.19',
            ]);

        // Make an authenticated request through the middleware stack with Bearer token
        $response = $this->withHeader('Authorization', 'Bearer ' . $token->plainTextToken)
            ->getJson('/api/auth/me');

        $response->assertOk();

        // Make a second request immediately (simulating fast user navigation)
        $secondResponse = $this->withHeader('Authorization', 'Bearer ' . $token->plainTextToken)
            ->getJson('/api/auth/me');

        $secondResponse->assertOk();
    }
}
