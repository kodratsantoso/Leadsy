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
        Schema::create('ai_generated_outputs', function (Blueprint $table) {
            $table->id();
            $table->morphs('entity'); // entity_type, entity_id
            $table->string('feature_key');
            $table->json('original_output_json')->nullable();
            $table->json('edited_output_json')->nullable();
            $table->json('current_output_json')->nullable();
            $table->string('status')->default('draft'); // draft | reviewed | approved | rejected | archived
            $table->string('ai_provider')->nullable();
            $table->string('ai_model')->nullable();
            $table->string('prompt_version')->nullable();
            $table->unsignedBigInteger('generated_by')->nullable();
            $table->unsignedBigInteger('reviewed_by')->nullable();
            $table->unsignedBigInteger('last_edited_by')->nullable();
            $table->timestamp('generated_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['entity_type', 'entity_id', 'feature_key'], 'ai_outputs_entity_feature_index');
        });

        Schema::create('ai_output_versions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('ai_output_id');
            $table->integer('version_number');
            $table->json('output_json')->nullable();
            $table->string('change_summary')->nullable();
            $table->unsignedBigInteger('changed_by')->nullable();
            $table->string('change_type')->default('generated'); // generated | edited | regenerated | approved | rejected
            $table->timestamps();

            $table->foreign('ai_output_id')->references('id')->on('ai_generated_outputs')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_output_versions');
        Schema::dropIfExists('ai_generated_outputs');
    }
};
