<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Non-destructive: normalize legacy transcripts where import_status defaulted to PENDING
        // but the source was a direct text or file upload (not an external Lark meeting link).
        DB::table('lead_transcripts')
            ->where('import_status', 'PENDING')
            ->where('source_type', '!=', 'link')
            ->update(['import_status' => 'TRANSCRIPT_IMPORTED']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op to preserve operational data integrity
    }
};
