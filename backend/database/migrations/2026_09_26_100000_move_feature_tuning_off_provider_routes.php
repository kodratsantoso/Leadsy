<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Separates "which provider answers" from "how this feature needs to be called".
 *
 * Both lived on `ai_feature_routes`, and that row also carries a NOT NULL ai_model_id.
 * So the only way to give a feature its own timeout or token budget was to pin it to one
 * provider — which is exactly the hardcoding we are removing. Dropping those rows without
 * moving the tuning first would hand lead_ai_profiling the global 30s timeout for a call
 * that routinely takes 20-60s and is allowed 120, breaking it outright.
 *
 * Additive only: two nullable columns, backfilled from whatever the feature's own route
 * currently says. Nothing is dropped and no existing row changes meaning.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ai_prompt_templates')) {
            return;
        }

        Schema::table('ai_prompt_templates', function (Blueprint $table) {
            if (! Schema::hasColumn('ai_prompt_templates', 'timeout_seconds')) {
                $table->unsignedSmallInteger('timeout_seconds')->nullable()->after('is_active');
            }
            if (! Schema::hasColumn('ai_prompt_templates', 'max_tokens')) {
                $table->unsignedInteger('max_tokens')->nullable()->after('timeout_seconds');
            }
        });

        if (! Schema::hasTable('ai_feature_routes')) {
            return;
        }

        // Carry each feature's existing tuning across, so removing the pinned route later
        // costs nothing. Highest-priority route wins where a feature has several.
        $tuning = DB::table('ai_feature_routes')
            ->where('feature_name', '<>', 'global')
            ->orderBy('feature_name')
            ->orderBy('priority')
            ->get(['feature_name', 'timeout_seconds', 'max_tokens'])
            ->unique('feature_name');

        foreach ($tuning as $row) {
            DB::table('ai_prompt_templates')
                ->where('feature_name', $row->feature_name)
                ->whereNull('timeout_seconds')
                ->whereNull('max_tokens')
                ->update([
                    'timeout_seconds' => $row->timeout_seconds,
                    'max_tokens' => $row->max_tokens,
                    'updated_at' => now(),
                ]);
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('ai_prompt_templates')) {
            return;
        }

        Schema::table('ai_prompt_templates', function (Blueprint $table) {
            foreach (['timeout_seconds', 'max_tokens'] as $column) {
                if (Schema::hasColumn('ai_prompt_templates', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
