<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Services\AuditService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Meeting transcripts and their AI evaluations for a lead.
 *
 * Split out of LeadController, which had grown to 66 methods across eight
 * unrelated domains. These seven use none of that controller's private
 * helpers and neither of its injected services, so they move as they are.
 */
class LeadTranscriptController extends Controller
{
    /** GET /api/leads/{lead}/transcripts */
    public function getTranscripts(Lead $lead): JsonResponse
    {
        $transcripts = $lead->transcripts()
            ->with(['activity:id,activity_type,activity_date,description', 'documents', 'syncJobs'])
            ->orderByDesc('recorded_at')
            ->paginate(50);

        return response()->json($transcripts);
    }

    /** POST /api/leads/{lead}/transcripts */
    public function storeTranscript(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'title' => 'nullable|string|max:255',
            'activity_id' => 'nullable|integer|exists:lead_activities,id',
            'source_type' => 'required|in:whatsapp,meeting,manual,call,audio,video,file,transcript,link',
            'transcript_text' => 'nullable|string',
            'transcript_file' => 'nullable|file|max:51200|mimes:txt,vtt,srt,mp3,wav,m4a,mp4,mov,webm',
            'source_id' => 'nullable|integer',
            'recorded_at' => 'nullable|date',
            'meeting_type' => 'nullable|string|max:100',
        ]);

        if (! empty($data['activity_id']) && ! $lead->activities()->whereKey($data['activity_id'])->exists()) {
            abort(422, 'Selected activity does not belong to this lead.');
        }

        $filePath = null;
        $fileName = null;
        $fileMime = null;
        $fileSize = null;
        $transcriptText = $data['transcript_text'] ?? null;

        if ($request->hasFile('transcript_file')) {
            $file = $request->file('transcript_file');
            $filePath = $file->store('lead-transcripts', 'public');
            $fileName = $file->getClientOriginalName();
            $fileMime = $file->getMimeType();
            $fileSize = $file->getSize();

            $extension = strtolower($file->getClientOriginalExtension());
            if (in_array($extension, ['txt', 'vtt', 'srt'], true)) {
                $fileText = file_get_contents($file->getRealPath());
                if (is_string($fileText) && trim($fileText) !== '') {
                    $transcriptText = trim($transcriptText ? "{$transcriptText}\n\n{$fileText}" : $fileText);
                }
            }
        }

        if (! $transcriptText && ! $filePath) {
            abort(422, 'Transcript text or a transcript file is required.');
        }

        $transcript = $lead->transcripts()->create([
            'activity_id' => $data['activity_id'] ?? null,
            'title' => $data['title'] ?? null,
            'source_type' => $data['source_type'],
            'transcript_text' => $transcriptText,
            'source_id' => $data['source_id'] ?? null,
            'file_path' => $filePath,
            'file_name' => $fileName,
            'file_mime' => $fileMime,
            'file_size' => $fileSize,
            'recorded_at' => $data['recorded_at'] ?? now(),
            'evaluation_status' => 'pending',
            'meeting_type' => $data['meeting_type'] ?? 'General',
        ]);

        AuditService::log('create_transcript', 'lead_transcripts', $transcript, null, [
            'source_type' => $data['source_type'],
        ]);

        if (!empty($transcriptText)) {
            \Illuminate\Support\Facades\Bus::chain([
                new \App\Jobs\AnalyzeTranscriptJob($transcript->id),
                new \App\Jobs\SaveTranscriptAnalysisJob($transcript->id),
                new \App\Jobs\SyncTranscriptAnalysisToLarkBaseJob($transcript->id),
                new \App\Jobs\GenerateMeetingSummaryPdfJob($transcript->id),
                new \App\Jobs\SyncMeetingSummaryPdfToLarkBaseJob($transcript->id),
            ])->dispatch();
        }

        return response()->json(['data' => $transcript->load('activity:id,activity_type,activity_date,description')], 201);
    }

    /** PUT /api/leads/{lead}/transcripts/{transcript} */
    public function updateTranscript(Request $request, Lead $lead, $transcriptId): JsonResponse
    {
        $transcript = $lead->transcripts()->findOrFail($transcriptId);

        $data = $request->validate([
            'title' => 'nullable|string|max:255',
            'recorded_at' => 'nullable|date',
            'meeting_type' => 'nullable|string|max:100',
            'transcript_text' => 'nullable|string',
        ]);

        $updateData = [];
        if (array_key_exists('title', $data)) $updateData['title'] = $data['title'];
        if (array_key_exists('recorded_at', $data)) $updateData['recorded_at'] = $data['recorded_at'] ? Carbon::parse($data['recorded_at']) : null;
        if (array_key_exists('meeting_type', $data)) $updateData['meeting_type'] = $data['meeting_type'];
        if (array_key_exists('transcript_text', $data)) $updateData['transcript_text'] = $data['transcript_text'];

        $transcript->update($updateData);

        AuditService::log('update_transcript', 'lead_transcripts', $transcript, null, $updateData);

        return response()->json(['data' => $transcript]);
    }

    /** POST /api/leads/{lead}/transcripts/fetch-link */
    public function fetchTranscriptFromLink(Request $request, Lead $lead): JsonResponse
    {
        $data = $request->validate([
            'meeting_link' => 'required|url',
        ]);

        $url = $data['meeting_link'];

        if (!$lead->meeting_link) {
            $lead->update(['meeting_link' => $url]);
        }

        $integration = \App\Models\LarkIntegration::where('tenant_id', $lead->tenant_id)->where('is_active', true)->first();
        if (!$integration) {
            abort(400, 'No active Lark integration found for this tenant.');
        }

        // Validate URL immediately
        $parsed = \App\Services\Lark\LarkMeetingUrlParser::parse($url);
        if (!$parsed['valid']) {
            abort(400, 'Invalid Lark Meeting URL.');
        }

        // Application-level duplicate check for meetingId or minuteToken
        if ($parsed['type'] === 'meetingId') {
            $existing = \App\Models\LeadTranscript::where('meeting_id', $parsed['id'])
                ->whereHas('lead', function($q) use ($lead) {
                    $q->where('tenant_id', $lead->tenant_id);
                })->first();
                
            if ($existing) {
                return response()->json([
                    'message' => 'Transcript already imported on lead: ' . $existing->lead_id,
                    'duplicate' => true,
                    'existing_id' => $existing->id,
                    'lead_id' => $existing->lead_id
                ], 409);
            }
        } elseif ($parsed['type'] === 'minuteToken') {
            $existing = \App\Models\LeadTranscript::where('minute_token', $parsed['id'])
                ->whereHas('lead', function($q) use ($lead) {
                    $q->where('tenant_id', $lead->tenant_id);
                })->first();
                
            if ($existing) {
                return response()->json([
                    'message' => 'Transcript already imported on lead: ' . $existing->lead_id,
                    'duplicate' => true,
                    'existing_id' => $existing->id,
                    'lead_id' => $existing->lead_id
                ], 409);
            }
        }

        // Create pending transcript
        $transcript = $lead->transcripts()->create([
            'title' => 'Lark Meeting Transcript',
            'source_type' => 'link',
            'source_provider' => 'LARK',
            'source_url' => $url,
            'transcript_text' => '',
            'recorded_at' => now(),
            'evaluation_status' => 'pending',
            'import_status' => 'VALIDATING_LINK'
        ]);

        \App\Services\AuditService::log('create_transcript', 'lead_transcripts', $transcript, null, [
            'source_type' => 'link',
            'fetch_source' => 'lark_link',
        ]);

        // Dispatch background job
        \App\Jobs\ImportLarkMeetingTranscriptJob::dispatch($transcript->id);

        return response()->json([
            'data' => $transcript->load('activity:id,activity_type,activity_date,description'),
            'message' => 'Transcript import job started successfully.',
        ], 201);
    }

    /** DELETE /api/leads/{lead}/transcripts/{transcript} */
    public function deleteTranscript(Lead $lead, $transcriptId): JsonResponse
    {
        $transcript = $lead->transcripts()->findOrFail($transcriptId);
        if ($transcript->file_path) {
            Storage::disk('public')->delete($transcript->file_path);
        }
        $transcript->delete();

        AuditService::log('delete_transcript', 'lead_transcripts', $transcript, $transcript->toArray());

        return response()->json(['message' => 'Transcript deleted']);
    }

    /** POST /api/leads/{lead}/transcripts/{transcript}/evaluate */
    public function evaluateTranscript(Lead $lead, $transcriptId): JsonResponse
    {
        $transcript = $lead->transcripts()->findOrFail($transcriptId);

        if (! trim((string) $transcript->transcript_text)) {
            return response()->json([
                'message' => 'This transcript has no text content yet. Add/paste transcript text before running AI analysis.',
            ], 422);
        }

        $transcript->update(['evaluation_status' => 'pending']);
        
        \App\Jobs\AnalyzeTranscriptJob::dispatch($transcript->id);

        return response()->json(['message' => 'Evaluation queued', 'data' => []], 202);
    }

    /** GET /api/leads/{lead}/evaluations */
    public function getEvaluations(Lead $lead): JsonResponse
    {
        $evaluations = $lead->aiEvaluations()
            ->orderByDesc('evaluated_at')
            ->paginate(50);

        return response()->json($evaluations);
    }
}
