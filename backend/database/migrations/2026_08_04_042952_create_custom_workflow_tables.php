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
        Schema::create('workflow_definitions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->string('name');
            $table->string('base_record_type');
            $table->string('category')->default('Approval');
            $table->string('status')->default('draft');
            $table->text('description')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('workflow_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workflow_definition_id')->constrained('workflow_definitions')->onDelete('cascade');
            $table->integer('version_number');
            $table->boolean('is_active')->default(false);
            $table->boolean('is_testing')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('workflow_states', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workflow_version_id')->constrained('workflow_versions')->onDelete('cascade');
            $table->string('name');
            $table->string('type');
            $table->integer('display_order')->default(0);
            $table->json('visual_coordinates')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_entry')->default(false);
            $table->boolean('is_terminal')->default(false);
            $table->timestamps();
        });

        Schema::create('workflow_transitions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workflow_version_id')->constrained('workflow_versions')->onDelete('cascade');
            $table->foreignId('source_state_id')->constrained('workflow_states')->onDelete('cascade');
            $table->foreignId('destination_state_id')->constrained('workflow_states')->onDelete('cascade');
            $table->string('label')->nullable();
            $table->string('trigger');
            $table->integer('priority')->default(0);
            $table->boolean('is_enabled')->default(true);
            $table->json('conditions')->nullable();
            $table->timestamps();
        });

        Schema::create('workflow_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workflow_state_id')->nullable()->constrained('workflow_states')->onDelete('cascade');
            $table->foreignId('workflow_transition_id')->nullable()->constrained('workflow_transitions')->onDelete('cascade');
            $table->string('action_type');
            $table->string('execution_timing');
            $table->integer('execution_order')->default(0);
            $table->json('configuration')->nullable();
            $table->json('conditions')->nullable();
            $table->string('failure_behavior')->default('STOP_WORKFLOW');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('workflow_actions');
        Schema::dropIfExists('workflow_transitions');
        Schema::dropIfExists('workflow_states');
        Schema::dropIfExists('workflow_versions');
        Schema::dropIfExists('workflow_definitions');
    }
};
