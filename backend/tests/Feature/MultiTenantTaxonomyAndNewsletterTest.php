<?php

namespace Tests\Feature;

use App\Http\Middleware\CheckPermission;
use App\Models\BusinessCategory;
use App\Models\Industry;
use App\Models\Lead;
use App\Models\Product;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Enrichment\LeadMasterDataMapperService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MultiTenantTaxonomyAndNewsletterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(CheckPermission::class);
    }

    public function test_technogym_preset_isolates_tenant_taxonomy_products_and_supports_3d_newsletter_flow(): void
    {
        // Tenant 1: Existing B2B IT Workspace using Global Default taxonomy (tenant_id = null)
        $tenantIt = Tenant::create([
            'name' => 'Prasetia Enterprise IT',
            'slug' => 'prasetia-it',
            'status' => 'active',
        ]);
        $userIt = User::create([
            'tenant_id' => $tenantIt->id,
            'name' => 'IT Sales',
            'email' => 'sales@prasetia.co.id',
            'password' => bcrypt('password123'),
        ]);

        $globalInd = Industry::create([
            'tenant_id' => null,
            'name' => 'Technology & IT Services',
            'is_active' => true,
        ]);

        // Tenant 2: Dedicated Wellness / Technogym Tenant
        $tenantWellness = Tenant::create([
            'name' => 'Technogym Indonesia',
            'slug' => 'technogym-id',
            'status' => 'active',
        ]);
        $userWellness = User::create([
            'tenant_id' => $tenantWellness->id,
            'name' => 'Wellness Consultant',
            'email' => 'consultant@technogym.id',
            'password' => bcrypt('password123'),
        ]);

        // Apply Technogym Vertical Preset + Product Catalog to Tenant 2
        $applyRes = $this->actingAs($userWellness)->postJson('/api/settings/taxonomy-presets/apply', [
            'preset_key' => 'wellness_commercial_technogym',
            'include_products' => true,
        ]);

        $applyRes->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.industries_synced', 5)
            ->assertJsonPath('data.sub_industries_synced', 24)
            ->assertJsonPath('data.business_categories_synced', 19)
            ->assertJsonPath('data.products_synced', 9);

        // Verify Tenant 1 STILL sees only its global default taxonomy (untouched!)
        $itIndRes = $this->actingAs($userIt)->getJson('/api/industries');
        $itIndRes->assertOk();
        $this->assertCount(1, $itIndRes->json('data'));
        $this->assertSame($globalInd->id, $itIndRes->json('data.0.id'));

        // Verify Tenant 2 sees ONLY its 5 Technogym segments and 19 LOB categories
        $tgIndRes = $this->actingAs($userWellness)->getJson('/api/industries');
        $tgIndRes->assertOk()->assertJsonPath('meta.is_tenant_isolated', true);
        $this->assertCount(5, $tgIndRes->json('data'));

        $hrSegment = Industry::forTenantOrDefault($tenantWellness->id)
            ->where('name', 'Hospitality & Residential (H&R)')
            ->firstOrFail();

        // Cascading Business Categories for H&R returns only H&R's 5 LOBs (205, 208, 210, 211, 215)
        $hrCatRes = $this->actingAs($userWellness)->getJson("/api/business-categories?industry_id={$hrSegment->id}");
        $hrCatRes->assertOk();
        $codes = collect($hrCatRes->json('data'))->pluck('code')->sort()->values()->all();
        $this->assertSame(['205', '208', '210', '211', '215'], $codes);

        // Verify Mapper resolves #LOB codes and labels cleanly within Tenant 2
        /** @var LeadMasterDataMapperService $mapper */
        $mapper = app(LeadMasterDataMapperService::class);
        $mappedLob205 = $mapper->mapBusinessCategory('[205] Hotel & Resorts', $hrSegment->id, $tenantWellness->id);
        $this->assertNotNull($mappedLob205);
        $this->assertSame('205', $mappedLob205->code);

        $mappedLob905 = $mapper->mapBusinessCategory('905', null, $tenantWellness->id);
        $this->assertNotNull($mappedLob905);
        $this->assertSame('partner_influencer', $mappedLob905->channel_role);

        // Verify 9 Technogym Products are isolated to Tenant 2
        $this->assertSame(9, Product::withoutGlobalScopes()->where('tenant_id', $tenantWellness->id)->count());
        $this->assertSame(0, Product::withoutGlobalScopes()->where('tenant_id', $tenantIt->id)->count());

        // Verify 3D Industry Newsletter: Industry + Sub-Industry + Business Category (#LOB 205)
        $luxuryHotelsSub = $hrSegment->subIndustries()
            ->where('name', 'Luxury Hotels & Resorts (4 & 5 Star)')
            ->firstOrFail();

        $newsletterIndRes = $this->actingAs($userWellness)->getJson('/api/lead-generator/newsletter/industries');
        $newsletterIndRes->assertOk();
        $hrOption = collect($newsletterIndRes->json('data'))->firstWhere('id', $hrSegment->id);
        $this->assertNotNull($hrOption);
        $this->assertCount(5, $hrOption['business_categories']);

        $mockRssXml = <<<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Google News</title>
    <item>
      <title>PT Metropolitan Land Tbk Bangun Luxury Resort Bintang Lima Baru di Bali - Bisnis.com</title>
      <link>https://properti.bisnis.com/read/20261105/metland-luxury-resort-bali</link>
      <pubDate>Thu, 05 Nov 2026 02:00:00 GMT</pubDate>
      <description><![CDATA[PT Metropolitan Land Tbk resmi memulai pembangunan resor bintang lima dengan fasilitas wellness spa premium.]]></description>
      <source url="https://properti.bisnis.com">Bisnis.com</source>
    </item>
  </channel>
</rss>
XML;

        Http::fake([
            'https://news.google.com/*' => Http::response($mockRssXml, 200),
            '*' => Http::response(['organic' => []], 200),
        ]);

        $syncRes = $this->actingAs($userWellness)->postJson('/api/lead-generator/newsletter/sync', [
            'industry_id' => $hrSegment->id,
            'sub_industry_id' => $luxuryHotelsSub->id,
            'business_category_id' => $mappedLob205->id,
            'region_scope' => 'id',
            'sync' => true,
        ]);

        $syncRes->assertOk()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.business_category_id', $mappedLob205->id);

        // Read back filtered by all 3 dimensions
        $feedRes = $this->actingAs($userWellness)->getJson(sprintf(
            '/api/lead-generator/newsletter?industry_id=%d&sub_industry_id=%d&business_category_id=%d',
            $hrSegment->id,
            $luxuryHotelsSub->id,
            $mappedLob205->id
        ));

        $feedRes->assertOk()
            ->assertJsonPath('data.telemetry.total_articles', 1)
            ->assertJsonPath('data.articles.0.business_category.code', '205');

        $entityId = $feedRes->json('data.entity_directory.0.representative_entity_id');
        $this->assertNotNull($entityId);

        // Convert entity -> verify Lead receives Industry + Sub-Industry + Business Category (#LOB 205)
        $convertRes = $this->actingAs($userWellness)->postJson('/api/lead-generator/newsletter/convert', [
            'items' => [
                [
                    'entity_id' => $entityId,
                    'sub_industry_id' => $luxuryHotelsSub->id,
                    'business_category_id' => $mappedLob205->id,
                ],
            ],
            'trigger_ai_enrichment' => false,
        ]);

        $convertRes->assertOk()
            ->assertJsonPath('data.converted', 1);

        $createdLeadId = $convertRes->json('data.leads.0.lead_id');
        $createdLead = Lead::withoutGlobalScopes()->findOrFail($createdLeadId);
        $this->assertSame($hrSegment->id, (int) $createdLead->industry_id);
        $this->assertSame($luxuryHotelsSub->id, (int) $createdLead->sub_industry_id);
        $this->assertSame($mappedLob205->id, (int) $createdLead->business_category_id);
        $this->assertSame('Hotel & Resorts', $createdLead->business_category);
    }
}
