<?php

namespace Tests\Feature;

use App\Http\Middleware\CheckPermission;
use App\Models\AiModel;
use App\Models\AiPromptTemplate;
use App\Models\AiProvider;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiDefaultSettingsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_masks_keys_and_reveal_requires_admin_role(): void
    {
        $this->withoutMiddleware(CheckPermission::class);

        $provider = AiProvider::create([
            'name' => 'OpenAI',
            'slug' => 'openai',
            'provider_type' => 'openai',
            'base_url' => 'https://api.openai.com/v1',
            'api_key_encrypted' => 'sk-test-secret-1234',
            'status' => 'active',
        ]);

        AiModel::create([
            'ai_provider_id' => $provider->id,
            'name' => 'gpt-4o-mini',
            'cost_tier' => 'low',
            'status' => 'active',
        ]);

        $viewer = $this->makeUser('viewer');
        $admin = $this->makeUser('admin');

        $this->actingAs($viewer)
            ->getJson('/api/settings/ai-default')
            ->assertOk()
            ->assertJsonPath('data.providers.0.api_key_masked', 'sk-****-****-1234');

        $this->actingAs($viewer)
            ->postJson("/api/settings/ai-default/providers/{$provider->id}/reveal-key")
            ->assertForbidden();

        $this->actingAs($admin)
            ->postJson("/api/settings/ai-default/providers/{$provider->id}/reveal-key")
            ->assertOk()
            ->assertJsonPath('data.api_key', 'sk-test-secret-1234');
    }

    public function test_feature_route_save_persists_priorities(): void
    {
        $this->withoutMiddleware(CheckPermission::class);

        $admin = $this->makeUser('admin');
        $provider = AiProvider::create([
            'name' => 'Anthropic',
            'slug' => 'anthropic',
            'provider_type' => 'anthropic',
            'base_url' => 'https://api.anthropic.com/v1',
            'api_key_encrypted' => 'anthropic-key-1234',
            'status' => 'active',
        ]);

        $primary = AiModel::create([
            'ai_provider_id' => $provider->id,
            'name' => 'claude-sonnet',
            'cost_tier' => 'high',
            'status' => 'active',
        ]);

        $fallback = AiModel::create([
            'ai_provider_id' => $provider->id,
            'name' => 'claude-haiku',
            'cost_tier' => 'low',
            'status' => 'active',
        ]);

        $this->actingAs($admin)
            ->putJson('/api/settings/ai-default/feature-routes/global', [
                'routes' => [
                    [
                        'priority' => 1,
                        'ai_model_id' => $primary->id,
                        'timeout_seconds' => 20,
                        'max_retries' => 1,
                        'complexity_mode' => 'deep_reasoning',
                        'cost_sensitivity' => 'quality_first',
                        'is_active' => true,
                    ],
                    [
                        'priority' => 2,
                        'ai_model_id' => $fallback->id,
                        'timeout_seconds' => 15,
                        'max_retries' => 1,
                        'complexity_mode' => 'lightweight',
                        'cost_sensitivity' => 'cost_first',
                        'is_active' => true,
                    ],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.0.feature_name', 'global');

        $this->assertDatabaseHas('ai_feature_routes', [
            'feature_name' => 'global',
            'ai_model_id' => $primary->id,
            'priority' => 1,
            'complexity_mode' => 'deep_reasoning',
        ]);

        $this->assertDatabaseHas('ai_feature_routes', [
            'feature_name' => 'global',
            'ai_model_id' => $fallback->id,
            'priority' => 2,
            'complexity_mode' => 'lightweight',
        ]);
    }

    public function test_prompt_versioning_creates_new_version_and_can_activate_it(): void
    {
        $this->withoutMiddleware(CheckPermission::class);

        $admin = $this->makeUser('admin');

        $this->actingAs($admin)
            ->postJson('/api/settings/ai-default/prompt-templates/versions', [
                'feature_name' => 'lead_analysis',
                'template_name' => 'Default',
                'description' => 'Lead analysis system wrapper',
                'content' => "System instruction\n\n{{input}}",
            ])
            ->assertCreated()
            ->assertJsonPath('data.version', 2);

        $template = AiPromptTemplate::where('feature_name', 'lead_analysis')->where('template_name', 'Default')->firstOrFail();
        $newVersion = $template->versions()->where('version', 2)->firstOrFail();

        $this->actingAs($admin)
            ->postJson("/api/settings/ai-default/prompt-templates/versions/{$newVersion->id}/activate")
            ->assertOk()
            ->assertJsonPath('data.is_active', true);

        $this->assertDatabaseHas('ai_prompt_templates', [
            'id' => $template->id,
            'active_version_id' => $newVersion->id,
        ]);

        $this->assertDatabaseHas('ai_prompt_template_versions', [
            'id' => $newVersion->id,
            'is_active' => true,
        ]);
    }

    private function makeUser(string $roleName): User
    {
        $tenant = Tenant::firstOrCreate(
            ['slug' => 'test-workspace'],
            ['name' => 'Test Workspace', 'status' => 'active']
        );

        $role = Role::firstOrCreate(
            ['name' => $roleName],
            ['display_name' => ucfirst(str_replace('_', ' ', $roleName))]
        );

        return User::create([
            'name' => ucfirst($roleName),
            'email' => $roleName.'-'.uniqid().'@example.com',
            'password' => 'password123',
            'role_id' => $role->id,
            'tenant_id' => $tenant->id,
            'is_active' => true,
        ]);
    }
}
