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
            $table->json('industry_snapshot_json')->nullable()->after('customer_snapshot_json');
            $table->json('business_category_snapshot_json')->nullable()->after('industry_snapshot_json');
            $table->json('product_industry_fit_json')->nullable()->after('product_fit_hypothesis_json');
            $table->json('industry_pain_point_hypothesis_json')->nullable()->after('needs_pain_hypothesis_json');
            $table->json('industry_based_bantc_questions_json')->nullable()->after('bantc_discovery_plan_json');
            $table->json('industry_based_demo_strategy_json')->nullable()->after('demo_strategy_json');
            $table->integer('industry_context_completeness_score')->nullable()->after('data_completeness_score');
            $table->integer('product_industry_fit_score')->nullable()->after('industry_context_completeness_score');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lead_pre_meeting_briefs', function (Blueprint $table) {
            $table->dropColumn([
                'industry_snapshot_json',
                'business_category_snapshot_json',
                'product_industry_fit_json',
                'industry_pain_point_hypothesis_json',
                'industry_based_bantc_questions_json',
                'industry_based_demo_strategy_json',
                'industry_context_completeness_score',
                'product_industry_fit_score',
            ]);
        });
    }
};
