<?php

namespace Tests\Feature;

use App\Models\AiAttentionHighlight;
use App\Models\FunnelStage;
use App\Models\Lead;
use App\Models\LeadAiEvaluation;
use App\Models\LeadBattleCard;
use App\Models\LeadFunnelHistory;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\Sales\CompetitiveBattleCardService;
use App\Services\Sales\FunnelStageRecommendationService;
use App\Services\Sales\StalledDealDetectionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class Sprint2EngagementHardeningTest extends TestCase
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
     * Test G2.2: Stalled deal detection service and Artisan command.
     */
    public function test_stalled_deal_detection_identifies_inactive_leads_and_creates_highlights(): void
    {
        $stage = FunnelStage::where('name', 'like', '%Proposal%')->first()
            ?? FunnelStage::create([
                'name' => 'Proposal Discussion',
                'sequence' => 5,
                'color' => '#10B981',
                'probability' => 60,
                'is_active' => true,
            ]);

        // Lead with an activity logged 20 days ago (threshold for proposal is 7 days)
        $stalledLead = Lead::create([
            'company_name' => 'PT Mandek Jaya',
            'funnel_stage_id' => $stage->id,
            'qualification_status' => 'qualified',
        ]);
        \App\Models\LeadActivity::create([
            'lead_id' => $stalledLead->id,
            'activity_type' => 'Meeting',
            'description' => 'Past proposal discussion',
            'activity_date' => now()->subDays(20),
        ]);
        // Re-set updated_at without touching
        \Illuminate\Support\Facades\DB::table('leads')
            ->where('id', $stalledLead->id)
            ->update(['updated_at' => now()->subDays(20)]);

        // Active lead with activity yesterday
        $activeLead = Lead::create([
            'company_name' => 'PT Lancar Makmur',
            'funnel_stage_id' => $stage->id,
            'qualification_status' => 'qualified',
        ]);
        \App\Models\LeadActivity::create([
            'lead_id' => $activeLead->id,
            'activity_type' => 'Call',
            'description' => 'Follow up call yesterday',
            'activity_date' => now()->subDays(1),
        ]);

        $service = app(StalledDealDetectionService::class);
        $report = $service->detectStalledLeads();

        $this->assertTrue($report->contains('lead_id', $stalledLead->id));
        $this->assertFalse($report->contains('lead_id', $activeLead->id));

        // Check highlight was generated in database
        $this->assertDatabaseHas('ai_attention_highlights', [
            'entity_type' => Lead::class,
            'entity_id' => $stalledLead->id,
            'category' => 'Stalled Deal',
            'status' => 'open',
        ]);

        // Test artisan command executes successfully
        $exitCode = Artisan::call('leadsy:detect-stalled-deals');
        $this->assertSame(0, $exitCode);

        // Test API endpoint returns stalled deals
        $response = $this->actingAs($this->user)->getJson('/api/deals/stalled');
        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonFragment(['lead_id' => $stalledLead->id]);
    }

    /**
     * Test G2.4: Stage recommendation engine recommends advance when BANT-C is met.
     */
    public function test_stage_recommendation_suggests_advancing_when_prerequisites_met(): void
    {
        // Use existing seeded stages in sequence (e.g. seq 1 -> seq 2)
        $stages = FunnelStage::where('is_active', true)->orderBy('sequence')->get();
        $stage1 = $stages->firstWhere('sequence', 1) ?? FunnelStage::create(['name' => 'Stage 1', 'sequence' => 1, 'is_active' => true]);
        $stage2 = $stages->firstWhere('sequence', 2) ?? FunnelStage::create(['name' => 'Stage 2', 'sequence' => 2, 'is_active' => true]);

        $lead = Lead::create([
            'company_name' => 'PT Maju Terus',
            'funnel_stage_id' => $stage1->id,
            'lead_score' => 50,
            'budget' => 'Rp 500.000.000',
            'authority' => 'Bpk. Hendra (CEO)',
            'needs' => 'Automasi sales pipeline dan CRM',
            'timeline' => 'Q4 2026',
        ]);

        LeadAiEvaluation::create([
            'lead_id' => $lead->id,
            'source_type' => Lead::class,
            'source_id' => $lead->id,
            'sentiment' => 'positive',
            'buying_signals' => ['Confirmed budget allocation', 'Immediate need for replacement'],
            'evaluated_at' => now(),
        ]);

        $service = app(FunnelStageRecommendationService::class);
        $recommendation = $service->recommendStage($lead);

        $this->assertSame('advance', $recommendation['action']);
        $this->assertSame($stage2->id, $recommendation['recommended_stage']['id']);
        $this->assertGreaterThanOrEqual(70, $recommendation['confidence_score']);

        // Test applying the recommendation via API
        $response = $this->actingAs($this->user)->postJson("/api/leads/{$lead->id}/apply-stage-recommendation", [
            'target_stage_id' => $stage2->id,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'to_stage_id' => $stage2->id,
            ]);

        // Check that lead moved and funnel history recorded
        $lead->refresh();
        $this->assertSame($stage2->id, $lead->funnel_stage_id);

        $this->assertDatabaseHas('lead_funnel_history', [
            'lead_id' => $lead->id,
            'from_stage_id' => $stage1->id,
            'to_stage_id' => $stage2->id,
        ]);
    }

    /**
     * Test G2.3: Competitive battle card generation and retrieval.
     */
    public function test_competitive_battle_card_generates_and_persists_intel(): void
    {
        $lead = Lead::create([
            'company_name' => 'PT Target Enterprise',
            'competitor' => 'Salesforce CRM',
            'needs' => 'Regional sales tracking',
        ]);

        $service = app(CompetitiveBattleCardService::class);
        $card = $service->generateBattleCard($lead);

        $this->assertInstanceOf(LeadBattleCard::class, $card);
        $this->assertSame('Salesforce CRM', $card->competitor_name);
        $this->assertNotEmpty($card->advantages);
        $this->assertNotEmpty($card->weaknesses);
        $this->assertNotEmpty($card->counter_tactics);
        $this->assertNotEmpty($card->key_talking_points);

        // Check via API endpoint
        $response = $this->actingAs($this->user)->getJson("/api/leads/{$lead->id}/battle-cards");
        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'count' => 1,
            ])
            ->assertJsonFragment(['competitor_name' => 'Salesforce CRM']);

        // Test generate with explicit competitor name
        $postResponse = $this->actingAs($this->user)->postJson("/api/leads/{$lead->id}/battle-cards/generate", [
            'competitor_name' => 'HubSpot Enterprise',
        ]);

        $postResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonFragment(['competitor_name' => 'HubSpot Enterprise']);

        $this->assertDatabaseHas('lead_battle_cards', [
            'lead_id' => $lead->id,
            'competitor_name' => 'HubSpot Enterprise',
        ]);
    }
}
