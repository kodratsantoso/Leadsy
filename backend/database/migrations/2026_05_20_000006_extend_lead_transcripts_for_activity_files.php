<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lead_transcripts', function (Blueprint $table) {
            $table->foreignId('activity_id')->nullable()->after('lead_id')->constrained('lead_activities')->nullOnDelete();
            $table->string('title')->nullable()->after('activity_id');
            $table->string('file_path')->nullable()->after('transcript_text');
            $table->string('file_name')->nullable()->after('file_path');
            $table->string('file_mime')->nullable()->after('file_name');
            $table->unsignedBigInteger('file_size')->nullable()->after('file_mime');
        });

        DB::statement('ALTER TABLE lead_transcripts ALTER COLUMN transcript_text DROP NOT NULL');
    }

    public function down(): void
    {
        Schema::table('lead_transcripts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('activity_id');
            $table->dropColumn(['title', 'file_path', 'file_name', 'file_mime', 'file_size']);
        });

        DB::table('lead_transcripts')->whereNull('transcript_text')->update(['transcript_text' => '']);
        DB::statement('ALTER TABLE lead_transcripts ALTER COLUMN transcript_text SET NOT NULL');
    }
};
