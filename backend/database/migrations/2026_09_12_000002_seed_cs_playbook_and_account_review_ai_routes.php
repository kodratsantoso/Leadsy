<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const FEATURES = [
        'cs_playbook_ai',
        'ai_account_review_generator',
    ];

    private const PREFERRED_PRIMARY = [
        'gpt-4.1',
        'gpt-4.1-mini',
        'gpt-4o',
        'claude-sonnet-4-20250514',
        'gemini-2.5-flash',
    ];

    private const PREFERRED_FALLBACK = [
        'gpt-4.1-mini',
        'gpt-4o-mini',
        'claude-3-5-haiku-20241022',
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash',
    ];

    public function up(): void
    {
        foreach (self::FEATURES as $feature) {
            $this->seedFeature($feature);
        }
    }

    public function down(): void
    {
        DB::table('ai_feature_routes')->whereIn('feature_name', self::FEATURES)->delete();
    }

    private function seedFeature(string $feature): void
    {
        if (DB::table('ai_feature_routes')->where('feature_name', $feature)->exists()) {
            return;
        }

        $primaryId = $this->resolveModelId(self::PREFERRED_PRIMARY);
        $fallbackId = $this->resolveModelId(self::PREFERRED_FALLBACK, exclude: $primaryId);

        if (! $primaryId) {
            return;
        }

        DB::table('ai_feature_routes')->insert([
            'feature_name' => $feature,
            'ai_model_id' => $primaryId,
            'priority' => 1,
            'max_retries' => 1,
            'timeout_seconds' => 60,
            'cost_sensitivity' => 'medium',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if ($fallbackId) {
            DB::table('ai_feature_routes')->insert([
                'feature_name' => $feature,
                'ai_model_id' => $fallbackId,
                'priority' => 2,
                'max_retries' => 1,
                'timeout_seconds' => 60,
                'cost_sensitivity' => 'low',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    private function resolveModelId(array $preferred, ?int $exclude = null): ?int
    {
        foreach ($preferred as $name) {
            $query = DB::table('ai_models')->where('name', $name)->where('status', 'active');
            if ($exclude) {
                $query->where('id', '!=', $exclude);
            }

            $id = $query->value('id');
            if ($id) {
                return $id;
            }
        }

        $query = DB::table('ai_models')->where('cost_tier', 'medium')->where('status', 'active');
        if ($exclude) {
            $query->where('id', '!=', $exclude);
        }

        $id = $query->value('id');
        if ($id) {
            return $id;
        }

        $query = DB::table('ai_models')->where('status', 'active');
        if ($exclude) {
            $query->where('id', '!=', $exclude);
        }

        return $query->value('id');
    }
};
