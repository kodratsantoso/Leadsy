<?php

namespace App\Jobs;

use App\Models\LeadTranscript;
use App\Models\Lead;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use App\Services\AI\AiOrchestrationService;
use Illuminate\Support\Facades\DB;

class AnalyzeTranscriptJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 120; // AI calls can take a while

    /**
     * Create a new job instance.
     */
    public function __construct(public int $transcriptId)
    {
    }

    /**
     * Execute the job.
     */
    public function handle(\App\Services\Sales\MeetingSummaryGenerationService $summaryService): void
    {
        $transcript = LeadTranscript::with('lead')->find($this->transcriptId);
        
        if (!$transcript || !$transcript->lead || empty($transcript->transcript_text)) {
            Log::warning("AnalyzeTranscriptJob aborted: Transcript or Lead not found, or text is empty for ID {$this->transcriptId}");
            return;
        }

        $transcript->update(['evaluation_status' => 'analyzing']);
        
        try {
            $summaryService->generate($transcript);
            $transcript->update(['evaluation_status' => 'evaluated']);
            
            // Log raw compatibility placeholder in lead_analysis_logs
            DB::table('lead_analysis_logs')->insert([
                'tenant_id' => $transcript->lead->tenant_id,
                'lead_id' => $transcript->lead_id,
                'analysis_type' => 'transcript_evaluation_raw',
                'result_json' => json_encode([
                    'transcript_id' => $transcript->id,
                    'raw_content' => json_encode($transcript->only([
                        'general_sections_json', 'meeting_type_sections_json', 'bantc_json', 'score_updates_json'
                    ])),
                ]),
                'created_at' => now(),
            ]);
            Log::info("AI analysis completed successfully for transcript ID {$transcript->id}");
        } catch (\Exception $e) {
            $transcript->update(['evaluation_status' => 'failed']);
            Log::error("AI analysis failed for transcript ID {$transcript->id}: " . $e->getMessage());
            $this->fail($e);
        }
    }
    
    private function buildTranscriptEvaluationPrompt(Lead $lead, LeadTranscript $transcript): string
    {
        return <<<PROMPT
        Analyze this customer interaction transcript and return a JSON evaluation with:
        - summary: concise 3-5 bullet conclusion of the meeting/transcript
        - sentiment: "positive", "neutral", or "negative"
        - intent_level: "high", "medium", or "low" (likelihood they want to buy)
        - interest_level: "high", "medium", or "low" (expressed interest in product/service)
        - objections: array of 2-3 objections mentioned (if any)
        - buying_signals: array of 2-3 positive buying signals (if any)
        - challenge: string, what is the main challenge the customer is facing?
        - legacy_tools: string, what existing tools or legacy systems are they using?
        - risks: array of strings, any risks or attention highlights that need monitoring
        - action_items: array of strings, specific action items from the meeting
        - missing_information: array of strings, what key information is still missing from the discovery?
        - eligibility_reason: automatic assessment of why the lead is eligible or not
        - presales_analysis: automatic assessment of technical/presales analysis
        - presales_recommendation: automatic assessment of presales recommendation
        - next_best_action: recommended next step for the sales rep (string, brief)
        - estimated_closing_date: automatic assessment of estimated closing date in YYYY-MM-DD format (if determinable, else null)
        - confidence: 0-100 confidence in this evaluation
        - bantc_extracted: object containing budget, authority, needs, timeline, competitor based on transcript content
        
        Company: {$lead->company_name}
        Industry: {$lead->industry?->name}
        Source: {$transcript->source_type}
        
        Transcript:
        {$transcript->transcript_text}
        
        Return ONLY valid JSON, no markdown.
        PROMPT;
    }
}
