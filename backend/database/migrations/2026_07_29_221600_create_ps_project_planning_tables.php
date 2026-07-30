<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. ps_project_plans (Header)
        Schema::create('ps_project_plans', function (Blueprint $table) {
            $table->id();
            $table->string('project_plan_number')->unique();
            $table->foreignId('estimation_id')->constrained('ps_estimations')->onDelete('cascade');
            $table->foreignId('lead_id')->nullable()->constrained('leads')->onDelete('set null');
            $table->foreignId('quotation_id')->nullable()->constrained('lead_quotations')->onDelete('set null');
            $table->foreignId('sales_order_id')->nullable()->constrained('lead_sales_orders')->onDelete('set null');
            
            $table->string('project_name');
            $table->string('customer_name_snapshot')->nullable();
            
            // Draft Plan, Ready for Kickoff, Active, On Hold, Completed, Cancelled, Archived
            $table->string('project_status')->default('Draft Plan'); 
            
            $table->date('project_start_date')->nullable();
            $table->date('target_go_live_date')->nullable();
            $table->date('target_completion_date')->nullable();
            
            $table->integer('estimated_duration_days')->nullable();
            $table->decimal('total_estimated_mandays', 8, 2)->default(0);
            
            $table->foreignId('service_category_id')->nullable()->constrained('ps_service_categories')->onDelete('set null');
            $table->foreignId('estimation_template_id')->nullable()->constrained('ps_estimation_templates')->onDelete('set null');
            $table->foreignId('complexity_level_id')->nullable()->constrained('ps_complexity_levels')->onDelete('set null');
            
            $table->foreignId('project_manager_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('solution_architect_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('main_consultant_id')->nullable()->constrained('users')->onDelete('set null');
            
            $table->text('delivery_notes')->nullable();
            $table->text('risk_summary')->nullable();
            
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });

        // 2. ps_project_tasks (Tasks & Subtasks)
        Schema::create('ps_project_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_plan_id')->constrained('ps_project_plans')->onDelete('cascade');
            $table->foreignId('source_estimation_task_id')->nullable()->constrained('ps_estimation_lines')->onDelete('set null');
            $table->foreignId('parent_task_id')->nullable()->constrained('ps_project_tasks')->onDelete('cascade');
            
            // phase, task, subtask, milestone
            $table->string('task_type')->default('task');
            $table->string('task_name');
            $table->text('description')->nullable();
            $table->text('deliverable')->nullable();
            $table->json('acceptance_criteria')->nullable();
            
            $table->foreignId('assigned_role_id')->nullable()->constrained('ps_roles')->onDelete('set null');
            $table->foreignId('assigned_user_id')->nullable()->constrained('users')->onDelete('set null');
            
            $table->decimal('estimated_mandays', 8, 2)->default(0);
            
            $table->date('planned_start_date')->nullable();
            $table->date('planned_end_date')->nullable();
            $table->integer('duration_days')->nullable();
            
            $table->json('dependency_notes')->nullable();
            $table->foreignId('predecessor_task_id')->nullable()->constrained('ps_project_tasks')->onDelete('set null');
            
            // Not Started, In Progress, Blocked, Done, Cancelled
            $table->string('status')->default('Not Started');
            $table->string('priority')->default('Medium');
            
            $table->json('risk_notes')->nullable();
            $table->integer('sort_order')->default(0);
            
            $table->timestamps();
        });

        // 3. ps_project_milestones
        Schema::create('ps_project_milestones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_plan_id')->constrained('ps_project_plans')->onDelete('cascade');
            $table->string('milestone_name');
            $table->text('description')->nullable();
            $table->date('planned_date')->nullable();
            $table->foreignId('owner_id')->nullable()->constrained('users')->onDelete('set null');
            
            // Not Started, In Progress, Achieved, Delayed, Cancelled
            $table->string('status')->default('Not Started');
            $table->text('dependency_notes')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // 4. ps_project_resources
        Schema::create('ps_project_resources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_plan_id')->constrained('ps_project_plans')->onDelete('cascade');
            $table->foreignId('role_id')->constrained('ps_roles')->onDelete('restrict');
            $table->foreignId('assigned_user_id')->nullable()->constrained('users')->onDelete('set null');
            
            $table->decimal('estimated_mandays', 8, 2)->default(0);
            $table->date('planned_start_date')->nullable();
            $table->date('planned_end_date')->nullable();
            $table->integer('allocation_percentage')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 5. ps_project_delivery_checklists (for UAT, Training, Handover, Hypercare)
        Schema::create('ps_project_delivery_checklists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_plan_id')->constrained('ps_project_plans')->onDelete('cascade');
            // uat, training, handover, hypercare
            $table->string('checklist_type'); 
            
            $table->date('planned_start_date')->nullable();
            $table->date('planned_end_date')->nullable();
            $table->foreignId('owner_id')->nullable()->constrained('users')->onDelete('set null');
            
            $table->text('scope_notes')->nullable();
            $table->json('checklist_items')->nullable(); // array of { "label": "...", "completed": boolean }
            
            $table->string('status')->default('Pending');
            $table->text('general_notes')->nullable();
            $table->timestamps();
        });

        // 6. ps_project_risks
        Schema::create('ps_project_risks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_plan_id')->constrained('ps_project_plans')->onDelete('cascade');
            
            $table->string('risk_title');
            $table->text('risk_description')->nullable();
            // Low, Medium, High, Critical
            $table->string('risk_level')->default('Medium');
            $table->text('mitigation_plan')->nullable();
            $table->foreignId('owner_id')->nullable()->constrained('users')->onDelete('set null');
            
            // Open, Monitoring, Mitigated, Closed
            $table->string('status')->default('Open');
            
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });

        // 7. ps_project_readiness_items
        Schema::create('ps_project_readiness_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_plan_id')->constrained('ps_project_plans')->onDelete('cascade');
            
            $table->string('item_name');
            $table->boolean('is_required')->default(true);
            $table->boolean('is_completed')->default(false);
            $table->string('override_reason')->nullable();
            $table->foreignId('overridden_by')->nullable()->constrained('users')->onDelete('set null');
            
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ps_project_readiness_items');
        Schema::dropIfExists('ps_project_risks');
        Schema::dropIfExists('ps_project_delivery_checklists');
        Schema::dropIfExists('ps_project_resources');
        Schema::dropIfExists('ps_project_milestones');
        Schema::dropIfExists('ps_project_tasks');
        Schema::dropIfExists('ps_project_plans');
    }
};
