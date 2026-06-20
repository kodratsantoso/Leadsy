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
        Schema::table('lead_ai_evaluations', function (Blueprint $table) {
            $table->json('bantc_extracted')->nullable()->after('buying_signals');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lead_ai_evaluations', function (Blueprint $table) {
            $table->dropColumn('bantc_extracted');
        });
    }
};
