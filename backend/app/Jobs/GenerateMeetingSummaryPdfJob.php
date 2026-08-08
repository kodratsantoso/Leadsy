<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

use App\Models\LeadTranscript;
use App\Models\LeadAiEvaluation;
use App\Models\MeetingSummaryDocument;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Exception;
use Illuminate\Support\Str;

use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class GenerateMeetingSummaryPdfJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $transcriptId;
    protected $evaluationId;

    /**
     * Create a new job instance.
     */
    public function __construct($transcriptId, $evaluationId = null)
    {
        $this->transcriptId = $transcriptId;
        $this->evaluationId = $evaluationId;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $transcript = LeadTranscript::with(['lead', 'evaluations'])->find($this->transcriptId);
        
        if (!$transcript) {
            return;
        }

        $evaluation = $this->evaluationId 
            ? LeadAiEvaluation::find($this->evaluationId)
            : $transcript->evaluations()->latest()->first();

        if (!$evaluation) {
            return;
        }

        // Initialize document record
        $document = MeetingSummaryDocument::create([
            'transcript_id' => $transcript->id,
            'lead_id' => $transcript->lead_id,
            'generation_status' => 'generating',
            'generated_at' => now(),
            'generated_by' => 'system',
        ]);

        try {
            $lead = $transcript->lead;

            $data = [
                'transcript' => $transcript,
                'evaluation' => $evaluation,
                'lead' => $lead,
                'documentId' => 'MS-' . str_pad($document->id, 6, '0', STR_PAD_LEFT),
                'generatedDate' => now()->format('M d, Y H:i'),
            ];

            // Render PDF
            $pdf = Pdf::loadView('pdf.meeting-summary', $data);

            // Store PDF
            $leadName = $lead->company_name ?? $lead->name ?? 'Unknown Lead';
            $meetingDate = $transcript->recorded_at ? $transcript->recorded_at->format('Y-m-d') : now()->format('Y-m-d');
            $meetingTitle = $transcript->title ?? 'Meeting';
            
            $rawFilename = "{$leadName} - {$meetingDate} - {$meetingTitle}";
            // Sanitize filename to avoid invalid path characters
            $safeFilename = preg_replace('/[^A-Za-z0-9\- \_]/', '', $rawFilename);
            $filename = trim($safeFilename) . '.pdf';
            
            $path = 'meeting-summaries/' . $filename;
            
            Storage::disk('public')->put($path, $pdf->output());

            // Update document record
            $document->update([
                'file_name' => $filename,
                'file_path' => $path,
                'file_url' => Storage::disk('public')->url($path),
                'file_mime_type' => 'application/pdf',
                'file_size' => Storage::disk('public')->size($path),
                'generation_status' => 'success',
            ]);

            // Map meeting type to column prefix
            $typeColumnPrefix = match (strtolower(str_replace([' ', '-'], '_', $transcript->meeting_type ?: 'General'))) {
                'discovery' => 'discovery_meeting',
                'demo' => 'demo_meeting',
                'follow_up' => 'follow_up_meeting',
                'proposal_discussion' => 'proposal_discussion',
                'closing_discussion' => 'closing_discussion',
                'handover_to_csm' => 'handover_to_csm',
                default => 'general_meeting'
            };

            $summaryData = [
                'summary' => $evaluation->summary ?? '',
                'action_items' => $evaluation->action_items ?? [],
                'presales_recommendation' => $evaluation->presales_recommendation ?? '',
                'objections_detected' => $evaluation->objections_detected ?? [],
            ];

            // Update lead with the new summary and attachment
            $lead->update([
                "{$typeColumnPrefix}_summary" => $summaryData,
                "{$typeColumnPrefix}_attachment_id" => $document->id,
            ]);

            // Sync to Lark Base
            SyncMeetingSummaryPdfToLarkBaseJob::dispatch($transcript->id);
            SyncLeadToLarkBaseJob::dispatch($lead->id);

        } catch (Exception $e) {
            \Illuminate\Support\Facades\Log::error('pdf_generation_failed', [
                'transcript_id' => $this->transcriptId,
                'evaluation_id' => $this->evaluationId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            $document->update([
                'generation_status' => 'failed',
            ]);
            throw $e;
        }
    }
}
