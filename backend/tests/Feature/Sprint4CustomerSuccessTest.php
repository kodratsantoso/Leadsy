<?php

namespace Tests\Feature;

use App\Models\CustomerFeedback;
use App\Models\CustomerRenewalOpportunity;
use App\Models\FunnelStage;
use App\Models\Lead;
use App\Models\LeadSalesOrder;
use App\Models\Permission;
use App\Models\Product;
use App\Models\Role;
use App\Models\User;
use App\Services\CustomerSuccess\CsmProactiveAlertService;
use App\Services\CustomerSuccess\CustomerFeedbackService;
use App\Services\CustomerSuccess\CustomerRenewalIntelligenceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class Sprint4CustomerSuccessTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::firstOrCreate(['name' => 'superadmin'], ['display_name' => 'Superadmin', 'is_active' => true]);
        $p1 = Permission::firstOrCreate(['name' => 'leads.view'], ['module' => 'leads', 'display_name' => 'View Leads']);
        $p2 = Permission::firstOrCreate(['name' => 'leads.edit'], ['module' => 'leads', 'display_name' => 'Edit Leads']);
        $role->permissions()->syncWithoutDetaching([$p1->id, $p2->id]);

        $this->user = User::factory()->create([
            'role_id' => $role->id,
        ]);
    }

    /**
     * Test G3.4: Renewal & Cross-sell Intelligence Detection.
     */
    public function test_renewal_and_cross_sell_intelligence(): void
    {
        $wonStage = FunnelStage::where('name', 'like', '%Won%')->first()
            ?? FunnelStage::create(['name' => 'Closed Won', 'sequence' => 9, 'is_active' => true]);

        $client = Lead::create([
            'company_name' => 'PT Pelanggan Kontrak',
            'funnel_stage_id' => $wonStage->id,
        ]);

        $product = Product::create([
            'name' => 'Leadsy Maps Intelligence',
            'code' => 'LMI-01',
            'base_price' => 50000000,
            'status' => 'active',
        ]);

        // Sales order expiring in 45 days (high urgency renewal window)
        $order = LeadSalesOrder::create([
            'lead_id' => $client->id,
            'sales_order_number' => 'SO-2026-TEST',
            'order_type' => 'subscription',
            'order_status' => 'active',
            'order_date' => now()->subMonths(11),
            'contract_start_date' => now()->subMonths(11),
            'contract_end_date' => now()->addDays(45)->toDateString(),
            'total_amount' => 50000000,
            'recurring_amount' => 50000000,
            'currency' => 'IDR',
            'subtotal_amount' => 50000000,
            'tax_amount' => 0,
            'discount_amount' => 0,
            'total_withholding_tax' => 0,
            'grand_total_before_wht' => 50000000,
            'source_type' => 'manual',
        ]);

        $service = app(CustomerRenewalIntelligenceService::class);
        $renewals = $service->detectRenewalOpportunities();

        $this->assertTrue($renewals->contains('sales_order_id', $order->id));
        $renewalOpp = $renewals->firstWhere('sales_order_id', $order->id);
        $this->assertSame('high', $renewalOpp->urgency);
        $this->assertSame('renewal', $renewalOpp->opportunity_type);

        // Test API endpoint for renewals
        $response = $this->actingAs($this->user)->getJson('/api/customer-success/renewals');
        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonFragment(['sales_order_id' => $order->id]);
    }

    /**
     * Test G3.5: Customer Feedback Recording and Detractor Alert.
     */
    public function test_customer_feedback_records_and_alerts_detractors(): void
    {
        $wonStage = FunnelStage::where('name', 'like', '%Won%')->first()
            ?? FunnelStage::create(['name' => 'Closed Won', 'sequence' => 9, 'is_active' => true]);

        $client = Lead::create([
            'company_name' => 'PT Feedback Klien',
            'funnel_stage_id' => $wonStage->id,
        ]);

        // Submit detractor NPS survey via API (Score 4 = Detractor)
        $response = $this->actingAs($this->user)->postJson("/api/leads/{$client->id}/feedbacks", [
            'survey_type' => 'nps',
            'score' => 4,
            'feedback_text' => 'Support response times have been slower than expected this week.',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonFragment(['category' => 'detractor', 'sentiment' => 'negative']);

        // Check highlight was generated for CSM attention
        $this->assertDatabaseHas('ai_attention_highlights', [
            'entity_type' => Lead::class,
            'entity_id' => $client->id,
            'category' => 'CSM Attention',
            'severity' => 'critical',
            'status' => 'open',
        ]);

        // Test GET feedbacks
        $listResponse = $this->actingAs($this->user)->getJson("/api/leads/{$client->id}/feedbacks");
        $listResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'count' => 1,
            ]);
    }

    /**
     * Test G3.6: Proactive CSM Alert Scan and Artisan Command.
     */
    public function test_csm_proactive_alert_scan(): void
    {
        $exitCode = Artisan::call('leadsy:detect-csm-alerts');
        $this->assertSame(0, $exitCode);

        $response = $this->actingAs($this->user)->getJson('/api/customer-success/proactive-alerts');
        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);
    }
}
