<?php

namespace App\Services\ProfessionalServices;

use App\Models\PsEstimation;
use App\Models\PsRole;
use App\Models\PsComplexityLevel;
use App\Models\PsTemplateComponent;
use Illuminate\Support\Facades\Http;
use Exception;
use Illuminate\Support\Facades\Log;

class PsTaskBreakdownAiService
{
    /**
     * Call the internal AiOutputController or similar AI framework to generate the breakdown.
     * Since we might not have a direct service for the AI Routing, we will mock the AI call structure 
     * based on standard Leadsy AI practices, or call the provider directly if we must.
     * 
     * Assuming we use the standard approach, we'd normally dispatch an AiRequest. 
     * For now, we'll implement a direct parser/generator method assuming we get the JSON back.
     */
    public function generateBreakdown(PsEstimation $estimation): array
    {
        // 1. Gather Context
        $roles = PsRole::where('is_active', true)->get(['id', 'name', 'description']);
        $complexities = PsComplexityLevel::where('is_active', true)->get(['id', 'name', 'multiplier']);
        
        $components = collect();
        if ($estimation->template_id) {
            $components = PsTemplateComponent::where('template_id', $estimation->template_id)
                ->orderBy('sort_order')
                ->get(['id', 'task_name', 'description', 'base_mandays', 'component_type', 'parent_component_id']);
        }

        $context = [
            'project_summary' => $estimation->title,
            'business_objective' => $estimation->lead ? $estimation->lead->customer_story : '',
            'in_scope' => 'Standard Professional Services',
            'out_of_scope' => $estimation->out_of_scope ?? 'None specified',
            'assumptions' => $estimation->assumptions ?? 'None specified',
            'dependencies' => $estimation->dependencies ?? 'None specified',
            'risks' => $estimation->risks ?? 'None specified',
            'missing_information' => $estimation->internal_notes ?? 'None specified',
            
            'selected_template' => $estimation->template ? $estimation->template->name : 'Custom',
            'service_category' => $estimation->category ? $estimation->category->name : 'Uncategorized',
            'selected_complexity' => $estimation->complexityLevel ? $estimation->complexityLevel->name : 'Standard',
            
            'available_roles_json' => $roles->toJson(),
            'available_complexity_levels_json' => $complexities->toJson(),
            'available_template_components_json' => $components->toJson(),
        ];

        // 2. Mocking the AI Response for now since we don't have the full internal AI SDK booted in this context.
        // In reality, this would hit the `AiFeatureRoute` and get a parsed response.
        
        // Let's create a simulated realistic response based on the context
        return $this->simulateAiResponse($context);
    }
    
    private function simulateAiResponse(array $context): array
    {
        $roleId = json_decode($context['available_roles_json'], true)[0]['id'] ?? 1;
        $complexityId = json_decode($context['available_complexity_levels_json'], true)[0]['id'] ?? 1;
        
        return [
            'task_breakdown' => [
                [
                    'task_name' => 'Project Discovery & Requirement Gathering',
                    'description' => 'Initial workshops with stakeholders to finalize scope.',
                    'deliverable' => 'Business Requirements Document (BRD)',
                    'acceptance_criteria' => ['BRD signed off by client'],
                    'suggested_role' => [
                        'role_id' => $roleId,
                        'role_name' => 'Solution Architect',
                        'confidence' => 'high'
                    ],
                    'complexity' => [
                        'complexity_id' => $complexityId,
                        'complexity_name' => 'Standard',
                        'reason' => 'Standard workshops'
                    ],
                    'base_mandays' => 3.5,
                    'dependency_notes' => ['Client availability'],
                    'risk_notes' => ['Delays in sign-off'],
                    'ai_confidence' => 'high',
                    'subtasks' => [
                        [
                            'subtask_name' => 'Workshop 1: As-Is Process',
                            'description' => 'Analyze current processes',
                            'deliverable' => 'Process Map',
                            'acceptance_criteria' => [],
                            'suggested_role' => [
                                'role_id' => $roleId,
                                'role_name' => 'Solution Architect',
                                'confidence' => 'high'
                            ],
                            'base_mandays' => 1.0,
                            'dependency_notes' => [],
                            'risk_notes' => [],
                            'ai_confidence' => 'high'
                        ],
                        [
                            'subtask_name' => 'Workshop 2: To-Be Process',
                            'description' => 'Design future processes',
                            'deliverable' => 'Future Process Map',
                            'acceptance_criteria' => [],
                            'suggested_role' => [
                                'role_id' => $roleId,
                                'role_name' => 'Solution Architect',
                                'confidence' => 'high'
                            ],
                            'base_mandays' => 2.5,
                            'dependency_notes' => [],
                            'risk_notes' => [],
                            'ai_confidence' => 'high'
                        ]
                    ]
                ]
            ],
            'summary' => [
                'total_base_mandays' => 3.5,
                'confidence_level' => 'high',
                'pm_review_notes' => ['Please verify the total workshop days needed.'],
                'missing_information_affecting_estimation' => []
            ]
        ];
    }
}
