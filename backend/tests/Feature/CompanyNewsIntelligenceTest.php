<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\LeadCompanyNews;
use App\Models\Product;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\AI\AiOrchestrationService;
use App\Services\Lead\CompanyNewsDiscoveryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CompanyNewsIntelligenceTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Lead $lead;
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::firstOrCreate(
            ['id' => 1],
            ['name' => 'Default Workspace', 'slug' => 'default']
        );

        $role = Role::firstOrCreate(['name' => 'super_admin'], ['display_name' => 'Super Admin']);

        $this->user = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'role_id' => $role->id,
        ]);

        $this->lead = Lead::create([
            'tenant_id' => $this->tenant->id,
            'company_name' => 'PT Telekomunikasi Indonesia Tbk',
            'website' => 'https://telkom.co.id',
            'website_domain' => 'telkom.co.id',
            'lead_score' => 85,
            'qualification_status' => 'qualified',
        ]);

        Product::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Leadsy Enterprise AI Suite',
            'code' => 'LEADSY-ENT',
            'category' => 'Software',
            'description' => 'Automated sales intelligence and lead scoring platform.',
            'is_active' => true,
        ]);
    }

    public function test_can_fetch_company_news_and_signals(): void
    {
        LeadCompanyNews::create([
            'lead_id' => $this->lead->id,
            'tenant_id' => $this->tenant->id,
            'headline' => 'Telkom Catat Pertumbuhan Laba dan Ekspansi Data Center',
            'canonical_url' => 'https://kompas.com/bisnis/telkom-ekspansi-data-center',
            'publisher_name' => 'Kompas',
            'publisher_domain' => 'kompas.com',
            'summary' => 'Telkom mempercepat belanja modal untuk ekspansi pusat data regional.',
            'source_provider' => 'Serper Google News',
            'relevance_score' => 95,
            'reliability_score' => 95,
            'is_relevant' => true,
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson("/api/leads/{$this->lead->id}/company-news");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.stats.total_news', 1)
            ->assertJsonPath('data.stats.high_relevance_count', 1);
    }

    public function test_can_toggle_article_relevance(): void
    {
        $article = LeadCompanyNews::create([
            'lead_id' => $this->lead->id,
            'tenant_id' => $this->tenant->id,
            'headline' => 'Berita CSR Telkom',
            'canonical_url' => 'https://detik.com/csr-telkom',
            'publisher_name' => 'Detik',
            'summary' => 'Program bakti sosial.',
            'is_relevant' => true,
        ]);

        $response = $this->actingAs($this->user, 'sanctum')
            ->patchJson("/api/leads/{$this->lead->id}/company-news/{$article->id}/relevance", [
                'is_relevant' => false,
                'is_excluded' => true,
            ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('lead_company_news', [
            'id' => $article->id,
            'is_relevant' => false,
            'is_excluded' => true,
        ]);
    }

    public function test_can_apply_pitching_angle_to_brief(): void
    {
        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/leads/{$this->lead->id}/company-news/apply-to-brief", [
                'angle' => [
                    'angle_title' => 'Ekspansi Data Center Telkom',
                    'icebreaker' => 'Selamat atas langkah Telkom memperluas kapasitas data center hyperscale minggu ini.',
                    'value_prop' => 'Leadsy dapat memetakan potensi klien enterprise baru yang memerlukan hosting terdistribusi.',
                    'target_stakeholder' => 'VP Enterprise Sales & VP Data Center',
                ],
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('lead_pre_meeting_briefs', [
            'lead_id' => $this->lead->id,
        ]);
    }
}
