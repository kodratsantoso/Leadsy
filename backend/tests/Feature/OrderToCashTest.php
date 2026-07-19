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
                        'line_discount_type' => 'amount',
                        'line_discount_value' => 100,
                        'tax_rate' => 5.5556, // 5.5556% on 900 taxable amount is 50.00
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
        // line discount = 100, tax_rate = 5.5556% on 900 = 50.00
        // total = 1000 - 100 + 50 = 950
        $this->assertEquals(1000.00, (float)$quotation->subtotal_amount);
        $this->assertEquals(0.00, (float)$quotation->discount_amount); // Header discount is 0
        $this->assertEquals(100.00, (float)$quotation->total_line_discount); // Line discount is 100
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
 
    public function test_advanced_netsuite_quotation_features(): void
    {
        $user = $this->makeUser();
        $lead = $this->makeLead($user);
        $this->setupCurrency();
        
        // Create a contact for the lead
        $contact = $lead->contacts()->create([
            'name' => 'John Doe',
            'email' => 'john@testcorp.com',
            'phone' => '12345678',
        ]);
 
        $response = $this->actingAs($user)
            ->postJson("/api/leads/{$lead->id}/quotations", [
                'quotation_type' => 'expansion',
                'quotation_date' => now()->toDateString(),
                'customer_name' => 'Target Customer Exp',
                'contact_id' => $contact->id,
                'sales_owner_id' => $user->id,
                'payment_terms' => 'Net 30',
                'billing_frequency' => 'yearly',
                'header_discount_type' => 'percentage',
                'header_discount_value' => 10, // 10% header discount
                'other_cost' => 150, // Shipping or setup cost
                'items' => [
                    [
                        'item_name' => 'License Tier A',
                        'quantity' => 10,
                        'unit_price' => 100, // 1000 subtotal
                        'line_discount_type' => 'percentage',
                        'line_discount_value' => 20, // 20% line discount = 200
                        'tax_rate' => 10, // 10% tax on 800 taxable amount = 80
                        'billing_period' => 'yearly'
                    ]
                ]
            ]);
 
        $response->assertStatus(201);
 
        $quotation = LeadQuotation::first();
        $this->assertNotNull($quotation);
        $this->assertEquals($contact->id, $quotation->contact_id);
        $this->assertEquals($user->id, $quotation->sales_owner_id);
        $this->assertEquals('Net 30', $quotation->payment_terms);
        $this->assertEquals('yearly', $quotation->billing_frequency);
 
        // Verification of calculations:
        // base amount = 10 * 100 = 1000
        // line discount = 20% of 1000 = 200
        // total line discount = 200
        // line tax = 10% of (1000 - 200) = 80
        // subtotal = 1000
        // taxable subtotal = 1000 - 200 = 800
        // header discount = 10% of 800 = 80
        // other cost = 150
        // total tax = 80
        // grand total = 1000 - 200 - 80 + 80 + 150 = 950
        $this->assertEquals(1000.00, (float)$quotation->subtotal_amount);
        $this->assertEquals(200.00, (float)$quotation->total_line_discount);
        $this->assertEquals(80.00, (float)$quotation->discount_amount); // Header discount
        $this->assertEquals(80.00, (float)$quotation->tax_amount);
        $this->assertEquals(150.00, (float)$quotation->other_cost);
        $this->assertEquals(950.00, (float)$quotation->total_amount);
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
