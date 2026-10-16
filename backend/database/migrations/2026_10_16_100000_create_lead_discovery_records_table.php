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
        Schema::create('lead_discovery_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
            
            // Structured sections (objectives, current_process, pain_points, desired_outcomes,
            // stakeholders, existing_systems, functional_requirements, non_functional_requirements,
            // integration_requirements, technical_constraints, open_questions, assumptions, dependencies)
            $table->json('sections')->default('{}');
            
            // Map of field key => provenance ('confirmed' | 'assumption' | 'ai_suggested')
            $table->json('field_sources')->default('{}');
            
            // Qualification status: unqualified, in_progress, qualified, disqualified
            $table->string('qualification_status')->default('in_progress');
            
            // Completeness metric (0 - 100)
            $table->unsignedTinyInteger('completeness_score')->default(0);
            $table->json('completeness_details')->nullable();
            $table->timestamp('last_validated_at')->nullable();
            
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique('lead_id');
            $table->index(['qualification_status', 'completeness_score']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lead_discovery_records');
    }
};
