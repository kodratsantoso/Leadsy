<?php
namespace Tests\Feature;
use Tests\TestCase;
use App\Models\User;
use App\Models\Lead;
use App\Models\LeadTranscript;
use App\Models\LeadAiEvaluation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Http\Middleware\CheckPermission;

class ManualPdfTest extends TestCase
{
    use RefreshDatabase;

    public function test_manual_pdf()
    {
        $this->withoutMiddleware(CheckPermission::class);

        $user = User::factory()->create();

        $lead = Lead::first();
        if (!$lead) {
            $lead = Lead::create(['company_name' => 'test company']);
        }
        $transcript = $lead->transcripts()->create(['title' => 'test', 'transcript_text' => 'test', 'source_type' => 'manual']);
        $eval = $lead->aiEvaluations()->create(['source_type' => LeadTranscript::class, 'source_id' => $transcript->id]);
        
        $response = $this->actingAs($user)->postJson('/api/transcripts/meeting-summary/generate', [
            'transcript_id' => $transcript->id,
            'evaluation_id' => $eval->id
        ]);
        
        $response->assertStatus(200);
        
        $this->assertDatabaseHas('meeting_summary_documents', [
            'transcript_id' => $transcript->id
        ]);
    }
}
