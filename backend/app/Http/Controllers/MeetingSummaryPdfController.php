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

        GenerateMeetingSummaryPdfJob::dispatch($request->transcript_id, $request->evaluation_id);

        return response()->json([
            'message' => 'Meeting summary generation has been queued.'
        ]);
    }

    /**
     * Download the latest meeting summary PDF for a given transcript
     */
    public function download($transcriptId)
    {
        $document = MeetingSummaryDocument::where('transcript_id', $transcriptId)
            ->where('generation_status', 'success')
            ->latest()
            ->first();

        if (!$document || !Storage::disk('public')->exists($document->file_path)) {
            return response()->json(['message' => 'PDF document not found or not ready.'], 404);
        }

        return Storage::disk('public')->download($document->file_path, $document->file_name);
    }
}
