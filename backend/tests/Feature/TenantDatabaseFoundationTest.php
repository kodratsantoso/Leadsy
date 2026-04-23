<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantDatabaseFoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_default_tenant_is_seeded_and_backfills_phase_three_tables(): void
    {
        $this->assertDatabaseHas('tenants', [
            'slug' => 'default-workspace',
            'status' => 'active',
        ]);

        $this->assertDatabaseCount('qualification_parameter_sets', 1);
        $this->assertDatabaseMissing('qualification_parameter_sets', [
            'tenant_id' => null,
        ]);

        $this->assertDatabaseMissing('qualification_workflows', [
            'tenant_id' => null,
        ]);
    }
}
