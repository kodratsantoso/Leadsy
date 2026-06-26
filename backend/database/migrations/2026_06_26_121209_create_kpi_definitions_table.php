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
        Schema::create('kpi_definitions', function (Blueprint $table) {
            $table->id();
            $table->string('role_slug');
            $table->string('kpi_key');
            $table->string('kpi_name');
            $table->text('description')->nullable();
            $table->json('formula_json')->nullable();
            $table->decimal('weight', 5, 2)->default(1.0);
            $table->string('format')->default('number'); // currency, percentage, number
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['role_slug', 'kpi_key']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kpi_definitions');
    }
};
