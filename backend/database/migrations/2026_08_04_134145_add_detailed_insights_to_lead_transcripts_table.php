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
        Schema::table('lead_transcripts', function (Blueprint $table) {
            $table->json('detailed_insights_json')->nullable()->after('meeting_type_sections_json');
            $table->json('conclusion_section_json')->nullable()->after('detailed_insights_json');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lead_transcripts', function (Blueprint $table) {
            $table->dropColumn(['detailed_insights_json', 'conclusion_section_json']);
        });
    }
};
