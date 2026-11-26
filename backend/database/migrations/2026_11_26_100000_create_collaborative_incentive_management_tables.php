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
        // 1. Incentive Policies (Tenant-scoped Master Configuration)
        Schema::create('incentive_policies', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->nullable()->index();
            $table->string('policy_name')->default('Kebijakan Insentif Departemen Standar');
            $table->boolean('is_active')->default(true);
            
            // Pool Rates
            $table->decimal('saas_pool_rate', 5, 2)->default(2.00); // 2.00%
            $table->decimal('ps_pool_rate', 5, 2)->default(3.00);   // 3.00%
            
            // Pool Distribution Splits (Total = 100%)
            $table->decimal('direct_allocation_percentage', 5, 2)->default(70.00);  // 70%
            $table->decimal('indirect_allocation_percentage', 5, 2)->default(20.00); // 20%
            $table->decimal('shared_allocation_percentage', 5, 2)->default(10.00);   // 10%
            
            // Revenue Trigger & Financial Exclusions
            $table->string('revenue_trigger')->default('cash_collection'); // cash_collection, invoiced_dpp, sales_order_confirmed
            $table->boolean('exclude_vat')->default(true);
            $table->boolean('exclude_wht')->default(false);
            $table->boolean('exclude_discount')->default(true);
            $table->boolean('exclude_pass_through_cost')->default(true);
            
            // Effort Standards
            $table->decimal('hours_per_manday', 4, 2)->default(8.00);
            $table->string('ps_effort_source')->default('ps_work_log');
            $table->string('sa_csm_effort_source')->default('milestone_defaults'); // milestone_defaults, timesheet
            $table->boolean('allow_manager_effort_override')->default(true);
            $table->json('milestone_effort_weights_json')->nullable();
            
            // Multipliers & Weights
            $table->json('role_weights_json')->nullable();
            $table->json('performance_multipliers_json')->nullable();
            
            // Exception & Governance Rules
            $table->string('exception_fallback_indirect')->default('redirect_to_direct'); // redirect_to_direct, redirect_to_shared, halt_review
            $table->string('joiner_leaver_policy')->default('prorata_calendar_days'); // prorata_calendar_days, cutoff_date
            $table->boolean('exclude_probation')->default(true);
            $table->string('payout_cycle')->default('monthly'); // monthly, quarterly, milestone
            $table->string('privacy_mode')->default('individual_only'); // individual_only, open_transparent
            
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('updated_by')->references('id')->on('users')->nullOnDelete();
        });

        // 2. Role Incentive Settings (Direct Binding to master `roles` table)
        Schema::create('role_incentive_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->nullable()->index();
            $table->unsignedBigInteger('policy_id');
            $table->unsignedBigInteger('role_id');
            $table->boolean('is_eligible')->default(true);
            $table->decimal('saas_rate', 5, 2)->default(0.00);
            $table->decimal('ps_rate', 5, 2)->default(0.00);
            $table->string('allocation_mode')->default('collaborative_pool'); // collaborative_pool, direct_individual
            $table->string('default_contributor_level')->default('core'); // lead, core, supporting, minor
            $table->timestamps();

            $table->foreign('policy_id')->references('id')->on('incentive_policies')->cascadeOnDelete();
            $table->foreign('role_id')->references('id')->on('roles')->cascadeOnDelete();
            $table->unique(['policy_id', 'role_id']);
        });

        // 3. Incentive Pools (Generated Instance per Deal/Order/Invoice)
        Schema::create('incentive_pools', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->nullable()->index();
            $table->unsignedBigInteger('policy_id');
            $table->unsignedBigInteger('lead_id');
            $table->unsignedBigInteger('sales_order_id')->nullable();
            $table->unsignedBigInteger('commercial_invoice_id')->nullable();
            
            $table->string('pool_code')->unique();
            $table->string('period_type')->default('deal'); // deal, monthly, quarterly, milestone
            $table->string('period_key')->nullable()->index(); // e.g. 2026-11, 2026-Q4
            $table->string('revenue_stream')->default('hybrid'); // saas, professional_service, hybrid
            
            $table->decimal('eligible_revenue', 15, 2)->default(0.00);
            $table->decimal('pool_rate_applied', 5, 2)->default(0.00);
            $table->decimal('total_pool_amount', 15, 2)->default(0.00);
            $table->decimal('direct_pool_amount', 15, 2)->default(0.00);
            $table->decimal('indirect_pool_amount', 15, 2)->default(0.00);
            $table->decimal('shared_pool_amount', 15, 2)->default(0.00);
            
            $table->string('status')->default('draft'); // draft, in_review, approved_dept, approved_finance, paid, cancelled
            $table->unsignedBigInteger('approved_dept_by')->nullable();
            $table->timestamp('approved_dept_at')->nullable();
            $table->unsignedBigInteger('approved_finance_by')->nullable();
            $table->timestamp('approved_finance_at')->nullable();
            
            $table->text('notes')->nullable();
            $table->json('calculation_snapshot_json')->nullable();
            $table->timestamps();

            $table->foreign('policy_id')->references('id')->on('incentive_policies')->cascadeOnDelete();
            $table->foreign('lead_id')->references('id')->on('leads')->cascadeOnDelete();
            $table->foreign('sales_order_id')->references('id')->on('lead_sales_orders')->nullOnDelete();
            $table->foreign('commercial_invoice_id')->references('id')->on('commercial_invoices')->nullOnDelete();
            $table->foreign('approved_dept_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('approved_finance_by')->references('id')->on('users')->nullOnDelete();
        });

        // 4. Incentive Contributors (Individual allocation breakdown)
        Schema::create('incentive_contributors', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('pool_id');
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('role_id')->nullable();
            
            $table->string('contribution_type')->default('direct'); // direct, indirect, shared
            $table->string('contributor_level')->default('core');   // lead, core, supporting, minor
            $table->decimal('role_weight', 5, 2)->default(1.00);
            $table->decimal('effort_units', 8, 2)->default(1.00); // mandays
            $table->string('performance_rating')->default('meets'); // below, meets, exceeds, outstanding
            $table->decimal('performance_multiplier', 5, 2)->default(1.00);
            $table->decimal('contribution_score', 12, 4)->default(1.00); // role_weight * effort_units * performance_multiplier
            
            $table->decimal('allocated_amount', 15, 2)->default(0.00);
            $table->text('evaluation_notes')->nullable();
            $table->timestamps();

            $table->foreign('pool_id')->references('id')->on('incentive_pools')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('role_id')->references('id')->on('roles')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('incentive_contributors');
        Schema::dropIfExists('incentive_pools');
        Schema::dropIfExists('role_incentive_settings');
        Schema::dropIfExists('incentive_policies');
    }
};
