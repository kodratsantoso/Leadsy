<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Records where each BANTC answer on a lead came from.
 *
 * Two paths write these fields with different rules, which is why the same lead shows
 * different answers on different screens. The meeting-summary path pushes all five up to
 * the lead; the manual activity path keeps four of them on the activity and only lifts
 * `competitor`. 25 activities carry BANTC answers while only 9 leads do — the other 16
 * never arrived.
 *
 * Fixing that alone would create a second problem: the AI path uses
 * `$ai['budget'] ?? $lead->budget`, so the next meeting transcript would overwrite an
 * answer a salesperson had corrected by hand. Deciding that needs to know which values a
 * human set, and nothing recorded it.
 *
 * Shape: {"budget": {"source": "manual|ai", "at": "ISO-8601"}, ...}. Additive and
 * nullable — a lead with no entry is simply unknown, which is honest for the 9 that
 * already have answers from before this existed.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('leads') || Schema::hasColumn('leads', 'bantc_sources')) {
            return;
        }

        Schema::table('leads', function (Blueprint $table) {
            $table->json('bantc_sources')->nullable()->after('competitor');
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('leads') && Schema::hasColumn('leads', 'bantc_sources')) {
            Schema::table('leads', function (Blueprint $table) {
                $table->dropColumn('bantc_sources');
            });
        }
    }
};
