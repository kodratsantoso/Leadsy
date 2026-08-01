<?php

namespace App\Jobs;

use App\Models\LeadTranscript;
use App\Models\LarkIntegration;
use App\Services\Lark\LarkMeetingService;
use App\Services\Lark\LarkMeetingUrlParser;
use App\Services\AuditService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ImportLarkMeetingTranscriptJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $backoff = [10, 30, 60];

    protected $transcriptId;

    /**
     * Create a new job instance.
     */
    public function __construct(int $transcriptId)
    {
        $this->transcriptId = $transcriptId;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $transcript = LeadTranscript::with('lead')->find($this->transcriptId);
        if (!$transcript) {
            return;
        }

        $lead = $transcript->lead;

        try {
            // 1. Resolve Integration
            $integration = LarkIntegration::where('tenant_id', $lead->tenant_id)->where('is_active', true)->first();
            if (!$integration) {
                $this->failImport($transcript, 'LARK_INTEGRATION_NOT_CONFIGURED', 'Lark integration has not been configured.');
                return;
            }

            $larkService = new LarkMeetingService($integration);

            // 2. Parse URL
            $url = $transcript->source_url;
            $parsed = LarkMeetingUrlParser::parse($url);

            if (!$parsed['valid']) {
                $this->failImport($transcript, $parsed['error'], 'The provided URL is not a valid Lark meeting link.');
                return;
            }

            $minuteToken = null;
            $meetingId = null;

            // 3. Resolve Minute Token
            $transcript->update(['import_status' => 'RESOLVING_RECORDING']);

            if ($parsed['type'] === 'minuteToken') {
                $minuteToken = $parsed['id'];
            } elseif ($parsed['type'] === 'meetingId') {
                $meetingId = $parsed['id'];
                
                // Application-level duplicate check for meetingId
                $existing = LeadTranscript::where('meeting_id', $meetingId)
                    ->where('id', '!=', $transcript->id)
                    ->whereHas('lead', function($q) use ($lead) {
                        $q->where('tenant_id', $lead->tenant_id);
                    })->first();
                
                if ($existing) {
                    $this->failImport($transcript, 'TRANSCRIPT_ALREADY_IMPORTED', 'This meeting transcript has already been imported on lead: ' . $existing->lead_id);
                    return;
                }

                $recordingInfo = $larkService->getMeetingRecording($meetingId);
                if (!$recordingInfo || empty($recordingInfo['url'])) {
                    $this->failImport($transcript, 'LARK_RECORDING_NOT_AVAILABLE', 'No recording is available for this meeting.');
                    return;
                }

                // URL from recording info is usually a minutes URL
                $recordingUrl = $recordingInfo['url'];
                $transcript->update([
                    'meeting_id' => $meetingId,
                    'recording_url' => $recordingUrl
                ]);
                
                // Extract minute token from recording url
                $parsedRec = LarkMeetingUrlParser::parse($recordingUrl);
                if ($parsedRec['type'] === 'minuteToken') {
                    $minuteToken = $parsedRec['id'];
                } else {
                    $this->failImport($transcript, 'LARK_MINUTES_URL_NOT_FOUND', 'Lark Minutes could not be resolved for this meeting.');
                    return;
                }
            }

            // 4. Validate duplicate by Minute Token
            $transcript->update(['minute_token' => $minuteToken]);
            
            $existingByToken = LeadTranscript::where('minute_token', $minuteToken)
                ->where('id', '!=', $transcript->id)
                ->whereHas('lead', function($q) use ($lead) {
                    $q->where('tenant_id', $lead->tenant_id);
                })->first();
                
            if ($existingByToken) {
                $this->failImport($transcript, 'TRANSCRIPT_ALREADY_IMPORTED', 'This meeting transcript has already been imported on lead: ' . $existingByToken->lead_id);
                return;
            }

            // 5. Export Transcript
            $transcript->update(['import_status' => 'EXPORTING_TRANSCRIPT']);
            
            $transcriptText = $larkService->exportTranscript($minuteToken);
            
            if (!$transcriptText || trim($transcriptText) === '') {
                $this->failImport($transcript, 'LARK_TRANSCRIPT_EMPTY', 'The exported meeting transcript is empty.');
                return;
            }

            $hash = hash('sha256', $transcriptText);

            $transcript->update([
                'transcript_text' => $transcriptText,
                'transcript_hash' => $hash,
                'import_status' => 'TRANSCRIPT_IMPORTED',
                'imported_at' => now(),
            ]);

            AuditService::log('import_transcript', 'lead_transcripts', $transcript, null, [
                'source_type' => 'meeting',
                'fetch_source' => 'lark_link',
                'minute_token' => $minuteToken
            ]);

            // 6. Trigger Existing AI Analysis
            $transcript->update([
                'evaluation_status' => 'analyzing'
            ]);
            
            AnalyzeTranscriptJob::dispatch($transcript->id);

        } catch (\Exception $e) {
            Log::error('ImportLarkMeetingTranscriptJob failed', [
                'transcript_id' => $this->transcriptId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $this->failImport($transcript, 'LARK_PROVIDER_ERROR', 'An unexpected error occurred during import: ' . $e->getMessage());
        }
    }

    protected function failImport(LeadTranscript $transcript, string $code, string $message): void
    {
        $transcript->update([
            'import_status' => 'FAILED',
            'import_error_code' => $code,
            'import_error_message' => $message,
            'evaluation_status' => 'failed'
        ]);
        
        AuditService::log('import_transcript_failed', 'lead_transcripts', $transcript, null, [
            'error_code' => $code,
            'error_message' => $message,
        ]);
    }
}
