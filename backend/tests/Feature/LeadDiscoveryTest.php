<?php

namespace Tests\Feature;

use App\Http\Middleware\CheckPermission;
use App\Models\Lead;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LeadDiscoveryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(CheckPermission::class);
    }

    private function makeUser(): User
    {
        $tenant = Tenant::create([
            'name' => 'Presales Test Workspace',
            'slug' => 'presales-test-workspace',
            'status' => 'active',
        ]);

        return User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Presales Architect',
            'email' => 'presales@example.com',
            'password' => bcrypt('password'),
        ]);
    }

    private function makeLead(User $user): Lead
    {
        return Lead::create([
            'tenant_id' => $user->tenant_id,
            'owner_id' => $user->id,
            'company_name' => 'PT Solusi Bangsa Mandiri',
            'website_domain' => 'solusibangsa.com',
            'budget' => 'Rp 800 Juta',
            'authority' => 'CTO & Head of IT',
            'needs' => 'Modernisasi ERP dan Integrasi WhatsApp API',
            'timeline' => 'Q1 2027',
            'bantc_sources' => [
                'budget' => 'confirmed',
                'authority' => 'confirmed',
                'needs' => 'confirmed',
                'timeline' => 'confirmed',
            ],
        ]);
    }

    public function test_can_fetch_default_discovery_workspace(): void
    {
        $user = $this->makeUser();
        $lead = $this->makeLead($user);

        $response = $this->actingAs($user)
            ->getJson("/api/leads/{$lead->id}/discovery");

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'lead_id',
                    'sections',
                    'field_sources',
                    'qualification_status',
                    'completeness_score',
                ],
                'evaluation' => [
                    'score',
                    'is_ready_for_solution_design',
                    'checklist',
                    'provenance_counts',
                ],
                'standard_sections',
            ]);

        $json = $response->json();
        $this->assertSame($lead->id, $json['data']['lead_id']);
        $this->assertArrayHasKey('business_objectives', $json['standard_sections']);
        $this->assertArrayHasKey('functional_requirements', $json['standard_sections']);
    }

    public function test_can_save_discovery_workspace_and_calculate_completeness(): void
    {
        $user = $this->makeUser();
        $lead = $this->makeLead($user);

        $payload = [
            'qualification_status' => 'in_progress',
            'sections' => [
                'business_objectives' => 'Meningkatkan efisiensi pemrosesan pesanan 50% dan SLA respons pelanggan < 5 menit.',
                'current_process' => 'Menggunakan spreadsheet manual yang dikonsolidasikan tiap akhir hari.',
                'pain_points' => 'Data sering desinkron, stok tidak real-time, komplain pelanggan tinggi.',
                'desired_outcomes' => 'Sistem terotomasi dengan dashboard analitik dan notifikasi instan.',
                'stakeholders' => 'Direktur Operasional (Sponsor), CTO (Evaluator), Lead Presales.',
                'functional_requirements' => 'Pencatatan order, integrasi WhatsApp, alur approval bertingkat.',
                'assumptions' => 'Klien menyediakan server dan kredensial API sandbox sebelum sprint 1.',
            ],
            'field_sources' => [
                'business_objectives' => 'confirmed',
                'current_process' => 'confirmed',
                'pain_points' => 'confirmed',
                'desired_outcomes' => 'confirmed',
                'stakeholders' => 'confirmed',
                'functional_requirements' => 'confirmed',
                'assumptions' => 'assumption',
            ],
        ];

        $response = $this->actingAs($user)
            ->putJson("/api/leads/{$lead->id}/discovery", $payload);

        $response->assertOk()
            ->assertJsonPath('data.qualification_status', 'in_progress');

        $json = $response->json();
        $score = $json['data']['completeness_score'];

        $this->assertGreaterThan(50, $score);
        $this->assertTrue($json['evaluation']['is_ready_for_solution_design']);

        // Verify database persistence
        $this->assertDatabaseHas('lead_discovery_records', [
            'lead_id' => $lead->id,
            'qualification_status' => 'in_progress',
            'completeness_score' => $score,
        ]);
    }

    public function test_separates_confirmed_facts_from_assumptions_and_ai_suggestions(): void
    {
        $user = $this->makeUser();
        $lead = $this->makeLead($user);

        $payload = [
            'sections' => [
                'business_objectives' => 'Otomasi faktur',
                'assumptions' => 'Database lama MySQL 5.7',
                'open_questions' => 'Apakah butuh integrasi ke SAP?',
            ],
            'field_sources' => [
                'business_objectives' => 'confirmed',
                'assumptions' => 'assumption',
                'open_questions' => 'ai_suggested',
            ],
        ];

        $response = $this->actingAs($user)
            ->putJson("/api/leads/{$lead->id}/discovery", $payload);

        $response->assertOk();
        $counts = $response->json('evaluation.provenance_counts');

        $this->assertGreaterThan(0, $counts['confirmed']);
        $this->assertGreaterThan(0, $counts['assumption']);
        $this->assertGreaterThan(0, $counts['ai_suggested']);
    }

    public function test_can_validate_completeness_on_demand(): void
    {
        $user = $this->makeUser();
        $lead = $this->makeLead($user);

        $response = $this->actingAs($user)
            ->postJson("/api/leads/{$lead->id}/discovery/validate");

        $response->assertOk()
            ->assertJsonStructure([
                'evaluation' => [
                    'score',
                    'is_ready_for_solution_design',
                    'missing_required',
                    'checklist',
                ],
                'message',
            ]);
    }

    public function test_can_update_bantc_via_discovery_and_sync_with_lead(): void
    {
        $user = $this->makeUser();
        $lead = $this->makeLead($user);

        $payload = [
            'bantc' => [
                'budget' => 'Rp 1.5 Milyar',
                'authority' => 'Dewan Direksi & CTO',
                'needs' => 'Full ERP Transformation',
                'timeline' => 'Q2 2027',
                'competitor' => 'SAP S/4HANA',
            ],
        ];

        $response = $this->actingAs($user)
            ->putJson("/api/leads/{$lead->id}/discovery", $payload);

        $response->assertOk();

        $lead->refresh();
        $this->assertSame('Rp 1.5 Milyar', $lead->budget);
        $this->assertSame('Dewan Direksi & CTO', $lead->authority);
        $this->assertSame('Full ERP Transformation', $lead->needs);
        $this->assertSame('Q2 2027', $lead->timeline);
        $this->assertSame('SAP S/4HANA', $lead->competitor);

        $sources = $lead->bantc_sources;
        $this->assertSame('manual', $sources['competitor']['source'] ?? null);

        $bantcStatus = $response->json('evaluation.bantc_status');
        $this->assertSame('SAP S/4HANA', $bantcStatus['competitor']);
        $this->assertSame('manual', $bantcStatus['sources']['competitor']);
    }
}
