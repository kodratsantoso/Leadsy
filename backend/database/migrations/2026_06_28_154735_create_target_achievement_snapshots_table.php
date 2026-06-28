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
        Schema::create('target_achievement_snapshots', function (Blueprint $table) {
            $table->id();
            $table->string('target_type'); // revenue, kpi
            $table->unsignedBigInteger('target_id');
            $table->decimal('actual_value', 20, 2);
            $table->decimal('target_value', 20, 2);
            $table->decimal('achievement_percentage', 8, 2);
            $table->json('calculation_basis_json')->nullable();
            $table->json('data_sources_json')->nullable();
            $table->string('limitation')->nullable();
            $table->timestamp('generated_at');
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('target_achievement_snapshots');
    }
};
