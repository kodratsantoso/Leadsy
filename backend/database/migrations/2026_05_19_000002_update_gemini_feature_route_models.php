<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $providerId = DB::table('ai_providers')
            ->where('slug', 'google')
            ->orWhere('slug', 'gemini')
            ->value('id');

        if (! $providerId) {
            return;
        }

        DB::table('ai_models')->updateOrInsert(
            ['ai_provider_id' => $providerId, 'name' => 'gemini-2.0-flash'],
            [
                'cost_tier' => 'low',
                'context_window' => 1048576,
                'status' => 'active',
                'updated_at' => now(),
                'created_at' => now(),
            ],
        );

        DB::table('ai_models')->updateOrInsert(
            ['ai_provider_id' => $providerId, 'name' => 'gemini-2.5-flash'],
            [
                'cost_tier' => 'low',
                'context_window' => 1048576,
                'status' => 'active',
                'updated_at' => now(),
                'created_at' => now(),
            ],
        );

        $replacementModelId = DB::table('ai_models')
            ->where('ai_provider_id', $providerId)
            ->where('name', 'gemini-2.0-flash')
            ->value('id');

        $legacyModelIds = DB::table('ai_models')
            ->where('ai_provider_id', $providerId)
            ->whereIn('name', ['gemini-1.5-pro', 'gemini-1.5-flash'])
            ->pluck('id');

        if ($replacementModelId && $legacyModelIds->isNotEmpty()) {
            DB::table('ai_feature_routes')
                ->whereIn('ai_model_id', $legacyModelIds)
                ->update([
                    'ai_model_id' => $replacementModelId,
                    'updated_at' => now(),
                ]);
        }
    }

    public function down(): void
    {
        // Keep generated routes untouched on rollback. AI provider settings are runtime configuration.
    }
};
