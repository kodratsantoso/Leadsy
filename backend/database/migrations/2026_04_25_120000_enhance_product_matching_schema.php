<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Extend products table with structured metadata for BANT matching
        Schema::table('products', function (Blueprint $table) {
            $table->string('supported_regions', 500)->nullable()->after('ai_reference_material');
            $table->string('budget_range', 255)->nullable()->after('supported_regions');
            $table->string('target_company_size', 255)->nullable()->after('budget_range');
            $table->json('use_cases')->nullable()->after('target_company_size');
            $table->text('competitor_notes')->nullable()->after('use_cases');
            $table->json('keywords')->nullable()->after('competitor_notes');
        });

        // 2. Extend lead_product_matches with BANT analysis + AI provenance
        Schema::table('lead_product_matches', function (Blueprint $table) {
            $table->json('bant_analysis')->nullable()->after('match_reason');
            $table->json('reasoning')->nullable()->after('bant_analysis');
            $table->text('recommended_approach')->nullable()->after('reasoning');
            $table->string('competitor_context', 1000)->nullable()->after('recommended_approach');
            $table->string('match_level', 20)->nullable()->after('competitor_context'); // strong|moderate|weak
            $table->unsignedSmallInteger('confidence_score')->nullable()->after('match_level');
            $table->string('ai_provider_used', 100)->nullable()->after('confidence_score');
            $table->string('ai_model_used', 150)->nullable()->after('ai_provider_used');
        });

        // 3. Create lead_product_match_runs for audit trail
        Schema::create('lead_product_match_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
            $table->foreignId('triggered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedSmallInteger('products_evaluated')->default(0);
            $table->unsignedSmallInteger('matches_created')->default(0);
            $table->unsignedSmallInteger('ai_calls_made')->default(0);
            $table->decimal('total_cost_usd', 10, 6)->nullable();
            $table->unsignedInteger('duration_ms')->nullable();
            $table->string('status', 20)->default('completed'); // completed|failed
            $table->text('error_message')->nullable();
            $table->timestamp('run_at')->useCurrent();
            $table->timestamps();

            $table->index('lead_id');
            $table->index('run_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_product_match_runs');

        Schema::table('lead_product_matches', function (Blueprint $table) {
            $table->dropColumn([
                'bant_analysis', 'reasoning', 'recommended_approach',
                'competitor_context', 'match_level', 'confidence_score',
                'ai_provider_used', 'ai_model_used',
            ]);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'supported_regions', 'budget_range', 'target_company_size',
                'use_cases', 'competitor_notes', 'keywords',
            ]);
        });
    }
};
