<?php

namespace Tests\Unit;

use App\Models\Industry;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\LeadContact;
use App\Models\LeadIcpConfig;
use App\Models\LeadSource;
use App\Models\Territory;
use App\Services\Lead\LeadScoringService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LeadScoringServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_calculates_a_hot_lead_with_explainable_breakdown(): void
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
            'priority_weight' => 100,
        ]);

        $lead = Lead::create([
            'company_name' => 'PT Maju Bersama',
            'address' => 'Jl. Sudirman, Jakarta',
            'website' => 'https://maju.test',
            'phone' => '+62 21 555 1000',
            'email' => 'hello@maju.test',
            'industry_id' => $industry->id,
            'company_size_estimate' => 'small',
            'territory_id' => $territory->id,
        ]);

        LeadSource::create([
            'lead_id' => $lead->id,
            'source_type' => 'website',
            'source_ref' => 'https://maju.test',
            'confidence' => 'high',
        ]);

        LeadContact::create([
            'lead_id' => $lead->id,
            'name' => 'Rina',
            'title' => 'Procurement Manager',
            'email' => 'rina@maju.test',
            'phone' => '+62 811 000 111',
            'is_primary' => true,
            'source' => 'manual',
            'confidence_score' => 90,
        ]);

        LeadActivity::create([
            'lead_id' => $lead->id,
            'activity_type' => 'call',
            'description' => 'Qualified discovery call',
            'activity_date' => now()->subDays(2),
        ]);

        $service = app(LeadScoringService::class);

        $result = $service->calculateLeadScore($lead->fresh());
        $record = $service->scoreLead($lead->fresh());

        $this->assertSame(99, $result['score']);
        $this->assertSame('Hot', $result['grade']);
        $this->assertStringContainsString('Strong on', $result['explanation']);
        $this->assertCount(7, $result['breakdown']);

        $this->assertSame(99, $record->score);
        $this->assertSame('Hot', $record->grade);
        $this->assertDatabaseHas('lead_score_breakdowns', [
            'lead_id' => $lead->id,
            'factor' => 'industry_match',
        ]);
        $this->assertDatabaseHas('lead_analysis_logs', [
            'lead_id' => $lead->id,
            'analysis_type' => 'deterministic_lead_score',
        ]);
    }

    public function test_it_calculates_a_cold_lead_when_fit_and_data_are_weak(): void
    {
        $lead = Lead::create([
            'company_name' => 'CV Minim Data',
        ]);

        $service = app(LeadScoringService::class);

        $result = $service->calculateLeadScore($lead);

        $this->assertSame(9, $result['score']);
        $this->assertSame('Cold', $result['grade']);
        $this->assertStringContainsString('Needs improvement', $result['explanation']);
    }
}
