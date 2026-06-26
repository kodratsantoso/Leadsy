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
        Schema::create('kpi_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('kpi_key');
            $table->decimal('actual_value', 15, 2)->default(0);
            $table->decimal('target_value', 15, 2)->nullable();
            $table->decimal('achievement_percentage', 8, 2)->nullable();
            $table->string('period_type');
            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();
            $table->timestamp('generated_at')->useCurrent();
            $table->timestamps();

            $table->index(['user_id', 'period_type', 'generated_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kpi_snapshots');
    }
};
