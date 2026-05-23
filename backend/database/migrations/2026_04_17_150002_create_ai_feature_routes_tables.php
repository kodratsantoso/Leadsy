<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // MODULE C: AI Provider Settings & Priority Engine

        // Replace the single-routing approach with priority-based feature routes
        // We will keep ai_model_routes if it exists, or eventually drop it.
        // It's safer to create a new `ai_feature_routes` table that incorporates priorities.

        Schema::create('ai_feature_routes', function (Blueprint $table) {
            $table->id();
            $table->string('feature_name')->index();     // e.g. 'lead_scoring', 'transcript_evaluation'
            $table->foreignId('ai_model_id')->constrained('ai_models')->cascadeOnDelete();
            $table->unsignedSmallInteger('priority')->default(1); // 1 = highest priority, 2 = fallback 1, etc.

            // Settings for this specific route
            $table->unsignedSmallInteger('max_retries')->default(1);
            $table->unsignedSmallInteger('timeout_seconds')->default(30);
            $table->string('cost_sensitivity')->default('medium'); // Optional logic tie-in
            $table->boolean('is_active')->default(true);

            $table->timestamps();

            // Only one model per priority per feature
            $table->unique(['feature_name', 'priority']);
        });

        // Add to AI Requests to log which route/priority was actually used, if not already tracked.
        Schema::table('ai_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('ai_requests', 'fallback_used')) {
                $table->boolean('fallback_used')->default(false)->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('ai_requests', function (Blueprint $table) {
            if (Schema::hasColumn('ai_requests', 'fallback_used')) {
                $table->dropColumn('fallback_used');
            }
        });

        Schema::dropIfExists('ai_feature_routes');
    }
};
