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

    /**
     * Get meeting transcript from Minute Token
     */
    public function getMinuteTranscript(string $minuteToken): ?array
    {
        try {
            // Lark Minutes API endpoint for getting the transcript/content
            // (Note: Requires specific 'minutes' scope permissions in Lark App)
            $response = $this->request('GET', "/minutes/v1/minutes/{$minuteToken}");

            return $response;
        } catch (Exception $e) {
            Log::error('Failed to get Lark minute transcript', [
                'minute_token' => $minuteToken,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Capture meeting transcript from a URL link
     */
    public function captureTranscriptFromLink(
        string $url,
        string $leadsyLeadId
    ): LarkSync {
        // Basic extraction of minute token from a typical Lark Minutes URL
        // Example: https://vc.larksuite.com/minutes/obc1234567890
        $minuteToken = null;
        if (preg_match('/minutes\/([a-zA-Z0-9]+)/', $url, $matches)) {
            $minuteToken = $matches[1];
        }

        if (!$minuteToken) {
            throw new Exception('Invalid Lark Minutes URL or token not found');
        }

        $sync = LarkSync::create([
            'tenant_id' => $this->integration->tenant_id,
            'lark_integration_id' => $this->integration->id,
            'module' => 'meeting',
            'action' => 'capture_transcript_link',
            'lark_entity_type' => 'minute',
            'lark_entity_id' => $minuteToken,
            'leadsy_entity_type' => 'lead',
            'leadsy_entity_id' => $leadsyLeadId,
            'status' => 'pending',
            'request_data' => ['url' => $url],
        ]);

        try {
            // Get transcript
            $transcript = $this->getMinuteTranscript($minuteToken);

            if (! $transcript) {
                throw new Exception('Transcript not available or API permission denied.');
            }

            $lead = Lead::findOrFail($leadsyLeadId);

            // The content might be in different structures depending on the exact Minutes API response
            $transcriptText = $transcript['content'] ?? ($transcript['transcript'] ?? json_encode($transcript));

            $lead->activities()->create([
                'activity_type' => 'meeting',
                'title' => 'Lark Meeting Transcript (Imported)',
                'description' => $transcriptText,
                'metadata' => [
                    'minute_token' => $minuteToken,
                    'source_url' => $url,
                    'transcript_full' => $transcript,
                ],
            ]);

            $sync->update([
                'response_data' => [
                    'transcript_captured' => true,
                    'transcript_length' => strlen($transcriptText),
                ],
            ]);

            $sync->markSuccessful();

            Log::info('Lark minute transcript captured from link', [
                'minute_token' => $minuteToken,
                'lead_id' => $leadsyLeadId,
                'sync_id' => $sync->id,
            ]);

            return $sync;
        } catch (Exception $e) {
            $sync->markFailed($e->getMessage());
            Log::error('Failed to capture Lark minute transcript from link', [
                'minute_token' => $minuteToken,
                'lead_id' => $leadsyLeadId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
