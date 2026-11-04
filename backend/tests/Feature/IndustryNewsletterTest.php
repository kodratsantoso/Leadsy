<?php

namespace Tests\Feature;

use App\Http\Middleware\CheckPermission;
use App\Models\Industry;
use App\Models\IndustryNewsArticle;
use App\Models\IndustryNewsEntity;
use App\Models\Lead;
use App\Models\SubIndustry;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class IndustryNewsletterTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    private User $user;

    private Industry $industry;

    private SubIndustry $subIndustry;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(CheckPermission::class);

        $this->tenant = Tenant::firstOrCreate(
            ['slug' => 'newsletter-workspace'],
            ['name' => 'Newsletter Workspace', 'status' => 'active']
        );

        $this->user = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Presales Analyst',
            'email' => 'analyst@prasetia.co.id',
            'password' => bcrypt('password123'),
        ]);

        $this->industry = Industry::create([
            'name' => 'Manufacturing',
            'synonyms' => ['Manufaktur', 'Pabrik'],
            'is_active' => true,
        ]);

        $this->subIndustry = SubIndustry::create([
            'industry_id' => $this->industry->id,
            'name' => 'FMCG & Food Processing',
            'is_active' => true,
        ]);
    }

    public function test_sync_persists_news_extracts_entities_matches_existing_leads_and_deduplicates_on_resync(): void
    {
        // Pre-existing CRM Lead to verify automatic entity cross-matching
        $existingLead = Lead::withoutEvents(fn () => Lead::create([
            'tenant_id' => $this->tenant->id,
            'company_name' => 'PT Mayora Indah Tbk',
            'industry_id' => $this->industry->id,
            'created_by' => $this->user->id,
        ]));

        $mockRssXml = <<<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Google News</title>
    <item>
      <title>PT Kino Indonesia Tbk Siapkan Capex Rp 250 Miliar untuk Ekspansi Pabrik Baru - Kontan</title>
      <link>https://industri.kontan.co.id/news/kino-ekspansi-pabrik-2026</link>
      <pubDate>Wed, 04 Nov 2026 06:00:00 GMT</pubDate>
      <description><![CDATA[PT Kino Indonesia Tbk resmi menganggarkan belanja modal ekspansi kapasitas produksi tahun ini.]]></description>
      <source url="https://industri.kontan.co.id">Kontan</source>
    </item>
    <item>
      <title>PT Mayora Indah Tbk Gandeng Mitra Logistik untuk Transformasi Digital Gudang - Bisnis.com</title>
      <link>https://market.bisnis.com/read/20261104/mayora-transformasi-gudang</link>
      <pubDate>Wed, 04 Nov 2026 07:30:00 GMT</pubDate>
      <description><![CDATA[Emiten konsumer PT Mayora Indah Tbk mempercepat kerjasama otomatisasi rantai pasok.]]></description>
      <source url="https://market.bisnis.com">Bisnis.com</source>
    </item>
  </channel>
</rss>
XML;

        Http::fake([
            'https://news.google.com/rss/search*' => Http::response($mockRssXml, 200, ['Content-Type' => 'application/rss+xml']),
            '*' => Http::response([], 200),
        ]);

        // 1. Trigger initial sync (inline mode)
        $syncResponse = $this->actingAs($this->user)->postJson('/api/lead-generator/newsletter/sync', [
            'industry_id' => $this->industry->id,
            'sub_industry_id' => $this->subIndustry->id,
            'region_scope' => 'id',
            'sync' => true,
        ]);

        $syncResponse->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.new_articles_saved', 2);

        $this->assertEquals(2, IndustryNewsArticle::withoutGlobalScopes()->count());

        // 2. Read newsletter from DB (zero external network calls required)
        $readResponse = $this->actingAs($this->user)->getJson('/api/lead-generator/newsletter?industry_id='.$this->industry->id);

        $readResponse->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.telemetry.total_articles', 2)
            ->assertJsonPath('data.telemetry.unique_publishers', 2)
            ->assertJsonPath('data.telemetry.pipeline_mentions', 1)
            ->assertJsonPath('data.telemetry.convertible_prospects', 1);

        // Verify Mayora was automatically matched to existingLead
        $mayoraEntity = IndustryNewsEntity::withoutGlobalScopes()
            ->where('normalized_name', 'mayoraindah')
            ->first();
        $this->assertNotNull($mayoraEntity);
        $this->assertEquals($existingLead->id, $mayoraEntity->matched_lead_id);

        // Verify Kino is a convertible net-new prospect
        $kinoEntity = IndustryNewsEntity::withoutGlobalScopes()
            ->where('normalized_name', 'kinoindonesia')
            ->first();
        $this->assertNotNull($kinoEntity);
        $this->assertNull($kinoEntity->matched_lead_id);

        // 3. Re-running sync with identical RSS feed saves 0 duplicates
        $resyncResponse = $this->actingAs($this->user)->postJson('/api/lead-generator/newsletter/sync', [
            'industry_id' => $this->industry->id,
            'sync' => true,
        ]);

        $resyncResponse->assertOk()
            ->assertJsonPath('data.new_articles_saved', 0);
        $this->assertEquals(2, IndustryNewsArticle::withoutGlobalScopes()->count());

        // 4. Convert Kino entity into a new CRM Lead
        $convertResponse = $this->actingAs($this->user)->postJson('/api/lead-generator/newsletter/convert', [
            'items' => [
                [
                    'entity_id' => $kinoEntity->id,
                    'company_name' => 'PT Kino Indonesia Tbk',
                    'website' => 'https://kino.co.id',
                    'sub_industry_id' => $this->subIndustry->id,
                ],
            ],
            'trigger_ai_enrichment' => false,
        ]);

        $convertResponse->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.converted', 1)
            ->assertJsonPath('data.linked_existing', 0);

        $createdLeadId = $convertResponse->json('data.leads.0.lead_id');
        $this->assertNotNull($createdLeadId);

        $createdLead = Lead::withoutGlobalScopes()->find($createdLeadId);
        $this->assertEquals('PT Kino Indonesia Tbk', $createdLead->company_name);
        $this->assertEquals($this->industry->id, $createdLead->industry_id);
        $this->assertEquals('kino.co.id', $createdLead->website_domain);

        // Entity row is now permanently marked as matched to the new lead
        $this->assertEquals($createdLeadId, $kinoEntity->fresh()->matched_lead_id);
        $this->assertNotNull($kinoEntity->fresh()->converted_at);
    }
}
