<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('direct_manager_id')->nullable()->after('role_id')->constrained('users')->nullOnDelete();
            $table->enum('target_period', ['weekly', 'monthly', 'quarterly', 'yearly'])->default('monthly')->after('phone');
            $table->decimal('target_revenue', 15, 2)->nullable()->after('target_period');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['target_period', 'target_revenue']);
            $table->dropConstrainedForeignId('direct_manager_id');
        });
    }
};
