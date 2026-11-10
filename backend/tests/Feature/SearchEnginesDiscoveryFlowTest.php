<?php

namespace Tests\Feature;

use App\Http\Middleware\CheckPermission;
use App\Models\IntegrationConfig;
use App\Models\Lead;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SearchEnginesDiscoveryFlowTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(): User
    {
        $tenant = Tenant::query()->first() ?? Tenant::create([
            'name' => 'Default Workspace',
            'slug' => 'default-workspace',
            'status' => 'active',
        ]);

        return User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Test User',
            'email' => 'test-user@example.com',
            'password' => bcrypt('password'),
        ]);
    }

    private function makeLead(User $user): Lead
    {
        return Lead::create([
            'tenant_id' => $user->tenant_id,
            'company_name' => 'PT Holycow Danadipa Indonesia',
            'brand' => 'Holycow Steakhouse',
            'website' => 'https://holycowsteak.com',
            'website_domain' => 'holycowsteak.com',
            'status' => 'new',
            'created_by' => $user->id,
        ]);
    }

    public function test_deep_search_prioritizes_serper_and_stops_on_success(): void
    {
        $this->withoutMiddleware(CheckPermission::class);

        $user = $this->makeUser();
        $lead = $this->makeLead($user);

        // Configure Serper
        IntegrationConfig::create([
            'tenant_id' => $user->tenant_id,
            'category' => 'search_engines',
            'key' => 'SERPER_ENABLED',
            'value' => 'true',
            'is_secret' => false,
            'is_active' => true,
        ]);
        IntegrationConfig::create([
            'tenant_id' => $user->tenant_id,
            'category' => 'search_engines',
            'key' => 'SERPER_API_KEY',
            'value' => 'test-serper-key',
            'is_secret' => true,
            'is_active' => true,
        ]);

        Http::fake([
            'https://google.serper.dev/search*' => Http::response([
                'organic' => [
                    [
                        'title' => 'Budi Santoso - General Manager - PT Holycow | LinkedIn',
                        'link' => 'https://id.linkedin.com/in/budisantoso',
                        'snippet' => 'General Manager at PT Holycow Danadipa Indonesia. Leading F&B operations.',
                    ],
                    [
                        'title' => 'Siti Rahma - Finance Director - Holycow | LinkedIn',
                        'link' => 'https://id.linkedin.com/in/sitirahma',
                        'snippet' => 'Finance Director at PT Holycow Steakhouse.',
                    ],
                ],
            ]),
        ]);

        $response = $this->actingAs($user)
            ->postJson("/api/leads/{$lead->id}/contact-enrichment/google-deep/search");

        $response->assertOk();
        $response->assertJsonPath('data.0.name', 'Budi Santoso');
        $response->assertJsonPath('data.0.title', 'General Manager');

        $this->assertDatabaseHas('contact_enrichment_candidates', [
            'lead_id' => $lead->id,
            'provider' => 'GOOGLE_DEEP_SEARCH',
            'name' => 'Budi Santoso',
        ]);
    }

    public function test_deep_search_cascades_to_custom_endpoint_when_serper_fails_or_empty(): void
    {
        $this->withoutMiddleware(CheckPermission::class);

        $user = $this->makeUser();
        $lead = $this->makeLead($user);

        // Configure Serper (returns empty)
        IntegrationConfig::create([
            'tenant_id' => $user->tenant_id,
            'category' => 'search_engines',
            'key' => 'SERPER_ENABLED',
            'value' => 'true',
            'is_secret' => false,
            'is_active' => true,
        ]);
        IntegrationConfig::create([
            'tenant_id' => $user->tenant_id,
            'category' => 'search_engines',
            'key' => 'SERPER_API_KEY',
            'value' => 'test-serper-key',
            'is_secret' => true,
            'is_active' => true,
        ]);

        // Configure Custom Endpoint
        IntegrationConfig::create([
            'tenant_id' => $user->tenant_id,
            'category' => 'search_engines',
            'key' => 'CUSTOM_SEARCH_ENABLED',
            'value' => 'true',
            'is_secret' => false,
            'is_active' => true,
        ]);
        IntegrationConfig::create([
            'tenant_id' => $user->tenant_id,
            'category' => 'search_engines',
            'key' => 'CUSTOM_SEARCH_ENDPOINT',
            'value' => 'https://custom-search.internal/api/search',
            'is_secret' => false,
            'is_active' => true,
        ]);

        Http::fake([
            // Serper returns empty results
            'https://google.serper.dev/search*' => Http::response(['organic' => []]),
            // Custom Endpoint returns results
            'https://custom-search.internal/api/search*' => Http::response([
                'results' => [
                    [
                        'title' => 'Ahmad Reza - Head of Procurement - PT Holycow | LinkedIn',
                        'url' => 'https://id.linkedin.com/in/ahmadreza',
                        'snippet' => 'Procurement Head managing supply chain at Holycow Steakhouse.',
                    ],
                ],
            ]),
        ]);

        $response = $this->actingAs($user)
            ->postJson("/api/leads/{$lead->id}/contact-enrichment/google-deep/search");

        $response->assertOk();
        $response->assertJsonPath('data.0.name', 'Ahmad Reza');
        $response->assertJsonPath('data.0.title', 'Head of Procurement');
    }

    public function test_deep_search_cascades_to_tavily_when_priorities_return_empty(): void
    {
        $this->withoutMiddleware(CheckPermission::class);

        $user = $this->makeUser();
        $lead = $this->makeLead($user);

        // Configure Priority: Serper then Tavily
        IntegrationConfig::create([
            'tenant_id' => $user->tenant_id,
            'category' => 'search_engines',
            'key' => 'SEARCH_ENGINE_PRIORITY',
            'value' => json_encode(['serper', 'tavily']),
            'is_secret' => false,
            'is_active' => true,
        ]);
        IntegrationConfig::create([
            'tenant_id' => $user->tenant_id,
            'category' => 'search_engines',
            'key' => 'SERPER_ENABLED',
            'value' => 'true',
            'is_secret' => false,
            'is_active' => true,
        ]);
        IntegrationConfig::create([
            'tenant_id' => $user->tenant_id,
            'category' => 'search_engines',
            'key' => 'SERPER_API_KEY',
            'value' => 'serper-key',
            'is_secret' => true,
            'is_active' => true,
        ]);
        IntegrationConfig::create([
            'tenant_id' => $user->tenant_id,
            'category' => 'search_engines',
            'key' => 'TAVILY_ENABLED',
            'value' => 'true',
            'is_secret' => false,
            'is_active' => true,
        ]);
        IntegrationConfig::create([
            'tenant_id' => $user->tenant_id,
            'category' => 'search_engines',
            'key' => 'TAVILY_API_KEY',
            'value' => 'tavily-key',
            'is_secret' => true,
            'is_active' => true,
        ]);

        Http::fake([
            'https://google.serper.dev/search*' => Http::response(['organic' => []]),
            'https://api.tavily.com/search*' => Http::response([
                'results' => [
                    [
                        'title' => 'Rina Wijaya - VP Operations - PT Holycow | LinkedIn',
                        'url' => 'https://id.linkedin.com/in/rinawijaya',
                        'content' => 'VP Operations leading restaurant expansion for PT Holycow Danadipa.',
                    ],
                ],
            ]),
        ]);

        $response = $this->actingAs($user)
            ->postJson("/api/leads/{$lead->id}/contact-enrichment/google-deep/search");

        $response->assertOk();
        $response->assertJsonPath('data.0.name', 'Rina Wijaya');
        $response->assertJsonPath('data.0.title', 'VP Operations');
    }

    public function test_search_engine_test_connection_endpoint(): void
    {
        $this->withoutMiddleware(CheckPermission::class);

        $user = $this->makeUser();

        Http::fake([
            'https://google.serper.dev/search*' => Http::response([
                'organic' => [
                    ['title' => 'Test', 'link' => 'https://example.com'],
                ],
            ]),
        ]);

        $response = $this->actingAs($user)
            ->postJson('/api/settings/integrations/search-engines/test', [
                'provider' => 'serper',
                'credentials' => [
                    'SERPER_API_KEY' => 'valid-serper-key',
                ],
            ]);

        $response->assertOk();
        $response->assertJsonPath('success', true);
    }
}
