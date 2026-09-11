<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LeadTrashRetentionTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::firstOrCreate(
            ['slug' => 'test-tenant'],
            ['name' => 'Test Tenant', 'status' => 'active']
        );

        $superAdminRole = Role::firstOrCreate(
            ['name' => 'super_admin'],
            ['display_name' => 'Super Admin', 'level' => 100]
        );

        $this->superAdmin = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'role_id' => $superAdminRole->id,
        ]);
    }

    public function test_trash_endpoint_returns_deleted_leads_with_retention_metadata(): void
    {
        // 1 active lead
        Lead::factory()->create([
            'tenant_id' => $this->tenant->id,
            'company_name' => 'Active Corp',
        ]);

        // 1 deleted lead (deleted 10 days ago)
        $deletedLead = Lead::factory()->create([
            'tenant_id' => $this->tenant->id,
            'company_name' => 'Deleted Corp',
            'deleted_at' => Carbon::now()->subDays(10),
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->getJson('/api/leads/trash?retention_days=90');

        $response->assertOk();
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'company_name',
                    'deleted_at',
                    'retention_days',
                    'purge_at',
                    'days_remaining',
                    'hours_remaining',
                    'is_expired',
                    'retention_status',
                ],
            ],
            'meta' => ['total', 'current_page'],
            'summary' => ['total_deleted', 'within_retention', 'expiring_soon', 'expired', 'retention_days'],
        ]);

        $this->assertEquals(1, $response->json('meta.total'));
        $this->assertEquals($deletedLead->id, $response->json('data.0.id'));
        $this->assertEquals(80, $response->json('data.0.days_remaining'));
        $this->assertFalse($response->json('data.0.is_expired'));
        $this->assertEquals('active', $response->json('data.0.retention_status'));
    }

    public function test_restore_single_lead(): void
    {
        $lead = Lead::factory()->create([
            'tenant_id' => $this->tenant->id,
            'company_name' => 'Restorable Corp',
            'deleted_at' => Carbon::now()->subDays(5),
        ]);

        $this->assertSoftDeleted('leads', ['id' => $lead->id]);

        $response = $this->actingAs($this->superAdmin)
            ->postJson("/api/leads/{$lead->id}/restore");

        $response->assertOk();
        $this->assertNotSoftDeleted('leads', ['id' => $lead->id]);
    }

    public function test_batch_restore_leads(): void
    {
        $lead1 = Lead::factory()->create([
            'tenant_id' => $this->tenant->id,
            'company_name' => 'Batch 1 Corp',
            'deleted_at' => Carbon::now()->subDays(2),
        ]);

        $lead2 = Lead::factory()->create([
            'tenant_id' => $this->tenant->id,
            'company_name' => 'Batch 2 Corp',
            'deleted_at' => Carbon::now()->subDays(3),
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->postJson('/api/leads/batch-restore', [
                'ids' => [$lead1->id, $lead2->id],
            ]);

        $response->assertOk();
        $this->assertEquals(2, $response->json('restored_count'));
        $this->assertNotSoftDeleted('leads', ['id' => $lead1->id]);
        $this->assertNotSoftDeleted('leads', ['id' => $lead2->id]);
    }

    public function test_force_delete_single_lead(): void
    {
        $lead = Lead::factory()->create([
            'tenant_id' => $this->tenant->id,
            'company_name' => 'Permanent Delete Corp',
            'deleted_at' => Carbon::now()->subDays(100),
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->deleteJson("/api/leads/{$lead->id}/force-delete");

        $response->assertOk();
        $this->assertDatabaseMissing('leads', ['id' => $lead->id]);
    }

    public function test_batch_force_delete_leads(): void
    {
        $lead1 = Lead::factory()->create([
            'tenant_id' => $this->tenant->id,
            'deleted_at' => Carbon::now()->subDays(100),
        ]);

        $lead2 = Lead::factory()->create([
            'tenant_id' => $this->tenant->id,
            'deleted_at' => Carbon::now()->subDays(100),
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->postJson('/api/leads/batch-force-delete', [
                'ids' => [$lead1->id, $lead2->id],
            ]);

        $response->assertOk();
        $this->assertEquals(2, $response->json('deleted_count'));
        $this->assertDatabaseMissing('leads', ['id' => $lead1->id]);
        $this->assertDatabaseMissing('leads', ['id' => $lead2->id]);
    }

    public function test_purge_expired_leads(): void
    {
        // 1 lead deleted 100 days ago (expired under 90-day retention)
        $expiredLead = Lead::factory()->create([
            'tenant_id' => $this->tenant->id,
            'deleted_at' => Carbon::now()->subDays(100),
        ]);

        // 1 lead deleted 10 days ago (within 90-day retention)
        $retainedLead = Lead::factory()->create([
            'tenant_id' => $this->tenant->id,
            'deleted_at' => Carbon::now()->subDays(10),
        ]);

        $response = $this->actingAs($this->superAdmin)
            ->postJson('/api/leads/purge-expired', [
                'retention_days' => 90,
            ]);

        $response->assertOk();
        $this->assertEquals(1, $response->json('purged_count'));
        $this->assertDatabaseMissing('leads', ['id' => $expiredLead->id]);
        $this->assertSoftDeleted('leads', ['id' => $retainedLead->id]);
    }
}
