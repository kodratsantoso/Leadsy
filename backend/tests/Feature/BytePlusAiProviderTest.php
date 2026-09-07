<?php

namespace Tests\Feature;

use App\Http\Middleware\CheckPermission;
use App\Models\AiModel;
use App\Models\AiProvider;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BytePlusAiProviderTest extends TestCase
{
    use RefreshDatabase;

    public function test_byteplus_provider_seeded_and_can_be_configured(): void
    {
        $this->withoutMiddleware(CheckPermission::class);

        $admin = $this->makeUser('admin');

        $byteplus = AiProvider::where('slug', 'byteplus')->first();
        $this->assertNotNull($byteplus);
        $this->assertSame('BytePlus ModelArk', $byteplus->name);
        $this->assertSame('https://ark.ap-southeast.bytepluses.com/api/v3', $byteplus->base_url);

        // Check models
        $models = $byteplus->models()->pluck('name')->toArray();
        $this->assertContains('doubao-1.5-pro-32k', $models);
        $this->assertContains('deepseek-r1', $models);

        // Update API key and status
        $response = $this->actingAs($admin)
            ->putJson("/api/settings/ai-default/providers/{$byteplus->id}", [
                'api_key' => 'bp-test-key-1234567890',
                'status' => 'active',
                'default_model' => 'deepseek-r1',
            ])
            ->assertOk();

        $this->assertSame('active', $response->json('data.status'));
        $this->assertSame('deepseek-r1', $response->json('data.default_model'));

        // Reveal key check
        $this->actingAs($admin)
            ->postJson("/api/settings/ai-default/providers/{$byteplus->id}/reveal-key")
            ->assertOk()
            ->assertJsonPath('data.api_key', 'bp-test-key-1234567890');
    }

    public function test_can_add_custom_byteplus_endpoint_model(): void
    {
        $this->withoutMiddleware(CheckPermission::class);

        $admin = $this->makeUser('admin');
        $byteplus = AiProvider::where('slug', 'byteplus')->firstOrFail();

        $this->actingAs($admin)
            ->postJson("/api/settings/ai-default/providers/{$byteplus->id}/models", [
                'name' => 'ep-20241234-custom-doubao',
                'cost_tier' => 'medium',
                'context_window' => 64000,
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'ep-20241234-custom-doubao');

        $this->assertDatabaseHas('ai_models', [
            'ai_provider_id' => $byteplus->id,
            'name' => 'ep-20241234-custom-doubao',
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
