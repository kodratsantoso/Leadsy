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
                'name'              => 'OpenAI',
                'slug'              => 'openai',
                'base_url'          => 'https://api.openai.com/v1',
                'api_key_encrypted' => 'PLACEHOLDER_CONFIGURE_IN_SETTINGS',
                'status'            => 'inactive',
                'models'            => [
                    ['name' => 'gpt-5.1',      'cost_tier' => 'high',   'context_window' => 400000],
                    ['name' => 'gpt-5',        'cost_tier' => 'high',   'context_window' => 400000],
                    ['name' => 'gpt-5-mini',   'cost_tier' => 'medium', 'context_window' => 400000],
                    ['name' => 'gpt-5-nano',   'cost_tier' => 'low',    'context_window' => 400000],
                    ['name' => 'gpt-4.1',      'cost_tier' => 'high',   'context_window' => 1047576],
                    ['name' => 'gpt-4.1-mini', 'cost_tier' => 'medium', 'context_window' => 1047576],
                    ['name' => 'gpt-4.1-nano', 'cost_tier' => 'low',    'context_window' => 1047576],
                    ['name' => 'gpt-4o',       'cost_tier' => 'high',   'context_window' => 128000],
                    ['name' => 'gpt-4o-mini',  'cost_tier' => 'low',    'context_window' => 128000],
                ],
            ],
            [
                'name'              => 'Anthropic',
                'slug'              => 'anthropic',
                'base_url'          => 'https://api.anthropic.com/v1',
                'api_key_encrypted' => 'PLACEHOLDER_CONFIGURE_IN_SETTINGS',
                'status'            => 'inactive',
                'models'            => [
                    ['name' => 'claude-opus-4-1-20250805',   'cost_tier' => 'high',   'context_window' => 200000],
                    ['name' => 'claude-opus-4-20250514',     'cost_tier' => 'high',   'context_window' => 200000],
                    ['name' => 'claude-sonnet-4-20250514',   'cost_tier' => 'medium', 'context_window' => 200000],
                    ['name' => 'claude-3-7-sonnet-20250219', 'cost_tier' => 'medium', 'context_window' => 200000],
                    ['name' => 'claude-3-5-haiku-20241022',  'cost_tier' => 'low',    'context_window' => 200000],
                    ['name' => 'claude-3-haiku-20240307',    'cost_tier' => 'low',    'context_window' => 200000],
                ],
            ],
            [
                'name'              => 'Google Gemini',
                'slug'              => 'google',
                'base_url'          => 'https://generativelanguage.googleapis.com/v1beta',
                'api_key_encrypted' => 'PLACEHOLDER_CONFIGURE_IN_SETTINGS',
                'status'            => 'inactive',
                'models'            => [
                    ['name' => 'gemini-3-pro-preview',  'cost_tier' => 'high',   'context_window' => 1048576],
                    ['name' => 'gemini-2.5-pro',        'cost_tier' => 'high',   'context_window' => 1048576],
                    ['name' => 'gemini-2.5-flash',      'cost_tier' => 'medium', 'context_window' => 1048576],
                    ['name' => 'gemini-2.5-flash-lite', 'cost_tier' => 'low',    'context_window' => 1048576],
                    ['name' => 'gemini-2.0-flash',      'cost_tier' => 'low',    'context_window' => 1048576],
                ],
            ],
        ];

        foreach ($providers as $providerData) {
            $models = $providerData['models'];
            unset($providerData['models']);

            $provider = AiProvider::updateOrCreate(
                ['slug' => $providerData['slug']],
                // Do NOT overwrite api_key_encrypted if already set by the user
                array_merge($providerData, [
                    'api_key_encrypted' => AiProvider::where('slug', $providerData['slug'])->value('api_key_encrypted')
                        ?? $providerData['api_key_encrypted'],
                ])
            );

            foreach ($models as $model) {
                AiModel::updateOrCreate(
                    ['ai_provider_id' => $provider->id, 'name' => $model['name']],
                    array_merge($model, ['status' => 'active'])
                );
            }
        }
    }
}
