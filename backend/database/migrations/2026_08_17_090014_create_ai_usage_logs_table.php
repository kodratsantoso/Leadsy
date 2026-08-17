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
        Schema::create('ai_usage_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->string('action')->index(); // e.g., 'pre_meeting_brief_generation'
            $table->string('provider');
            $table->string('model');
            $table->integer('tokens_prompt')->default(0);
            $table->integer('tokens_completion')->default(0);
            $table->integer('tokens_total')->default(0);
            $table->decimal('estimated_cost_usd', 10, 6)->default(0);
            $table->boolean('has_web_search')->default(false);
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_usage_logs');
    }
};
