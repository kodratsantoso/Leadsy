<?php

namespace Database\Seeders;

use App\Models\AiFeatureRoute;
use App\Models\AiModel;
use App\Models\AiPromptTemplate;
use App\Models\AiPromptTemplateVersion;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PsTaskBreakdownAiSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::transaction(function () {
            // Get default model or fallback
            $model = AiModel::where('name', 'gemini-1.5-pro')->first() 
                ?? AiModel::first();
            
            if (!$model) {
                return; // No AI model available
            }

            // Create Feature Route
            AiFeatureRoute::updateOrCreate(
                ['feature_name' => 'professional_service_task_breakdown'],
                [
                    'ai_model_id' => $model->id,
                    'priority' => 1,
                    'max_retries' => 2,
                ]
            );

            // Create Prompt Template

            $template = AiPromptTemplate::updateOrCreate(
                ['feature_name' => 'professional_service_task_breakdown'],
                [
                    'template_name' => 'Professional Service Task Breakdown',
                    'description' => 'Generates structured task and subtask breakdown for Professional Services projects',
                    'is_active' => true,
                    'created_by' => 1
                ]
            );

            $systemPrompt = <<<EOT
You are an expert Project Manager and Solution Architect for a professional services organization.
Your goal is to break down a project scope into a detailed, hierarchical structure of tasks and subtasks that can be used for effort estimation and project delivery.

You must return your output strictly in JSON format matching this schema:
{
  "task_breakdown": [
    {
      "task_name": "Name of the task group",
      "description": "Brief description of the task",
      "deliverable": "Key deliverable from this task",
      "acceptance_criteria": ["criteria 1", "criteria 2"],
      "suggested_role": {
        "role_id": ID of matched role,
        "role_name": "Matched role name",
        "confidence": "high|medium|low"
      },
      "complexity": {
        "complexity_id": ID of matched complexity level,
        "complexity_name": "Matched complexity name",
        "reason": "Why this complexity was chosen"
      },
      "base_mandays": Number or null,
      "dependency_notes": ["dependency 1"],
      "risk_notes": ["risk 1"],
      "ai_confidence": "high|medium|low",
      "subtasks": [
         {
           "subtask_name": "Name of subtask",
           "description": "...",
           "deliverable": "...",
           "acceptance_criteria": [],
           "suggested_role": { "role_id": null, "role_name": "", "confidence": "" },
           "base_mandays": Number or null,
           "dependency_notes": [],
           "risk_notes": [],
           "ai_confidence": "high|medium|low"
         }
      ]
    }
  ],
  "summary": {
    "total_base_mandays": Total number,
    "confidence_level": "high|medium|low",
    "pm_review_notes": ["Note 1 for PM"],
    "missing_information_affecting_estimation": ["Missing piece 1"]
  }
}

Rules:
1. ONLY return JSON. No markdown wrappers.
2. If the input scope is insufficient to determine ManDays, set `base_mandays` to null and set confidence to `low`, and add a note in `missing_information_affecting_estimation`.
3. You MUST map roles strictly to the list of `available_professional_service_roles`.
4. You MUST map complexity strictly to the list of `available_complexity_levels`.
5. Break down logical groups (e.g., Requirement Gathering, Configuration, Testing, Training).
6. Do not fabricate scope not implied by the project context.
EOT;

            $userPrompt = <<<EOT
Project Context:
Project Summary: {{project_summary}}
Business Objective: {{business_objective}}
In Scope: {{in_scope}}
Out of Scope: {{out_of_scope}}
Assumptions: {{assumptions}}
Dependencies: {{dependencies}}
Risks: {{risks}}
Missing Information: {{missing_information}}

Selected Template: {{selected_template}}
Suggested Service Category: {{service_category}}
Selected Complexity: {{selected_complexity}}

Available Configuration:
Available Roles:
{{available_roles_json}}

Available Complexity Levels:
{{available_complexity_levels_json}}

Available Template Components:
{{available_template_components_json}}

Generate the JSON task breakdown based on the rules and context above.
EOT;

            // Only create a new version if there isn't one or we want to overwrite
            // We'll just create a new version as active
            $versionNumber = $template->versions()->max('version') + 1;
            
            $version = AiPromptTemplateVersion::create([
                'ai_prompt_template_id' => $template->id,
                'version' => $versionNumber,
                'system_prompt' => $systemPrompt,
                'user_prompt' => $userPrompt,
                'variables_schema_json' => [
                    'project_summary', 'business_objective', 'in_scope', 'out_of_scope', 
                    'assumptions', 'dependencies', 'risks', 'missing_information', 
                    'selected_template', 'service_category', 'selected_complexity', 
                    'available_roles_json', 'available_complexity_levels_json', 'available_template_components_json'
                ],
                'is_active' => true,
                'is_enabled' => true,
                'created_by' => 1
            ]);

            // Deactivate older versions
            AiPromptTemplateVersion::where('ai_prompt_template_id', $template->id)
                ->where('id', '!=', $version->id)
                ->update(['is_active' => false]);
        });
    }
}
