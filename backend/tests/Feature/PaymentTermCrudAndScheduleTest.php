<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\LeadSalesOrder;
use App\Models\PaymentTerm;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\Finance\BillingScheduleService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentTermCrudAndScheduleTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

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

    public function test_can_create_payment_term_with_quarterly_start_of_month_installments()
    {
        $payload = [
            'name' => 'Kuartalan 4x Awal Bulan',
            'code' => 'TOP-Q-TEST',
            'term_type' => 'calendar',
            'frequency' => 'quarterly',
            'days_due' => 30,
            'is_active' => true,
            'description' => 'Penagihan setiap awal bulan pertama pada setiap kuartal kontrak.',
            'installments_config' => [
                ['label' => 'Kuartal 1 (Bulan ke-1)', 'percentage' => 25, 'trigger' => 'calendar_date', 'month_offset' => 0, 'billing_rule' => 'start_of_month', 'days_after' => 0],
                ['label' => 'Kuartal 2 (Bulan ke-4)', 'percentage' => 25, 'trigger' => 'calendar_date', 'month_offset' => 3, 'billing_rule' => 'start_of_month', 'days_after' => 0],
                ['label' => 'Kuartal 3 (Bulan ke-7)', 'percentage' => 25, 'trigger' => 'calendar_date', 'month_offset' => 6, 'billing_rule' => 'start_of_month', 'days_after' => 0],
                ['label' => 'Kuartal 4 (Bulan ke-10)', 'percentage' => 25, 'trigger' => 'calendar_date', 'month_offset' => 9, 'billing_rule' => 'start_of_month', 'days_after' => 0],
            ],
        ];

        $response = $this->actingAs($this->user)->postJson('/api/finance/payment-terms', $payload);
        $response->assertStatus(201);
        $termId = $response->json('data.id');

        $this->assertDatabaseHas('payment_terms', [
            'id' => $termId,
            'code' => 'TOP-Q-TEST',
            'frequency' => 'quarterly',
        ]);

        return $termId;
    }

    public function test_can_update_and_delete_payment_term()
    {
        $term = PaymentTerm::create([
            'name' => 'Tempo Bulanan 12x',
            'code' => 'TOP-M-TEST',
            'term_type' => 'calendar',
            'frequency' => 'monthly',
            'days_due' => 30,
            'is_active' => true,
            'installments_config' => [
                ['label' => 'Bulan 1', 'percentage' => 50, 'trigger' => 'calendar_date', 'month_offset' => 0, 'billing_rule' => 'start_of_month'],
                ['label' => 'Bulan 2', 'percentage' => 50, 'trigger' => 'calendar_date', 'month_offset' => 1, 'billing_rule' => 'start_of_month'],
            ],
        ]);

        // Update
        $updateResp = $this->actingAs($this->user)->putJson("/api/finance/payment-terms/{$term->id}", [
            'name' => 'Tempo Bulanan Updated',
            'days_due' => 14,
        ]);
        $updateResp->assertStatus(200);
        $this->assertEquals('Tempo Bulanan Updated', $term->fresh()->name);
        $this->assertEquals(14, $term->fresh()->days_due);

        // Delete
        $deleteResp = $this->actingAs($this->user)->deleteJson("/api/finance/payment-terms/{$term->id}");
        $deleteResp->assertStatus(200);
        $this->assertDatabaseMissing('payment_terms', ['id' => $term->id]);
    }

    public function test_billing_schedule_service_calculates_quarterly_start_of_month_dates_correctly()
    {
        $term = PaymentTerm::create([
            'name' => 'Quarterly Contract Start Test',
            'code' => 'TOP-Q-CALC',
            'term_type' => 'calendar',
            'frequency' => 'quarterly',
            'days_due' => 30,
            'is_active' => true,
            'installments_config' => [
                ['label' => 'Q1', 'percentage' => 25, 'trigger' => 'calendar_date', 'month_offset' => 0, 'billing_rule' => 'start_of_month'],
                ['label' => 'Q2', 'percentage' => 25, 'trigger' => 'calendar_date', 'month_offset' => 3, 'billing_rule' => 'start_of_month'],
                ['label' => 'Q3', 'percentage' => 25, 'trigger' => 'calendar_date', 'month_offset' => 6, 'billing_rule' => 'start_of_month'],
                ['label' => 'Q4', 'percentage' => 25, 'trigger' => 'calendar_date', 'month_offset' => 9, 'billing_rule' => 'start_of_month'],
            ],
        ]);

        $lead = Lead::factory()->create();
        // Contract starts on 15 March 2026
        $order = LeadSalesOrder::create([
            'lead_id' => $lead->id,
            'sales_order_number' => 'SO-TEST-Q-01',
            'status' => 'confirmed',
            'total_amount' => 100000000,
            'order_date' => '2026-03-15',
            'delivery_date' => '2027-03-15',
            'payment_term_id' => $term->id,
        ]);

        $service = app(BillingScheduleService::class);
        $schedules = $service->syncSchedulesForSalesOrder($order, $term->id);

        $this->assertCount(4, $schedules);

        // Q1: month_offset 0 from 2026-03-15 -> start of March = 2026-03-01
        $this->assertEquals('2026-03-01', $schedules[0]->scheduled_date->toDateString());
        $this->assertEquals(25000000, (float)$schedules[0]->amount);

        // Q2: month_offset 3 -> 2026-06-01
        $this->assertEquals('2026-06-01', $schedules[1]->scheduled_date->toDateString());
        $this->assertEquals(25000000, (float)$schedules[1]->amount);

        // Q3: month_offset 6 -> 2026-09-01
        $this->assertEquals('2026-09-01', $schedules[2]->scheduled_date->toDateString());

        // Q4: month_offset 9 -> 2026-12-01
        $this->assertEquals('2026-12-01', $schedules[3]->scheduled_date->toDateString());
    }
}
