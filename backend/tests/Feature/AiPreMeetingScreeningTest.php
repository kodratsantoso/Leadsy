<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class AiPreMeetingScreeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_superadmin_cannot_trigger_screening(): void
    {
        $salesUser = $this->makeUser('sales');
        $lead = Lead::create([
            'company_name' => 'PT Test Lead',
            'qualification_status' => 'pending',
        ]);

        $response = $this->actingAs($salesUser)
            ->postJson("/api/leads/{$lead->id}/ai-screening");

        $response->assertStatus(403);
    }

    public function test_superadmin_can_get_unassessed_count(): void
    {
        $superAdmin = $this->makeUser('super_admin');

        Lead::create([
            'company_name' => 'PT Lead One',
            'qualification_status' => 'pending',
            'lead_score' => null,
        ]);
        Lead::create([
            'company_name' => 'PT Lead Two',
            'qualification_status' => 'pending',
            'lead_score' => null,
        ]);

        $response = $this->actingAs($superAdmin)
            ->getJson('/api/leads/ai-screening/unassessed-count');

        $response->assertStatus(200);
        $response->assertJsonStructure(['success', 'unassessed_count']);
        $this->assertGreaterThanOrEqual(2, $response->json('unassessed_count'));
    }

    public function test_superadmin_can_dispatch_bulk_unassessed_screening(): void
    {
        Queue::fake();

        $superAdmin = $this->makeUser('super_admin');

        Lead::create([
            'company_name' => 'PT Lead Unassessed',
            'qualification_status' => 'pending',
            'lead_score' => null,
        ]);

        $response = $this->actingAs($superAdmin)
            ->postJson('/api/leads/ai-screening/bulk-unassessed');

        $response->assertStatus(200);
        $response->assertJsonStructure(['success', 'dispatched_count']);
        Queue::assertPushed(\App\Jobs\RunPreMeetingAiScreeningJob::class);
    }

    public function test_superadmin_can_dispatch_bulk_selected_screening(): void
    {
        Queue::fake();

        $superAdmin = $this->makeUser('super_admin');

        $lead1 = Lead::create(['company_name' => 'PT Lead Alpha', 'qualification_status' => 'pending']);
        $lead2 = Lead::create(['company_name' => 'PT Lead Beta', 'qualification_status' => 'pending']);

        $response = $this->actingAs($superAdmin)
            ->postJson('/api/leads/ai-screening/bulk-selected', [
                'lead_ids' => [$lead1->id, $lead2->id],
            ]);

        $response->assertStatus(200);
        $this->assertEquals(2, $response->json('dispatched_count'));
        Queue::assertPushed(\App\Jobs\RunPreMeetingAiScreeningJob::class, 2);
    }

    public function test_superadmin_can_get_stats_and_pending_leads(): void
    {
        $superAdmin = $this->makeUser('super_admin');

        Lead::create([
            'company_name' => 'PT Lead Pending',
            'qualification_status' => 'pending',
            'lead_score' => null,
        ]);

        $statsRes = $this->actingAs($superAdmin)->getJson('/api/leads/ai-screening/stats');
        $statsRes->assertStatus(200);
        $statsRes->assertJsonStructure(['success', 'total_leads', 'assessed_count', 'unassessed_count']);

        $pendingRes = $this->actingAs($superAdmin)->getJson('/api/leads/ai-screening/pending-leads');
        $pendingRes->assertStatus(200);
        $pendingRes->assertJsonStructure(['success', 'total_unassessed', 'data']);
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
