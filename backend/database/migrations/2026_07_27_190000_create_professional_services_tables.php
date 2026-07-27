<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ps_service_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('ps_estimation_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_category_id')->constrained('ps_service_categories')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('ps_roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('ps_rate_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained('ps_roles')->cascadeOnDelete();
            $table->decimal('rate_per_manday', 15, 2);
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('ps_complexity_levels', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique(); // Simple, Medium, Complex, Enterprise
            $table->decimal('multiplier', 5, 2)->default(1.00); // 1.0, 1.25, 1.5, 2.0
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('ps_complexity_dimensions', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Business Process, Data, Integration, etc.
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('ps_template_components', function (Blueprint $table) {
            $table->id();
            $table->foreignId('template_id')->constrained('ps_estimation_templates')->cascadeOnDelete();
            $table->foreignId('role_id')->constrained('ps_roles');
            $table->string('task_name');
            $table->text('description')->nullable();
            $table->decimal('base_mandays', 10, 2)->default(0);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('ps_estimations', function (Blueprint $table) {
            $table->id();
            $table->string('estimation_number')->unique(); // PS-EST-YYYYMMDD-XXXX
            $table->foreignId('lead_id')->nullable()->constrained('leads')->nullOnDelete();
            $table->foreignId('service_category_id')->nullable()->constrained('ps_service_categories')->nullOnDelete();
            $table->foreignId('template_id')->nullable()->constrained('ps_estimation_templates')->nullOnDelete();
            $table->foreignId('complexity_level_id')->nullable()->constrained('ps_complexity_levels')->nullOnDelete();
            $table->string('title');
            
            // Configuration at time of estimation
            $table->decimal('complexity_multiplier', 5, 2)->default(1.00);
            $table->decimal('buffer_percentage', 5, 2)->default(0.00);
            $table->string('currency_code')->default('USD');
            
            // Totals
            $table->decimal('total_base_mandays', 10, 2)->default(0);
            $table->decimal('total_adjusted_mandays', 10, 2)->default(0); // after complexity
            $table->decimal('total_buffer_mandays', 10, 2)->default(0); // after buffer %
            $table->decimal('total_manual_adjustment_mandays', 10, 2)->default(0); // ad-hoc changes
            $table->decimal('total_final_mandays', 10, 2)->default(0);
            $table->decimal('total_estimated_fee', 15, 2)->default(0);
            
            // Text inputs
            $table->text('assumptions')->nullable();
            $table->text('out_of_scope')->nullable();
            $table->text('dependencies')->nullable();
            $table->text('risks')->nullable();
            $table->text('internal_notes')->nullable();
            
            // Workflow
            $table->string('status')->default('draft'); // draft, pm_reviewed, approved, rejected, converted_to_quotation, archived
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            
            $table->timestamps();
        });

        Schema::create('ps_estimation_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('estimation_id')->constrained('ps_estimations')->cascadeOnDelete();
            $table->foreignId('role_id')->nullable()->constrained('ps_roles')->nullOnDelete();
            $table->foreignId('template_component_id')->nullable()->constrained('ps_template_components')->nullOnDelete();
            
            $table->string('task_name');
            $table->text('description')->nullable();
            
            $table->decimal('base_mandays', 10, 2)->default(0);
            $table->decimal('adjusted_mandays', 10, 2)->default(0);
            $table->decimal('buffer_mandays', 10, 2)->default(0);
            $table->decimal('manual_adjustment', 10, 2)->default(0);
            $table->decimal('final_mandays', 10, 2)->default(0);
            
            // Snapshots
            $table->decimal('rate_snapshot', 15, 2)->default(0);
            $table->decimal('estimated_fee', 15, 2)->default(0);
            
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ps_estimation_lines');
        Schema::dropIfExists('ps_estimations');
        Schema::dropIfExists('ps_template_components');
        Schema::dropIfExists('ps_complexity_dimensions');
        Schema::dropIfExists('ps_complexity_levels');
        Schema::dropIfExists('ps_rate_cards');
        Schema::dropIfExists('ps_roles');
        Schema::dropIfExists('ps_estimation_templates');
        Schema::dropIfExists('ps_service_categories');
    }
};
