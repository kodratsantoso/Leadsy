<?php

namespace App\Jobs;

use App\Models\LarkEvent;
use App\Models\LarkIntegration;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Exception;

class ProcessLarkWebhookEvent implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected LarkEvent $event;

    public function __construct(LarkEvent $event)
    {
        $this->event = $event;
    }

    public function handle(): void
    {
        try {
            $eventType = $this->event->event_type;
            $eventData = $this->event->event_data ?? [];

            Log::info('Processing Lark webhook event', [
                'event_id' => $this->event->id,
                'event_type' => $eventType,
            ]);

            match ($eventType) {
                'message.message_receive' => $this->handleMessageReceived($eventData),
                'meeting.meeting_ended' => $this->handleMeetingEnded($eventData),
                'contact.user_updated' => $this->handleUserUpdated($eventData),
                'bitable.record_created' => $this->handleRecordCreated($eventData),
                'bitable.record_updated' => $this->handleRecordUpdated($eventData),
                'bitable.record_deleted' => $this->handleRecordDeleted($eventData),
                default => Log::info('Unknown Lark event type: ' . $eventType),
            };

            $this->event->markProcessed();
        } catch (Exception $e) {
            $this->event->markFailed($e->getMessage());

            if ($this->attempts() < 3) {
                $this->release(300); // Retry after 5 minutes
            }

            Log::error('Failed to process Lark webhook event', [
                'event_id' => $this->event->id,
                'error' => $e->getMessage(),
                'attempts' => $this->attempts(),
            ]);

            throw $e;
        }
    }

    protected function handleMessageReceived(array $data): void
    {
        // Handle incoming messages from Lark
        Log::info('Message received from Lark', [
            'sender_id' => $data['sender_id'] ?? null,
            'message_id' => $data['message_id'] ?? null,
        ]);
    }

    protected function handleMeetingEnded(array $data): void
    {
        // Handle meeting ended event - capture transcript
        Log::info('Meeting ended in Lark', [
            'meeting_id' => $data['meeting_id'] ?? null,
        ]);

        // Could dispatch a job to capture meeting transcript
    }

    protected function handleUserUpdated(array $data): void
    {
        // Handle user updates from Lark - sync department/manager changes
        Log::info('User updated in Lark', [
            'user_id' => $data['user_id'] ?? null,
            'department_id' => $data['department_id'] ?? null,
        ]);
    }

    protected function handleRecordCreated(array $data): void
    {
        // Handle Lark Base record creation - sync back to Leadsy
        Log::info('Record created in Lark Base', [
            'record_id' => $data['record_id'] ?? null,
            'base_id' => $data['base_id'] ?? null,
        ]);
    }

    protected function handleRecordUpdated(array $data): void
    {
        // Handle Lark Base record updates - sync back to Leadsy
        Log::info('Record updated in Lark Base', [
            'record_id' => $data['record_id'] ?? null,
            'base_id' => $data['base_id'] ?? null,
        ]);
    }

    protected function handleRecordDeleted(array $data): void
    {
        // Handle Lark Base record deletion
        Log::info('Record deleted in Lark Base', [
            'record_id' => $data['record_id'] ?? null,
            'base_id' => $data['base_id'] ?? null,
        ]);
    }
}
