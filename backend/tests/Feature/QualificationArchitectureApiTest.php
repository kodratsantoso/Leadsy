<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QualificationArchitectureApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_can_create_and_activate_a_parameter_set(): void
    {
        $this->withoutMiddleware();

        $createResponse = $this->postJson('/api/qualification/parameter-sets', [
            'name' => 'API Test Policy',
            'version' => 'test-v1',
            'status' => 'draft',
            'parameters' => [
                [
                    'dimension' => 'firmographic',
                    'parameter_key' => 'target_industry_fit',
                    'label' => 'Target Industry Fit',
                    'input_type' => 'enum',
                    'max_points' => 15,
                    'is_required' => true,
                    'options' => [
                        ['option_value' => 'high', 'label' => 'High', 'score' => 15],
                        ['option_value' => 'low', 'label' => 'Low', 'score' => 0],
                    ],
                ],
            ],
        ]);

        $createResponse->assertCreated();
        $setId = $createResponse->json('data.id');

        $this->postJson("/api/qualification/parameter-sets/{$setId}/activate")
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        $this->assertDatabaseHas('qualification_parameter_sets', [
            'id' => $setId,
            'status' => 'active',
        ]);
    }

    public function test_it_can_create_and_update_a_workflow_review(): void
    {
        $this->withoutMiddleware();

        $workflowResponse = $this->postJson('/api/qualification/workflows', [
            'name' => 'Review Workflow',
            'slug' => 'review-workflow',
            'trigger_status' => 'need_review',
            'requires_approval' => true,
            'override_enabled' => true,
            'stages' => [
                [
                    'code' => 'triage',
                    'label' => 'Triage',
                    'sequence' => 1,
                    'assigned_role' => 'sales_manager',
                    'decision_type' => 'review',
                ],
            ],
        ]);

        $workflowResponse->assertCreated();
        $workflowId = $workflowResponse->json('data.id');

        $createResponse = $this->postJson('/api/qualification/reviews', [
            'workflow_id' => $workflowId,
            'justification' => 'Lead needs human validation before CRM entry.',
            'recommended_status' => 'need_review',
        ]);

        $createResponse->assertCreated()->assertJsonPath('data.status', 'pending');
        $reviewId = $createResponse->json('data.id');

        $this->putJson("/api/qualification/reviews/{$reviewId}", [
            'status' => 'approved',
            'final_status' => 'potential',
            'justification' => 'Reviewer approved progression after manual verification.',
        ])->assertOk()->assertJsonPath('data.status', 'approved');

        $this->assertDatabaseHas('qualification_workflow_reviews', [
            'id' => $reviewId,
            'status' => 'approved',
            'final_status' => 'potential',
        ]);
    }
}
