<?php

namespace Tests\Feature;

use App\Models\IdxCompanyCache;
use App\Models\User;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IdxCompanyDetailTest extends TestCase
{
    use RefreshDatabase;
    public function test_can_fetch_idx_company_detail_with_stock_trend(): void
    {
        // Ensure cache is populated or create a mock cache
        $cache = IdxCompanyCache::firstOrCreate(
            ['idx_code' => 'BBCA'],
            [
                'company_name' => 'PT Bank Central Asia Tbk.',
                'industry' => 'Bank',
                'sub_industry' => 'Bank',
                'sector' => 'Keuangan',
                'listing_board' => 'Utama',
                'website' => 'https://www.bca.co.id',
                'phone' => '021-23588000',
                'email' => 'investor_relations@bca.co.id',
                'address' => 'Menara BCA, Grand Indonesia',
                'raw_payload_json' => [
                    'KodeEmiten' => 'BBCA',
                    'NamaEmiten' => 'PT Bank Central Asia Tbk.',
                    'KegiatanUsahaUtama' => 'Jasa Perbankan',
                    'NPWP' => '01.308.449.6-091.000',
                    'EfekEmiten_Saham' => true,
                    'EfekEmiten_Obligasi' => true,
                ],
            ]
        );

        $tenant = Tenant::first() ?? Tenant::create(['name' => 'Test Tenant', 'slug' => 'test-tenant']);
        $user = User::first() ?? User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Test User',
            'email' => 'test@leadsy.test',
            'password' => bcrypt('password'),
        ]);

        $response = $this->actingAs($user)->getJson('/api/lead-generator/idx-companies/BBCA');

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('data.idx_code', 'BBCA');
        $response->assertJsonPath('data.tradingview_symbol', 'IDX:BBCA');
        $this->assertNotEmpty($response->json('data.stock_trend.series'));
    }

    public function test_returns_404_for_unknown_emiten(): void
    {
        $tenant = Tenant::first() ?? Tenant::create(['name' => 'Test Tenant', 'slug' => 'test-tenant']);
        $user = User::first() ?? User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Test User',
            'email' => 'test2@leadsy.test',
            'password' => bcrypt('password'),
        ]);

        $response = $this->actingAs($user)->getJson('/api/lead-generator/idx-companies/NONEXISTENT999');

        $response->assertStatus(404);
        $response->assertJsonPath('success', false);
    }
}
