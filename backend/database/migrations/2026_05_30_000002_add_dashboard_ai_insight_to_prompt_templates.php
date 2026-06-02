<?php

use App\Models\AiPromptTemplate;
use App\Services\AI\AIPromptTemplateService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const FEATURE = 'dashboard_ai_insight';

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
        $service = app(AIPromptTemplateService::class);
        $reflection = new ReflectionClass($service);
        $method = $reflection->getMethod('defaultTemplates');
        $method->setAccessible(true);
        $templates = $method->invoke($service);

        if (isset($templates['dashboard_ai_insight'])) {
            $featureName = 'dashboard_ai_insight';
            $content = $templates['dashboard_ai_insight'];

            $template = AiPromptTemplate::firstOrCreate(
                ['feature_name' => $featureName, 'template_name' => 'Default'],
                ['description' => 'Detailed system-managed default prompt wrapper', 'is_active' => true]
            );

            $activeVersion = $template->activeVersion;
            if (!$activeVersion || trim($activeVersion->content) !== trim($content)) {
                $version = $template->versions()->create([
                    'version' => ((int) $template->versions()->max('version')) + 1,
                    'content' => $content,
                    'is_active' => false,
                    'is_enabled' => true,
                ]);

                $template->versions()->update(['is_active' => false]);
                $version->forceFill([
                    'is_active' => true,
                    'activated_at' => now(),
                ])->save();

                $template->forceFill([
                    'active_version_id' => $version->id,
                ])->save();
            }
        }

        // Seed feature routes for dashboard_ai_insight
        if (!DB::table('ai_feature_routes')->where('feature_name', self::FEATURE)->exists()) {
            $primaryId = $this->resolveModelId(self::PREFERRED_PRIMARY);
            $fallbackId = $this->resolveModelId(self::PREFERRED_FALLBACK, exclude: $primaryId);

            if ($primaryId) {
                DB::table('ai_feature_routes')->insert([
                    [
                        'feature_name' => self::FEATURE,
                        'ai_model_id' => $primaryId,
                        'priority' => 1,
                        'max_retries' => 1,
                        'timeout_seconds' => 45,
                        'cost_sensitivity' => 'medium',
                        'is_active' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ],
                ]);

                if ($fallbackId) {
                    DB::table('ai_feature_routes')->insert([
                        [
                            'feature_name' => self::FEATURE,
                            'ai_model_id' => $fallbackId,
                            'priority' => 2,
                            'max_retries' => 1,
                            'timeout_seconds' => 45,
                            'cost_sensitivity' => 'low',
                            'is_active' => true,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ],
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        DB::table('ai_feature_routes')->where('feature_name', self::FEATURE)->delete();
        // Prompt versions are history records. Keep intact on rollback.
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
