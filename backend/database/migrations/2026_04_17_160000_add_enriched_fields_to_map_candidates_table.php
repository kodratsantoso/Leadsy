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
        Schema::table('map_candidates', function (Blueprint $table) {
            $table->string('website')->nullable()->after('phone');
            $table->json('opening_hours_json')->nullable()->after('website');
            $table->integer('user_ratings_total')->nullable()->after('rating');
            $table->timestamp('last_enriched_at')->nullable()->after('fetched_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('map_candidates', function (Blueprint $table) {
            $table->dropColumn(['website', 'opening_hours_json', 'user_ratings_total', 'last_enriched_at']);
        });
    }
};
