<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('tier_level', ['VP', 'MANAGER', 'SR_AE', 'JR_AE', 'SDR'])->default('JR_AE')->after('role_id');
            $table->decimal('buffer_rate', 5, 2)->default(20.00)->after('tier_level');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['tier_level', 'buffer_rate']);
        });
    }
};
