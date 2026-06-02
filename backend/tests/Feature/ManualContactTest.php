<?php

namespace Tests\Feature;

use App\Http\Middleware\CheckPermission;
use App\Models\Lead;
use App\Models\LeadContact;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ManualContactTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_add_contact_manually_with_normalized_linkedin_url(): void
    {
        $this->withoutMiddleware(CheckPermission::class);

        $user = $this->makeUser();
        $lead = Lead::create([
            'tenant_id' => $user->tenant_id,
            'company_name' => 'Acme Indonesia',
            'website_domain' => 'acme.co.id',
            'lead_score' => 60,
            'qualification_status' => 'potential',
        ]);

        // Case 1: Full URL
        $response = $this->actingAs($user)
            ->postJson("/api/leads/{$lead->id}/contacts", [
                'name' => 'John Doe',
                'title' => 'CEO',
                'email' => 'john@acme.co.id',
                'phone' => '+628123456789',
                'linkedin_url' => 'https://www.linkedin.com/in/johndoe',
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('lead_contacts', [
            'lead_id' => $lead->id,
            'name' => 'John Doe',
            'linkedin_url' => 'https://www.linkedin.com/in/johndoe',
        ]);

        // Case 2: Just username/handle
        $response2 = $this->actingAs($user)
            ->postJson("/api/leads/{$lead->id}/contacts", [
                'name' => 'Jane Doe',
                'title' => 'CFO',
                'email' => 'jane@acme.co.id',
                'linkedin_url' => 'janedoe',
            ]);

        $response2->assertStatus(201);
        $this->assertDatabaseHas('lead_contacts', [
            'lead_id' => $lead->id,
            'name' => 'Jane Doe',
            'linkedin_url' => 'https://www.linkedin.com/in/janedoe',
        ]);
    }

    public function test_can_update_contact_manually_with_normalized_linkedin_url(): void
    {
        $this->withoutMiddleware(CheckPermission::class);

        $user = $this->makeUser();
        $lead = Lead::create([
            'tenant_id' => $user->tenant_id,
            'company_name' => 'Acme Indonesia',
            'website_domain' => 'acme.co.id',
            'lead_score' => 60,
            'qualification_status' => 'potential',
        ]);

        $contact = LeadContact::create([
            'lead_id' => $lead->id,
            'name' => 'John Smith',
            'title' => 'CTO',
            'source' => 'manual',
            'confidence' => 'high',
            'confidence_score' => 100,
        ]);

        // Update with @handle
        $response = $this->actingAs($user)
            ->putJson("/api/leads/{$lead->id}/contacts/{$contact->id}", [
                'name' => 'John Smith',
                'title' => 'CTO',
                'linkedin_url' => '@johnsmith_cto',
            ]);

        $response->assertOk();
        $this->assertDatabaseHas('lead_contacts', [
            'id' => $contact->id,
            'linkedin_url' => 'https://www.linkedin.com/in/johnsmith_cto',
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
            'name' => 'Admin User',
            'email' => 'admin-test@example.com',
            'password' => bcrypt('password'),
        ]);
    }
}
