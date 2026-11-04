<?php

namespace Tests\Feature;

use App\Http\Middleware\CheckPermission;
use App\Models\AiGeneratedOutput;
use App\Models\Industry;
use App\Models\Lead;
use App\Models\LeadDiscoveryRecord;
use App\Models\LeadOfficeLocation;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class AiLeadProfilingHydrationTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    private User $user;

    private Industry $industry;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(CheckPermission::class);

        $this->tenant = Tenant::firstOrCreate(
            ['slug' => 'profiling-workspace'],
            ['name' => 'Profiling Workspace', 'status' => 'active']
        );

        $role = Role::firstOrCreate(
            ['name' => 'super_admin'],
            ['display_name' => 'Super Admin']
        );

        $this->user = User::create([
            'tenant_id' => $this->tenant->id,
            'role_id' => $role->id,
            'name' => 'Presales Architect',
            'email' => 'presales@prasetia.co.id',
            'password' => bcrypt('password123'),
        ]);

        $this->industry = Industry::create([
            'name' => 'Manufacturing',
            'is_active' => true,
        ]);
    }

    public function test_creating_lead_with_applied_ai_profile_persists_scalars_relational_locations_links_output_and_seeds_discovery(): void
    {
        Queue::fake();

        $standaloneOutput = AiGeneratedOutput::create([
            'entity_type' => Lead::class,
            'entity_id' => 0,
            'feature_key' => 'lead_ai_profiling',
            'status' => 'ready_for_review',
            'generated_by' => $this->user->id,
            'generated_at' => now(),
            'original_output_json' => ['company_name' => 'Asahimas'],
            'current_output_json' => ['company_name' => 'PT Asahimas Flat Glass Tbk'],
        ]);

        $profilePayload = [
            'company_name' => 'PT Asahimas Flat Glass Tbk',
            'legal_name' => 'PT Asahimas Flat Glass Tbk',
            'brand' => 'AMG / Asahimas',
            'ownership_type' => 'Tbk / PMA (AGC Group)',
            'year_established' => '1971',
            'operational_area_type' => 'Nasional & Ekspor Regional',
            'whatsapp' => '+628119876543',
            'branch_count' => 3,
            'core_product' => 'Architectural & Automotive Safety Glass',
            'corporate_structure' => 'Subsidiary of AGC Inc. (Japan) & Rodamas Group',
            'manufacturing_capability' => 'Pabrik kaca lembaran terintegrasi di Cikampek dan Sidoarjo',
            'customer_story' => 'Produsen kaca lembaran dan kaca otomotif terbesar di Asia Tenggara yang berdiri sejak 1971.',
            'presales_perspective' => 'Fokuskan pendekatan pada visibilitas supply chain multi-pabrik dan otomasi quality assurance.',
            'office_locations' => [
                [
                    'type' => 'Headquarters',
                    'label' => 'Kantor Pusat Ancol',
                    'address' => 'Jl. Ancol IX No. 5, Jakarta Utara',
                    'city' => 'Jakarta Utara',
                    'province' => 'DKI Jakarta',
                    'country' => 'Indonesia',
                ],
                [
                    'type' => 'Plant / Factory',
                    'label' => 'Pabrik Cikampek',
                    'address' => 'Kawasan Industri Indotaisei, Cikampek',
                    'city' => 'Karawang',
                    'province' => 'Jawa Barat',
                    'country' => 'Indonesia',
                ],
                [
                    'type' => 'Plant / Factory',
                    'label' => 'Pabrik Sidoarjo',
                    'address' => 'Tanjungsari, Taman, Sidoarjo',
                    'city' => 'Sidoarjo',
                    'province' => 'Jawa Timur',
                    'country' => 'Indonesia',
                ],
            ],
            'sales_notes' => [
                'departments_to_approach' => ['IT Infrastructure & ERP', 'Plant Operations'],
                'pain_points' => ['Sinkronisasi inventori lintas pabrik', 'Pelaporan produksi real-time'],
                'potential_needs' => ['Integrasi IoT lantai produksi ke ERP'],
                'solution_angles' => ['Unified Multi-Plant Analytics'],
                'discovery_questions' => [
                    'Bagaimana mekanisme sinkronisasi jadwal produksi antara pabrik Cikampek dan Sidoarjo saat ini?',
                    'Siapa stakeholder utama untuk evaluasi investasi otomasi tahun ini?',
                ],
            ],
        ];

        $response = $this->actingAs($this->user)->postJson('/api/leads', [
            'company_name' => 'PT Asahimas Flat Glass Tbk',
            'brand' => 'AMG / Asahimas',
            'industry_id' => $this->industry->id,
            'ai_profile_json' => $profilePayload,
            'ai_profiling_output_id' => $standaloneOutput->id,
        ]);

        $response->assertCreated();
        $leadId = $response->json('data.id');
        $this->assertNotNull($leadId);

        $lead = Lead::with(['officeLocations', 'discoveryRecord', 'bantcQuestionGuide'])->findOrFail($leadId);

        // 1. Verify 5 new scalar columns + customer_story + branch_count + ai_profile_json
        $this->assertSame('PT Asahimas Flat Glass Tbk', $lead->legal_name);
        $this->assertSame('Tbk / PMA (AGC Group)', $lead->ownership_type);
        $this->assertSame('1971', $lead->year_established);
        $this->assertSame('Nasional & Ekspor Regional', $lead->operational_scope);
        $this->assertSame('+628119876543', $lead->whatsapp);
        $this->assertSame(3, $lead->branch_count);
        $this->assertStringContainsString('1971', (string) $lead->customer_story);
        $this->assertSame('Unified Multi-Plant Analytics', $lead->ai_profile_json['sales_notes']['solution_angles'][0]);

        // 2. Verify standalone AiGeneratedOutput linked from entity_id=0 -> $lead->id
        $standaloneOutput->refresh();
        $this->assertSame($lead->id, $standaloneOutput->entity_id);
        $this->assertSame('applied', $standaloneOutput->status);

        // 3. Verify relational lead_office_locations rows
        $this->assertCount(3, $lead->officeLocations);
        $hq = $lead->officeLocations->firstWhere('city', 'Jakarta Utara');
        $this->assertNotNull($hq);
        $this->assertTrue($hq->is_primary);
        $this->assertSame('ai_profiling', $hq->source);

        // 4. Verify LeadDiscoveryRecord non-destructive seeding with `ai_suggested` provenance
        $this->assertNotNull($lead->discoveryRecord);
        $this->assertSame('ai_suggested', $lead->discoveryRecord->field_sources['pain_points'] ?? null);
        $this->assertStringContainsString('Sinkronisasi inventori', $lead->discoveryRecord->sections['pain_points'] ?? '');

        // 5. Verify BANTC Question Guide seeded with discovery questions
        $this->assertNotNull($lead->bantcQuestionGuide);
        $this->assertCount(2, $lead->bantcQuestionGuide->questions);

        // 6. Verify manual office location survives subsequent AI profile re-hydration
        $manualRes = $this->actingAs($this->user)->postJson("/api/leads/{$lead->id}/office-locations", [
            'location_type' => 'Warehouse',
            'label' => 'Gudang Distribusi Medan',
            'city' => 'Medan',
            'province' => 'Sumatera Utara',
        ]);
        $manualRes->assertCreated();

        // Confirm human-edited discovery section is NEVER overwritten by sync-playbook
        $discovery = $lead->discoveryRecord;
        $sections = $discovery->sections;
        $sources = $discovery->field_sources;
        $sections['pain_points'] = 'Confirmed human pain point from meeting';
        $sources['pain_points'] = 'confirmed';
        $discovery->update(['sections' => $sections, 'field_sources' => $sources]);

        $syncRes = $this->actingAs($this->user)->postJson("/api/leads/{$lead->id}/ai-profiling/sync-playbook");
        $syncRes->assertOk();

        $this->assertSame(4, LeadOfficeLocation::where('lead_id', $lead->id)->count());
        $this->assertSame(
            'Confirmed human pain point from meeting',
            LeadDiscoveryRecord::where('lead_id', $lead->id)->first()->sections['pain_points']
        );

        // 7. Verify GET /api/leads/{id} includes office_locations & ai_profile_json
        $showRes = $this->actingAs($this->user)->getJson("/api/leads/{$lead->id}");
        $showRes->assertOk()
            ->assertJsonPath('data.legal_name', 'PT Asahimas Flat Glass Tbk')
            ->assertJsonCount(4, 'data.office_locations');
    }
}
