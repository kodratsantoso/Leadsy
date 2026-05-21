<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lead_ai_evaluations', function (Blueprint $table) {
            $table->text('summary')->nullable()->after('interest_level');
        });
    }

    public function down(): void
    {
        Schema::table('lead_ai_evaluations', function (Blueprint $table) {
            $table->dropColumn('summary');
        });
    }
};
