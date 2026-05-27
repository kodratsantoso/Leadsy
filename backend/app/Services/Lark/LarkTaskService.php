<?php

namespace App\Services\Lark;

use App\Models\LarkSync;
use Exception;
use Illuminate\Support\Facades\Log;

class LarkTaskService extends LarkService
{
    /**
     * Create a task in Lark
     */
    public function createTask(
        array $taskData,
        string $leadsyEntityType,
        string $leadsyEntityId
    ): LarkSync {
        $sync = LarkSync::create([
            'tenant_id' => $this->integration->tenant_id,
            'lark_integration_id' => $this->integration->id,
            'module' => 'task',
            'action' => 'create_task',
            'lark_entity_type' => 'task',
            'leadsy_entity_type' => $leadsyEntityType,
            'leadsy_entity_id' => $leadsyEntityId,
            'status' => 'pending',
            'request_data' => $taskData,
        ]);

        try {
            $payload = [
                'summary' => $taskData['summary'] ?? 'Leadsy Task',
                'description' => $taskData['description'] ?? '',
                'due' => [
                    'time' => $taskData['due_date'] ?? now()->addDays(7)->timestamp * 1000,
                ],
                'custom_fields' => [
                    [
                        'guid' => 'leadsy_entity_id',
                        'value' => $leadsyEntityId,
                    ],
                ],
            ];

            if (isset($taskData['assignee_id'])) {
                $payload['assignees'] = [
                    [
                        'id' => $taskData['assignee_id'],
                        'type' => 'user',
                    ],
                ];
            }

            $response = $this->request('POST', '/task/v2/tasks', $payload);

            $sync->update([
                'lark_entity_id' => $response['task']['id'] ?? null,
                'response_data' => $response,
            ]);

            $sync->markSuccessful();

            Log::info('Lark task created', [
                'task_id' => $response['task']['id'] ?? null,
                'sync_id' => $sync->id,
            ]);

            return $sync;
        } catch (Exception $e) {
            $sync->markFailed($e->getMessage());
            Log::error('Failed to create Lark task', [
                'error' => $e->getMessage(),
                'task_data' => $taskData,
            ]);
            throw $e;
        }
    }

    /**
     * Update a task in Lark
     */
    public function updateTask(
        string $larkTaskId,
        array $updates
    ): LarkSync {
        $sync = LarkSync::create([
            'tenant_id' => $this->integration->tenant_id,
            'lark_integration_id' => $this->integration->id,
            'module' => 'task',
            'action' => 'update_task',
            'lark_entity_type' => 'task',
            'lark_entity_id' => $larkTaskId,
            'status' => 'pending',
            'request_data' => $updates,
        ]);

        try {
            $payload = [];

            if (isset($updates['summary'])) {
                $payload['summary'] = $updates['summary'];
            }

            if (isset($updates['description'])) {
                $payload['description'] = $updates['description'];
            }

            if (isset($updates['status'])) {
                $payload['status'] = $updates['status']; // 'open', 'in_progress', 'done', 'closed'
            }

            $response = $this->request('PATCH', "/task/v2/tasks/{$larkTaskId}", $payload);

            $sync->markSuccessful($response);

            Log::info('Lark task updated', [
                'task_id' => $larkTaskId,
                'sync_id' => $sync->id,
            ]);

            return $sync;
        } catch (Exception $e) {
            $sync->markFailed($e->getMessage());
            Log::error('Failed to update Lark task', [
                'task_id' => $larkTaskId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Complete a task in Lark
     */
    public function completeTask(string $larkTaskId): LarkSync
    {
        return $this->updateTask($larkTaskId, ['status' => 'done']);
    }

    /**
     * Delete a task in Lark
     */
    public function deleteTask(string $larkTaskId): LarkSync
    {
        $sync = LarkSync::create([
            'tenant_id' => $this->integration->tenant_id,
            'lark_integration_id' => $this->integration->id,
            'module' => 'task',
            'action' => 'delete_task',
            'lark_entity_type' => 'task',
            'lark_entity_id' => $larkTaskId,
            'status' => 'pending',
        ]);

        try {
            $response = $this->request('DELETE', "/task/v2/tasks/{$larkTaskId}");

            $sync->markSuccessful($response);

            Log::info('Lark task deleted', [
                'task_id' => $larkTaskId,
                'sync_id' => $sync->id,
            ]);

            return $sync;
        } catch (Exception $e) {
            $sync->markFailed($e->getMessage());
            Log::error('Failed to delete Lark task', [
                'task_id' => $larkTaskId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Create task for lead follow-up
     */
    public static function buildFollowUpTask(array $leadData, array $followUpData): array
    {
        return [
            'summary' => "Follow-up: {$leadData['company_name']}",
            'description' => sprintf(
                "Follow-up for lead: %s\n".
                "Industry: %s\n".
                "Email: %s\n".
                "Phone: %s\n".
                'Notes: %s',
                $leadData['company_name'] ?? 'N/A',
                $leadData['industry'] ?? 'N/A',
                $leadData['email'] ?? 'N/A',
                $leadData['phone'] ?? 'N/A',
                $followUpData['notes'] ?? ''
            ),
            'due_date' => $followUpData['due_date'] ?? now()->addDays(1)->timestamp * 1000,
            'assignee_id' => $followUpData['assignee_id'] ?? null,
        ];
    }
}
