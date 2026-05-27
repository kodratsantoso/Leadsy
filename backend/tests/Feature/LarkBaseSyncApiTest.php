<?php

namespace Tests\Feature;

use App\Http\Middleware\CheckPermission;
use App\Models\LarkBaseTable;
use App\Models\LarkIntegration;
use App\Models\Lead;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class LarkBaseSyncApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_push_to_lark_includes_tenant_and_legacy_global_leads(): void
    {
        $this->withoutMiddleware(CheckPermission::class);

        Http::preventStrayRequests();

        Http::fake(function (Request $request) {
            $url = $request->url();

            if (str_contains($url, '/auth/v3/tenant_access_token/internal')) {
                return Http::response([
                    'code' => 0,
                    'tenant_access_token' => 'tenant-token',
                ]);
            }

            if (str_contains($url, '/bitable/v1/apps/app-token/tables/table-id/records')) {
                $companyName = (string) ($request->data()['fields']['Company Name'] ?? '');
                $recordId = $companyName === 'Legacy Global Lead' ? 'rec-global' : 'rec-tenant';

                return Http::response([
                    'code' => 0,
                    'data' => [
                        'record' => [
                            'record_id' => $recordId,
                        ],
                    ],
                ]);
            }

            return Http::response(['code' => -1, 'msg' => 'Unexpected Lark test URL: '.$url], 500);
        });

        $tenant = Tenant::query()->first() ?? Tenant::create([
            'name' => 'Default Workspace',
            'slug' => 'default-workspace',
            'status' => 'active',
        ]);

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Lark Admin',
            'email' => 'lark-admin@example.com',
            'password' => bcrypt('password'),
        ]);

        $integration = LarkIntegration::create([
            'tenant_id' => $tenant->id,
            'app_id' => 'cli_test',
            'app_secret_encrypted' => encrypt('secret'),
            'enabled_modules' => ['base' => true],
            'is_active' => true,
        ]);

        $baseTable = LarkBaseTable::create([
            'tenant_id' => $tenant->id,
            'lark_integration_id' => $integration->id,
            'app_token' => 'app-token',
            'table_id' => 'table-id',
            'table_name' => 'Leads Management',
            'leadsy_entity_type' => 'lead',
            'sync_direction' => 'two_way',
            'field_mapping' => [
                'leadsy_id' => 'Leadsy ID',
                'company_name' => 'Company Name',
            ],
            'is_active' => true,
        ]);

        Lead::create([
            'tenant_id' => $tenant->id,
            'company_name' => 'Tenant Lead',
            'qualification_status' => 'potential',
        ]);
        Lead::create([
            'tenant_id' => null,
            'company_name' => 'Legacy Global Lead',
            'qualification_status' => 'potential',
        ]);

        $response = $this->actingAs($user)
            ->postJson("/api/lark/base/mappings/{$baseTable->id}/sync", [
                'direction' => 'push',
                'limit' => 10,
            ]);
        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('attempted_count', 2)
            ->assertJsonPath('synced_count', 2)
            ->assertJsonPath('error_count', 0);

        $this->assertDatabaseHas('lark_base_record_mappings', [
            'lark_base_table_id' => $baseTable->id,
            'leadsy_entity_type' => 'lead',
            'lark_record_id' => 'rec-tenant',
        ]);
        $this->assertDatabaseHas('lark_base_record_mappings', [
            'lark_base_table_id' => $baseTable->id,
            'leadsy_entity_type' => 'lead',
            'lark_record_id' => 'rec-global',
        ]);
    }
}
