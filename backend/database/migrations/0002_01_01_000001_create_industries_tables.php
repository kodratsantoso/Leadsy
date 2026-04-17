<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BRD §4.2 – Master Industry & Sub Industry
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('industries', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->json('synonyms')->nullable();
            $table->text('scoring_hints')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('sub_industries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('industry_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->json('synonyms')->nullable();
            $table->text('scoring_hints')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['industry_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sub_industries');
        Schema::dropIfExists('industries');
    }
};
