<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MultiTenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        TenantContext::clear();
        parent::tearDown();
    }

    public function test_tenant_a_cannot_see_tenant_b_leads(): void
    {
        // Create Tenant A and Tenant B
        $tenantA = Tenant::create([
            'name' => 'Org Alpha Test',
            'slug' => 'org-alpha-test',
            'status' => 'active',
        ]);

        $tenantB = Tenant::create([
            'name' => 'Org Beta Test',
            'slug' => 'org-beta-test',
            'status' => 'active',
        ]);

        // Create Leads for each tenant
        TenantContext::setTenantId($tenantA->id);
        $leadA = Lead::create([
            'company_name' => 'Alpha Secret Corp',
            'tenant_id' => $tenantA->id,
            'qualification_status' => 'unqualified',
        ]);

        TenantContext::setTenantId($tenantB->id);
        $leadB = Lead::create([
            'company_name' => 'Beta Secret Corp',
            'tenant_id' => $tenantB->id,
            'qualification_status' => 'unqualified',
        ]);

        // Query under Tenant A context
        TenantContext::setTenantId($tenantA->id);
        $leadsForA = Lead::all();

        $this->assertTrue($leadsForA->contains('id', $leadA->id));
        $this->assertFalse($leadsForA->contains('id', $leadB->id));

        // Query under Tenant B context
        TenantContext::setTenantId($tenantB->id);
        $leadsForB = Lead::all();

        $this->assertTrue($leadsForB->contains('id', $leadB->id));
        $this->assertFalse($leadsForB->contains('id', $leadA->id));
    }

    public function test_lead_automatically_receives_tenant_id_from_context(): void
    {
        $tenant = Tenant::create([
            'name' => 'Auto Scope Org',
            'slug' => 'auto-scope-org',
            'status' => 'active',
        ]);

        TenantContext::setTenantId($tenant->id);

        // Create lead without specifying tenant_id
        $lead = Lead::create([
            'company_name' => 'Auto Assigned Lead',
            'qualification_status' => 'unqualified',
        ]);

        $this->assertEquals($tenant->id, $lead->tenant_id);
    }

    public function test_non_superadmin_cannot_access_platform_admin_api(): void
    {
        $tenant = Tenant::create([
            'name' => 'Customer Tenant',
            'slug' => 'customer-tenant',
            'status' => 'active',
        ]);

        $regularRole = Role::where('name', 'account_manager')->first()
            ?? Role::create(['name' => 'account_manager', 'display_name' => 'AM']);

        $customerUser = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Regular Customer User',
            'email' => 'customer@test-saas.com',
            'password' => bcrypt('password123'),
            'role_id' => $regularRole->id,
            'is_active' => true,
        ]);

        $response = $this->actingAs($customerUser, 'sanctum')
            ->getJson('/api/platform/metrics');

        $response->assertStatus(403);
    }

    public function test_superadmin_can_access_platform_admin_api(): void
    {
        $superAdmin = User::whereHas('role', fn($q) => $q->where('name', 'super_admin'))->first();

        if (! $superAdmin) {
            $this->markTestSkipped('No superadmin user found in database.');
        }

        $response = $this->actingAs($superAdmin, 'sanctum')
            ->getJson('/api/platform/metrics');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'tenants' => ['total', 'active', 'trial', 'suspended'],
                    'users' => ['total', 'active'],
                    'leads' => ['total', 'pipeline_value'],
                    'tiers',
                    'system_health',
                ],
            ]);
    }
}
