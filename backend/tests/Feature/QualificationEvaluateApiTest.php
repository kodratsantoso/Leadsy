<?php

namespace Tests\Feature;

use Tests\TestCase;

class QualificationEvaluateApiTest extends TestCase
{
    public function test_evaluate_endpoint_returns_explainable_result_contract(): void
    {
        $this->withoutMiddleware();

        $response = $this->postJson('/api/qualification/evaluate', [
            'company_name' => 'Acme Industrial',
            'industry' => 'Manufacturing',
            'company_size_band' => 'medium',
            'territory_fit' => true,
            'target_industry_fit' => 'high',
            'problem_statement' => 'Manual quotation and dispatch process is slowing enterprise deals.',
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
            'required_capabilities' => ['workflow automation', 'approval routing'],
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.status', 'eligible')
            ->assertJsonStructure([
                'data' => [
                    'policy_version',
                    'status',
                    'score',
                    'reasoning',
                    'risk_flags',
                    'recommendation',
                    'hard_stops',
                    'critical_data_gaps',
                    'dimension_breakdown',
                    'input_snapshot',
                ],
            ]);
    }
}
