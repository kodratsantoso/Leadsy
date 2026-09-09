<?php

namespace Tests\Feature;

use App\Models\FunnelStage;
use App\Models\Lead;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\CustomerSuccess\AccountReviewGeneratorService;
use App\Services\CustomerSuccess\CustomerSuccessPlaybookService;
use App\Services\Sales\LeadSourceQualityService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Sprint5PolishTest extends TestCase
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
     * Test G3.7: Account Review Generator (QBR / Monthly Review).
     */
    public function test_account_review_generator_creates_comprehensive_review(): void
    {
        $wonStage = FunnelStage::where('name', 'like', '%Won%')->first()
            ?? FunnelStage::create(['name' => 'Closed Won', 'sequence' => 9, 'is_active' => true]);

        $client = Lead::create([
            'company_name' => 'PT Semen Perkasa',
            'funnel_stage_id' => $wonStage->id,
            'authority' => 'Bpk. Ridwan (Direktur Operasional)',
        ]);

        $service = app(AccountReviewGeneratorService::class);
        $review = $service->generateAccountReview($client, 'Quarterly');

        $this->assertSame('Quarterly', $review['period']);
        $this->assertSame('PT Semen Perkasa', $review['company_name']);
        $this->assertNotEmpty($review['executive_summary']);
        $this->assertNotEmpty($review['value_delivered']);
        $this->assertNotEmpty($review['forward_roadmap']);

        // Test API Endpoint
        $response = $this->actingAs($this->user)->postJson("/api/leads/{$client->id}/account-review/generate", [
            'period' => 'Quarterly',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'lead_id' => $client->id,
            ])
            ->assertJsonFragment(['period' => 'Quarterly']);
    }

    /**
     * Test G3.8: CS Playbook AI Tactical Guidance.
     */
    public function test_cs_playbook_generator_provides_tactical_steps(): void
    {
        $wonStage = FunnelStage::where('name', 'like', '%Won%')->first()
            ?? FunnelStage::create(['name' => 'Closed Won', 'sequence' => 9, 'is_active' => true]);

        $client = Lead::create([
            'company_name' => 'PT Manufaktur Solusi',
            'funnel_stage_id' => $wonStage->id,
            'authority' => 'Ibu Siti (Head of IT)',
        ]);

        $service = app(CustomerSuccessPlaybookService::class);
        $playbook = $service->generatePlaybook($client, 'churn_risk_recovery');

        $this->assertSame('churn_risk_recovery', $playbook['scenario_key']);
        $this->assertNotEmpty($playbook['scenario_title']);
        $this->assertNotEmpty($playbook['immediate_actions']);
        $this->assertNotEmpty($playbook['diagnostic_questions']);
        $this->assertNotEmpty($playbook['outreach_message_draft']);

        // Test API Endpoint
        $response = $this->actingAs($this->user)->postJson("/api/leads/{$client->id}/cs-playbook/generate", [
            'scenario' => 'churn_risk_recovery',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'lead_id' => $client->id,
            ])
            ->assertJsonFragment(['scenario_key' => 'churn_risk_recovery']);
    }

    /**
     * Test G1.2: Lead Source Quality Scoring Analytics.
     */
    public function test_lead_source_quality_analytics_evaluates_channels(): void
    {
        $wonStage = FunnelStage::where('name', 'like', '%Won%')->first()
            ?? FunnelStage::create(['name' => 'Closed Won', 'sequence' => 9, 'is_active' => true]);

        // High quality channel lead
        $lead1 = Lead::create([
            'company_name' => 'PT Maps Corp 1',
            'lead_score' => 85,
            'qualification_status' => 'qualified',
            'funnel_stage_id' => $wonStage->id,
        ]);
        \App\Models\LeadSource::create([
            'lead_id' => $lead1->id,
            'source_type' => 'google_maps',
            'confidence' => 'high',
        ]);

        $lead2 = Lead::create([
            'company_name' => 'PT Maps Corp 2',
            'lead_score' => 90,
            'qualification_status' => 'qualified',
            'funnel_stage_id' => $wonStage->id,
        ]);
        \App\Models\LeadSource::create([
            'lead_id' => $lead2->id,
            'source_type' => 'google_maps',
            'confidence' => 'high',
        ]);

        // Lower quality channel lead
        $lead3 = Lead::create([
            'company_name' => 'PT WA Unknown',
            'lead_score' => 40,
            'qualification_status' => 'unqualified',
        ]);
        \App\Models\LeadSource::create([
            'lead_id' => $lead3->id,
            'source_type' => 'whatsapp',
            'confidence' => 'medium',
        ]);

        $service = app(LeadSourceQualityService::class);
        $report = $service->evaluateSourceQuality();

        $this->assertNotEmpty($report);
        $mapsChannel = $report->firstWhere('channel', 'Google Maps Discovery');
        $this->assertNotNull($mapsChannel);
        $this->assertSame(2, $mapsChannel['total_leads']);
        $this->assertSame(100.0, $mapsChannel['qualification_rate_pct']);
        $this->assertSame('A', $mapsChannel['quality_grade']);

        // Test API Endpoint
        $response = $this->actingAs($this->user)->getJson('/api/analytics/lead-source-quality');
        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonFragment(['channel' => 'Google Maps Discovery']);
    }
}
