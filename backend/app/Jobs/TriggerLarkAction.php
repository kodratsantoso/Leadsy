<?php

namespace App\Jobs;

use App\Models\LarkIntegration;
use App\Models\LarkBaseTable;
use App\Models\Lead;
use App\Services\Lark\LarkMessengerService;
use App\Services\Lark\LarkTaskService;
use App\Services\Lark\LarkCalendarService;
use App\Services\Lark\LarkBaseService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Exception;

class TriggerLarkAction implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected int $tenantId;
    protected string $action;
    protected array $data;
    protected ?string $userId;
    protected ?string $leadId;

    public function __construct(
        int $tenantId,
        string $action,
        array $data,
        ?string $userId = null,
        ?string $leadId = null
    ) {
        $this->tenantId = $tenantId;
        $this->action = $action;
        $this->data = $data;
        $this->userId = $userId;
        $this->leadId = $leadId;
    }

    public function handle(): void
    {
        try {
            $integration = LarkIntegration::where('tenant_id', $this->tenantId)
                ->where('is_active', true)
                ->firstOrFail();

            Log::info('Triggering Lark action', [
                'action' => $this->action,
                'integration_id' => $integration->id,
            ]);

            match ($this->action) {
                'send_lead_notification' => $this->sendLeadNotification($integration),
                'create_follow_up_task' => $this->createFollowUpTask($integration),
                'create_follow_up_event' => $this->createFollowUpEvent($integration),
                'sync_lead_to_base' => $this->syncLeadToBase($integration),
                default => Log::warning('Unknown Lark action: ' . $this->action),
            };
        } catch (Exception $e) {
            Log::error('Failed to trigger Lark action', [
                'action' => $this->action,
                'error' => $e->getMessage(),
                'attempts' => $this->attempts(),
            ]);

            if ($this->attempts() < 3) {
                $this->release(300); // Retry after 5 minutes
            }

            throw $e;
        }
    }

    protected function sendLeadNotification(LarkIntegration $integration): void
    {
        if (!$integration->isModuleEnabled('messenger') || !$this->userId) {
            return;
        }

        try {
            $messengerService = new LarkMessengerService($integration);
            $leadData = $this->data['lead'] ?? [];
            $actionType = $this->data['action'] ?? 'updated';

            $cardData = LarkMessengerService::createLeadNotificationCard(
                $actionType,
                $leadData,
                $this->data['owner_name'] ?? null
            );

            $messengerService->sendMessageCard(
                $this->userId,
                $cardData,
                'lead',
                $this->leadId
            );

            Log::info('Lark notification sent', [
                'user_id' => $this->userId,
                'lead_id' => $this->leadId,
            ]);
        } catch (Exception $e) {
            Log::error('Failed to send Lark notification', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    protected function createFollowUpTask(LarkIntegration $integration): void
    {
        if (!$integration->isModuleEnabled('task') || !$this->leadId) {
            return;
        }

        try {
            $lead = Lead::findOrFail($this->leadId);
            $taskService = new LarkTaskService($integration);

            $taskData = LarkTaskService::buildFollowUpTask(
                [
                    'company_name' => $lead->company_name,
                    'industry' => $lead->industry?->name,
                    'email' => $lead->email,
                    'phone' => $lead->phone,
                ],
                $this->data['follow_up'] ?? []
            );

            $taskService->createTask($taskData, 'lead', $this->leadId);

            Log::info('Lark follow-up task created', [
                'lead_id' => $this->leadId,
            ]);
        } catch (Exception $e) {
            Log::error('Failed to create Lark follow-up task', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    protected function createFollowUpEvent(LarkIntegration $integration): void
    {
        if (!$integration->isModuleEnabled('calendar') || !$this->leadId) {
            return;
        }

        try {
            $lead = Lead::findOrFail($this->leadId);
            $calendarService = new LarkCalendarService($integration);

            $eventData = LarkCalendarService::buildFollowUpEvent(
                [
                    'company_name' => $lead->company_name,
                    'industry' => $lead->industry?->name,
                    'email' => $lead->email,
                    'phone' => $lead->phone,
                    'address' => $lead->address,
                ],
                $this->data['follow_up'] ?? []
            );

            $calendarService->createCalendarEvent($eventData, 'lead', $this->leadId);

            Log::info('Lark follow-up calendar event created', [
                'lead_id' => $this->leadId,
            ]);
        } catch (Exception $e) {
            Log::error('Failed to create Lark follow-up event', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    protected function syncLeadToBase(LarkIntegration $integration): void
    {
        if (!$integration->isModuleEnabled('base') || !$this->leadId) {
            return;
        }

        try {
            $lead = Lead::with(['industry', 'funnelStage', 'owner'])->findOrFail($this->leadId);
            $baseService = new LarkBaseService($integration);

            LarkBaseTable::where('tenant_id', $integration->tenant_id)
                ->where('lark_integration_id', $integration->id)
                ->where('leadsy_entity_type', 'lead')
                ->where('is_active', true)
                ->get()
                ->each(fn (LarkBaseTable $baseTable) => $baseService->upsertLead($lead, $baseTable));

            Log::info('Lark Base sync completed', [
                'lead_id' => $this->leadId,
            ]);
        } catch (Exception $e) {
            Log::error('Failed to sync lead to Lark Base', [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
