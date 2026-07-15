<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Lead;
use App\Models\LeadTranscript;
use App\Models\LeadAiEvaluation;
use App\Services\Sales\MeetingSummaryGenerationService;
use App\Services\AI\AiOrchestrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;

class MeetingSummaryGenerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_discovery_meeting_summary_generation_saves_correct_structure(): void
    {
        // 1. Arrange: Create a Lead and a LeadTranscript
        $lead = Lead::create([
            'company_name' => 'Test Company LLC',
            'budget' => null,
            'authority' => null,
            'needs' => null,
            'timeline' => null,
            'competitor' => null,
        ]);

        $transcript = LeadTranscript::create([
            'lead_id' => $lead->id,
            'title' => 'Discovery Call Test',
            'recorded_at' => now(),
            'source_type' => 'manual',
            'transcript_text' => 'This is a sample discovery call conversation.',
            'meeting_type' => 'Discovery',
        ]);

        $mockJson = [
            'meeting_type' => 'Discovery',
            'summary_type' => 'Discovery',
            'general_sections' => [
                'executive_summary' => 'This was a discovery meeting with Test Company LLC.',
                'key_discussion_points' => ['Discussed CRM transition', 'Pain point identification'],
                'customer_needs_pain_points' => ['Struggling with lead tracking speed'],
                'decision_agreement' => ['Agreed to demo on Friday'],
                'action_items' => ['Prepare demo account', 'Send pricing sheet'],
                'risks_concerns' => ['Integration latency concerns'],
                'next_step' => ['Deliver proposal next week'],
                'missing_information' => ['Exact user count'],
            ],
            'meeting_type_sections' => [
                'pain_point_validation' => 'Validated lead tracking bottleneck',
                'bantc_budget' => '10k-20k annual',
                'bantc_authority' => 'Direct access to VP',
                'bantc_need' => 'Urgent central tracker',
                'bantc_timeline' => 'Within 2 months',
                'bantc_competitor' => 'Internal spreadsheet tracker',
            ],
            'bantc' => [
                'budget' => '10k-20k',
                'authority' => 'VP of Sales',
                'needs' => 'Central lead tracking',
                'timeline' => '2 months',
                'competitor' => 'Excel',
            ],
            'score_updates' => [
                'lead_score' => 88,
                'eligibility_status' => 'eligible',
                'confidence' => 90,
            ],
            'presales_recommendation' => 'Schedule standard product demo highlighting pipeline workflow.'
        ];

        // Mock AiOrchestrationService
        $aiMock = Mockery::mock(AiOrchestrationService::class);
        $aiMock->shouldReceive('call')
            ->once()
            ->with('global', Mockery::type('array'))
            ->andReturn([
                'success' => true,
                'content' => json_encode($mockJson),
                'provider' => 'google',
                'model' => 'gemini-1.5-pro',
            ]);

        $this->app->instance(AiOrchestrationService::class, $aiMock);

        // 2. Act: Run the generation service
        $service = $this->app->make(MeetingSummaryGenerationService::class);
        $result = $service->generate($transcript);

        // 3. Assert: Verify database column mappings on LeadTranscript
        $transcript->refresh();
        $this->assertEquals('Discovery', $transcript->summary_type);
        $this->assertEquals('This was a discovery meeting with Test Company LLC.', $transcript->general_sections_json['executive_summary']);
        $this->assertEquals('Validated lead tracking bottleneck', $transcript->meeting_type_sections_json['pain_point_validation']);
        $this->assertEquals('10k-20k', $transcript->bantc_json['budget']);
        $this->assertEquals('VP of Sales', $transcript->bantc_json['authority']);
        $this->assertEquals(88, $transcript->score_updates_json['lead_score']);
        $this->assertEquals('eligible', $transcript->score_updates_json['eligibility_status']);

        // Assert: Verify Lead model was updated
        $lead->refresh();
        $this->assertEquals('10k-20k', $lead->budget);
        $this->assertEquals('VP of Sales', $lead->authority);
        $this->assertEquals(88, $lead->lead_score);
        $this->assertEquals('eligible', $lead->qualification_status);

        // Assert: Verify LeadAiEvaluation record was created
        $evaluation = LeadAiEvaluation::where('source_type', LeadTranscript::class)
            ->where('source_id', $transcript->id)
            ->first();
        
        $this->assertNotNull($evaluation);
        $this->assertEquals('This was a discovery meeting with Test Company LLC.', $evaluation->summary);
        $this->assertEquals(90, $evaluation->confidence_score);
        $this->assertEquals('eligible', $evaluation->intent_level);
        $this->assertEquals('Schedule standard product demo highlighting pipeline workflow.', $evaluation->presales_recommendation);
    }
}
