<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('confidentiality_assessments', function (Blueprint $table) {
            $table->id();
            $table->string('entity_type'); // e.g., App\Models\Lead
            $table->unsignedBigInteger('entity_id');
            $table->enum('confidentiality_level', ['low', 'medium', 'high', 'restricted'])->default('low');
            $table->integer('score')->default(0);
            $table->enum('assessment_method', ['rule_based', 'ai_assisted', 'manual'])->default('rule_based');
            
            $table->jsonb('score_breakdown_json')->nullable();
            $table->jsonb('data_sources_json')->nullable();
            $table->jsonb('missing_data_json')->nullable();
            $table->jsonb('recommendation_json')->nullable();
            
            $table->string('confidence_score')->nullable(); // e.g. low, medium, high
            $table->enum('status', ['draft', 'reviewed', 'approved', 'overridden'])->default('draft');
            
            $table->unsignedBigInteger('assessed_by')->nullable();
            $table->unsignedBigInteger('reviewed_by')->nullable();
            
            $table->timestamp('assessed_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['entity_type', 'entity_id']);
            $table->index('confidentiality_level');
            
            $table->foreign('assessed_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('reviewed_by')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('confidentiality_assessment_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assessment_id')->constrained('confidentiality_assessments')->cascadeOnDelete();
            $table->integer('version_number');
            $table->enum('confidentiality_level', ['low', 'medium', 'high', 'restricted']);
            $table->integer('score');
            $table->jsonb('score_breakdown_json')->nullable();
            $table->string('change_reason')->nullable();
            $table->unsignedBigInteger('changed_by')->nullable();
            $table->timestamp('created_at')->useCurrent();
            
            $table->foreign('changed_by')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('confidentiality_access_reviews', function (Blueprint $table) {
            $table->id();
            $table->string('entity_type');
            $table->unsignedBigInteger('entity_id');
            $table->unsignedBigInteger('reviewer_id');
            $table->enum('review_status', ['pending', 'approved', 'adjusted', 'rejected'])->default('pending');
            $table->text('review_notes')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['entity_type', 'entity_id']);
            $table->foreign('reviewer_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('confidentiality_access_reviews');
        Schema::dropIfExists('confidentiality_assessment_versions');
        Schema::dropIfExists('confidentiality_assessments');
    }
};
