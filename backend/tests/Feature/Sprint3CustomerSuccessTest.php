<?php

namespace Tests\Feature;

use App\Models\CustomerHealthScore;
use App\Models\CustomerOnboardingMilestone;
use App\Models\FunnelStage;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\LeadAiEvaluation;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\CustomerSuccess\ChurnRiskDetectionService;
use App\Services\CustomerSuccess\CustomerHealthScoreService;
use App\Services\CustomerSuccess\CustomerOnboardingWorkflowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class Sprint3CustomerSuccessTest extends TestCase
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
     * Test G3.1: Customer Health Score Engine multi-factor calculation.
     */
    public function test_customer_health_score_calculation(): void
    {
        $wonStage = FunnelStage::where('name', 'like', '%Won%')->first()
            ?? FunnelStage::create(['name' => 'Closed Won', 'sequence' => 9, 'is_active' => true]);

        $client = Lead::create([
            'company_name' => 'PT Mitra Sukses Abadi',
            'funnel_stage_id' => $wonStage->id,
            'authority' => 'Bpk. Budi (COO)',
        ]);

        // Recent activity
        LeadActivity::create([
            'lead_id' => $client->id,
            'activity_type' => 'Meeting',
            'description' => 'Bi-weekly check-in call with client',
            'activity_date' => now()->subDays(2),
        ]);

        // Positive evaluation
        LeadAiEvaluation::create([
            'lead_id' => $client->id,
            'source_type' => Lead::class,
            'source_id' => $client->id,
            'sentiment' => 'positive',
            'buying_signals' => ['Client satisfied with rollout', 'Discussed team expansion'],
            'evaluated_at' => now(),
        ]);

        $service = app(CustomerHealthScoreService::class);
        $score = $service->calculateHealthScore($client);

        $this->assertInstanceOf(CustomerHealthScore::class, $score);
        $this->assertGreaterThanOrEqual(75, $score->overall_score);
        $this->assertContains($score->health_status, ['thriving', 'healthy']);
        $this->assertNotEmpty($score->summary);

        // Check via API endpoint
        $response = $this->actingAs($this->user)->getJson("/api/leads/{$client->id}/health-score");
        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'lead_id' => $client->id,
            ])
            ->assertJsonFragment(['overall_score' => $score->overall_score]);
    }

    /**
     * Test G3.3: Post-Won Onboarding Workflow generation and milestone completion.
     */
    public function test_onboarding_workflow_generation_and_completion(): void
    {
        $wonStage = FunnelStage::where('name', 'like', '%Won%')->first()
            ?? FunnelStage::create(['name' => 'Closed Won', 'sequence' => 9, 'is_active' => true]);

        $client = Lead::create([
            'company_name' => 'PT Onboarding Prima',
            'funnel_stage_id' => $wonStage->id,
        ]);

        $workflowService = app(CustomerOnboardingWorkflowService::class);
        $milestones = $workflowService->generateOnboardingWorkflow($client);

        $this->assertCount(5, $milestones);
        $this->assertSame('in_progress', $milestones->first()->status);
        $this->assertSame('pending', $milestones->last()->status);

        // Complete the first milestone
        $firstMilestone = $milestones->first();
        $workflowService->completeMilestone($firstMilestone);

        $firstMilestone->refresh();
        $this->assertSame('completed', $firstMilestone->status);
        $this->assertNotNull($firstMilestone->completed_at);

        // Subsequent milestone should now be marked in_progress
        $secondMilestone = CustomerOnboardingMilestone::where('lead_id', $client->id)
            ->where('sequence', 2)
            ->first();
        $this->assertSame('in_progress', $secondMilestone->status);

        // Test API endpoint returns milestones
        $response = $this->actingAs($this->user)->getJson("/api/leads/{$client->id}/onboarding-milestones");
        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'count' => 5,
            ]);
    }

    /**
     * Test G3.2: Churn Risk Detection and Alerting.
     */
    public function test_churn_risk_detection_flags_neglected_clients(): void
    {
        $wonStage = FunnelStage::where('name', 'like', '%Won%')->first()
            ?? FunnelStage::create(['name' => 'Closed Won', 'sequence' => 9, 'is_active' => true]);

        $neglectedClient = Lead::create([
            'company_name' => 'PT Klien Terbengkalai',
            'funnel_stage_id' => $wonStage->id,
        ]);

        // Last activity was 40 days ago
        LeadActivity::create([
            'lead_id' => $neglectedClient->id,
            'activity_type' => 'Meeting',
            'description' => 'Old implementation call',
            'activity_date' => now()->subDays(40),
        ]);

        $churnService = app(ChurnRiskDetectionService::class);
        $risks = $churnService->detectChurnRisks();

        $this->assertTrue($risks->contains('lead_id', $neglectedClient->id));

        // Verify that AiAttentionHighlight was generated
        $this->assertDatabaseHas('ai_attention_highlights', [
            'entity_type' => Lead::class,
            'entity_id' => $neglectedClient->id,
            'category' => 'Churn Risk',
            'status' => 'open',
        ]);

        // Test Artisan command
        $exitCode = Artisan::call('leadsy:detect-churn-risks');
        $this->assertSame(0, $exitCode);

        // Test API endpoint
        $response = $this->actingAs($this->user)->getJson('/api/customer-success/churn-risks');
        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonFragment(['lead_id' => $neglectedClient->id]);
    }
}
