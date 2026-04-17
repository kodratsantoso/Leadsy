<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BRD §11 – AI Provider & Model Management
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_providers', function (Blueprint $table) {
            $table->id();
            $table->string('name');                   // OpenAI, Anthropic, Google, Custom…
            $table->string('slug')->unique();
            $table->string('base_url')->nullable();   // custom endpoint
            $table->text('api_key_encrypted');         // encrypted at rest
            $table->string('organization_id')->nullable();
            $table->string('region')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->json('environments')->nullable();  // ["dev","staging","prod"]
            $table->timestamps();
        });

        Schema::create('ai_models', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ai_provider_id')->constrained()->cascadeOnDelete();
            $table->string('name');                    // gpt-4o, claude-3-5-sonnet, gemini-1.5-pro
            $table->unsignedInteger('context_window')->nullable();
            $table->json('capabilities')->nullable();  // ["classification","reasoning",…]
            $table->enum('cost_tier', ['low', 'medium', 'high'])->default('medium');
            $table->string('default_usage_type')->nullable();  // lead_scoring, document_parsing …
            $table->enum('status', ['active', 'deprecated'])->default('active');
            $table->timestamps();
            $table->unique(['ai_provider_id', 'name']);
        });

        // Model → system-function routing  (BRD §11.5)
        Schema::create('ai_model_routes', function (Blueprint $table) {
            $table->id();
            $table->string('function_name');     // lead_scoring, product_understanding, …
            $table->foreignId('primary_model_id')->constrained('ai_models')->cascadeOnDelete();
            $table->foreignId('fallback_model_id')->nullable()->constrained('ai_models')->nullOnDelete();
            $table->unsignedSmallInteger('retry_count')->default(2);
            $table->unsignedSmallInteger('timeout_seconds')->default(30);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique('function_name');
        });

        // AI request log  (BRD §11.8 logging)
        Schema::create('ai_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ai_model_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('function_name');
            $table->json('prompt_metadata')->nullable();   // metadata only, no PII
            $table->json('response_metadata')->nullable();
            $table->unsignedInteger('prompt_tokens')->nullable();
            $table->unsignedInteger('completion_tokens')->nullable();
            $table->decimal('estimated_cost_usd', 8, 6)->nullable();
            $table->unsignedInteger('latency_ms')->nullable();
            $table->enum('status', ['success', 'failure', 'timeout'])->default('success');
            $table->text('error_message')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_requests');
        Schema::dropIfExists('ai_model_routes');
        Schema::dropIfExists('ai_models');
        Schema::dropIfExists('ai_providers');
    }
};
