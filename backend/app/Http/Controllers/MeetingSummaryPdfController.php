<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\LeadTranscript;
use App\Models\MeetingSummaryDocument;
use App\Jobs\GenerateMeetingSummaryPdfJob;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MeetingSummaryPdfController extends Controller
{
    /**
     * Manually trigger the generation of a meeting summary PDF
     */
    public function generate(Request $request)
    {
        $request->validate([
            'transcript_id' => 'required|exists:lead_transcripts,id',
            'evaluation_id' => 'nullable|exists:lead_ai_evaluations,id'
        ]);

        try {
            GenerateMeetingSummaryPdfJob::dispatchSync($request->transcript_id, $request->evaluation_id);
            
            $userId = auth()->check() ? auth()->id() : null;
            \App\Jobs\SyncMeetingSummaryToLarkJob::dispatch($request->transcript_id, $userId);

            return response()->json([
                'message' => 'Meeting summary generated and is syncing to Lark Base in the background.'
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to generate meeting summary PDF', [
                'transcript_id' => $request->transcript_id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json([
                'message' => 'Failed to generate Meeting Summary PDF. ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Download the latest meeting summary PDF for a given transcript
     */
    public function download($transcriptId)
    {
        $transcript = LeadTranscript::with(['lead', 'evaluations'])->findOrFail($transcriptId);

        $document = MeetingSummaryDocument::where('transcript_id', $transcriptId)
            ->where('generation_status', 'success')
            ->latest()
            ->first();

        // 1. If physical file exists on disk, download directly
        if ($document && !empty($document->file_path) && Storage::disk('public')->exists($document->file_path)) {
            return Storage::disk('public')->download($document->file_path, $document->file_name);
        }

        // 2. Self-healing fallback: Generate PDF on the fly using DomPdf
        $evaluation = $transcript->evaluations()->latest()->first();
        if (!$evaluation) {
            return response()->json(['message' => 'Transcript evaluation not found. Run AI analysis first.'], 404);
        }

        $lead = $transcript->lead;
        if (!$lead) {
            return response()->json(['message' => 'Associated lead not found.'], 404);
        }

        $docId = $document ? 'MS-' . str_pad($document->id, 6, '0', STR_PAD_LEFT) : 'MS-' . str_pad($transcript->id, 6, '0', STR_PAD_LEFT);
        $data = [
            'transcript' => $transcript,
            'evaluation' => $evaluation,
            'lead' => $lead,
            'documentId' => $docId,
            'generatedDate' => now()->format('M d, Y H:i'),
        ];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.meeting-summary', $data);

        $leadName = $lead->company_name ?? $lead->name ?? 'Lead';
        $meetingDate = $transcript->created_at ? $transcript->created_at->format('Y-m-d') : date('Y-m-d');
        $rawFilename = "Meeting Summary - {$leadName} - {$transcript->meeting_type} - {$meetingDate}";
        $safeFilename = preg_replace('/[^A-Za-z0-9\- \_]/', '', $rawFilename);
        $filename = trim($safeFilename) . '.pdf';
        $path = 'meeting-summaries/' . $filename;

        // Ensure directory exists and write
        $fullPath = storage_path('app/public/' . $path);
        if (!is_dir(dirname($fullPath))) {
            mkdir(dirname($fullPath), 0755, true);
        }
        Storage::disk('public')->put($path, $pdf->output());

        if ($document) {
            $document->update([
                'file_name' => $filename,
                'file_path' => $path,
                'file_url' => Storage::disk('public')->url($path),
                'file_mime_type' => 'application/pdf',
                'file_size' => Storage::disk('public')->size($path),
                'generation_status' => 'success',
            ]);
        } else {
            MeetingSummaryDocument::create([
                'transcript_id' => $transcript->id,
                'lead_id' => $lead->id,
                'file_name' => $filename,
                'file_path' => $path,
                'file_url' => Storage::disk('public')->url($path),
                'file_mime_type' => 'application/pdf',
                'file_size' => Storage::disk('public')->size($path),
                'generation_status' => 'success',
                'generated_at' => now(),
                'generated_by' => 'system',
            ]);
        }

        return Storage::disk('public')->download($path, $filename);
    }
}
