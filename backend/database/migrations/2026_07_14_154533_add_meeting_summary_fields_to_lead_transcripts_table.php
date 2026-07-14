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
            $table->string('meeting_type')->nullable()->after('evaluation_status');
            $table->string('summary_type')->nullable()->after('meeting_type');
            $table->json('general_sections_json')->nullable()->after('summary_type');
            $table->json('meeting_type_sections_json')->nullable()->after('general_sections_json');
            $table->json('bantc_json')->nullable()->after('meeting_type_sections_json');
            $table->json('score_updates_json')->nullable()->after('bantc_json');
            $table->text('presales_recommendation')->nullable()->after('score_updates_json');
            $table->string('prompt_template_key')->nullable()->after('presales_recommendation');
            $table->string('prompt_version')->nullable()->after('prompt_template_key');
            $table->string('ai_provider')->nullable()->after('prompt_version');
            $table->string('ai_model')->nullable()->after('ai_provider');
            $table->timestamp('generated_at')->nullable()->after('ai_model');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lead_transcripts', function (Blueprint $table) {
            $table->dropColumn([
                'meeting_type',
                'summary_type',
                'general_sections_json',
                'meeting_type_sections_json',
                'bantc_json',
                'score_updates_json',
                'presales_recommendation',
                'prompt_template_key',
                'prompt_version',
                'ai_provider',
                'ai_model',
                'generated_at',
            ]);
        });
    }
};
