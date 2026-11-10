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

class LushaContactRevealFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_lusha_preview_is_blocked_when_lusha_is_disabled(): void
    {
        $this->withoutMiddleware(CheckPermission::class);
        Http::fake();

        $user = $this->makeUser();
        $lead = Lead::create([
            'tenant_id' => $user->tenant_id,
            'company_name' => 'Acme Indonesia',
            'website_domain' => 'acme.co.id',
            'lead_score' => 59,
            'qualification_status' => 'potential',
        ]);

        $this->actingAs($user)
            ->postJson("/api/leads/{$lead->id}/contact-enrichment/lusha/search")
            ->assertStatus(422)
            ->assertJsonPath('message', 'Lusha integration is not enabled. Please enable it in Settings > Integration.');

        Http::assertNothingSent();
    }

    public function test_lusha_search_saves_preview_candidates_without_creating_contacts(): void
    {
        $this->withoutMiddleware(CheckPermission::class);
        Http::fake([
            'api.lusha.com/v3/contacts/search' => Http::response([
                'requestId' => 'search-request-1',
                'results' => [[
                    'id' => 'lusha-123',
                    'firstName' => 'Budi',
                    'lastName' => 'Santoso',
                    'jobTitle' => ['title' => 'Chief Financial Officer'],
                    'company' => ['name' => 'Acme Indonesia', 'domain' => 'acme.co.id'],
                    'has' => ['firstName', 'lastName', 'jobTitle'],
                    'canReveal' => [['field' => 'phones', 'credits' => 1]],
                ]],
                'billing' => ['creditsCharged' => 0, 'resultsReturned' => 1],
            ]),
        ]);

        $user = $this->makeUser();
        $this->configureLusha($user);
        $lead = $this->makeEligibleLead($user);

        $this->actingAs($user)
            ->postJson("/api/leads/{$lead->id}/contact-enrichment/lusha/search")
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Budi Santoso')
            ->assertJsonPath('data.0.has_phone', true);

        $this->assertDatabaseHas('contact_enrichment_candidates', [
            'lead_id' => $lead->id,
            'provider' => 'LUSHA',
            'provider_candidate_id' => 'lusha-123',
            'status' => 'previewed',
        ]);
        $this->assertSame(0, $lead->contacts()->count());
    }

    public function test_lusha_reveal_phone_creates_lead_contact_after_user_confirmation(): void
    {
        $this->withoutMiddleware(CheckPermission::class);
        Http::fake([
            'api.lusha.com/v3/contacts/enrich' => Http::response([
                'requestId' => 'reveal-request-1',
                'results' => [[
                    'id' => 'lusha-123',
                    'firstName' => 'Budi',
                    'lastName' => 'Santoso',
                    'fullName' => 'Budi Santoso',
                    'jobTitle' => ['title' => 'Chief Financial Officer'],
                    'phones' => [['number' => '+628123456789', 'type' => 'mobile', 'doNotCall' => false]],
                    'socialLinks' => ['linkedin' => 'https://www.linkedin.com/in/budi-santoso'],
                ]],
                'billing' => ['creditsCharged' => 1, 'resultsReturned' => 1],
            ]),
        ]);

        $user = $this->makeUser();
        $this->configureLusha($user);
        $lead = $this->makeEligibleLead($user);
        $candidate = ContactEnrichmentCandidate::create([
            'lead_id' => $lead->id,
            'created_by' => $user->id,
            'provider' => 'LUSHA',
            'provider_candidate_id' => 'lusha-123',
            'name' => 'Budi Santoso',
            'title' => 'Chief Financial Officer',
            'company_name' => 'Acme Indonesia',
            'company_domain' => 'acme.co.id',
            'has_phone' => true,
            'reveal_phone_credits' => 1,
            'raw_preview' => ['id' => 'lusha-123'],
            'expires_at' => now()->addDay(),
        ]);

        $this->actingAs($user)
            ->postJson("/api/leads/{$lead->id}/contact-enrichment/lusha/candidates/{$candidate->id}/reveal-phone")
            ->assertOk()
            ->assertJsonPath('data.contact.name', 'Budi Santoso')
            ->assertJsonPath('data.contact.phone', '+628123456789');

        $this->assertDatabaseHas('lead_contacts', [
            'lead_id' => $lead->id,
            'name' => 'Budi Santoso',
            'phone' => '+628123456789',
            'source' => 'LUSHA',
        ]);
        $this->assertDatabaseHas('contact_enrichment_candidates', [
            'id' => $candidate->id,
            'status' => 'revealed',
        ]);
    }

    public function test_lusha_reveal_phone_updates_existing_contact_without_duplicate(): void
    {
        $this->withoutMiddleware(CheckPermission::class);
        Http::fake([
            'api.lusha.com/v3/contacts/enrich' => Http::response([
                'requestId' => 'reveal-request-2',
                'results' => [[
                    'id' => 'lusha-456',
                    'fullName' => 'Ir. Budi Santoso, M.M.',
                    'jobTitle' => ['title' => 'Chief Financial Officer'],
                    'phones' => [['number' => '+62899887766', 'type' => 'mobile', 'doNotCall' => false]],
                    'socialLinks' => ['linkedin' => 'https://www.linkedin.com/in/budi-santoso'],
                ]],
                'billing' => ['creditsCharged' => 1, 'resultsReturned' => 1],
            ]),
        ]);

        $user = $this->makeUser();
        $this->configureLusha($user);
        $lead = $this->makeEligibleLead($user);

        // Pre-existing contact discovered from Google/LinkedIn with no phone number yet
        $existingContact = $lead->contacts()->create([
            'name' => 'Budi Santoso',
            'title' => 'Chief Financial Officer',
            'linkedin_url' => 'https://id.linkedin.com/in/budi-santoso',
            'phone' => null,
            'source' => 'GOOGLE_SEARCH',
            'is_primary' => true,
        ]);

        $candidate = ContactEnrichmentCandidate::create([
            'lead_id' => $lead->id,
            'created_by' => $user->id,
            'provider' => 'LUSHA',
            'provider_candidate_id' => 'lusha-456',
            'name' => 'Budi Santoso',
            'title' => 'Chief Financial Officer',
            'company_name' => 'Acme Indonesia',
            'company_domain' => 'acme.co.id',
            'has_phone' => true,
            'reveal_phone_credits' => 1,
            'raw_preview' => [
                'id' => 'lusha-456',
                'target_contact_id' => $existingContact->id,
            ],
            'expires_at' => now()->addDay(),
        ]);

        $this->actingAs($user)
            ->postJson("/api/leads/{$lead->id}/contact-enrichment/lusha/candidates/{$candidate->id}/reveal-phone", [
                'contact_id' => $existingContact->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.contact.phone', '+62899887766');

        // MUST NOT create duplicate contact: count remains exactly 1!
        $this->assertSame(1, $lead->contacts()->count());
        $this->assertSame('+62899887766', $existingContact->fresh()->phone);
        $this->assertSame(90, (int) $existingContact->fresh()->confidence_score);
    }

    private function makeEligibleLead(User $user): Lead
    {
        return Lead::create([
            'tenant_id' => $user->tenant_id,
            'company_name' => 'Acme Indonesia',
            'website_domain' => 'acme.co.id',
            'lead_score' => 60,
            'qualification_status' => 'potential',
        ]);
    }

    private function configureLusha(User $user): void
    {
        IntegrationConfig::create([
            'tenant_id' => $user->tenant_id,
            'category' => 'lusha',
            'key' => 'LUSHA_ENABLED',
            'value' => 'true',
            'is_secret' => false,
            'value_type' => 'boolean',
            'is_active' => true,
        ]);

        IntegrationConfig::create([
            'tenant_id' => $user->tenant_id,
            'category' => 'lusha',
            'key' => 'LUSHA_API_KEY',
            'value' => 'lusha-secret',
            'is_secret' => true,
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
            'name' => 'Lusha Admin',
            'email' => 'lusha-admin@example.com',
            'password' => bcrypt('password'),
        ]);
    }
}
