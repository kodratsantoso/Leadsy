<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('target_percentage', 5, 2)->default(100.00)->after('target_revenue');
            $table->string('target_calculation_type', 50)->default('amount')->after('target_percentage'); // 'amount' or 'percentage'
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['target_percentage', 'target_calculation_type']);
        });
    }
};
