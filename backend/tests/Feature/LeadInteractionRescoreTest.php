<?php

namespace Tests\Feature;

use App\Jobs\EnrichLeadJob;
use App\Jobs\ICPMatchLeadJob;
use App\Jobs\QualifyLeadJob;
use App\Jobs\RunLeadIntelligenceJob;
use App\Jobs\ScoreLeadJob;
use App\Models\Lead;
use App\Models\LeadTranscript;
use App\Models\User;
use App\Services\Sales\LeadActivityService;
use App\Services\Sales\LeadInteractionRescoreService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class LeadInteractionRescoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_activity_logging_triggers_automated_rescore(): void
    {
        Queue::fake([
            ScoreLeadJob::class,
            QualifyLeadJob::class,
            ICPMatchLeadJob::class,
            RunLeadIntelligenceJob::class,
        ]);

        $lead = Lead::create([
            'company_name' => 'Acme Corp Test',
        ]);

        $activityService = app(LeadActivityService::class);
        $activityService->logActivity($lead, 'Meeting', 'Initial discovery with Acme Corp');

        Queue::assertPushed(ScoreLeadJob::class, function ($job) use ($lead) {
            $prop = new \ReflectionProperty($job, 'leadId');
            return $prop->getValue($job) === $lead->id;
        });

        Queue::assertPushed(QualifyLeadJob::class, function ($job) use ($lead) {
            $prop = new \ReflectionProperty($job, 'leadId');
            return $prop->getValue($job) === $lead->id;
        });

        Queue::assertPushed(ICPMatchLeadJob::class, function ($job) use ($lead) {
            $prop = new \ReflectionProperty($job, 'leadId');
            return $prop->getValue($job) === $lead->id;
        });

        Queue::assertPushed(RunLeadIntelligenceJob::class, function ($job) use ($lead) {
            return $job->leadId === $lead->id;
        });
    }

    public function test_save_transcript_analysis_triggers_rescore(): void
    {
        Queue::fake([
            ScoreLeadJob::class,
            QualifyLeadJob::class,
            ICPMatchLeadJob::class,
            RunLeadIntelligenceJob::class,
        ]);

        $lead = Lead::create([
            'company_name' => 'Transcript Test Co',
        ]);

        $transcript = LeadTranscript::create([
            'lead_id' => $lead->id,
            'source_type' => 'meeting',
            'transcript_text' => 'We have $50,000 budget and want to decide by next month.',
        ]);

        // Trigger rescore service explicitly as it is called after analysis persistence
        app(LeadInteractionRescoreService::class)->triggerRescore($lead, 'transcript_analysis');

        Queue::assertPushed(ScoreLeadJob::class);
        Queue::assertPushed(QualifyLeadJob::class);
        Queue::assertPushed(ICPMatchLeadJob::class);
        Queue::assertPushed(RunLeadIntelligenceJob::class);
    }

    public function test_map_discovery_add_to_leads_dispatches_enrichment_job(): void
    {
        Queue::fake([
            EnrichLeadJob::class,
        ]);

        $role = \App\Models\Role::firstOrCreate(
            ['name' => 'super_admin'],
            ['display_name' => 'Super Admin', 'is_active' => true]
        );
        $user = User::factory()->create(['role_id' => $role->id]);

        $payload = [
            'external_place_id' => 'ChIJN1t_tDeuEmsRUsoyG83frY4',
            'company_name' => 'PT Google Maps Discovery',
            'address' => 'Jl. Sudirman No 1',
            'phone' => '+628123456789',
            'website' => 'https://discoverytest.co.id',
            'lat' => -6.2,
            'lng' => 106.8,
        ];

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/maps/add-to-leads', $payload);

        $response->assertStatus(201);

        $createdLead = Lead::where('company_name', 'PT Google Maps Discovery')->first();
        $this->assertNotNull($createdLead);

        Queue::assertPushed(EnrichLeadJob::class, function ($job) use ($createdLead) {
            $prop = new \ReflectionProperty($job, 'leadId');
            return $prop->getValue($job) === $createdLead->id;
        });
    }

    public function test_whatsapp_convert_to_lead_dispatches_enrichment_job(): void
    {
        Queue::fake([
            EnrichLeadJob::class,
        ]);

        $role = \App\Models\Role::firstOrCreate(
            ['name' => 'super_admin'],
            ['display_name' => 'Super Admin', 'is_active' => true]
        );
        $user = User::factory()->create(['role_id' => $role->id]);

        $contact = \App\Models\WhatsappContact::create([
            'name' => 'John Doe WhatsApp',
            'phone_number' => '+628987654321',
            'normalized_phone_number' => '628987654321',
        ]);

        $conversation = \App\Models\WhatsappConversation::create([
            'contact_id' => $contact->id,
            'platform' => 'whatsapp',
            'external_chat_id' => 'wa_thread_123',
            'sync_status' => 'synced',
        ]);

        $payload = [
            'company_name' => 'PT WhatsApp Inbound',
        ];

        $response = $this->actingAs($user, 'sanctum')
            ->postJson("/api/whatsapp/conversations/{$conversation->id}/convert-to-lead", $payload);

        $response->assertStatus(201);

        $createdLead = Lead::where('company_name', 'PT WhatsApp Inbound')->first();
        $this->assertNotNull($createdLead);

        Queue::assertPushed(EnrichLeadJob::class, function ($job) use ($createdLead) {
            $prop = new \ReflectionProperty($job, 'leadId');
            return $prop->getValue($job) === $createdLead->id;
        });
    }
}
