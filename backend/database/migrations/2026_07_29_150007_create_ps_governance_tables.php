<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ps_estimation_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('estimation_id')->constrained('ps_estimations')->cascadeOnDelete();
            $table->integer('version_number');
            $table->string('version_label')->nullable();
            $table->text('change_reason')->nullable();
            $table->json('snapshot_json'); // The complete state of the estimation
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            
            $table->unique(['estimation_id', 'version_number']);
        });

        Schema::create('ps_approval_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('estimation_id')->constrained('ps_estimations')->cascadeOnDelete();
            $table->integer('version_number')->nullable();
            $table->string('action'); // submit, approve, reject, request_revision, create_revision
            $table->string('from_status')->nullable();
            $table->string('to_status')->nullable();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('comment')->nullable();
            $table->text('reason')->nullable();
            $table->json('blocker_override_json')->nullable();
            $table->timestamps();
        });

        Schema::create('ps_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('original_estimation_id')->constrained('ps_estimations')->cascadeOnDelete();
            $table->foreignId('revised_estimation_id')->constrained('ps_estimations')->cascadeOnDelete();
            $table->integer('revision_number')->default(1);
            $table->text('revision_reason')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('ps_governance_rules', function (Blueprint $table) {
            $table->id();
            $table->string('rule_name');
            $table->string('rule_type'); // require_approval, blocker
            $table->decimal('threshold_value', 15, 2)->nullable();
            $table->foreignId('applies_to_service_category_id')->nullable()->constrained('ps_service_categories')->cascadeOnDelete();
            $table->foreignId('approver_role_id')->nullable()->constrained('roles')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ps_governance_rules');
        Schema::dropIfExists('ps_revisions');
        Schema::dropIfExists('ps_approval_logs');
        Schema::dropIfExists('ps_estimation_versions');
    }
};
