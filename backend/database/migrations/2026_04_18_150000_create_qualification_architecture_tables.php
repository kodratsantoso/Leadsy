<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qualification_parameter_sets', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('version');
            $table->enum('status', ['draft', 'active', 'archived'])->default('draft');
            $table->text('description')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('qualification_parameters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parameter_set_id')->constrained('qualification_parameter_sets')->cascadeOnDelete();
            $table->string('dimension');
            $table->string('parameter_key');
            $table->string('label');
            $table->enum('input_type', ['enum', 'boolean', 'integer', 'text']);
            $table->unsignedSmallInteger('max_points')->default(0);
            $table->unsignedSmallInteger('sort_order')->default(1);
            $table->boolean('is_required')->default(false);
            $table->string('hard_stop_operator')->nullable();
            $table->json('hard_stop_value')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(['parameter_set_id', 'parameter_key']);
        });

        Schema::create('qualification_parameter_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parameter_id')->constrained('qualification_parameters')->cascadeOnDelete();
            $table->string('option_value');
            $table->string('label');
            $table->smallInteger('score')->default(0);
            $table->unsignedSmallInteger('sort_order')->default(1);
            $table->boolean('is_active')->default(true);
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('qualification_workflows', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('trigger_status')->default('need_review');
            $table->boolean('requires_approval')->default(true);
            $table->boolean('override_enabled')->default(true);
            $table->unsignedSmallInteger('sla_hours')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('qualification_workflow_stages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workflow_id')->constrained('qualification_workflows')->cascadeOnDelete();
            $table->string('code');
            $table->string('label');
            $table->unsignedSmallInteger('sequence')->default(1);
            $table->string('assigned_role')->nullable();
            $table->string('decision_type')->default('review');
            $table->boolean('is_required')->default(true);
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(['workflow_id', 'code']);
        });

        Schema::create('qualification_workflow_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workflow_id')->constrained('qualification_workflows')->cascadeOnDelete();
            $table->foreignId('lead_id')->nullable()->constrained('leads')->nullOnDelete();
            $table->foreignId('lead_qualification_id')->nullable()->constrained('lead_qualifications')->nullOnDelete();
            $table->enum('status', ['pending', 'in_review', 'approved', 'rejected', 'overridden'])->default('pending');
            $table->string('current_stage_code')->nullable();
            $table->string('recommended_status')->nullable();
            $table->string('final_status')->nullable();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('justification')->nullable();
            $table->text('override_reason')->nullable();
            $table->json('review_payload')->nullable();
            $table->timestamp('due_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });

        $this->seedDefaultArchitectureRecords();
    }

    public function down(): void
    {
        Schema::dropIfExists('qualification_workflow_reviews');
        Schema::dropIfExists('qualification_workflow_stages');
        Schema::dropIfExists('qualification_workflows');
        Schema::dropIfExists('qualification_parameter_options');
        Schema::dropIfExists('qualification_parameters');
        Schema::dropIfExists('qualification_parameter_sets');
    }

    private function seedDefaultArchitectureRecords(): void
    {
        $setId = DB::table('qualification_parameter_sets')->insertGetId([
            'name' => 'Enterprise Qualification Default',
            'slug' => 'enterprise-qualification-default',
            'version' => 'enterprise-qualification-v1',
            'status' => 'active',
            'description' => 'Default policy seeded from the SSOT enterprise qualification framework.',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $parameters = [
            ['dimension' => 'firmographic', 'parameter_key' => 'target_industry_fit', 'label' => 'Target Industry Fit', 'input_type' => 'enum', 'max_points' => 15, 'sort_order' => 1, 'is_required' => true, 'options' => [['high', 'High', 15], ['medium', 'Medium', 9], ['unknown', 'Unknown', 4], ['low', 'Low', 0]], 'hard_stop_operator' => 'equals', 'hard_stop_value' => ['value' => 'low']],
            ['dimension' => 'firmographic', 'parameter_key' => 'company_size_band', 'label' => 'Company Size Band', 'input_type' => 'enum', 'max_points' => 6, 'sort_order' => 2, 'is_required' => false, 'options' => [['enterprise', 'Enterprise', 6], ['medium', 'Medium', 6], ['small', 'Small', 5], ['micro', 'Micro', 2], ['unknown', 'Unknown', 2]]],
            ['dimension' => 'firmographic', 'parameter_key' => 'territory_fit', 'label' => 'Territory Fit', 'input_type' => 'boolean', 'max_points' => 4, 'sort_order' => 3, 'is_required' => false, 'options' => [['yes', 'Yes', 4], ['unknown', 'Unknown', 2], ['no', 'No', 0]], 'hard_stop_operator' => 'equals', 'hard_stop_value' => ['value' => 'no']],

            ['dimension' => 'need_relevance', 'parameter_key' => 'problem_statement', 'label' => 'Problem Statement Present', 'input_type' => 'text', 'max_points' => 8, 'sort_order' => 1, 'is_required' => true, 'options' => [['present', 'Present', 8], ['absent', 'Absent', 0]]],
            ['dimension' => 'need_relevance', 'parameter_key' => 'pain_level', 'label' => 'Pain Level', 'input_type' => 'enum', 'max_points' => 10, 'sort_order' => 2, 'is_required' => false, 'options' => [['high', 'High', 10], ['medium', 'Medium', 6], ['low', 'Low', 2], ['unknown', 'Unknown', 0]]],
            ['dimension' => 'need_relevance', 'parameter_key' => 'use_case_fit', 'label' => 'Use Case Fit', 'input_type' => 'enum', 'max_points' => 7, 'sort_order' => 3, 'is_required' => false, 'options' => [['high', 'High', 7], ['medium', 'Medium', 4], ['unknown', 'Unknown', 2], ['low', 'Low', 0]]],

            ['dimension' => 'commercial_readiness', 'parameter_key' => 'budget_status', 'label' => 'Budget Status', 'input_type' => 'enum', 'max_points' => 10, 'sort_order' => 1, 'is_required' => true, 'options' => [['confirmed', 'Confirmed', 10], ['range', 'Range', 6], ['unknown', 'Unknown', 2], ['unavailable', 'Unavailable', 0]], 'hard_stop_operator' => 'equals', 'hard_stop_value' => ['value' => 'unavailable']],
            ['dimension' => 'commercial_readiness', 'parameter_key' => 'timeline_months', 'label' => 'Timeline Months', 'input_type' => 'integer', 'max_points' => 6, 'sort_order' => 2, 'is_required' => false, 'options' => [['fast', '<= 3 months', 6], ['planned', '<= 6 months', 4], ['long', '<= 12 months', 2], ['unknown', 'Unknown', 1], ['deferred', '> 12 months', 0]]],
            ['dimension' => 'commercial_readiness', 'parameter_key' => 'commercial_urgency', 'label' => 'Commercial Urgency', 'input_type' => 'enum', 'max_points' => 4, 'sort_order' => 3, 'is_required' => false, 'options' => [['high', 'High', 4], ['medium', 'Medium', 2], ['low', 'Low', 1], ['unknown', 'Unknown', 0]]],

            ['dimension' => 'stakeholder_access', 'parameter_key' => 'decision_maker_engaged', 'label' => 'Decision Maker Engaged', 'input_type' => 'boolean', 'max_points' => 8, 'sort_order' => 1, 'is_required' => true, 'options' => [['yes', 'Yes', 8], ['unknown', 'Unknown', 2], ['no', 'No', 0]]],
            ['dimension' => 'stakeholder_access', 'parameter_key' => 'stakeholder_count', 'label' => 'Stakeholder Count', 'input_type' => 'integer', 'max_points' => 4, 'sort_order' => 2, 'is_required' => false, 'options' => [['multi', '2+', 4], ['single', '1', 2], ['none', '0', 0]]],
            ['dimension' => 'stakeholder_access', 'parameter_key' => 'contact_quality', 'label' => 'Contact Quality', 'input_type' => 'enum', 'max_points' => 3, 'sort_order' => 3, 'is_required' => false, 'options' => [['strong', 'Strong', 3], ['weak', 'Weak', 1], ['absent', 'Absent', 0]]],

            ['dimension' => 'technical_fit', 'parameter_key' => 'technical_fit', 'label' => 'Technical Fit', 'input_type' => 'enum', 'max_points' => 9, 'sort_order' => 1, 'is_required' => true, 'options' => [['high', 'High', 9], ['medium', 'Medium', 5], ['unknown', 'Unknown', 2], ['low', 'Low', 0]], 'hard_stop_operator' => 'equals', 'hard_stop_value' => ['value' => 'low']],
            ['dimension' => 'technical_fit', 'parameter_key' => 'integration_complexity', 'label' => 'Integration Complexity', 'input_type' => 'enum', 'max_points' => 4, 'sort_order' => 2, 'is_required' => false, 'options' => [['low', 'Low', 4], ['medium', 'Medium', 2], ['unknown', 'Unknown', 1], ['high', 'High', 0]]],
            ['dimension' => 'technical_fit', 'parameter_key' => 'required_capabilities', 'label' => 'Required Capabilities Defined', 'input_type' => 'text', 'max_points' => 2, 'sort_order' => 3, 'is_required' => false, 'options' => [['yes', 'Yes', 2], ['no', 'No', 0]]],
        ];

        foreach ($parameters as $parameter) {
            $options = $parameter['options'];
            unset($parameter['options']);

            $parameterId = DB::table('qualification_parameters')->insertGetId([
                'parameter_set_id' => $setId,
                'dimension' => $parameter['dimension'],
                'parameter_key' => $parameter['parameter_key'],
                'label' => $parameter['label'],
                'input_type' => $parameter['input_type'],
                'max_points' => $parameter['max_points'],
                'sort_order' => $parameter['sort_order'],
                'is_required' => $parameter['is_required'],
                'hard_stop_operator' => $parameter['hard_stop_operator'] ?? null,
                'hard_stop_value' => isset($parameter['hard_stop_value']) ? json_encode($parameter['hard_stop_value']) : null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            foreach ($options as $index => [$value, $label, $score]) {
                DB::table('qualification_parameter_options')->insert([
                    'parameter_id' => $parameterId,
                    'option_value' => $value,
                    'label' => $label,
                    'score' => $score,
                    'sort_order' => $index + 1,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $workflowId = DB::table('qualification_workflows')->insertGetId([
            'name' => 'Need Review Gate',
            'slug' => 'need-review-gate',
            'trigger_status' => 'need_review',
            'requires_approval' => true,
            'override_enabled' => true,
            'sla_hours' => 24,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('qualification_workflow_stages')->insert([
            [
                'workflow_id' => $workflowId,
                'code' => 'triage',
                'label' => 'RevOps Triage',
                'sequence' => 1,
                'assigned_role' => 'sales_manager',
                'decision_type' => 'review',
                'is_required' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'workflow_id' => $workflowId,
                'code' => 'approval',
                'label' => 'Manager Approval',
                'sequence' => 2,
                'assigned_role' => 'admin',
                'decision_type' => 'approve',
                'is_required' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
};
