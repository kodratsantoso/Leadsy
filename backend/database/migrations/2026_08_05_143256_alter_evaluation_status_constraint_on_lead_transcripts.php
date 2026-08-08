<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE lead_transcripts DROP CONSTRAINT IF EXISTS lead_transcripts_evaluation_status_check');
            DB::statement("ALTER TABLE lead_transcripts ADD CONSTRAINT lead_transcripts_evaluation_status_check CHECK (evaluation_status::text = ANY (ARRAY['pending'::text, 'analyzing'::text, 'evaluated'::text, 'skipped'::text, 'failed'::text]))");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE lead_transcripts DROP CONSTRAINT IF EXISTS lead_transcripts_evaluation_status_check');
            DB::statement("ALTER TABLE lead_transcripts ADD CONSTRAINT lead_transcripts_evaluation_status_check CHECK (evaluation_status::text = ANY (ARRAY['pending'::text, 'evaluated'::text, 'skipped'::text]))");
        }
    }
};
