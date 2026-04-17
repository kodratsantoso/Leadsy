<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // MODULE A: Lead Intelligence Engine (BRD §3.3)

        // 1. Lead Scores
        Schema::create('lead_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
            $table->unsignedSmallInteger('score')->default(0); // 0-100
            $table->enum('grade', ['Hot', 'Warm', 'Cold'])->nullable();
            $table->json('score_breakdown')->nullable();
            $table->timestamp('last_scored_at')->useCurrent();
            $table->timestamps();
        });

        // 2. Lead Qualifications
        Schema::create('lead_qualifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
            $table->enum('qualified', ['yes', 'maybe', 'no'])->default('maybe');
            $table->string('business_type')->nullable(); // B2B, B2C, mixed
            $table->string('company_size_band')->nullable(); // micro, small, medium, enterprise, unknown
            $table->text('qualification_reason')->nullable();
            $table->timestamp('last_qualified_at')->useCurrent();
            $table->timestamps();
        });

        // 3. Lead Product Matches
        Schema::create('lead_product_matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->unsignedSmallInteger('match_score')->default(0);
            $table->text('match_reason')->nullable();
            $table->boolean('is_recommended')->default(false);
            $table->timestamp('last_matched_at')->useCurrent();
            $table->timestamps();
        });

        // 4. Lead AI Analyses
        Schema::create('lead_ai_analyses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
            $table->unsignedSmallInteger('relevance_score')->nullable();
            $table->text('business_opportunity_summary')->nullable();
            $table->json('probable_needs')->nullable();
            $table->text('suggested_approach')->nullable();
            $table->enum('urgency_level', ['high', 'medium', 'low', 'unknown'])->default('unknown');
            $table->unsignedSmallInteger('confidence_score')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_ai_analyses');
        Schema::dropIfExists('lead_product_matches');
        Schema::dropIfExists('lead_qualifications');
        Schema::dropIfExists('lead_scores');
    }
};
