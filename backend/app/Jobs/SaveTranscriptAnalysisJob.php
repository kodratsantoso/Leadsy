<?php

namespace App\Jobs;

use App\Models\LeadTranscript;
use App\Models\LeadAiEvaluation;
use App\Models\Lead;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SaveTranscriptAnalysisJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;

    /**
     * Create a new job instance.
     */
    public function __construct(public int $transcriptId)
    {
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $transcript = LeadTranscript::with('lead')->find($this->transcriptId);
        
        if (!$transcript || !$transcript->lead) {
            Log::warning("SaveTranscriptAnalysisJob aborted: Transcript or Lead not found for ID {$this->transcriptId}");
            return;
        }

        $log = DB::table('lead_analysis_logs')
            ->where('lead_id', $transcript->lead_id)
            ->where('analysis_type', 'transcript_evaluation_raw')
            ->whereRaw("json_extract(result_json, '$.transcript_id') = ?", [$this->transcriptId])
            ->orderByDesc('created_at')
            ->first();

        if (!$log) {
            Log::error("SaveTranscriptAnalysisJob failed: No raw analysis log found for transcript ID {$this->transcriptId}");
            $this->fail(new \Exception("No raw analysis log found."));
            return;
        }

        $resultJson = json_decode($log->result_json, true);
        $rawContent = $resultJson['raw_content'] ?? null;
        
        if (!$rawContent) {
            $this->fail(new \Exception("Raw content is empty."));
            return;
        }
        
        $evaluation = $this->parseJson($rawContent);

        if (!$evaluation) {
            $transcript->update(['evaluation_status' => 'failed']);
            $this->fail(new \Exception("Failed to parse JSON from AI output."));
            return;
        }

        $lead = $transcript->lead;

        // Persist evaluation
        $aiEvaluation = $lead->aiEvaluations()->create([
            'source_type' => LeadTranscript::class,
            'source_id' => $transcript->id,
            'sentiment' => $evaluation['sentiment'] ?? 'neutral',
            'intent_level' => $evaluation['intent_level'] ?? 'low',
            'interest_level' => $evaluation['interest_level'] ?? 'medium',
            'summary' => $this->stringValue($evaluation['summary'] ?? null),
            'objections_detected' => $evaluation['objections'] ?? [],
            'buying_signals' => $evaluation['buying_signals'] ?? [],
            'bantc_extracted' => $evaluation['bantc_extracted'] ?? null,
            'eligibility_reason' => $this->stringValue($evaluation['eligibility_reason'] ?? null),
            'presales_analysis' => $this->stringValue($evaluation['presales_analysis'] ?? null),
            'presales_recommendation' => $this->stringValue($evaluation['presales_recommendation'] ?? null),
            'estimated_closing_date' => $this->stringValue($evaluation['estimated_closing_date'] ?? null),
            'next_best_action' => $evaluation['next_best_action'] ?? 'Schedule follow-up',
            'confidence_score' => (int) ($evaluation['confidence'] ?? 50),
            
            // New fields
            'challenge' => $this->stringValue($evaluation['challenge'] ?? null),
            'legacy_tools' => $this->stringValue($evaluation['legacy_tools'] ?? null),
            'risks' => $evaluation['risks'] ?? [],
            'action_items' => $evaluation['action_items'] ?? [],
            'missing_information' => $evaluation['missing_information'] ?? [],
            
            'evaluated_at' => Carbon::now(),
        ]);

        // Mark transcript as evaluated
        $transcript->update(['evaluation_status' => 'evaluated']);

        // Save BANTC to Lead Activity
        if (!empty($evaluation['bantc_extracted']) && is_array($evaluation['bantc_extracted'])) {
            $budget = $evaluation['bantc_extracted']['budget'] ?? null;
            $authority = $evaluation['bantc_extracted']['authority'] ?? null;
            $needs = $evaluation['bantc_extracted']['needs'] ?? null;
            $timeline = $evaluation['bantc_extracted']['timeline'] ?? null;
            $competitor = $evaluation['bantc_extracted']['competitor'] ?? null;

            $lead->activities()->create([
                'activity_type' => 'Meeting Analysis',
                'description' => 'AI extracted BANTC from meeting transcript. Summary: ' . $this->stringValue($evaluation['summary'] ?? 'Meeting evaluated.'),
                'budget' => $budget,
                'authority' => $authority,
                'needs' => $needs,
                'timeline' => $timeline,
                'competitor' => $competitor,
                'activity_date' => now(),
            ]);

            // Update the lead's current BANT-C state
            $lead->update([
                'budget' => $budget ?? $lead->budget,
                'authority' => $authority ?? $lead->authority,
                'needs' => $needs ?? $lead->needs,
                'timeline' => $timeline ?? $lead->timeline,
                'competitor' => $competitor ?? $lead->competitor,
            ]);
        }
        
        Log::info("Transcript analysis saved successfully for transcript ID {$this->transcriptId}");
    }
    
    private function parseJson(string $content): ?array
    {
        $content = trim($content);
        if (str_starts_with($content, '```json')) {
            $content = substr($content, 7);
            if (str_ends_with($content, '```')) {
                $content = substr($content, 0, -3);
            }
        } elseif (str_starts_with($content, '```')) {
            $content = substr($content, 3);
            if (str_ends_with($content, '```')) {
                $content = substr($content, 0, -3);
            }
        }
        $content = trim($content);
        $decoded = json_decode($content, true);
        
        return json_last_error() === JSON_ERROR_NONE ? $decoded : null;
    }
    
    private function stringValue(mixed $val): ?string
    {
        if (is_array($val)) {
            return implode("\n", $val);
        }
        if (is_string($val) && trim($val) !== '') {
            return trim($val);
        }
        return null;
    }
}
