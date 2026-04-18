<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lead_revenue_analyses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->string('business_type')->nullable();
            $table->text('use_case')->nullable();
            $table->string('intent_level')->nullable();           // high|medium|low
            $table->string('urgency')->nullable();                 // high|medium|low
            $table->decimal('probability_to_close', 5, 2)->nullable(); // 0-100
            $table->json('buying_signals')->nullable();
            $table->json('objections')->nullable();
            $table->text('recommended_action')->nullable();
            $table->text('recommended_approach')->nullable();
            $table->decimal('confidence', 4, 3)->nullable();       // 0.000-1.000
            $table->json('reasoning')->nullable();
            $table->string('ai_model')->nullable();
            $table->integer('prompt_tokens')->nullable();
            $table->integer('completion_tokens')->nullable();
            $table->decimal('cost_usd', 10, 6)->nullable();
            $table->string('status')->default('success');          // success|failed|partial
            $table->text('raw_response')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_revenue_analyses');
    }
};
