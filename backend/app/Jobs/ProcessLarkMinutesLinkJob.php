<?php

namespace App\Jobs;

use App\Models\LarkIntegration;
use App\Models\Lead;
use App\Services\Lark\LarkMeetingService;
use App\Services\AuditService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Log;

class ProcessLarkMinutesLinkJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 120;
    
    protected $leadId;
    protected $meetingLink;

    public function __construct(string $leadId, string $meetingLink)
    {
        $this->leadId = $leadId;
        $this->meetingLink = $meetingLink;
        // Run in the intelligence queue like other AI jobs
        $this->onQueue('intelligence');
    }

    public function handle(): void
    {
        $lead = Lead::find($this->leadId);
        if (!$lead) {
            Log::warning("ProcessLarkMinutesLinkJob: Lead not found", ['lead_id' => $this->leadId]);
            return;
        }

        $integration = LarkIntegration::where('tenant_id', $lead->tenant_id)->where('is_active', true)->first();
        if (!$integration) {
            Log::warning("ProcessLarkMinutesLinkJob: No active Lark integration found for tenant", ['tenant_id' => $lead->tenant_id]);
            return;
        }

        $minuteToken = null;
        if (preg_match('/minutes\/([a-zA-Z0-9]+)/', $this->meetingLink, $matches)) {
            $minuteToken = $matches[1];
        }

        if (!$minuteToken) {
            Log::error("ProcessLarkMinutesLinkJob: Invalid Lark Minutes URL. Could not find minute token.", ['url' => $this->meetingLink]);
            return;
        }

        try {
            $larkService = new LarkMeetingService($integration);
            $transcriptData = $larkService->getMinuteTranscript($minuteToken);
            
            if (!$transcriptData) {
                Log::error("ProcessLarkMinutesLinkJob: Failed to fetch transcript from Lark API. Ensure integration has permissions.");
                return;
            }

            $transcriptText = $transcriptData['content'] ?? ($transcriptData['transcript'] ?? json_encode($transcriptData));

            $transcript = $lead->transcripts()->create([
                'title' => 'Lark Meeting Transcript',
                'source_type' => 'meeting',
                'transcript_text' => $transcriptText,
                'recorded_at' => now(),
                'evaluation_status' => 'pending',
            ]);

            AuditService::log('create_transcript', 'lead_transcripts', $transcript, null, [
                'source_type' => 'meeting',
                'fetch_source' => 'lark_link_automation',
            ]);

            // Dispatch the chain for AI Summary, PDF generation, and Base sync
            Bus::chain([
                new AnalyzeTranscriptJob($transcript->id),
                new SaveTranscriptAnalysisJob($transcript->id),
                new SyncTranscriptAnalysisToLarkBaseJob($transcript->id),
                new GenerateMeetingSummaryPdfJob($transcript->id),
                new SyncMeetingSummaryPdfToLarkBaseJob($transcript->id),
            ])->dispatch();
            
            Log::info("ProcessLarkMinutesLinkJob: Successfully fetched transcript and dispatched AI chain.", ['lead_id' => $lead->id, 'transcript_id' => $transcript->id]);

        } catch (\Exception $e) {
            Log::error("ProcessLarkMinutesLinkJob: Error processing link", [
                'lead_id' => $lead->id,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
}
