<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. ps_psa_settings
        Schema::create('ps_psa_settings', function (Blueprint $table) {
            $table->id();
            $table->decimal('hours_per_manday', 4, 2)->default(8.00);
            $table->boolean('require_work_log_approval')->default(true);
            $table->boolean('require_bast_before_project_close')->default(true);
            $table->boolean('require_uat_signoff_before_bast')->default(false);
            $table->boolean('require_handover_before_bast')->default(false);
            $table->boolean('require_signed_sow_before_active')->default(true);
            $table->boolean('require_sales_order_before_active')->default(false);
            
            $table->integer('actual_md_watch_threshold_percentage')->default(80);
            $table->integer('actual_md_at_risk_threshold_percentage')->default(95);
            $table->integer('actual_md_overrun_threshold_percentage')->default(100);
            
            $table->integer('blocked_task_alert_days')->default(3);
            $table->integer('pending_change_request_alert_days')->default(5);
            
            $table->boolean('allow_timesheet_on_unassigned_task')->default(true);
            $table->boolean('allow_work_log_after_project_closed')->default(false);
            $table->boolean('require_reason_for_task_reopen')->default(true);
            $table->timestamps();
        });

        // 2. ps_work_logs
        Schema::create('ps_work_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_plan_id')->constrained('ps_project_plans')->onDelete('cascade');
            $table->foreignId('project_task_id')->nullable()->constrained('ps_project_tasks')->onDelete('set null');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('role_id')->nullable()->constrained('ps_roles')->onDelete('set null');
            
            $table->date('work_date');
            $table->decimal('actual_mandays', 8, 2);
            $table->decimal('work_hours', 8, 2)->nullable();
            
            $table->text('work_description')->nullable();
            $table->string('work_type')->default('delivery'); // delivery, meeting, configuration, development, etc.
            
            $table->boolean('billable')->default(true);
            $table->string('approval_status')->default('Draft'); // Draft, Submitted, Approved, Rejected
            
            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });

        // 3. ps_project_actual_summaries
        Schema::create('ps_project_actual_summaries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_plan_id')->unique()->constrained('ps_project_plans')->onDelete('cascade');
            
            $table->decimal('estimated_mandays', 8, 2)->default(0);
            $table->decimal('planned_mandays', 8, 2)->default(0);
            
            $table->decimal('submitted_actual_mandays', 8, 2)->default(0);
            $table->decimal('approved_actual_mandays', 8, 2)->default(0);
            $table->decimal('remaining_mandays', 8, 2)->default(0);
            
            $table->decimal('variance_mandays', 8, 2)->default(0);
            $table->decimal('variance_percentage', 8, 2)->default(0);
            $table->decimal('burn_rate', 8, 2)->default(0);
            
            $table->string('overrun_status')->default('On Track'); // On Track, Watch, At Risk, Overrun
            
            // Profitability Lite
            $table->decimal('revenue_amount', 15, 2)->default(0);
            $table->decimal('estimated_cost', 15, 2)->default(0);
            $table->decimal('actual_cost', 15, 2)->default(0);
            
            $table->decimal('estimated_margin_amount', 15, 2)->default(0);
            $table->decimal('estimated_margin_percentage', 8, 2)->default(0);
            $table->decimal('actual_margin_amount', 15, 2)->default(0);
            $table->decimal('actual_margin_percentage', 8, 2)->default(0);
            $table->decimal('margin_variance', 15, 2)->default(0);
            
            $table->timestamps();
        });

        // 4. ps_change_requests
        Schema::create('ps_change_requests', function (Blueprint $table) {
            $table->id();
            $table->string('change_request_number')->unique();
            $table->foreignId('project_plan_id')->constrained('ps_project_plans')->onDelete('cascade');
            $table->foreignId('estimation_id')->nullable()->constrained('ps_estimations')->onDelete('set null');
            $table->foreignId('lead_id')->nullable()->constrained('leads')->onDelete('cascade');
            $table->foreignId('quotation_id')->nullable()->constrained('lead_quotations')->onDelete('set null');
            $table->foreignId('sales_order_id')->nullable()->constrained('lead_sales_orders')->onDelete('set null');
            
            $table->string('title');
            $table->text('description');
            $table->text('reason')->nullable();
            
            $table->string('impact_type')->default('scope'); // scope, timeline, cost, resource, quality, risk
            $table->decimal('additional_mandays', 8, 2)->default(0);
            $table->decimal('additional_fee', 15, 2)->default(0);
            $table->integer('timeline_impact_days')->default(0);
            $table->json('affected_tasks_json')->nullable();
            
            $table->string('status')->default('Draft'); // Draft, Submitted, Approved, Rejected, Converted to Quotation, Cancelled
            
            $table->foreignId('requested_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            
            $table->timestamps();
        });

        // 5. ps_bast_documents
        Schema::create('ps_bast_documents', function (Blueprint $table) {
            $table->id();
            $table->string('bast_number')->unique();
            $table->foreignId('project_plan_id')->constrained('ps_project_plans')->onDelete('cascade');
            $table->foreignId('lead_id')->nullable()->constrained('leads')->onDelete('cascade');
            
            $table->string('customer_name_snapshot')->nullable();
            $table->string('project_name')->nullable();
            
            $table->text('completion_summary')->nullable();
            $table->text('delivered_scope')->nullable();
            $table->text('pending_items')->nullable();
            
            $table->date('acceptance_date')->nullable();
            $table->string('customer_signer')->nullable();
            $table->string('internal_signer')->nullable();
            
            $table->string('status')->default('Draft'); // Draft, Generated, Sent for Signature, Signed, Cancelled
            
            $table->foreignId('document_id')->nullable()->constrained('ps_documents')->onDelete('set null');
            
            $table->timestamps();
        });

        // 6. ps_post_implementation_reviews
        Schema::create('ps_post_implementation_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_plan_id')->unique()->constrained('ps_project_plans')->onDelete('cascade');
            
            $table->date('review_date')->nullable();
            $table->foreignId('reviewer_id')->nullable()->constrained('users')->onDelete('set null');
            
            $table->text('what_went_well')->nullable();
            $table->text('what_could_be_improved')->nullable();
            $table->text('estimation_accuracy_notes')->nullable();
            $table->text('actual_vs_estimated_summary')->nullable();
            $table->text('customer_feedback')->nullable();
            $table->text('internal_feedback')->nullable();
            
            $table->text('reusable_template_suggestion')->nullable();
            $table->text('future_upsell_opportunity')->nullable();
            
            $table->string('review_status')->default('Draft'); // Draft, Completed, Archived
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ps_psa_lite_tables');
    }
};
