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
            $table->string('source_provider')->nullable()->default('LARK');
            $table->text('source_url')->nullable();
            $table->string('meeting_id')->nullable();
            $table->string('minute_token')->nullable();
            $table->text('recording_url')->nullable();
            $table->string('transcript_hash')->nullable();
            $table->string('import_status')->nullable()->default('PENDING');
            $table->string('import_error_code')->nullable();
            $table->text('import_error_message')->nullable();
            $table->timestamp('imported_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lead_transcripts', function (Blueprint $table) {
            $table->dropColumn([
                'source_provider',
                'source_url',
                'meeting_id',
                'minute_token',
                'recording_url',
                'transcript_hash',
                'import_status',
                'import_error_code',
                'import_error_message',
                'imported_at'
            ]);
        });
    }
};
