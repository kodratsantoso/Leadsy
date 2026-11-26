<?php

namespace Tests\Feature;

use App\Models\IncentivePolicy;
use App\Models\IncentivePool;
use App\Models\IncentiveContributor;
use App\Models\Lead;
use App\Models\LeadSalesOrder;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IncentiveCalculationAndSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::firstOrCreate(
            ['name' => 'super_admin'],
            ['display_name' => 'Super Admin', 'is_active' => true]
        );

        $this->user = User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
    }

    public function test_get_settings_returns_policy_and_synced_roles(): void
    {
        $response = $this->actingAs($this->user)
            ->getJson('/api/incentives/settings');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'policy' => [
                        'id',
                        'saas_pool_rate',
                        'ps_pool_rate',
                        'direct_allocation_percentage',
                        'indirect_allocation_percentage',
                        'shared_allocation_percentage',
                    ],
                    'role_settings',
                ]
            ]);
    }

    public function test_update_settings_validates_and_persists_changes(): void
    {
        $settingsResponse = $this->actingAs($this->user)
            ->getJson('/api/incentives/settings');

        $roleSettings = $settingsResponse->json('data.role_settings');

        $payload = [
            'policy_name' => 'Kebijakan Insentif Q4 2026',
            'saas_pool_rate' => 2.50,
            'ps_pool_rate' => 3.50,
            'direct_allocation_percentage' => 60.00,
            'indirect_allocation_percentage' => 25.00,
            'shared_allocation_percentage' => 15.00,
            'revenue_trigger' => 'cash_collection',
            'exclude_vat' => true,
            'exclude_wht' => false,
            'exclude_discount' => true,
            'exclude_pass_through_cost' => true,
            'hours_per_manday' => 8.0,
            'ps_effort_source' => 'ps_work_log',
            'sa_csm_effort_source' => 'milestone_defaults',
            'allow_manager_effort_override' => true,
            'exception_fallback_indirect' => 'redirect_to_direct',
            'joiner_leaver_policy' => 'prorata_calendar_days',
            'exclude_probation' => true,
            'payout_cycle' => 'monthly',
            'privacy_mode' => 'individual_only',
            'role_settings' => array_map(function ($rs) {
                return [
                    'role_id' => $rs['role_id'],
                    'is_eligible' => (bool) $rs['is_eligible'],
                    'saas_rate' => 1.50,
                    'ps_rate' => 2.00,
                    'allocation_mode' => 'collaborative_pool',
                    'default_contributor_level' => 'core',
                ];
            }, $roleSettings),
        ];

        $response = $this->actingAs($this->user)
            ->putJson('/api/incentives/settings', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('data.policy.saas_pool_rate', '2.50')
            ->assertJsonPath('data.policy.direct_allocation_percentage', '60.00');
    }

    public function test_update_settings_fails_when_allocation_sum_is_not_100(): void
    {
        $payload = [
            'saas_pool_rate' => 2.00,
            'ps_pool_rate' => 3.00,
            'direct_allocation_percentage' => 70.00,
            'indirect_allocation_percentage' => 20.00,
            'shared_allocation_percentage' => 20.00, // Total = 110% -> 422!
            'revenue_trigger' => 'cash_collection',
            'hours_per_manday' => 8.0,
            'exception_fallback_indirect' => 'redirect_to_direct',
            'joiner_leaver_policy' => 'prorata_calendar_days',
            'payout_cycle' => 'monthly',
            'privacy_mode' => 'individual_only',
        ];

        $response = $this->actingAs($this->user)
            ->putJson('/api/incentives/settings', $payload);

        $response->assertStatus(422)
            ->assertJsonStructure(['message']);
    }

    public function test_calculate_preview_computes_exact_distribution(): void
    {
        $payload = [
            'gross_revenue' => 100000000.0, // Rp 100.000.000
            'revenue_stream' => 'professional_service',
            'pool_rate' => 3.0, // 3% -> Rp 3.000.000 Total Pool
            'direct_allocation_percentage' => 70.0,  // Rp 2.100.000
            'indirect_allocation_percentage' => 20.0, // Rp 600.000
            'shared_allocation_percentage' => 10.0,   // Rp 300.000
            'contributors' => [
                [
                    'user_name' => 'Solution Architect A',
                    'contribution_type' => 'direct',
                    'role_weight' => 1.5,
                    'effort_units' => 2.0,
                    'performance_multiplier' => 1.2, // Score = 1.5 * 2.0 * 1.2 = 3.6
                ],
                [
                    'user_name' => 'PS Consultant B',
                    'contribution_type' => 'direct',
                    'role_weight' => 1.2,
                    'effort_units' => 3.0,
                    'performance_multiplier' => 1.0, // Score = 1.2 * 3.0 * 1.0 = 3.6
                ],
                [
                    'user_name' => 'CSM Reviewer C',
                    'contribution_type' => 'indirect',
                    'role_weight' => 1.0,
                    'effort_units' => 1.0,
                    'performance_multiplier' => 1.0, // Score = 1.0
                ],
            ]
        ];

        $response = $this->actingAs($this->user)
            ->postJson('/api/incentives/calculate-preview', $payload);

        $response->assertStatus(200)
            ->assertJsonPath('data.total_pool', 3000000)
            ->assertJsonPath('data.direct_pool', 2100000)
            ->assertJsonPath('data.indirect_pool', 600000)
            ->assertJsonPath('data.shared_pool', 300000);

        // Contributor A and B have equal scores (3.6 and 3.6) so direct pool is split 50/50: 1.050.000 each
        $contributors = $response->json('data.contributors');
        $this->assertEquals(1050000, $contributors[0]['allocated_amount']);
        $this->assertEquals(1050000, $contributors[1]['allocated_amount']);
        $this->assertEquals(600000, $contributors[2]['allocated_amount']);
    }

    public function test_my_summary_and_analytics(): void
    {
        $summaryRes = $this->actingAs($this->user)
            ->getJson('/api/incentives/my-summary');

        $summaryRes->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'total_earned',
                    'approved_amount',
                    'pending_amount',
                    'active_participations_count',
                    'contributions',
                ]
            ]);

        $analyticsRes = $this->actingAs($this->user)
            ->getJson('/api/incentives/analytics');

        $analyticsRes->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'total_pools',
                    'total_pool_amount',
                    'direct_pool_amount',
                    'indirect_pool_amount',
                    'shared_pool_amount',
                ]
            ]);
    }

    public function test_generate_pool_from_sales_order_and_approve(): void
    {
        $lead = Lead::factory()->create([
            'company_name' => 'PT Solusi Teknologi Bersama',
        ]);

        $order = LeadSalesOrder::create([
            'lead_id' => $lead->id,
            'sales_order_number' => 'SO-2026-TEST-001',
            'order_date' => now(),
            'total_amount' => 50000000.0, // Rp 50.000.000
            'order_status' => 'confirmed',
        ]);

        $resp = $this->actingAs($this->user)
            ->postJson("/api/incentives/pools/generate-from-order/{$order->id}");

        $resp->assertStatus(201);
        $poolId = $resp->json('data.id');

        $this->assertNotNull($poolId);
        // Excludes 11% PPN: 50.000.000 / 1.11 = 45045045.05
        $this->assertEquals(45045045.05, (float) $resp->json('data.eligible_revenue'));

        // Approve by Dept Head
        $approveDeptResp = $this->actingAs($this->user)
            ->postJson("/api/incentives/pools/{$poolId}/approve-dept");

        $approveDeptResp->assertStatus(200)
            ->assertJsonPath('data.status', 'approved_dept');

        // Approve by Finance
        $approveFinResp = $this->actingAs($this->user)
            ->postJson("/api/incentives/pools/{$poolId}/approve-finance");

        $approveFinResp->assertStatus(200)
            ->assertJsonPath('data.status', 'approved_finance');
    }
}
