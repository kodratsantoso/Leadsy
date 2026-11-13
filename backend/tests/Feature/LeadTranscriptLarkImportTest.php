<?php

namespace Tests\Feature;

use App\Jobs\ImportLarkMeetingTranscriptJob;
use App\Models\Lead;
use App\Models\LeadTranscript;
use App\Models\LarkIntegration;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class LeadTranscriptLarkImportTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected User $user;
    protected Lead $lead;
    protected LarkIntegration $integration;

    protected function setUp(): void
    {
        parent::setUp();

        Queue::fake();

        $role = Role::firstOrCreate(['name' => 'admin'], ['display_name' => 'Admin']);
        $perm = \App\Models\Permission::firstOrCreate(['name' => 'leads.edit'], ['module' => 'leads', 'display_name' => 'Edit Leads']);
        $role->permissions()->syncWithoutDetaching([$perm->id]);
        $this->tenant = Tenant::create(['name' => 'Test Tenant', 'slug' => 'test-tenant']);

        $this->user = User::create([
            'tenant_id' => $this->tenant->id,
            'role_id' => $role->id,
            'name' => 'Test User',
            'email' => 'user@example.com',
            'password' => bcrypt('password123'),
            'is_active' => true,
        ]);

        $this->lead = Lead::create([
            'tenant_id' => $this->tenant->id,
            'company_name' => 'Target Corp',
            'contact_name' => 'Jane Doe',
            'email' => 'jane@targetcorp.com',
            'stage' => 'qualified',
        ]);

        $this->integration = LarkIntegration::create([
            'tenant_id' => $this->tenant->id,
            'app_id' => 'cli_test_app_id',
            'app_secret' => 'test_app_secret',
            'is_active' => true,
        ]);
    }

    public function test_it_imports_lark_minutes_with_full_metadata_and_prevents_duplicate()
    {
        $payload = [
            'meeting_link' => 'https://company.larksuite.com/minutes/detail/obcn7m0x5544sxxxxxxxx',
            'title' => 'Closing Meeting with Target Corp',
            'meeting_type' => 'Closing Discussion',
            'recorded_at' => '2026-11-13 10:00:00',
        ];

        $response = $this->actingAs($this->user)
            ->postJson("/api/leads/{$this->lead->id}/transcripts/fetch-link", $payload);

        $response->assertStatus(201);
        $data = $response->json('data');

        $this->assertEquals('Closing Meeting with Target Corp', $data['title']);
        $this->assertEquals('Closing Discussion', $data['meeting_type']);
        $this->assertEquals('obcn7m0x5544sxxxxxxxx', $data['minute_token']);
        $this->assertEquals('link', $data['source_type']);

        Queue::assertPushed(ImportLarkMeetingTranscriptJob::class, function ($job) use ($data) {
            return true;
        });

        // Test immediate duplicate prevention
        $duplicateResponse = $this->actingAs($this->user)
            ->postJson("/api/leads/{$this->lead->id}/transcripts/fetch-link", $payload);

        $duplicateResponse->assertStatus(409);
        $this->assertTrue($duplicateResponse->json('duplicate'));
    }

    public function test_it_handles_save_transcript_analysis_with_json_query()
    {
        $transcript = $this->lead->transcripts()->create([
            'title' => 'Sample Meeting',
            'source_type' => 'manual',
            'transcript_text' => 'Customer is interested in CRM with 50 users.',
            'recorded_at' => now(),
            'evaluation_status' => 'pending',
            'meeting_type' => 'Demo',
        ]);

        \Illuminate\Support\Facades\DB::table('lead_analysis_logs')->insert([
            'tenant_id' => $this->tenant->id,
            'lead_id' => $this->lead->id,
            'analysis_type' => 'transcript_evaluation_raw',
            'result_json' => json_encode([
                'transcript_id' => $transcript->id,
                'raw_content' => json_encode([
                    'sentiment' => 'positive',
                    'intent_level' => 'high',
                    'interest_level' => 'high',
                    'summary' => 'Client expressed high interest in CRM implementation.',
                    'confidence' => 88,
                ]),
            ]),
            'created_at' => now(),
        ]);

        $job = new \App\Jobs\SaveTranscriptAnalysisJob($transcript->id);
        $job->handle();

        $transcript->refresh();
        $this->assertEquals('evaluated', $transcript->evaluation_status);

        $this->assertDatabaseHas('lead_ai_evaluations', [
            'lead_id' => $this->lead->id,
            'source_type' => LeadTranscript::class,
            'source_id' => $transcript->id,
            'sentiment' => 'positive',
        ]);
    }
}
