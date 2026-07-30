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
        Schema::table('ps_estimation_lines', function (Blueprint $table) {
            $table->foreignId('parent_task_id')->nullable()->after('estimation_id')->constrained('ps_estimation_lines')->nullOnDelete();
            $table->string('task_type')->default('task')->after('parent_task_id'); // task, subtask
            $table->string('subtask_name')->nullable()->after('task_name');
            $table->text('deliverable')->nullable()->after('description');
            $table->json('acceptance_criteria')->nullable()->after('deliverable');
            
            $table->foreignId('complexity_level_id')->nullable()->after('role_id')->constrained('ps_complexity_levels')->nullOnDelete();
            
            $table->decimal('complexity_multiplier_snapshot', 5, 2)->nullable()->after('adjusted_mandays');
            $table->decimal('buffer_percentage_snapshot', 5, 2)->nullable()->after('buffer_mandays');
            $table->text('manual_adjustment_reason')->nullable()->after('manual_adjustment');
            
            $table->json('dependency_notes')->nullable()->after('estimated_fee');
            $table->json('risk_notes')->nullable()->after('dependency_notes');
            
            $table->boolean('is_ai_generated')->default(false)->after('risk_notes');
            $table->string('ai_confidence')->nullable()->after('is_ai_generated'); // low, medium, high
            
            $table->string('source_type')->default('manual')->after('ai_confidence'); // manual, template, ai_scope_analysis, imported
            $table->string('source_reference_id')->nullable()->after('source_type');
            
            $table->string('status')->default('draft')->after('sort_order'); // draft, reviewed, approved, rejected
        });

        Schema::table('ps_template_components', function (Blueprint $table) {
            $table->foreignId('parent_component_id')->nullable()->after('template_id')->constrained('ps_template_components')->nullOnDelete();
            $table->string('component_type')->default('task')->after('parent_component_id'); // task, subtask
            $table->text('deliverable')->nullable()->after('description');
            $table->json('acceptance_criteria')->nullable()->after('deliverable');
            
            $table->boolean('is_complexity_sensitive')->default(true)->after('base_mandays');
            $table->boolean('is_optional')->default(false)->after('is_complexity_sensitive');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ps_template_components', function (Blueprint $table) {
            $table->dropForeign(['parent_component_id']);
            $table->dropColumn([
                'parent_component_id',
                'component_type',
                'deliverable',
                'acceptance_criteria',
                'is_complexity_sensitive',
                'is_optional',
            ]);
        });

        Schema::table('ps_estimation_lines', function (Blueprint $table) {
            $table->dropForeign(['parent_task_id']);
            $table->dropForeign(['complexity_level_id']);
            $table->dropColumn([
                'parent_task_id',
                'task_type',
                'subtask_name',
                'deliverable',
                'acceptance_criteria',
                'complexity_level_id',
                'complexity_multiplier_snapshot',
                'buffer_percentage_snapshot',
                'manual_adjustment_reason',
                'dependency_notes',
                'risk_notes',
                'is_ai_generated',
                'ai_confidence',
                'source_type',
                'source_reference_id',
                'status',
            ]);
        });
    }
};
