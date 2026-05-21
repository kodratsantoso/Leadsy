<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Seeds a default ai_feature_routes entry for product_question_generation.
 *
 * Model selection priority (descending preference):
 *   1. claude-sonnet-4-20250514   (medium cost, strong instruction-following)
 *   2. gpt-4.1-mini               (medium cost, reliable JSON output)
 *   3. gemini-2.5-flash           (medium cost, good throughput)
 *   4. Any other active medium-cost model
 *   5. Any other active model
 *
 * A fallback route (priority 2) is also created with the next preferred model.
 * If no models exist yet (fresh install), the migration is a no-op — the admin
 * must configure routes in Settings → AI Defaults after setting up a provider.
 */
return new class extends Migration
{
    private const FEATURE = 'product_question_generation';

    private const PREFERRED_PRIMARY = [
        'claude-sonnet-4-20250514',
        'claude-3-7-sonnet-20250219',
        'gpt-4.1-mini',
        'gpt-4o-mini',
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
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
        // Skip if routes already configured for this feature
        if (DB::table('ai_feature_routes')->where('feature_name', self::FEATURE)->exists()) {
            return;
        }

        $primaryId  = $this->resolveModelId(self::PREFERRED_PRIMARY);
        $fallbackId = $this->resolveModelId(self::PREFERRED_FALLBACK, exclude: $primaryId);

        if (! $primaryId) {
            // No AI models seeded yet — admin will configure via Settings → AI Defaults
            return;
        }

        DB::table('ai_feature_routes')->insert([
            [
                'feature_name'    => self::FEATURE,
                'ai_model_id'     => $primaryId,
                'priority'        => 1,
                'max_retries'     => 1,
                'timeout_seconds' => 45,
                'cost_sensitivity'=> 'medium',
                'is_active'       => true,
                'created_at'      => now(),
                'updated_at'      => now(),
            ],
        ]);

        if ($fallbackId) {
            DB::table('ai_feature_routes')->insert([
                [
                    'feature_name'    => self::FEATURE,
                    'ai_model_id'     => $fallbackId,
                    'priority'        => 2,
                    'max_retries'     => 1,
                    'timeout_seconds' => 45,
                    'cost_sensitivity'=> 'low',
                    'is_active'       => true,
                    'created_at'      => now(),
                    'updated_at'      => now(),
                ],
            ]);
        }
    }

    public function down(): void
    {
        DB::table('ai_feature_routes')->where('feature_name', self::FEATURE)->delete();
    }

    private function resolveModelId(array $preferred, ?int $exclude = null): ?int
    {
        // Try preferred models in order
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

        // Fall back to any medium-cost active model
        $query = DB::table('ai_models')->where('cost_tier', 'medium')->where('status', 'active');
        if ($exclude) {
            $query->where('id', '!=', $exclude);
        }
        $id = $query->value('id');
        if ($id) {
            return $id;
        }

        // Last resort: any active model
        $query = DB::table('ai_models')->where('status', 'active');
        if ($exclude) {
            $query->where('id', '!=', $exclude);
        }
        return $query->value('id');
    }
};
