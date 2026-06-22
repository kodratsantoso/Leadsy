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
        Schema::dropIfExists('lead_pre_meeting_briefs');

        Schema::create('lead_pre_meeting_briefs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            
            $table->string('meeting_type')->nullable();
            $table->json('input_context_json')->nullable();
            
            $table->json('customer_snapshot_json')->nullable();
            $table->json('meeting_context_json')->nullable();
            $table->json('needs_pain_hypothesis_json')->nullable();
            $table->json('product_fit_hypothesis_json')->nullable();
            $table->json('bantc_discovery_plan_json')->nullable();
            $table->json('demo_strategy_json')->nullable();
            $table->json('stakeholder_strategy_json')->nullable();
            $table->json('risk_flags_json')->nullable();
            $table->json('recommended_meeting_approach_json')->nullable();
            
            $table->integer('readiness_score')->nullable();
            $table->string('readiness_status')->nullable();
            $table->integer('data_completeness_score')->nullable();
            $table->text('executive_brief')->nullable();
            
            $table->string('ai_provider')->nullable();
            $table->string('ai_model')->nullable();
            $table->string('prompt_version')->nullable();
            
            $table->foreignId('generated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('generated_at')->nullable();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lead_pre_meeting_briefs');
    }
};

