<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Adds BytePlus ModelArk provider and catalog models.
     * Reference: https://docs.byteplus.com/en/docs/ModelArk/1330310
     */
    public function up(): void
    {
        $provider = DB::table('ai_providers')->where('slug', 'byteplus')->first();

        if (! $provider) {
            $providerId = DB::table('ai_providers')->insertGetId([
                'name' => 'BytePlus ModelArk',
                'slug' => 'byteplus',
                'provider_type' => 'byteplus',
                'base_url' => 'https://ark.ap-southeast.bytepluses.com/api/v3',
                'api_key_encrypted' => 'PLACEHOLDER_CONFIGURE_IN_SETTINGS',
                'status' => 'inactive',
                'default_model' => 'doubao-1.5-pro-32k',
                'timeout_seconds' => 30,
                'retry_limit' => 1,
                'cost_sensitivity' => 'balanced',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            $providerId = $provider->id;
            DB::table('ai_providers')
                ->where('id', $providerId)
                ->update([
                    'name' => 'BytePlus ModelArk',
                    'provider_type' => 'byteplus',
                    'base_url' => $provider->base_url ?: 'https://ark.ap-southeast.bytepluses.com/api/v3',
                    'default_model' => $provider->default_model ?: 'doubao-1.5-pro-32k',
                    'updated_at' => now(),
                ]);
        }

        $models = [
            ['name' => 'doubao-1.5-pro-32k',        'cost_tier' => 'medium', 'context_window' => 32768],
            ['name' => 'doubao-1.5-lite-32k',       'cost_tier' => 'low',    'context_window' => 32768],
            ['name' => 'doubao-1.5-vision-pro-32k', 'cost_tier' => 'medium', 'context_window' => 32768],
            ['name' => 'deepseek-r1',               'cost_tier' => 'medium', 'context_window' => 64000],
            ['name' => 'deepseek-v3',               'cost_tier' => 'low',    'context_window' => 64000],
            ['name' => 'skylark2-pro-4k',           'cost_tier' => 'medium', 'context_window' => 4096],
            ['name' => 'glm-4-9b-chat',             'cost_tier' => 'low',    'context_window' => 32768],
            ['name' => 'qwen2.5-72b-instruct',      'cost_tier' => 'medium', 'context_window' => 32768],
            ['name' => 'moonshot-v1-8k',            'cost_tier' => 'low',    'context_window' => 8192],
        ];

        foreach ($models as $model) {
            DB::table('ai_models')->updateOrInsert(
                ['ai_provider_id' => $providerId, 'name' => $model['name']],
                [
                    'context_window' => $model['context_window'],
                    'cost_tier' => $model['cost_tier'],
                    'status' => 'active',
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }

    public function down(): void
    {
        // Runtime AI provider configuration. No destructive deletion on rollback.
    }
};
