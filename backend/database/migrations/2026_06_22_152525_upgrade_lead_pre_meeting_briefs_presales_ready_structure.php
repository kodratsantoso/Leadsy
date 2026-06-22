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
        Schema::table('lead_pre_meeting_briefs', function (Blueprint $table) {
            $table->json('executive_summary_json')->nullable();
            $table->json('customer_context_json')->nullable();
            $table->json('initial_product_intelligence_json')->nullable();
            $table->json('initial_bantc_estimation_json')->nullable();
            $table->json('question_guide_json')->nullable();
            $table->json('digitalization_resistance_json')->nullable();
            $table->json('meeting_strategy_json')->nullable();
            $table->json('demo_cycle_json')->nullable();
            $table->json('pain_point_hypothesis_json')->nullable();
            $table->json('risk_analysis_json')->nullable();
            $table->json('readiness_json')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lead_pre_meeting_briefs', function (Blueprint $table) {
            $table->dropColumn([
                'executive_summary_json',
                'customer_context_json',
                'initial_product_intelligence_json',
                'initial_bantc_estimation_json',
                'question_guide_json',
                'digitalization_resistance_json',
                'meeting_strategy_json',
                'demo_cycle_json',
                'pain_point_hypothesis_json',
                'risk_analysis_json',
                'readiness_json',
            ]);
        });
    }
};
