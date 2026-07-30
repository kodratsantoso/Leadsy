<?php

namespace App\Services\ProfessionalServices;

use App\Models\PsEstimation;
use App\Models\PsProjectPlan;
use App\Models\PsProjectTask;
use App\Models\PsProjectMilestone;
use App\Models\PsProjectResource;
use App\Models\PsProjectDeliveryChecklist;
use App\Models\PsProjectRisk;
use App\Models\PsProjectReadinessItem;
use App\Models\LeadActivity;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PsProjectPlanningService
{
    public function generatePlanFromEstimation(int $estimationId, int $userId): PsProjectPlan
    {
        return DB::transaction(function () use ($estimationId, $userId) {
            $estimation = PsEstimation::with(['lines.role', 'lines.subtasks', 'lead'])->findOrFail($estimationId);

            // 1. Eligibility Check
            $allowedStatuses = ['approved', 'signed', 'converted_to_quotation'];
            if (!in_array($estimation->status, $allowedStatuses)) {
                throw new Exception("Estimation must be Approved or Signed to create a Project Plan.");
            }
            if ($estimation->projectPlan) {
                throw new Exception("A Project Plan already exists for this estimation.");
            }

            // 2. Create Header
            $plan = PsProjectPlan::create([
                'project_plan_number' => 'PRJ-' . strtoupper(Str::random(6)) . '-' . date('Ym'),
                'estimation_id' => $estimation->id,
                'lead_id' => $estimation->lead_id,
                'quotation_id' => $estimation->converted_quotation_id,
                'project_name' => $estimation->title . ' Delivery Plan',
                'customer_name_snapshot' => $estimation->lead ? $estimation->lead->company_name : null,
                'project_status' => 'Draft Plan',
                'total_estimated_mandays' => $estimation->total_final_mandays,
                'service_category_id' => $estimation->service_category_id,
                'complexity_level_id' => $estimation->complexity_level_id,
                'created_by' => $userId,
                'updated_by' => $userId,
            ]);

            // 3. Create Tasks (recursive)
            $this->createTasks($plan, $estimation->lines->whereNull('parent_task_id'));

            // 4. Create Milestones
            $this->createDefaultMilestones($plan);

            // 5. Create Resource Plan (aggregated by role)
            $this->createResourcePlan($plan, $estimation);

            // 6. Create Delivery Checklists (UAT, Training, Handover, Hypercare)
            $this->createDeliveryChecklists($plan);

            // 7. Create Risks
            $this->createRisks($plan, $estimation);

            // 8. Create Readiness Items
            $this->createReadinessItems($plan);

            // 9. Log Activity
            if ($plan->lead_id) {
                LeadActivity::create([
                    'lead_id' => $plan->lead_id,
                    'user_id' => $userId,
                    'type' => 'professional_services',
                    'title' => 'Project Plan Drafted',
                    'description' => "Created initial Project Delivery Plan from Estimation {$estimation->estimation_number}",
                    'metadata' => [
                        'estimation_id' => $estimation->id,
                        'project_plan_id' => $plan->id
                    ]
                ]);
            }

            return $plan->load(['tasks', 'milestones', 'resources', 'deliveryChecklists', 'risks', 'readinessItems']);
        });
    }

    private function createTasks(PsProjectPlan $plan, $estimationLines, $parentTaskId = null)
    {
        foreach ($estimationLines as $line) {
            $taskType = $line->task_type ?? 'task'; // phase, task, subtask
            
            $task = PsProjectTask::create([
                'project_plan_id' => $plan->id,
                'source_estimation_task_id' => $line->id,
                'parent_task_id' => $parentTaskId,
                'task_type' => $taskType,
                'task_name' => $line->task_name ?: ($line->subtask_name ?: 'Unnamed Task'),
                'description' => $line->description,
                'deliverable' => $line->deliverable,
                'acceptance_criteria' => $line->acceptance_criteria,
                'assigned_role_id' => $line->role_id,
                'estimated_mandays' => $line->final_mandays ?? 0,
                'dependency_notes' => $line->dependency_notes,
                'risk_notes' => $line->risk_notes,
                'sort_order' => $line->sort_order,
                'status' => 'Not Started',
                'priority' => 'Medium',
            ]);

            // Recursively create subtasks
            if ($line->subtasks && $line->subtasks->count() > 0) {
                $this->createTasks($plan, $line->subtasks, $task->id);
            }
        }
    }

    private function createDefaultMilestones(PsProjectPlan $plan)
    {
        $milestones = [
            'Kickoff',
            'Requirement Confirmation',
            'Solution Design Sign-off',
            'Configuration / Development Complete',
            'Internal Testing Complete',
            'UAT Sign-off',
            'Training Complete',
            'Go-Live',
            'Handover Complete',
            'Hypercare Complete'
        ];

        foreach ($milestones as $index => $name) {
            PsProjectMilestone::create([
                'project_plan_id' => $plan->id,
                'milestone_name' => $name,
                'status' => 'Not Started',
                'sort_order' => $index + 1
            ]);
        }
    }

    private function createResourcePlan(PsProjectPlan $plan, PsEstimation $estimation)
    {
        // Aggregate roles from lines
        $roleMandays = [];
        $this->aggregateRoleMandays($estimation->lines, $roleMandays);

        foreach ($roleMandays as $roleId => $mandays) {
            PsProjectResource::create([
                'project_plan_id' => $plan->id,
                'role_id' => $roleId,
                'estimated_mandays' => $mandays,
            ]);
        }
    }

    private function aggregateRoleMandays($lines, &$roleMandays)
    {
        foreach ($lines as $line) {
            if ($line->role_id) {
                if (!isset($roleMandays[$line->role_id])) {
                    $roleMandays[$line->role_id] = 0;
                }
                $roleMandays[$line->role_id] += $line->final_mandays ?? 0;
            }
            if ($line->subtasks) {
                $this->aggregateRoleMandays($line->subtasks, $roleMandays);
            }
        }
    }

    private function createDeliveryChecklists(PsProjectPlan $plan)
    {
        $types = [
            'uat' => [
                ['label' => 'UAT scenario prepared', 'completed' => false],
                ['label' => 'UAT user confirmed', 'completed' => false],
                ['label' => 'UAT environment ready', 'completed' => false],
                ['label' => 'UAT data prepared', 'completed' => false],
                ['label' => 'UAT sign-off received', 'completed' => false],
            ],
            'training' => [
                ['label' => 'Training schedule confirmed', 'completed' => false],
                ['label' => 'Training material prepared', 'completed' => false],
                ['label' => 'End-user training completed', 'completed' => false],
            ],
            'handover' => [
                ['label' => 'Final configuration documented', 'completed' => false],
                ['label' => 'Access/admin ownership handed over', 'completed' => false],
                ['label' => 'Support channel confirmed', 'completed' => false],
            ],
            'hypercare' => [
                ['label' => 'Hypercare period confirmed', 'completed' => false],
                ['label' => 'Support SLA confirmed', 'completed' => false],
                ['label' => 'Hypercare closure confirmed', 'completed' => false],
            ]
        ];

        foreach ($types as $type => $items) {
            PsProjectDeliveryChecklist::create([
                'project_plan_id' => $plan->id,
                'checklist_type' => $type,
                'checklist_items' => $items,
                'status' => 'Pending'
            ]);
        }
    }

    private function createRisks(PsProjectPlan $plan, PsEstimation $estimation)
    {
        if (!empty($estimation->risks)) {
            PsProjectRisk::create([
                'project_plan_id' => $plan->id,
                'risk_title' => 'Initial Estimation Risk',
                'risk_description' => $estimation->risks,
                'risk_level' => 'Medium',
                'status' => 'Open'
            ]);
        }
    }

    private function createReadinessItems(PsProjectPlan $plan)
    {
        $items = [
            'Estimation approved',
            'SOW / Scope document generated',
            'PM assigned',
            'Delivery roles assigned',
            'Customer PIC confirmed',
            'Kickoff date confirmed',
            'Timeline confirmed',
        ];

        foreach ($items as $index => $item) {
            PsProjectReadinessItem::create([
                'project_plan_id' => $plan->id,
                'item_name' => $item,
                'is_required' => true,
                'is_completed' => ($item === 'Estimation approved'), // Auto check if true
                'sort_order' => $index + 1
            ]);
        }
    }
}
