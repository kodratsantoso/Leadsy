<?php

namespace App\Services\Lark;

use App\Models\LarkSync;
use Illuminate\Support\Facades\Log;
use Exception;

class LarkCalendarService extends LarkService
{
    /**
     * Create calendar event
     */
    public function createCalendarEvent(
        array $eventData,
        string $leadsyEntityType,
        string $leadsyEntityId
    ): LarkSync {
        $sync = LarkSync::create([
            'tenant_id' => $this->integration->tenant_id,
            'lark_integration_id' => $this->integration->id,
            'module' => 'calendar',
            'action' => 'create_event',
            'lark_entity_type' => 'calendar_event',
            'leadsy_entity_type' => $leadsyEntityType,
            'leadsy_entity_id' => $leadsyEntityId,
            'status' => 'pending',
            'request_data' => $eventData,
        ]);

        try {
            $payload = [
                'summary' => $eventData['title'] ?? 'Leadsy Event',
                'description' => $eventData['description'] ?? '',
                'start_time' => $eventData['start_time'],
                'end_time' => $eventData['end_time'],
                'attendee_ability' => 'can_invite_self',
            ];

            if (isset($eventData['location'])) {
                $payload['location'] = $eventData['location'];
            }

            if (isset($eventData['attendees']) && is_array($eventData['attendees'])) {
                $payload['attendees'] = array_map(function ($attendee) {
                    return [
                        'attendee_id' => $attendee['id'] ?? $attendee,
                    ];
                }, $eventData['attendees']);
            }

            $response = $this->request('POST', '/calendar/v4/events', $payload);

            $sync->update([
                'lark_entity_id' => $response['event']['event_id'] ?? null,
                'response_data' => $response,
            ]);

            $sync->markSuccessful();
            
            Log::info('Lark calendar event created', [
                'event_id' => $response['event']['event_id'] ?? null,
                'sync_id' => $sync->id,
            ]);

            return $sync;
        } catch (Exception $e) {
            $sync->markFailed($e->getMessage());
            Log::error('Failed to create Lark calendar event', [
                'error' => $e->getMessage(),
                'event_data' => $eventData,
            ]);
            throw $e;
        }
    }

    /**
     * Update calendar event
     */
    public function updateCalendarEvent(
        string $larkEventId,
        array $updates
    ): LarkSync {
        $sync = LarkSync::create([
            'tenant_id' => $this->integration->tenant_id,
            'lark_integration_id' => $this->integration->id,
            'module' => 'calendar',
            'action' => 'update_event',
            'lark_entity_type' => 'calendar_event',
            'lark_entity_id' => $larkEventId,
            'status' => 'pending',
            'request_data' => $updates,
        ]);

        try {
            $payload = [];
            
            if (isset($updates['title'])) {
                $payload['summary'] = $updates['title'];
            }
            
            if (isset($updates['description'])) {
                $payload['description'] = $updates['description'];
            }
            
            if (isset($updates['start_time'])) {
                $payload['start_time'] = $updates['start_time'];
            }
            
            if (isset($updates['end_time'])) {
                $payload['end_time'] = $updates['end_time'];
            }

            $response = $this->request('PUT', "/calendar/v4/events/{$larkEventId}", $payload);

            $sync->markSuccessful($response);
            
            Log::info('Lark calendar event updated', [
                'event_id' => $larkEventId,
                'sync_id' => $sync->id,
            ]);

            return $sync;
        } catch (Exception $e) {
            $sync->markFailed($e->getMessage());
            Log::error('Failed to update Lark calendar event', [
                'event_id' => $larkEventId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Delete calendar event
     */
    public function deleteCalendarEvent(string $larkEventId): LarkSync
    {
        $sync = LarkSync::create([
            'tenant_id' => $this->integration->tenant_id,
            'lark_integration_id' => $this->integration->id,
            'module' => 'calendar',
            'action' => 'delete_event',
            'lark_entity_type' => 'calendar_event',
            'lark_entity_id' => $larkEventId,
            'status' => 'pending',
        ]);

        try {
            $response = $this->request('DELETE', "/calendar/v4/events/{$larkEventId}");

            $sync->markSuccessful($response);
            
            Log::info('Lark calendar event deleted', [
                'event_id' => $larkEventId,
                'sync_id' => $sync->id,
            ]);

            return $sync;
        } catch (Exception $e) {
            $sync->markFailed($e->getMessage());
            Log::error('Failed to delete Lark calendar event', [
                'event_id' => $larkEventId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Build follow-up calendar event
     */
    public static function buildFollowUpEvent(array $leadData, array $followUpData): array
    {
        $dueDate = $followUpData['due_date'] ?? now()->addDays(1);
        $startTime = strtotime($dueDate) * 1000;
        $endTime = ($startTime + 3600000); // 1 hour meeting

        return [
            'title' => "Follow-up Meeting: {$leadData['company_name']}",
            'description' => sprintf(
                "Follow-up for lead: %s\n" .
                "Industry: %s\n" .
                "Email: %s\n" .
                "Phone: %s",
                $leadData['company_name'] ?? 'N/A',
                $leadData['industry'] ?? 'N/A',
                $leadData['email'] ?? 'N/A',
                $leadData['phone'] ?? 'N/A'
            ),
            'start_time' => $startTime,
            'end_time' => $endTime,
            'location' => $leadData['address'] ?? 'Virtual',
        ];
    }
}
