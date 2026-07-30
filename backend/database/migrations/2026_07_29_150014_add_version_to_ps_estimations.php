<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ps_estimations', function (Blueprint $table) {
            $table->integer('version_number')->default(1)->after('estimation_number');
            $table->foreignId('parent_estimation_id')->nullable()->after('version_number')->constrained('ps_estimations')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('ps_estimations', function (Blueprint $table) {
            $table->dropForeign(['parent_estimation_id']);
            $table->dropColumn('parent_estimation_id');
            $table->dropColumn('version_number');
        });
    }
};
