<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tier_level_check');
        }

        Schema::table('users', function (Blueprint $table) {
            $table->string('tier_level', 50)->default('JR_AE')->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('tier_level', ['VP', 'MANAGER', 'SR_AE', 'JR_AE', 'SDR'])->default('JR_AE')->change();
        });
    }
};
