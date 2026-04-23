<?php

namespace Tests\Feature;

use App\Models\IntegrationConfig;
use App\Models\Lead;
use App\Models\LeadContact;
use App\Models\LeadSource;
use App\Models\QualificationParameterSet;
use App\Models\QualificationWorkflow;
use App\Models\Tenant;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DatabaseHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_enforces_a_single_primary_contact_per_lead(): void
    {
        $lead = Lead::create(['company_name' => 'Primary Contact Test Lead']);

        LeadContact::create([
            'lead_id' => $lead->id,
            'name' => 'Primary One',
            'is_primary' => true,
        ]);

        $this->expectException(QueryException::class);

        LeadContact::create([
            'lead_id' => $lead->id,
            'name' => 'Primary Two',
            'is_primary' => true,
        ]);
    }

    public function test_it_enforces_unique_lead_source_identity_per_lead(): void
    {
        $lead = Lead::create(['company_name' => 'Lead Source Constraint Test']);

        LeadSource::create([
            'lead_id' => $lead->id,
            'source_type' => 'google_maps',
            'source_ref' => 'place_123',
        ]);

        $this->expectException(QueryException::class);

        LeadSource::create([
            'lead_id' => $lead->id,
            'source_type' => 'google_maps',
            'source_ref' => 'place_123',
        ]);
    }

    public function test_it_enforces_one_active_parameter_set_per_tenant(): void
    {
        $tenant = Tenant::query()->firstOrFail();

        $this->expectException(QueryException::class);

        QualificationParameterSet::create([
            'tenant_id' => $tenant->id,
            'name' => 'Another Active Parameter Set',
            'slug' => 'another-active-parameter-set',
            'version' => 'v2',
            'status' => 'active',
        ]);
    }

    public function test_it_allows_active_parameter_sets_for_different_tenants(): void
    {
        $tenant = Tenant::create([
            'name' => 'Expansion Workspace',
            'slug' => 'expansion-workspace',
            'status' => 'active',
        ]);

        $parameterSet = QualificationParameterSet::create([
            'tenant_id' => $tenant->id,
            'name' => 'Expansion Active Parameter Set',
            'slug' => 'expansion-active-parameter-set',
            'version' => 'v1',
            'status' => 'active',
        ]);

        $this->assertDatabaseHas('qualification_parameter_sets', [
            'id' => $parameterSet->id,
            'tenant_id' => $tenant->id,
            'status' => 'active',
        ]);
    }

    public function test_it_enforces_one_active_workflow_per_tenant_and_trigger_status(): void
    {
        $tenant = Tenant::query()->firstOrFail();

        $this->expectException(QueryException::class);

        QualificationWorkflow::create([
            'tenant_id' => $tenant->id,
            'name' => 'Another Need Review Flow',
            'slug' => 'another-need-review-flow',
            'trigger_status' => 'need_review',
            'is_active' => true,
        ]);
    }

    public function test_it_scopes_integration_config_keys_by_tenant(): void
    {
        $defaultTenant = Tenant::query()->firstOrFail();

        IntegrationConfig::create([
            'tenant_id' => $defaultTenant->id,
            'category' => 'maps',
            'key' => 'tenant_specific_maps_key',
            'value' => 'alpha',
            'value_type' => 'string',
            'is_secret' => false,
            'is_active' => true,
        ]);

        $secondTenant = Tenant::create([
            'name' => 'Regional Workspace',
            'slug' => 'regional-workspace',
            'status' => 'active',
        ]);

        IntegrationConfig::create([
            'tenant_id' => $secondTenant->id,
            'category' => 'maps',
            'key' => 'tenant_specific_maps_key',
            'value' => 'beta',
            'value_type' => 'string',
            'is_secret' => false,
            'is_active' => true,
        ]);

        $this->assertEquals(
            2,
            IntegrationConfig::where('key', 'tenant_specific_maps_key')->count()
        );

        $this->expectException(QueryException::class);

        IntegrationConfig::create([
            'tenant_id' => $defaultTenant->id,
            'category' => 'maps',
            'key' => 'tenant_specific_maps_key',
            'value' => 'gamma',
            'value_type' => 'string',
            'is_secret' => false,
            'is_active' => true,
        ]);
    }
}
