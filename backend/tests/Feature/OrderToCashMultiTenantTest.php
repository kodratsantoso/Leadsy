<?php

namespace Tests\Feature;

use App\Http\Middleware\CheckPermission;
use App\Models\Currency;
use App\Models\CurrencySetting;
use App\Models\Lead;
use App\Models\LeadQuotation;
use App\Models\LeadSalesOrder;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderToCashMultiTenantTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected Tenant $tenantB;
    protected User $userA;
    protected User $userB;
    protected Lead $leadA;
    protected Lead $leadB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(CheckPermission::class);

        $this->setupCurrency();

        $this->tenantA = Tenant::create([
            'name' => 'Tenant Alpha Corp',
            'slug' => 'tenant-alpha-corp',
            'status' => 'active',
        ]);

        $this->tenantB = Tenant::create([
            'name' => 'Tenant Beta Industries',
            'slug' => 'tenant-beta-industries',
            'status' => 'active',
        ]);

        $this->userA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Alice Alpha',
            'email' => 'alice@alpha.test',
            'password' => bcrypt('password'),
        ]);

        $this->userB = User::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'Bob Beta',
            'email' => 'bob@beta.test',
            'password' => bcrypt('password'),
        ]);

        TenantContext::setTenantId($this->tenantA->id);
        $this->leadA = Lead::create([
            'tenant_id' => $this->tenantA->id,
            'company_name' => 'Alpha Client Ltd',
            'website_domain' => 'alphaclient.test',
        ]);

        TenantContext::setTenantId($this->tenantB->id);
        $this->leadB = Lead::create([
            'tenant_id' => $this->tenantB->id,
            'company_name' => 'Beta Client Ltd',
            'website_domain' => 'betaclient.test',
        ]);

        TenantContext::clear();
    }

    protected function tearDown(): void
    {
        TenantContext::clear();
        parent::tearDown();
    }

    public function test_tenant_b_cannot_view_tenant_a_quotation(): void
    {
        $quotationA = LeadQuotation::create([
            'lead_id' => $this->leadA->id,
            'quotation_number' => 'QT-ALPHA-001',
            'quotation_type' => 'new',
            'quotation_status' => 'draft',
            'quotation_date' => now()->toDateString(),
            'currency' => 'USD',
            'subtotal_amount' => 5000,
            'total_amount' => 5000,
            'created_by' => $this->userA->id,
        ]);

        // User B attempts to access Quotation A (IDOR probe)
        $response = $this->actingAs($this->userB, 'sanctum')
            ->getJson("/api/quotations/{$quotationA->id}");

        $response->assertStatus(403);
    }

    public function test_tenant_b_cannot_update_or_delete_tenant_a_quotation(): void
    {
        $quotationA = LeadQuotation::create([
            'lead_id' => $this->leadA->id,
            'quotation_number' => 'QT-ALPHA-002',
            'quotation_type' => 'new',
            'quotation_status' => 'draft',
            'quotation_date' => now()->toDateString(),
            'currency' => 'USD',
            'subtotal_amount' => 1000,
            'total_amount' => 1000,
            'created_by' => $this->userA->id,
        ]);

        // Attempt update
        $updateResponse = $this->actingAs($this->userB, 'sanctum')
            ->putJson("/api/quotations/{$quotationA->id}", [
                'quotation_type' => 'renewal',
                'quotation_date' => now()->toDateString(),
                'items' => [
                    [
                        'item_name' => 'Tampered Service',
                        'quantity' => 1,
                        'unit_price' => 10,
                        'billing_period' => 'one_time',
                    ],
                ],
            ]);

        $updateResponse->assertStatus(403);

        // Attempt delete
        $deleteResponse = $this->actingAs($this->userB, 'sanctum')
            ->deleteJson("/api/quotations/{$quotationA->id}");

        $deleteResponse->assertStatus(403);

        $this->assertDatabaseHas('lead_quotations', [
            'id' => $quotationA->id,
            'quotation_number' => 'QT-ALPHA-002',
        ]);
    }

    public function test_tenant_b_cannot_view_or_mutate_tenant_a_sales_order(): void
    {
        $salesOrderA = LeadSalesOrder::create([
            'lead_id' => $this->leadA->id,
            'sales_order_number' => 'SO-ALPHA-001',
            'order_type' => 'new',
            'order_status' => 'draft',
            'order_date' => now()->toDateString(),
            'currency' => 'USD',
            'subtotal_amount' => 10000,
            'total_amount' => 10000,
            'created_by' => $this->userA->id,
        ]);

        // Probe GET
        $getResponse = $this->actingAs($this->userB, 'sanctum')
            ->getJson("/api/sales-orders/{$salesOrderA->id}");

        $getResponse->assertStatus(403);

        // Probe Confirm
        $confirmResponse = $this->actingAs($this->userB, 'sanctum')
            ->postJson("/api/sales-orders/{$salesOrderA->id}/confirm");

        $confirmResponse->assertStatus(403);

        // Probe Delete
        $deleteResponse = $this->actingAs($this->userB, 'sanctum')
            ->deleteJson("/api/sales-orders/{$salesOrderA->id}");

        $deleteResponse->assertStatus(403);
    }

    public function test_tenant_a_can_view_own_quotation_and_sales_order(): void
    {
        $quotationA = LeadQuotation::create([
            'lead_id' => $this->leadA->id,
            'quotation_number' => 'QT-ALPHA-003',
            'quotation_type' => 'new',
            'quotation_status' => 'draft',
            'quotation_date' => now()->toDateString(),
            'currency' => 'USD',
            'subtotal_amount' => 2000,
            'total_amount' => 2000,
            'created_by' => $this->userA->id,
        ]);

        $salesOrderA = LeadSalesOrder::create([
            'lead_id' => $this->leadA->id,
            'sales_order_number' => 'SO-ALPHA-002',
            'order_type' => 'new',
            'order_status' => 'draft',
            'order_date' => now()->toDateString(),
            'currency' => 'USD',
            'subtotal_amount' => 2000,
            'total_amount' => 2000,
            'created_by' => $this->userA->id,
        ]);

        $qResponse = $this->actingAs($this->userA, 'sanctum')
            ->getJson("/api/quotations/{$quotationA->id}");

        $qResponse->assertStatus(200);

        $soResponse = $this->actingAs($this->userA, 'sanctum')
            ->getJson("/api/sales-orders/{$salesOrderA->id}");

        $soResponse->assertStatus(200);
    }

    public function test_superadmin_can_bypass_tenant_isolation_on_quotation(): void
    {
        $superAdminRole = Role::firstOrCreate(['name' => 'super_admin'], ['display_name' => 'Super Administrator']);
        $superAdmin = User::create([
            'tenant_id' => null,
            'name' => 'Platform Super Admin',
            'email' => 'superadmin@leadsy.internal',
            'password' => bcrypt('password'),
            'role_id' => $superAdminRole->id,
            'is_active' => true,
        ]);

        $quotationA = LeadQuotation::create([
            'lead_id' => $this->leadA->id,
            'quotation_number' => 'QT-ALPHA-004',
            'quotation_type' => 'new',
            'quotation_status' => 'draft',
            'quotation_date' => now()->toDateString(),
            'currency' => 'USD',
            'subtotal_amount' => 1500,
            'total_amount' => 1500,
            'created_by' => $this->userA->id,
        ]);

        $response = $this->actingAs($superAdmin, 'sanctum')
            ->getJson("/api/quotations/{$quotationA->id}");

        $response->assertStatus(200);
    }

    private function setupCurrency(): void
    {
        $currency = Currency::firstOrCreate(
            ['code' => 'USD'],
            [
                'name' => 'US Dollar',
                'symbol' => '$',
                'is_active' => true,
            ]
        );

        CurrencySetting::firstOrCreate(
            ['currency_id' => $currency->id],
            [
                'thousands_separator' => ',',
                'decimal_separator' => '.',
                'decimal_digits' => 2,
                'symbol_position' => 'before',
            ]
        );
    }
}
