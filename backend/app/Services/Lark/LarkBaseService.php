<?php

namespace App\Services\Lark;

use App\Models\LarkSync;
use Illuminate\Support\Facades\Log;
use Exception;

class LarkBaseService extends LarkService
{
    protected ?string $appToken = null;

    /**
     * Get Base app token for Base API calls
     */
    public function getBaseToken(): string
    {
        if (!$this->appToken) {
            $this->appToken = $this->getAccessToken(
                decrypt($this->integration->app_secret_encrypted)
            );
        }
        return $this->appToken;
    }

    /**
     * Get Base details
     */
    public function getBase(string $baseId): ?array
    {
        try {
            $response = $this->request('GET', "/bitable/v1/apps/{$baseId}");
            return $response;
        } catch (Exception $e) {
            Log::error('Failed to get Lark Base', [
                'base_id' => $baseId,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Create record in Lark Base table
     */
    public function createRecord(
        string $baseId,
        string $tableId,
        array $fields,
        string $leadsyEntityType,
        string $leadsyEntityId
    ): LarkSync {
        $sync = LarkSync::create([
            'tenant_id' => $this->integration->tenant_id,
            'lark_integration_id' => $this->integration->id,
            'module' => 'base',
            'action' => 'create_record',
            'lark_entity_type' => 'record',
            'leadsy_entity_type' => $leadsyEntityType,
            'leadsy_entity_id' => $leadsyEntityId,
            'status' => 'pending',
            'request_data' => $fields,
        ]);

        try {
            $payload = [
                'fields' => $fields,
            ];

            $response = $this->request('POST', "/bitable/v1/apps/{$baseId}/tables/{$tableId}/records", $payload);

            $sync->update([
                'lark_entity_id' => $response['record']['record_id'] ?? null,
                'response_data' => $response,
            ]);

            $sync->markSuccessful();
            
            Log::info('Lark Base record created', [
                'base_id' => $baseId,
                'table_id' => $tableId,
                'record_id' => $response['record']['record_id'] ?? null,
                'sync_id' => $sync->id,
            ]);

            return $sync;
        } catch (Exception $e) {
            $sync->markFailed($e->getMessage());
            Log::error('Failed to create Lark Base record', [
                'base_id' => $baseId,
                'table_id' => $tableId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Update record in Lark Base table
     */
    public function updateRecord(
        string $baseId,
        string $tableId,
        string $recordId,
        array $fields
    ): LarkSync {
        $sync = LarkSync::create([
            'tenant_id' => $this->integration->tenant_id,
            'lark_integration_id' => $this->integration->id,
            'module' => 'base',
            'action' => 'update_record',
            'lark_entity_type' => 'record',
            'lark_entity_id' => $recordId,
            'status' => 'pending',
            'request_data' => $fields,
        ]);

        try {
            $payload = [
                'fields' => $fields,
            ];

            $response = $this->request('PUT', "/bitable/v1/apps/{$baseId}/tables/{$tableId}/records/{$recordId}", $payload);

            $sync->markSuccessful($response);
            
            Log::info('Lark Base record updated', [
                'base_id' => $baseId,
                'table_id' => $tableId,
                'record_id' => $recordId,
                'sync_id' => $sync->id,
            ]);

            return $sync;
        } catch (Exception $e) {
            $sync->markFailed($e->getMessage());
            Log::error('Failed to update Lark Base record', [
                'base_id' => $baseId,
                'table_id' => $tableId,
                'record_id' => $recordId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Delete record in Lark Base table
     */
    public function deleteRecord(
        string $baseId,
        string $tableId,
        string $recordId
    ): LarkSync {
        $sync = LarkSync::create([
            'tenant_id' => $this->integration->tenant_id,
            'lark_integration_id' => $this->integration->id,
            'module' => 'base',
            'action' => 'delete_record',
            'lark_entity_type' => 'record',
            'lark_entity_id' => $recordId,
            'status' => 'pending',
        ]);

        try {
            $response = $this->request('DELETE', "/bitable/v1/apps/{$baseId}/tables/{$tableId}/records/{$recordId}");

            $sync->markSuccessful($response);
            
            Log::info('Lark Base record deleted', [
                'base_id' => $baseId,
                'table_id' => $tableId,
                'record_id' => $recordId,
                'sync_id' => $sync->id,
            ]);

            return $sync;
        } catch (Exception $e) {
            $sync->markFailed($e->getMessage());
            Log::error('Failed to delete Lark Base record', [
                'base_id' => $baseId,
                'table_id' => $tableId,
                'record_id' => $recordId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Get records from Lark Base table
     */
    public function getRecords(
        string $baseId,
        string $tableId,
        array $query = []
    ): ?array {
        try {
            $params = array_merge([
                'page_size' => 100,
                'page_token' => null,
            ], $query);

            $response = $this->request('GET', "/bitable/v1/apps/{$baseId}/tables/{$tableId}/records", [], $params);
            return $response;
        } catch (Exception $e) {
            Log::error('Failed to get Lark Base records', [
                'base_id' => $baseId,
                'table_id' => $tableId,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Map Leadsy lead to Lark Base record fields
     */
    public static function mapLeadToBaseFields(array $leadData): array
    {
        return [
            'Company Name' => $leadData['company_name'] ?? '',
            'Website' => $leadData['website'] ?? '',
            'Email' => $leadData['email'] ?? '',
            'Phone' => $leadData['phone'] ?? '',
            'Industry' => $leadData['industry'] ?? '',
            'Address' => $leadData['address'] ?? '',
            'Lead Score' => $leadData['lead_score'] ?? 0,
            'Funnel Stage' => $leadData['funnel_stage'] ?? 'Not Classified',
            'Status' => $leadData['qualification_status'] ?? 'Pending',
            'Owner' => $leadData['owner_name'] ?? '',
        ];
    }
}
