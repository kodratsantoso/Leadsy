<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ICP Profiles — configurable Ideal Customer Profile definitions
        Schema::create('icp_profiles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->json('target_industries')->nullable();     // array of industry_id
            $table->json('target_company_sizes')->nullable();  // ['micro','small','medium','enterprise']
            $table->json('target_territories')->nullable();    // array of territory_id
            $table->integer('min_lead_score')->default(0);
            $table->json('required_fields')->nullable();       // fields that must be non-null
            $table->decimal('weight_lead_score', 4, 2)->default(0.30);
            $table->decimal('weight_industry', 4, 2)->default(0.25);
            $table->decimal('weight_company_size', 4, 2)->default(0.20);
            $table->decimal('weight_territory', 4, 2)->default(0.15);
            $table->decimal('weight_contact_info', 4, 2)->default(0.10);
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Lead ICP Match results
        Schema::create('lead_icp_matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->foreignId('icp_profile_id')->constrained()->cascadeOnDelete();
            $table->decimal('match_score', 5, 2)->default(0);
            $table->string('match_level'); // excellent/good/fair/poor
            $table->json('score_breakdown')->nullable();
            $table->timestamp('evaluated_at')->nullable();
            $table->timestamps();
            $table->unique(['lead_id', 'icp_profile_id']);
        });

        // Conversion Predictions
        Schema::create('lead_conversion_predictions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->decimal('probability_to_close', 5, 2); // 0–100
            $table->decimal('expected_deal_size', 15, 2)->nullable();
            $table->string('estimated_sales_effort'); // low/medium/high/very_high
            $table->decimal('confidence_score', 5, 2)->default(0);
            $table->json('prediction_factors')->nullable();
            $table->string('model_version')->default('v1.0-rule-based');
            $table->timestamps();
        });

        // Prescriptive Recommendations
        Schema::create('lead_prescriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->foreignId('recommended_owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('recommended_approach');
            $table->string('next_best_action');
            $table->string('follow_up_timing');
            $table->integer('priority_score')->default(5); // 1–10
            $table->text('reasoning')->nullable();
            $table->boolean('is_applied')->default(false);
            $table->timestamps();
        });

        // Revenue Control Rules
        Schema::create('revenue_rules', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('condition_type'); // score_below/score_above/missing_field/industry_not_in/qualification_status/ghost_lead
            $table->json('condition_value');
            $table->string('action'); // block/flag/prioritize/notify
            $table->string('severity')->default('warning'); // critical/warning/info
            $table->boolean('is_active')->default(true);
            $table->integer('priority')->default(10);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // Lead Outcomes (Feedback Loop)
        Schema::create('lead_outcomes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->string('outcome'); // won/lost/churned/disqualified
            $table->decimal('deal_size', 15, 2)->nullable();
            $table->string('loss_reason')->nullable();
            $table->string('loss_category')->nullable(); // price/timing/competition/no_budget/no_need/other
            $table->text('feedback_notes')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_outcomes');
        Schema::dropIfExists('revenue_rules');
        Schema::dropIfExists('lead_prescriptions');
        Schema::dropIfExists('lead_conversion_predictions');
        Schema::dropIfExists('lead_icp_matches');
        Schema::dropIfExists('icp_profiles');
    }
};
