<?php

namespace Tests\Feature;

use App\Http\Middleware\CheckPermission;
use App\Models\ContactEnrichmentCandidate;
use App\Models\IntegrationConfig;
use App\Models\Lead;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class LinkedInContactSearchFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_linkedin_search_fails_when_integration_not_configured(): void
    {
        $this->withoutMiddleware(CheckPermission::class);

        $user = $this->makeUser();
        $lead = $this->makeLead($user);

        // Don't configure LinkedIn
        $this->actingAs($user)
            ->postJson("/api/leads/{$lead->id}/contact-enrichment/linkedin/search")
            ->assertStatus(422)
            ->assertJsonPath('message', 'LinkedIn integration is not enabled. Please enable it in Settings > Integration.');
    }

    public function test_linkedin_search_saves_preview_candidates(): void
    {
        $this->withoutMiddleware(CheckPermission::class);

        Http::fake([
            'https://customsearch.googleapis.com/customsearch/v1*' => Http::response([
                'searchInformation' => ['totalResults' => '1', 'searchTime' => 0.1],
                'items' => [
                    [
                        'title' => 'John Doe - CFO - Acme Corp | LinkedIn',
                        'link' => 'https://www.linkedin.com/in/johndoe',
                        'snippet' => 'John Doe is the Chief Financial Officer at Acme Corp...',
                    ]
                ],
            ]),
        ]);

        $user = $this->makeUser();
        $this->configureLinkedIn($user);
        $this->configureGoogleSearch($user);
        $lead = $this->makeLead($user);

        $this->actingAs($user)
            ->postJson("/api/leads/{$lead->id}/contact-enrichment/linkedin/search")
            ->assertOk()
            ->assertJsonPath('data.0.name', 'John Doe')
            ->assertJsonPath('data.0.title', 'CFO');

        $this->assertDatabaseHas('contact_enrichment_candidates', [
            'lead_id' => $lead->id,
            'provider' => 'LINKEDIN',
            'status' => 'previewed',
        ]);
    }

    public function test_linkedin_add_candidate_creates_lead_contact(): void
    {
        $this->withoutMiddleware(CheckPermission::class);

        $user = $this->makeUser();
        $lead = $this->makeLead($user);
        $candidate = ContactEnrichmentCandidate::create([
            'lead_id' => $lead->id,
            'created_by' => $user->id,
            'provider' => 'LINKEDIN',
            'provider_candidate_id' => 'some-hash',
            'name' => 'John Doe',
            'title' => 'CFO',
            'company_name' => 'Acme Corp',
            'company_domain' => 'acme.com',
            'raw_preview' => [
                'linkedin_url' => 'https://www.linkedin.com/in/johndoe',
                'confidence_score' => 85,
            ],
            'expires_at' => now()->addDays(7),
        ]);

        $this->actingAs($user)
            ->postJson("/api/leads/{$lead->id}/contact-enrichment/linkedin/candidates/{$candidate->id}/add-contact")
            ->assertOk()
            ->assertJsonPath('data.contact.name', 'John Doe')
            ->assertJsonPath('data.contact.source', 'LINKEDIN');

        $this->assertDatabaseHas('lead_contacts', [
            'lead_id' => $lead->id,
            'name' => 'John Doe',
            'source' => 'LINKEDIN',
        ]);

        $this->assertDatabaseHas('contact_enrichment_candidates', [
            'id' => $candidate->id,
            'status' => 'added',
        ]);
    }

    private function makeLead(User $user): Lead
    {
        return Lead::create([
            'tenant_id' => $user->tenant_id,
            'company_name' => 'Acme Corp',
            'website_domain' => 'acme.com',
            'lead_score' => 60,
            'qualification_status' => 'potential',
        ]);
    }

    private function configureLinkedIn(User $user): void
    {
        IntegrationConfig::create([
            'tenant_id' => $user->tenant_id,
            'category' => 'linkedin',
            'key' => 'LINKEDIN_ENABLED',
            'value' => 'true',
            'is_secret' => false,
            'value_type' => 'boolean',
            'is_active' => true,
        ]);
    }

    private function configureGoogleSearch(User $user): void
    {
        IntegrationConfig::create([
            'tenant_id' => $user->tenant_id,
            'category' => 'maps',
            'key' => 'GOOGLE_SEARCH_API_KEY',
            'value' => 'fake-key',
            'is_secret' => false,
            'value_type' => 'string',
            'is_active' => true,
        ]);

        IntegrationConfig::create([
            'tenant_id' => $user->tenant_id,
            'category' => 'maps',
            'key' => 'GOOGLE_SEARCH_ENGINE_ID',
            'value' => 'fake-cx',
            'is_secret' => false,
            'value_type' => 'string',
            'is_active' => true,
        ]);
    }

    private function makeUser(): User
    {
        $tenant = Tenant::query()->first() ?? Tenant::create([
            'name' => 'Default Workspace',
            'slug' => 'default-workspace',
            'status' => 'active',
        ]);

        return User::create([
            'tenant_id' => $tenant->id,
            'name' => 'LinkedIn Admin',
            'email' => 'linkedin-admin@example.com',
            'password' => bcrypt('password'),
        ]);
    }
}
