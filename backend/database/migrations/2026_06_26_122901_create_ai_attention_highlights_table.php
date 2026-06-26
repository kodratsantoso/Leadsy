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
        Schema::create('ai_attention_highlights', function (Blueprint $table) {
            $table->id();
            $table->morphs('entity'); // entity_type, entity_id
            $table->string('feature_key')->nullable();
            $table->string('title');
            $table->string('category');
            $table->string('severity'); // low | medium | high | critical
            $table->text('reason')->nullable();
            $table->json('evidence_json')->nullable();
            $table->text('recommended_action')->nullable();
            $table->string('status')->default('open'); // open | acknowledged | resolved | dismissed
            $table->unsignedBigInteger('assigned_to')->nullable();
            $table->timestamp('due_date')->nullable();
            $table->unsignedBigInteger('created_by_ai_output_id')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['entity_type', 'entity_id'], 'ai_highlights_entity_index');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_attention_highlights');
    }
};
