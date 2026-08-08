<?php

namespace Tests\Feature;

use App\Models\AiGeneratedOutput;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiLeadProfilingTest extends TestCase
{
    use RefreshDatabase;

    public function test_profiling_endpoints_require_authentication()
    {
        $response = $this->postJson('/api/leads/ai-profiling/start', [
            'company_name' => 'Test Company',
        ]);

        $response->assertStatus(401);
    }

    public function test_authenticated_user_with_permission_can_start_profiling()
    {
        $user = User::factory()->create();
        
        // Assign leads.ai_profiling permission
        $permissionId = \DB::table('permissions')->where('name', 'leads.ai_profiling')->value('id');
        if (!$permissionId) {
            $permissionId = \DB::table('permissions')->insertGetId([
                'name' => 'leads.ai_profiling',
                'module' => 'leads',
                'display_name' => 'AI Lead Profiling',
            ]);
        }
        
        $roleId = \DB::table('roles')->where('name', 'admin')->value('id');
        if (!$roleId) {
            $roleId = \DB::table('roles')->insertGetId([
                'name' => 'admin',
                'display_name' => 'Admin',
            ]);
        }
        
        \DB::table('role_permission')->insertOrIgnore([
            'role_id' => $roleId,
            'permission_id' => $permissionId,
        ]);
        
        $user->update(['role_id' => $roleId]);

        $response = $this->actingAs($user)
            ->postJson('/api/leads/ai-profiling/start', [
                'company_name' => 'PT Bungkust Indonesia',
            ]);

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        
        $this->assertDatabaseHas('ai_generated_outputs', [
            'feature_key' => 'lead_ai_profiling',
            'entity_type' => 'App\Models\Lead',
        ]);
    }
}
