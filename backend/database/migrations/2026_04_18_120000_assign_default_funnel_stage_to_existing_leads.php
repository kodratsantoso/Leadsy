<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $firstStageId = DB::table('funnel_stages')->orderBy('sequence')->value('id');

        if ($firstStageId) {
            DB::table('leads')
                ->whereNull('funnel_stage_id')
                ->update(['funnel_stage_id' => $firstStageId]);
        }
    }

    public function down(): void
    {
        // Intentionally not reversible — we cannot know which leads originally had NULL
    }
};
