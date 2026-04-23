<?php

namespace Tests\Unit;

use App\Services\Lead\QualificationRuleEngineService;
use Tests\TestCase;

class QualificationRuleEngineServiceTest extends TestCase
{
    public function test_it_marks_strong_lead_as_eligible(): void
    {
        $service = app(QualificationRuleEngineService::class);

        $result = $service->evaluate([
            'company_name' => 'Nusantara Systems',
            'industry' => 'Technology',
            'company_size_band' => 'enterprise',
            'territory_fit' => true,
            'target_industry_fit' => 'high',
            'problem_statement' => 'Revenue leakage due to fragmented lead routing.',
            'pain_level' => 'high',
            'use_case_fit' => 'high',
            'budget_status' => 'confirmed',
            'timeline_months' => 2,
            'commercial_urgency' => 'high',
            'decision_maker_engaged' => true,
            'stakeholder_count' => 3,
            'contact_quality' => 'strong',
            'technical_fit' => 'high',
            'integration_complexity' => 'low',
            'required_capabilities' => ['routing', 'analytics'],
        ]);

        $this->assertSame('eligible', $result['status']);
        $this->assertGreaterThanOrEqual(80, $result['score']);
        $this->assertEmpty($result['hard_stops']);
    }

    public function test_it_routes_incomplete_lead_to_need_review(): void
    {
        $service = app(QualificationRuleEngineService::class);

        $result = $service->evaluate([
            'company_name' => 'Sparse Record Ltd',
            'company_size_band' => 'unknown',
            'target_industry_fit' => 'unknown',
            'budget_status' => 'unknown',
            'technical_fit' => 'unknown',
            'decision_maker_engaged' => null,
        ]);

        $this->assertSame('need_review', $result['status']);
        $this->assertNotEmpty($result['critical_data_gaps']);
    }

    public function test_it_hard_stops_leads_with_low_technical_fit(): void
    {
        $service = app(QualificationRuleEngineService::class);

        $result = $service->evaluate([
            'company_name' => 'Impossible Fit Co',
            'target_industry_fit' => 'high',
            'problem_statement' => 'Needs an on-prem stack we do not support.',
            'budget_status' => 'confirmed',
            'decision_maker_engaged' => true,
            'technical_fit' => 'low',
        ]);

        $this->assertSame('not_eligible', $result['status']);
        $this->assertNotEmpty($result['hard_stops']);
    }
}
