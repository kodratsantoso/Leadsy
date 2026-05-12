<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('geo_product_fit_analyses', function (Blueprint $table) {
            $table->id();
            $table->string('place_id');
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('lead_id')->nullable()->constrained('leads')->nullOnDelete();

            $table->unsignedSmallInteger('fit_score')->default(0);
            $table->string('fit_level', 20)->default('unknown'); // high|medium|low|unknown
            $table->unsignedSmallInteger('confidence_score')->default(0);

            $table->json('reasoning')->nullable();
            $table->json('matched_signals')->nullable();
            $table->json('missing_information')->nullable();
            $table->json('risk_flags')->nullable();

            $table->text('recommended_approach')->nullable();
            $table->text('recommended_next_action')->nullable();
            $table->text('potential_use_case')->nullable();

            // Pre-score fields (rule-based, before AI)
            $table->unsignedSmallInteger('pre_fit_score')->default(0);
            $table->boolean('analyzed_with_ai')->default(false);

            // AI provenance
            $table->string('ai_provider_used', 100)->nullable();
            $table->string('ai_model_used', 150)->nullable();

            // Cache invalidation hashes
            $table->string('source_payload_hash', 64)->nullable();
            $table->string('product_payload_hash', 64)->nullable();

            $table->timestamp('analyzed_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['place_id', 'product_id'], 'geo_fit_place_product_unique');
            $table->index('place_id');
            $table->index('product_id');
            $table->index('fit_level');
            $table->index('fit_score');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('geo_product_fit_analyses');
    }
};
