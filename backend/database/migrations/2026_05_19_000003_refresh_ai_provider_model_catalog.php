<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Refreshes the local model catalog from provider documentation current on 2026-05-19.
     *
     * Sources:
     * - OpenAI model docs: GPT-5.1 / GPT-5 / GPT-4.1 / GPT-4o families.
     * - Anthropic model overview: Claude Opus 4.1, Opus 4, Sonnet 4, Sonnet 3.7, Haiku 3.5, Haiku 3.
     * - Google Gemini model docs: Gemini 3 Pro preview, Gemini 2.5, and Gemini 2.0 Flash families.
     */
    public function up(): void
    {
        $catalog = [
            'openai' => [
                'provider_type' => 'openai',
                'default_model' => 'gpt-5.1',
                'models' => [
                    ['name' => 'gpt-5.1', 'cost_tier' => 'high', 'context_window' => 400000],
                    ['name' => 'gpt-5', 'cost_tier' => 'high', 'context_window' => 400000],
                    ['name' => 'gpt-5-mini', 'cost_tier' => 'medium', 'context_window' => 400000],
                    ['name' => 'gpt-5-nano', 'cost_tier' => 'low', 'context_window' => 400000],
                    ['name' => 'gpt-4.1', 'cost_tier' => 'high', 'context_window' => 1047576],
                    ['name' => 'gpt-4.1-mini', 'cost_tier' => 'medium', 'context_window' => 1047576],
                    ['name' => 'gpt-4.1-nano', 'cost_tier' => 'low', 'context_window' => 1047576],
                    ['name' => 'gpt-4o', 'cost_tier' => 'high', 'context_window' => 128000],
                    ['name' => 'gpt-4o-mini', 'cost_tier' => 'low', 'context_window' => 128000],
                ],
                'deprecated' => ['gpt-3.5-turbo'],
            ],
            'anthropic' => [
                'provider_type' => 'anthropic',
                'default_model' => 'claude-sonnet-4-20250514',
                'models' => [
                    ['name' => 'claude-opus-4-1-20250805', 'cost_tier' => 'high', 'context_window' => 200000],
                    ['name' => 'claude-opus-4-20250514', 'cost_tier' => 'high', 'context_window' => 200000],
                    ['name' => 'claude-sonnet-4-20250514', 'cost_tier' => 'medium', 'context_window' => 200000],
                    ['name' => 'claude-3-7-sonnet-20250219', 'cost_tier' => 'medium', 'context_window' => 200000],
                    ['name' => 'claude-3-5-sonnet-20241022', 'cost_tier' => 'medium', 'context_window' => 200000],
                    ['name' => 'claude-3-5-haiku-20241022', 'cost_tier' => 'low', 'context_window' => 200000],
                    ['name' => 'claude-3-haiku-20240307', 'cost_tier' => 'low', 'context_window' => 200000],
                ],
                'deprecated' => [],
            ],
            'google' => [
                'provider_type' => 'gemini',
                'default_model' => 'gemini-2.5-flash',
                'models' => [
                    ['name' => 'gemini-3-pro-preview', 'cost_tier' => 'high', 'context_window' => 1048576],
                    ['name' => 'gemini-2.5-pro', 'cost_tier' => 'high', 'context_window' => 1048576],
                    ['name' => 'gemini-2.5-flash', 'cost_tier' => 'medium', 'context_window' => 1048576],
                    ['name' => 'gemini-2.5-flash-lite', 'cost_tier' => 'low', 'context_window' => 1048576],
                    ['name' => 'gemini-2.0-flash', 'cost_tier' => 'low', 'context_window' => 1048576],
                ],
                'deprecated' => ['gemini-1.5-pro', 'gemini-1.5-flash'],
            ],
        ];

        foreach ($catalog as $slug => $providerCatalog) {
            $provider = DB::table('ai_providers')->where('slug', $slug)->first();

            if (! $provider) {
                continue;
            }

            DB::table('ai_providers')
                ->where('id', $provider->id)
                ->update([
                    'provider_type' => $providerCatalog['provider_type'],
                    'default_model' => $providerCatalog['default_model'],
                    'updated_at' => now(),
                ]);

            foreach ($providerCatalog['models'] as $model) {
                DB::table('ai_models')->updateOrInsert(
                    ['ai_provider_id' => $provider->id, 'name' => $model['name']],
                    [
                        'context_window' => $model['context_window'],
                        'cost_tier' => $model['cost_tier'],
                        'status' => 'active',
                        'updated_at' => now(),
                        'created_at' => now(),
                    ],
                );
            }

            if (! empty($providerCatalog['deprecated'])) {
                DB::table('ai_models')
                    ->where('ai_provider_id', $provider->id)
                    ->whereIn('name', $providerCatalog['deprecated'])
                    ->update([
                        'status' => 'deprecated',
                        'updated_at' => now(),
                    ]);
            }
        }

        $this->moveRoutesFromDeprecatedModels();
    }

    private function moveRoutesFromDeprecatedModels(): void
    {
        $replacements = [
            'gpt-3.5-turbo' => 'gpt-4o-mini',
            'gemini-1.5-pro' => 'gemini-2.5-flash',
            'gemini-1.5-flash' => 'gemini-2.0-flash',
        ];

        foreach ($replacements as $oldName => $newName) {
            $oldModel = DB::table('ai_models')->where('name', $oldName)->first();
            $newModel = DB::table('ai_models')->where('name', $newName)->first();

            if (! $oldModel || ! $newModel || $oldModel->ai_provider_id !== $newModel->ai_provider_id) {
                continue;
            }

            DB::table('ai_feature_routes')
                ->where('ai_model_id', $oldModel->id)
                ->update([
                    'ai_model_id' => $newModel->id,
                    'updated_at' => now(),
                ]);

            DB::table('ai_model_routes')
                ->where('primary_model_id', $oldModel->id)
                ->update([
                    'primary_model_id' => $newModel->id,
                    'updated_at' => now(),
                ]);

            DB::table('ai_model_routes')
                ->where('fallback_model_id', $oldModel->id)
                ->update([
                    'fallback_model_id' => $newModel->id,
                    'updated_at' => now(),
                ]);
        }
    }

    public function down(): void
    {
        // AI model availability is runtime configuration. Do not remove models on rollback.
    }
};
