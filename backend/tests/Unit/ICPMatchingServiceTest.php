<?php

namespace Tests\Unit;

use App\Models\Industry;
use App\Models\Lead;
use App\Models\LeadIcpConfig;
use App\Models\Territory;
use App\Services\Revenue\ICPMatchingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ICPMatchingServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_a_strong_match_from_lead_icp_config(): void
    {
        $industry = Industry::create(['name' => 'Manufacturing', 'is_active' => true]);
        $territory = Territory::create([
            'name' => 'Jakarta',
            'center_lat' => -6.2000000,
            'center_lng' => 106.8166660,
            'radius_meters' => 25000,
        ]);

        LeadIcpConfig::create([
            'industry' => 'Manufacturing',
            'size_range' => 'small medium',
            'location' => 'Jakarta',
            'priority_weight' => 90,
        ]);

        $lead = Lead::create([
            'company_name' => 'PT Sukses Industri',
            'industry_id' => $industry->id,
            'company_size_estimate' => 'small',
            'territory_id' => $territory->id,
            'address' => 'Jl. Gatot Subroto, Jakarta',
        ]);

        $result = app(ICPMatchingService::class)->matchLead($lead);

        $this->assertTrue($result['matched']);
        $this->assertSame(100, $result['icp_score']);
        $this->assertSame('strong_match', $result['match_status']);
        $this->assertStringContainsString('strong icp match', strtolower($result['reasoning']));
        $this->assertSame('lead_icp_config', $result['config_source']);
    }

    public function test_it_returns_a_weak_match_when_config_fit_is_low(): void
    {
        $industry = Industry::create(['name' => 'Retail', 'is_active' => true]);

        LeadIcpConfig::create([
            'industry' => 'Manufacturing',
            'size_range' => 'enterprise',
            'location' => 'Surabaya',
            'priority_weight' => 20,
        ]);

        $lead = Lead::create([
            'company_name' => 'CV Kecil Retail',
            'industry_id' => $industry->id,
            'company_size_estimate' => 'small',
            'address' => 'Bandung',
        ]);

        $result = app(ICPMatchingService::class)->matchLead($lead);

        $this->assertTrue($result['matched']);
        $this->assertSame('weak_match', $result['match_status']);
        $this->assertLessThan(55, $result['icp_score']);
        $this->assertStringContainsString('weak icp match', strtolower($result['reasoning']));
    }
}
