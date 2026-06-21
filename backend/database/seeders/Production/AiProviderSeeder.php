<?php

namespace Database\Seeders\Production;

use App\Models\AiModel;
use App\Models\AiProvider;
use Illuminate\Database\Seeder;

class AiProviderSeeder extends Seeder
{
    public function run(): void
    {
        $providers = [
            [
                'name' => 'OpenAI',
                'slug' => 'openai',
                'provider_type' => 'openai',
                'base_url' => 'https://api.openai.com/v1',
                'api_key_encrypted' => 'PLACEHOLDER_CONFIGURE_IN_SETTINGS',
                'status' => 'inactive',
                'models' => [
                    ['name' => 'gpt-4o',             'cost_tier' => 'high',   'context_window' => 128000],
                    ['name' => 'gpt-4o-mini',        'cost_tier' => 'low',    'context_window' => 128000],
                    ['name' => 'o1',                 'cost_tier' => 'high',   'context_window' => 200000],
                    ['name' => 'o1-mini',            'cost_tier' => 'medium', 'context_window' => 128000],
                    ['name' => 'o3-mini',            'cost_tier' => 'medium', 'context_window' => 200000],
                ],
            ],
            [
                'name' => 'Anthropic',
                'slug' => 'anthropic',
                'provider_type' => 'anthropic',
                'base_url' => 'https://api.anthropic.com/v1',
                'api_key_encrypted' => 'PLACEHOLDER_CONFIGURE_IN_SETTINGS',
                'status' => 'inactive',
                'models' => [
                    ['name' => 'claude-3-7-sonnet-20250219', 'cost_tier' => 'medium', 'context_window' => 200000],
                    ['name' => 'claude-3-5-sonnet-20241022', 'cost_tier' => 'medium', 'context_window' => 200000],
                    ['name' => 'claude-3-5-haiku-20241022',  'cost_tier' => 'low',    'context_window' => 200000],
                    ['name' => 'claude-3-opus-20240229',     'cost_tier' => 'high',   'context_window' => 200000],
                ],
            ],
            [
                'name' => 'Google Gemini',
                'slug' => 'google',
                'provider_type' => 'gemini',
                'base_url' => 'https://generativelanguage.googleapis.com/v1beta',
                'api_key_encrypted' => 'PLACEHOLDER_CONFIGURE_IN_SETTINGS',
                'status' => 'inactive',
                'models' => [
                    ['name' => 'gemini-3.5-flash',                'cost_tier' => 'medium', 'context_window' => 2000000],
                    ['name' => 'gemini-3.1-pro',                  'cost_tier' => 'high',   'context_window' => 2000000],
                    ['name' => 'gemini-3.1-flash-lite',           'cost_tier' => 'low',    'context_window' => 1000000],
                    ['name' => 'gemini-3-flash',                  'cost_tier' => 'medium', 'context_window' => 2000000],
                    ['name' => 'gemini-2.5-pro',                  'cost_tier' => 'high',   'context_window' => 2000000],
                    ['name' => 'gemini-2.5-flash',                'cost_tier' => 'medium', 'context_window' => 1000000],
                    ['name' => 'gemini-2.5-flash-lite',           'cost_tier' => 'low',    'context_window' => 1000000],
                    ['name' => 'gemini-2.5-flash-live-preview-2', 'cost_tier' => 'high',   'context_window' => 1000000],
                ],
            ],
            [
                'name' => 'Groq',
                'slug' => 'groq',
                'provider_type' => 'openai',
                'base_url' => 'https://api.groq.com/openai/v1',
                'api_key_encrypted' => 'PLACEHOLDER_CONFIGURE_IN_SETTINGS',
                'status' => 'inactive',
                'models' => [
                    ['name' => 'llama-3.3-70b-versatile',  'cost_tier' => 'low', 'context_window' => 128000],
                    ['name' => 'llama-3.1-8b-instant',     'cost_tier' => 'low', 'context_window' => 128000],
                    ['name' => 'mixtral-8x7b-32768',       'cost_tier' => 'low', 'context_window' => 32768],
                    ['name' => 'gemma2-9b-it',             'cost_tier' => 'low', 'context_window' => 8192],
                ],
            ],
            [
                'name' => 'DeepSeek',
                'slug' => 'deepseek',
                'provider_type' => 'openai',
                'base_url' => 'https://api.deepseek.com/v1',
                'api_key_encrypted' => 'PLACEHOLDER_CONFIGURE_IN_SETTINGS',
                'status' => 'inactive',
                'models' => [
                    ['name' => 'deepseek-chat',     'cost_tier' => 'low', 'context_window' => 64000],
                    ['name' => 'deepseek-reasoner', 'cost_tier' => 'low', 'context_window' => 64000],
                ],
            ],
        ];

        foreach ($providers as $providerData) {
            $models = $providerData['models'];
            unset($providerData['models']);

            $provider = AiProvider::where('slug', $providerData['slug'])->first();

            if ($provider) {
                $provider->forceFill(collect($providerData)
                    ->except(['api_key_encrypted', 'status'])
                    ->all())->save();
            } else {
                $provider = AiProvider::create($providerData);
            }

            $currentModelNames = collect($models)->pluck('name')->toArray();
            
            // Remove obsolete models that are no longer supported
            AiModel::where('ai_provider_id', $provider->id)
                ->whereNotIn('name', $currentModelNames)
                ->delete();

            foreach ($models as $model) {
                AiModel::updateOrCreate(
                    ['ai_provider_id' => $provider->id, 'name' => $model['name']],
                    array_merge($model, ['status' => 'active'])
                );
            }
        }
    }
}
