<?php

namespace App\Services\Lark;

use App\Models\LarkSync;
use Exception;
use Illuminate\Support\Facades\Log;

class LarkMessengerService extends LarkService
{
    /**
     * Send message card to user
     */
    public function sendMessageCard(
        string $userId,
        array $cardData,
        ?string $leadsyEntityType = null,
        ?string $leadsyEntityId = null
    ): LarkSync {
        $sync = LarkSync::create([
            'tenant_id' => $this->integration->tenant_id,
            'lark_integration_id' => $this->integration->id,
            'module' => 'messenger',
            'action' => 'send_message_card',
            'lark_entity_type' => 'message',
            'leadsy_entity_type' => $leadsyEntityType,
            'leadsy_entity_id' => $leadsyEntityId,
            'status' => 'pending',
            'request_data' => $cardData,
        ]);

        try {
            $payload = [
                'receive_id' => $userId,
                'msg_type' => 'interactive',
                'content' => json_encode($cardData),
            ];

            $response = $this->request('POST', '/im/v1/messages', $payload, [
                'receive_id_type' => 'user_id',
            ]);

            $sync->markSuccessful($response);

            Log::info('Lark message card sent', [
                'user_id' => $userId,
                'sync_id' => $sync->id,
            ]);

            return $sync;
        } catch (Exception $e) {
            $sync->markFailed($e->getMessage());
            Log::error('Failed to send Lark message card', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Send text message
     */
    public function sendTextMessage(
        string $userId,
        string $text,
        ?string $leadsyEntityType = null,
        ?string $leadsyEntityId = null
    ): LarkSync {
        $sync = LarkSync::create([
            'tenant_id' => $this->integration->tenant_id,
            'lark_integration_id' => $this->integration->id,
            'module' => 'messenger',
            'action' => 'send_text_message',
            'lark_entity_type' => 'message',
            'leadsy_entity_type' => $leadsyEntityType,
            'leadsy_entity_id' => $leadsyEntityId,
            'status' => 'pending',
            'request_data' => ['text' => $text],
        ]);

        try {
            $payload = [
                'receive_id' => $userId,
                'msg_type' => 'text',
                'content' => json_encode(['text' => $text]),
            ];

            $response = $this->request('POST', '/im/v1/messages', $payload, [
                'receive_id_type' => 'user_id',
            ]);

            $sync->markSuccessful($response);

            Log::info('Lark text message sent', [
                'user_id' => $userId,
                'sync_id' => $sync->id,
            ]);

            return $sync;
        } catch (Exception $e) {
            $sync->markFailed($e->getMessage());
            Log::error('Failed to send Lark text message', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Create notification card for lead actions
     */
    public static function createLeadNotificationCard(
        string $action,
        array $leadData,
        ?string $ownerName = null
    ): array {
        $actionText = match ($action) {
            'created' => 'New lead created',
            'updated' => 'Lead updated',
            'qualified' => 'Lead qualified',
            'follow_up' => 'Follow-up scheduled',
            default => ucfirst($action),
        };

        return [
            'type' => 'template',
            'data' => [
                'template_id' => 'leadsy_notification',
                'template_variable' => [
                    'action' => $actionText,
                    'company_name' => $leadData['company_name'] ?? 'Unknown',
                    'industry' => $leadData['industry'] ?? 'N/A',
                    'owner' => $ownerName ?? 'N/A',
                    'stage' => $leadData['funnel_stage'] ?? 'Not classified',
                    'score' => $leadData['lead_score'] ?? 0,
                ],
            ],
        ];
    }

    /**
     * Build message card for lead summary
     */
    public static function buildLeadSummaryCard(array $leadData): array
    {
        return [
            'type' => 'template',
            'data' => [
                'template_id' => 'leadsy_lead_summary',
                'template_variable' => [
                    'company_name' => $leadData['company_name'] ?? 'N/A',
                    'website' => $leadData['website'] ?? 'N/A',
                    'email' => $leadData['email'] ?? 'N/A',
                    'phone' => $leadData['phone'] ?? 'N/A',
                    'industry' => $leadData['industry'] ?? 'N/A',
                    'score' => $leadData['lead_score'] ?? 0,
                    'status' => $leadData['qualification_status'] ?? 'Pending',
                ],
            ],
        ];
    }
}
