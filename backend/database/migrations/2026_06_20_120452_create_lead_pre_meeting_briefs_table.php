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
        Schema::create('lead_pre_meeting_briefs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->json('summary_json')->nullable();
            $table->json('objective_hypothesis_json')->nullable();
            $table->json('strategy_json')->nullable();
            $table->json('questions_json')->nullable();
            $table->json('demo_strategy_json')->nullable();
            $table->json('bantc_pre_json')->nullable();
            $table->json('pain_point_json')->nullable();
            $table->json('risk_analysis_json')->nullable();
            $table->integer('readiness_score')->nullable();
            $table->string('ai_provider')->nullable();
            $table->string('ai_model')->nullable();
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
