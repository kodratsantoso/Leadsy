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
        Schema::create('target_cascade_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_target_id')->constrained('targets')->onDelete('cascade');
            $table->foreignId('child_target_id')->constrained('targets')->onDelete('cascade');
            $table->decimal('allocated_amount', 15, 2);
            $table->decimal('allocation_percentage', 5, 2)->nullable();
            $table->decimal('remaining_amount_snapshot', 15, 2)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('target_cascade_allocations');
    }
};
