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
        Schema::table('leads', function (Blueprint $table) {
            $table->string('enrichment_status')->default('pending')->after('duplicate_status')->index();
            $table->timestamp('last_enriched_at')->nullable()->after('enrichment_status');
            $table->json('enrichment_metadata')->nullable()->after('last_enriched_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn(['enrichment_status', 'last_enriched_at', 'enrichment_metadata']);
        });
    }
};
