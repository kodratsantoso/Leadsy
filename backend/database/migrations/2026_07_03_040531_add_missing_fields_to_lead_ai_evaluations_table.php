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
            $table->text('challenge')->nullable();
            $table->text('legacy_tools')->nullable();
            $table->json('risks')->nullable();
            $table->json('action_items')->nullable();
            $table->json('missing_information')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lead_ai_evaluations', function (Blueprint $table) {
            $table->dropColumn(['challenge', 'legacy_tools', 'risks', 'action_items', 'missing_information']);
        });
    }
};
