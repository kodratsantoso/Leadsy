<?php

namespace App\Services\Lark;

use App\Models\LarkBaseRecordMapping;
use App\Models\LarkBaseTable;
use App\Models\LarkSync;
use App\Models\Lead;
use Exception;
use Illuminate\Support\Facades\Log;

class LarkBaseService extends LarkService
{
    public const DEFAULT_LEAD_FIELD_MAPPING = [
        'leadsy_id' => 'Leadsy ID',
        'external_id' => 'External ID',
        'company_name' => 'Company Name',
        'website' => 'Website',
        'email' => 'Email',
        'phone' => 'Phone',
        'address' => 'Address',
        'business_category' => 'Business Category',
        'lead_score' => 'Lead Score',
        'qualification_status' => 'Status',
        'funnel_stage' => 'Funnel Stage',
        'owner' => 'Owner',
        'external_place_id' => 'External Place ID',
    ];

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

    public function listTables(string $appToken, array $query = []): array
    {
        return $this->request('GET', "/bitable/v1/apps/{$appToken}/tables", [], array_merge([
            'page_size' => 100,
        ], $query));
    }

    public function listFields(string $appToken, string $tableId, array $query = []): array
    {
        return $this->request('GET', "/bitable/v1/apps/{$appToken}/tables/{$tableId}/fields", [], array_merge([
            'page_size' => 100,
        ], $query));
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

            $sync->markSuccessful($response);

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

    public function upsertLead(Lead $lead, LarkBaseTable $baseTable): ?LarkBaseRecordMapping
    {
        return $this->upsertLeadWithResult($lead, $baseTable)['mapping'];
    }

    public function upsertLeadWithResult(Lead $lead, LarkBaseTable $baseTable, array $fieldDefinitions = []): array
    {
        if (! $baseTable->allowsPush()) {
            return [
                'action' => 'skipped',
                'mapping' => null,
                'record_id' => null,
                'reason' => 'Push is not allowed for this mapping direction.',
            ];
        }

        $lead->loadMissing(['industry', 'funnelStage', 'owner']);

        $fields = self::mapLeadToBaseFields(
            $lead,
            $baseTable->field_mapping ?: self::DEFAULT_LEAD_FIELD_MAPPING,
            $fieldDefinitions
        );
        $mapping = LarkBaseRecordMapping::where('lark_base_table_id', $baseTable->id)
            ->where('leadsy_entity_type', 'lead')
            ->where('leadsy_entity_id', (string) $lead->id)
            ->first();
        $action = $mapping ? 'updated' : 'added';

        if ($mapping) {
            $this->updateRecord($baseTable->app_token, $baseTable->table_id, $mapping->lark_record_id, $fields);
        } else {
            $sync = $this->createRecord($baseTable->app_token, $baseTable->table_id, $fields, 'lead', (string) $lead->id);

            $mapping = LarkBaseRecordMapping::create([
                'tenant_id' => $baseTable->tenant_id,
                'lark_base_table_id' => $baseTable->id,
                'leadsy_entity_type' => 'lead',
                'leadsy_entity_id' => (string) $lead->id,
                'lark_record_id' => $sync->lark_entity_id,
            ]);
        }

        $mapping->update([
            'last_leadsy_updated_at' => now(),
            'last_sync_source' => 'leadsy',
        ]);

        $baseTable->update(['last_push_at' => now()]);

        return [
            'action' => $action,
            'mapping' => $mapping,
            'record_id' => $mapping->lark_record_id,
            'reason' => null,
        ];
    }

    public function syncRecordToLead(LarkBaseTable $baseTable, string $recordId, ?array $record = null): ?Lead
    {
        return $this->syncRecordToLeadWithResult($baseTable, $recordId, $record)['lead'];
    }

    public function syncRecordToLeadWithResult(LarkBaseTable $baseTable, string $recordId, ?array $record = null): array
    {
        if (! $baseTable->allowsPull()) {
            return [
                'action' => 'skipped',
                'lead' => null,
                'lead_id' => null,
                'reason' => 'Pull is not allowed for this mapping direction.',
            ];
        }

        $record ??= $this->getRecord($baseTable->app_token, $baseTable->table_id, $recordId);
        $fields = $record['fields'] ?? [];
        $attributes = self::mapBaseFieldsToLead($fields, $baseTable->field_mapping ?: self::DEFAULT_LEAD_FIELD_MAPPING);

        if (($attributes['company_name'] ?? '') === '') {
            Log::warning('Skipping Lark Base record without company name', [
                'base_table_id' => $baseTable->id,
                'record_id' => $recordId,
            ]);

            return [
                'action' => 'skipped',
                'lead' => null,
                'lead_id' => null,
                'reason' => 'Lark Base record does not contain a mapped company name.',
            ];
        }

        $mapping = LarkBaseRecordMapping::where('lark_base_table_id', $baseTable->id)
            ->where('lark_record_id', $recordId)
            ->first();

        $lead = $mapping
            ? Lead::where('tenant_id', $baseTable->tenant_id)->find($mapping->leadsy_entity_id)
            : null;

        if (! $lead && isset($attributes['leadsy_id'])) {
            $lead = Lead::where('tenant_id', $baseTable->tenant_id)->find($attributes['leadsy_id']);
        }
        $action = $lead ? 'updated' : 'added';

        unset($attributes['leadsy_id'], $attributes['funnel_stage'], $attributes['owner']);

        if ($lead) {
            $attributes['external_id'] = $recordId;
            $attributes['lark_base_id'] = $baseTable->app_token;
            $attributes['lark_table_id'] = $baseTable->table_id;
            Lead::withoutEvents(fn () => $lead->update($attributes));

            \App\Models\LeadSource::firstOrCreate([
                'lead_id' => $lead->id,
                'source_type' => 'lark_base',
                'lark_app_token' => $baseTable->app_token,
                'lark_table_id' => $baseTable->table_id,
            ], [
                'confidence' => 'high',
                'last_verified_at' => now(),
            ]);
        } else {
            $lead = Lead::withoutEvents(fn () => Lead::create(array_merge($attributes, [
                'tenant_id' => $baseTable->tenant_id,
                'qualification_status' => $attributes['qualification_status'] ?? 'pending',
                'duplicate_status' => 'new',
                'ai_mode' => 'manual',
                'external_id' => $recordId,
                'lark_base_id' => $baseTable->app_token,
                'lark_table_id' => $baseTable->table_id,
            ])));

            \App\Models\LeadSource::create([
                'lead_id' => $lead->id,
                'source_type' => 'lark_base',
                'lark_app_token' => $baseTable->app_token,
                'lark_table_id' => $baseTable->table_id,
                'confidence' => 'high',
                'last_verified_at' => now(),
            ]);
        }

        LarkBaseRecordMapping::updateOrCreate(
            [
                'lark_base_table_id' => $baseTable->id,
                'lark_record_id' => $recordId,
            ],
            [
                'tenant_id' => $baseTable->tenant_id,
                'leadsy_entity_type' => 'lead',
                'leadsy_entity_id' => (string) $lead->id,
                'last_lark_updated_at' => now(),
                'last_sync_source' => 'lark',
            ]
        );

        $baseTable->update(['last_pull_at' => now()]);

        return [
            'action' => $action,
            'lead' => $lead,
            'lead_id' => $lead->id,
            'reason' => null,
        ];
    }

    public function getRecord(string $baseId, string $tableId, string $recordId): array
    {
        return $this->request('GET', "/bitable/v1/apps/{$baseId}/tables/{$tableId}/records/{$recordId}");
    }

    /**
     * Map Leadsy lead to Lark Base record fields
     */
    public static function mapLeadToBaseFields(Lead $lead, array $fieldMapping = self::DEFAULT_LEAD_FIELD_MAPPING, array $fieldDefinitions = []): array
    {
        $values = [
            'leadsy_id' => (string) $lead->id,
            'company_name' => $lead->company_name,
            'website' => $lead->website,
            'email' => $lead->email,
            'phone' => $lead->phone,
            'address' => $lead->address,
            'business_category' => $lead->business_category,
            'lead_score' => $lead->lead_score,
            'qualification_status' => $lead->qualification_status,
            'funnel_stage' => $lead->funnelStage?->name,
            'owner' => $lead->owner?->name,
            'external_place_id' => $lead->external_place_id,
        ];

        return collect($fieldMapping)
            ->mapWithKeys(fn (string $larkField, string $leadsyField): array => [$larkField => $values[$leadsyField] ?? null])
            ->map(fn ($value, string $larkField) => self::normalizeLeadValueForBaseField(
                $value,
                self::findBaseFieldDefinition($larkField, $fieldDefinitions)
            ))
            ->filter(fn ($value): bool => $value !== null)
            ->all();
    }

    private static function findBaseFieldDefinition(string $larkField, array $fieldDefinitions): ?array
    {
        if (isset($fieldDefinitions[$larkField]) && is_array($fieldDefinitions[$larkField])) {
            return $fieldDefinitions[$larkField];
        }

        foreach ($fieldDefinitions as $fieldDefinition) {
            if (($fieldDefinition['field_name'] ?? null) === $larkField) {
                return $fieldDefinition;
            }
        }

        return null;
    }

    private static function normalizeLeadValueForBaseField($value, ?array $fieldDefinition)
    {
        if ($value === null || $value === '') {
            return null;
        }

        $type = (int) ($fieldDefinition['type'] ?? 1);
        $uiType = (string) ($fieldDefinition['ui_type'] ?? '');

        if ($type === 2) {
            return is_numeric($value) ? (float) $value : null;
        }

        if ($type === 4) {
            return is_array($value) ? array_values($value) : [self::stringifyBaseScalar($value)];
        }

        if ($type === 5) {
            if (is_numeric($value)) {
                return (int) $value;
            }

            $timestamp = strtotime((string) $value);

            return $timestamp ? $timestamp * 1000 : null;
        }

        if ($type === 7) {
            return filter_var($value, FILTER_VALIDATE_BOOLEAN);
        }

        if ($type === 15 || $uiType === 'Url') {
            $url = self::stringifyBaseScalar($value);

            return [
                'link' => $url,
                'text' => $url,
            ];
        }

        return self::stringifyBaseScalar($value);
    }

    private static function stringifyBaseScalar($value): string
    {
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }

        if (is_scalar($value)) {
            return (string) $value;
        }

        return json_encode($value);
    }

    public static function mapBaseFieldsToLead(array $fields, array $fieldMapping = self::DEFAULT_LEAD_FIELD_MAPPING): array
    {
        $reverse = array_flip($fieldMapping);
        $attributes = [];

        foreach ($fields as $larkField => $value) {
            $leadsyField = $reverse[$larkField] ?? null;
            if (! $leadsyField) {
                continue;
            }

            $attributes[$leadsyField] = self::normalizeBaseValue($value);
        }

        return collect($attributes)
            ->only([
                'leadsy_id',
                'external_id',
                'company_name',
                'website',
                'email',
                'phone',
                'address',
                'business_category',
                'lead_score',
                'qualification_status',
                'external_place_id',
                'funnel_stage',
                'owner',
            ])
            ->all();
    }

    private static function normalizeBaseValue($value)
    {
        if (is_array($value)) {
            if (array_key_exists('text', $value)) {
                return $value['text'];
            }

            if (isset($value[0]['text'])) {
                return collect($value)->pluck('text')->implode(', ');
            }

            if (isset($value[0]['name'])) {
                return collect($value)->pluck('name')->implode(', ');
            }

            return json_encode($value);
        }

        return $value;
    }
}
