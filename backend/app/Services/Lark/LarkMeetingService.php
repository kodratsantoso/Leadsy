<?php

namespace App\Services\Lark;

use App\Models\LarkSync;
use App\Models\Lead;
use Exception;
use Illuminate\Support\Facades\Log;

class LarkMeetingService extends LarkService
{
    /**
     * Get meeting transcript
     */
    public function getMeetingTranscript(string $meetingId): ?array
    {
        try {
            $response = $this->request('GET', "/vc/v1/meetings/{$meetingId}/transcript");

            return $response;
        } catch (Exception $e) {
            Log::error('Failed to get Lark meeting transcript', [
                'meeting_id' => $meetingId,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Get meeting participants
     */
    public function getMeetingParticipants(string $meetingId): ?array
    {
        try {
            $response = $this->request('GET', "/vc/v1/meetings/{$meetingId}/participants");

            return $response;
        } catch (Exception $e) {
            Log::error('Failed to get Lark meeting participants', [
                'meeting_id' => $meetingId,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Get meeting details
     */
    public function getMeetingDetails(string $meetingId): ?array
    {
        try {
            $response = $this->request('GET', "/vc/v1/meetings/{$meetingId}");

            return $response;
        } catch (Exception $e) {
            Log::error('Failed to get Lark meeting details', [
                'meeting_id' => $meetingId,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Capture meeting transcript for lead
     */
    public function captureTranscriptForLead(
        string $meetingId,
        string $leadsyLeadId
    ): LarkSync {
        $sync = LarkSync::create([
            'tenant_id' => $this->integration->tenant_id,
            'lark_integration_id' => $this->integration->id,
            'module' => 'meeting',
            'action' => 'capture_transcript',
            'lark_entity_type' => 'meeting',
            'lark_entity_id' => $meetingId,
            'leadsy_entity_type' => 'lead',
            'leadsy_entity_id' => $leadsyLeadId,
            'status' => 'pending',
        ]);

        try {
            // Get meeting transcript and details
            $transcript = $this->getMeetingTranscript($meetingId);
            $details = $this->getMeetingDetails($meetingId);

            if (! $transcript) {
                throw new Exception('Transcript not available');
            }

            // Store transcript data in database
            $lead = Lead::findOrFail($leadsyLeadId);

            $transcriptText = $transcript['content'] ?? ($transcript['transcript'] ?? '');

            // Create activity for the meeting with transcript
            $lead->activities()->create([
                'activity_type' => 'meeting',
                'title' => 'Lark Meeting - '.($details['topic'] ?? 'Meeting'),
                'description' => $transcriptText,
                'metadata' => [
                    'meeting_id' => $meetingId,
                    'transcript_full' => $transcript,
                    'participants' => $details['participants'] ?? [],
                ],
            ]);

            $sync->update([
                'response_data' => [
                    'transcript_captured' => true,
                    'transcript_length' => strlen($transcriptText),
                    'meeting_details' => $details,
                ],
            ]);

            $sync->markSuccessful();

            Log::info('Lark meeting transcript captured', [
                'meeting_id' => $meetingId,
                'lead_id' => $leadsyLeadId,
                'sync_id' => $sync->id,
            ]);

            return $sync;
        } catch (Exception $e) {
            $sync->markFailed($e->getMessage());
            Log::error('Failed to capture Lark meeting transcript', [
                'meeting_id' => $meetingId,
                'lead_id' => $leadsyLeadId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Get meeting recordings
     */
    public function getMeetingRecordings(string $meetingId): ?array
    {
        try {
            $response = $this->request('GET', "/vc/v1/meetings/{$meetingId}/recordings");

            return $response;
        } catch (Exception $e) {
            Log::error('Failed to get Lark meeting recordings', [
                'meeting_id' => $meetingId,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Download meeting recording
     */
    public function downloadRecording(string $recordingId): ?string
    {
        try {
            $response = $this->request('GET', "/vc/v1/recordings/{$recordingId}/download");

            return $response['download_url'] ?? null;
        } catch (Exception $e) {
            Log::error('Failed to get Lark recording download URL', [
                'recording_id' => $recordingId,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }
}
