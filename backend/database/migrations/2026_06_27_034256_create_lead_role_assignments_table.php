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
        Schema::create('lead_role_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role_slug')->index(); // 'sales', 'presales', 'csm', 'am'
            $table->decimal('contribution_percentage', 5, 2)->default(100.00);
            $table->timestamps();

            // Prevent duplicate assignments of the same user to the same role on the same lead
            $table->unique(['lead_id', 'user_id', 'role_slug']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lead_role_assignments');
    }
};
