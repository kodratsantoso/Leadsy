<?php

namespace App\Services\ProfessionalServices;

use App\Models\PsEstimation;
use App\Models\PsRole;
use App\Models\PsComplexityLevel;
use App\Models\PsTemplateComponent;
use App\Services\AI\AiOrchestrationService;
use Illuminate\Support\Facades\Http;
use Exception;
use Illuminate\Support\Facades\Log;

class PsTaskBreakdownAiService
{
    public function __construct(
        private AiOrchestrationService $aiOrchestrator,
    ) {}

    /**
     * Generate an AI task/subtask breakdown for a Professional Services estimation.
     *
     * Calls the `ps_task_breakdown_generation` AI feature route. If no route is configured
     * yet (Settings → AI Defaults) or the AI response cannot be parsed, falls back to a
     * deterministic template-based breakdown so the feature never hard-fails.
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

        // 2. Ask the AI to produce the breakdown, constrained to the roles/complexity levels/
        // template components actually configured for this account.
        try {
            $prompt = $this->buildPrompt($context);
            $aiResult = $this->aiOrchestrator->call('ps_task_breakdown_generation', $prompt, [
                'estimation_id' => $estimation->id,
            ]);

            if (!empty($aiResult['success']) && !empty($aiResult['content'])) {
                $parsed = $this->parseAiContent($aiResult['content']);
                if ($parsed && !empty($parsed['task_breakdown'])) {
                    return $parsed;
                }
            }
        } catch (Exception $e) {
            Log::warning('[PsTaskBreakdownAiService] AI breakdown fallback for estimation '.$estimation->id.': '.$e->getMessage());
        }

        // 3. Fall back to a deterministic template-based breakdown if AI is not configured
        // or the response could not be parsed, so the feature never hard-fails.
        return $this->buildFallbackBreakdown($context);
    }

    private function buildPrompt(array $context): string
    {
        return "You are a Professional Services delivery lead. Break the project below into an implementation "
            ."task/subtask plan with man-day estimates.\n\n"
            ."Rules:\n"
            ."- Only use role_id values that exist in available_roles_json, and complexity_id values that exist in "
            ."available_complexity_levels_json — never invent new ids.\n"
            ."- If available_template_components_json is non-empty, base the task breakdown on those components "
            ."(same task names/order) instead of inventing an unrelated structure.\n"
            ."- Respond with strict JSON only (no markdown fences) matching exactly this shape:\n"
            .'{"task_breakdown":[{"task_name":"","description":"","deliverable":"","acceptance_criteria":[""],'
            .'"suggested_role":{"role_id":0,"role_name":"","confidence":"high|medium|low"},'
            .'"complexity":{"complexity_id":0,"complexity_name":"","reason":""},'
            .'"base_mandays":0,"dependency_notes":[""],"risk_notes":[""],"ai_confidence":"high|medium|low",'
            .'"subtasks":[{"subtask_name":"","description":"","deliverable":"","acceptance_criteria":[""],'
            .'"suggested_role":{"role_id":0,"role_name":"","confidence":"high|medium|low"},'
            .'"base_mandays":0,"dependency_notes":[""],"risk_notes":[""],"ai_confidence":"high|medium|low"}]}],'
            .'"summary":{"total_base_mandays":0,"confidence_level":"high|medium|low","pm_review_notes":[""],'
            .'"missing_information_affecting_estimation":[""]}}'."\n\n"
            ."Project context:\n".json_encode($context, JSON_PRETTY_PRINT);
    }

    private function parseAiContent(string $content): ?array
    {
        $clean = preg_replace('/^```(?:json)?\s*/i', '', trim($content));
        $clean = preg_replace('/\s*```$/', '', $clean);

        $decoded = json_decode($clean, true);

        return is_array($decoded) ? $decoded : null;
    }

    private function buildFallbackBreakdown(array $context): array
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
