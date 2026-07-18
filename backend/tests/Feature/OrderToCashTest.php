<?php
 
namespace Tests\Feature;
 
use App\Http\Middleware\CheckPermission;
use App\Models\Lead;
use App\Models\LeadQuotation;
use App\Models\LeadSalesOrder;
use App\Models\LeadActivity;
use App\Models\Currency;
use App\Models\CurrencySetting;
use App\Models\Tenant;
use App\Models\User;
use App\Models\FunnelStage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
 
class OrderToCashTest extends TestCase
{
    use RefreshDatabase;
 
    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(CheckPermission::class);
    }
 
    public function test_blocks_creation_if_default_currency_not_configured(): void
    {
        $user = $this->makeUser();
        $lead = $this->makeLead($user);
 
        // Ensure no currency settings exist
        CurrencySetting::truncate();
 
        $response = $this->actingAs($user)
            ->postJson("/api/leads/{$lead->id}/quotations", [
                'quotation_type' => 'new',
                'quotation_date' => now()->toDateString(),
                'items' => [
                    [
                        'item_name' => 'Test Service',
                        'quantity' => 1,
                        'unit_price' => 1000,
                        'billing_period' => 'one_time'
                    ]
                ]
            ]);
 
        $response->assertStatus(422);
        $response->assertJsonFragment(['message' => 'Default currency is not configured. Please configure currency first.']);
    }
 
    public function test_quotation_creation_and_recalculation(): void
    {
        $user = $this->makeUser();
        $lead = $this->makeLead($user);
        $this->setupCurrency();
 
        $response = $this->actingAs($user)
            ->postJson("/api/leads/{$lead->id}/quotations", [
                'quotation_type' => 'new',
                'quotation_date' => now()->toDateString(),
                'customer_name' => 'Target Customer',
                'items' => [
                    [
                        'item_name' => 'Consulting',
                        'quantity' => 2,
                        'unit_price' => 500,
                        'discount_amount' => 100,
                        'tax_amount' => 50,
                        'billing_period' => 'monthly'
                    ]
                ]
            ]);
 
        $response->assertStatus(201);
 
        $quotation = LeadQuotation::first();
        $this->assertNotNull($quotation);
        $this->assertEquals('QT-' . date('Ym') . '-', substr($quotation->quotation_number, 0, 10));
        $currencySetting = CurrencySetting::with('currency')->first();
        $this->assertEquals($currencySetting->currency->code, $quotation->currency);
        // Recalculation verification:
        // quantity (2) * unit_price (500) = 1000 subtotal
        // discount = 100, tax = 50
        // total = 1000 - 100 + 50 = 950
        $this->assertEquals(1000.00, (float)$quotation->subtotal_amount);
        $this->assertEquals(100.00, (float)$quotation->discount_amount);
        $this->assertEquals(50.00, (float)$quotation->tax_amount);
        $this->assertEquals(950.00, (float)$quotation->total_amount);
 
        // Validate activity log
        $this->assertDatabaseHas('lead_activities', [
            'lead_id' => $lead->id,
            'activity_type' => 'Quotation Created',
        ]);
    }
 
    public function test_quotation_status_transition_rules(): void
    {
        $user = $this->makeUser();
        $lead = $this->makeLead($user);
        $this->setupCurrency();
 
        // Create draft quotation
        $quotation = LeadQuotation::create([
            'lead_id' => $lead->id,
            'quotation_number' => 'QT-TEST-01',
            'quotation_date' => now(),
            'quotation_status' => 'draft',
            'subtotal_amount' => 100,
            'total_amount' => 100,
            'currency' => 'USD',
        ]);
 
        // Invalid: draft directly to approved
        $response = $this->actingAs($user)
            ->postJson("/api/quotations/{$quotation->id}/status", [
                'status' => 'approved'
            ]);
        $response->assertStatus(422);
 
        // Valid: draft to submitted
        $response = $this->actingAs($user)
            ->postJson("/api/quotations/{$quotation->id}/status", [
                'status' => 'submitted'
            ]);
        $response->assertOk();
        $this->assertEquals('submitted', $quotation->refresh()->quotation_status);
    }
 
    public function test_convert_accepted_quotation_to_sales_order(): void
    {
        $user = $this->makeUser();
        $lead = $this->makeLead($user);
        $this->setupCurrency();
 
        $quotation = LeadQuotation::create([
            'lead_id' => $lead->id,
            'quotation_number' => 'QT-TEST-02',
            'quotation_date' => now(),
            'quotation_status' => 'accepted',
            'subtotal_amount' => 1000,
            'total_amount' => 1000,
            'currency' => 'USD',
        ]);
        
        $item = $quotation->items()->create([
            'item_name' => 'Item 1',
            'quantity' => 1,
            'unit_price' => 1000,
            'total_amount' => 1000,
            'billing_period' => 'one_time'
        ]);
 
        // Convert to Sales Order
        $response = $this->actingAs($user)
            ->postJson("/api/quotations/{$quotation->id}/convert-to-sales-order");
 
        $response->assertStatus(201);
        $this->assertEquals('converted', $quotation->refresh()->quotation_status);
 
        $salesOrder = LeadSalesOrder::first();
        $this->assertNotNull($salesOrder);
        $this->assertEquals($quotation->id, $salesOrder->quotation_id);
        $this->assertEquals(1000.00, (float)$salesOrder->total_amount);
        $this->assertEquals('draft', $salesOrder->order_status);
 
        // Try duplicate conversion
        $responseDuplicate = $this->actingAs($user)
            ->postJson("/api/quotations/{$quotation->id}/convert-to-sales-order");
        $responseDuplicate->assertStatus(400);
    }
 
    public function test_direct_sales_order_creation_from_lead(): void
    {
        $user = $this->makeUser();
        $lead = $this->makeLead($user);
        $this->setupCurrency();
 
        $response = $this->actingAs($user)
            ->postJson("/api/leads/{$lead->id}/sales-orders", [
                'order_type' => 'new',
                'order_date' => now()->toDateString(),
                'items' => [
                    [
                        'item_name' => 'Direct Order Item',
                        'quantity' => 5,
                        'unit_price' => 200,
                        'billing_period' => 'one_time'
                    ]
                ]
            ]);
 
        $response->assertStatus(201);
 
        $order = LeadSalesOrder::first();
        $this->assertNotNull($order);
        $this->assertNull($order->quotation_id);
        $this->assertEquals(1000.00, (float)$order->total_amount);
        $this->assertEquals('draft', $order->order_status);
 
        // Check activity log
        $this->assertDatabaseHas('lead_activities', [
            'lead_id' => $lead->id,
            'activity_type' => 'Sales Order Created Directly',
        ]);
    }
 
    public function test_confirm_sales_order_updates_lead_closing_amount_and_funnel_stage(): void
    {
        $user = $this->makeUser();
        $lead = $this->makeLead($user);
        $this->setupCurrency();
 
        // Ensure Closed Won funnel stage exists
        $stage = FunnelStage::create([
            'name' => 'Closed Won',
            'color' => '#00FF00',
            'order' => 10,
        ]);
 
        $order = LeadSalesOrder::create([
            'lead_id' => $lead->id,
            'sales_order_number' => 'SO-TEST-01',
            'order_type' => 'new',
            'order_status' => 'draft',
            'order_date' => now(),
            'total_amount' => 5000,
            'currency' => 'USD',
        ]);
 
        $response = $this->actingAs($user)
            ->postJson("/api/sales-orders/{$order->id}/confirm");
 
        $response->assertOk();
        $this->assertEquals('confirmed', $order->refresh()->order_status);
 
        // Verify Lead updates
        $lead->refresh();
        $this->assertEquals(5000.00, (float)$lead->realized_closing_amount);
        $this->assertEquals($stage->id, $lead->funnel_stage_id);
    }
 
    private function makeUser(): User
    {
        $tenant = Tenant::create([
            'name' => 'Test Workspace',
            'slug' => 'test-workspace',
            'status' => 'active',
        ]);
 
        return User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Audit Test User',
            'email' => 'audittest@example.com',
            'password' => bcrypt('password'),
        ]);
    }
 
    private function makeLead(User $user): Lead
    {
        return Lead::create([
            'tenant_id' => $user->tenant_id,
            'company_name' => 'Test Corp',
            'website_domain' => 'testcorp.com',
        ]);
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
