<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lead_bantc_question_guides', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('leads')->cascadeOnDelete();
            $table->json('questions')->default('[]');
            $table->boolean('ai_generated')->default(false);
            $table->string('ai_model')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique('lead_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_bantc_question_guides');
    }
};
