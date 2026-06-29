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
        'contact_name' => 'Contact Name',
        'contact_phone' => 'Contact Phone Number',
        'meeting_link' => 'Meeting Link',
        'budget' => 'Budget',
        'authority' => 'Authority',
        'needs' => 'Needs',
        'timeline' => 'Timeline',
        'competitor' => 'Competitor',
        'meeting_summary_attachment' => 'Meeting Summary Attachment',
        'eligibility_status' => 'Eligibility Status',
        'confidentiality_score' => 'Confidentiality Score',
        'eligibility_reason' => 'Eligibility Reason',
        'presales_analysis' => 'Presales Analysis',
        'presales_recommendation' => 'Presales Recommendation',
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

    /**
     * Search records from Lark Base table
     */
    public function searchRecords(
        string $baseId,
        string $tableId,
        array $payload = [],
        array $query = []
    ): ?array {
        try {
            $params = array_merge([
                'page_size' => 100,
                'page_token' => null,
            ], $query);

            $response = $this->request('POST', "/bitable/v1/apps/{$baseId}/tables/{$tableId}/records/search", $payload, $params);

            return $response;
        } catch (Exception $e) {
            Log::error('Failed to search Lark Base records', [
                'base_id' => $baseId,
                'table_id' => $tableId,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Batch create records in Lark Base table
     * $records array format: [['fields' => [...]], ['fields' => [...]]]
     */
    public function batchCreateRecords(
        string $baseId,
        string $tableId,
        array $records
    ): array {
        try {
            $payload = ['records' => $records];
            $response = $this->request('POST', "/bitable/v1/apps/{$baseId}/tables/{$tableId}/records/batch_create", $payload);
            return $response;
        } catch (Exception $e) {
            Log::error('Failed to batch create Lark Base records', [
                'base_id' => $baseId,
                'table_id' => $tableId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Batch update records in Lark Base table
     * $records array format: [['record_id' => '...', 'fields' => [...]], ...]
     */
    public function batchUpdateRecords(
        string $baseId,
        string $tableId,
        array $records
    ): array {
        try {
            $payload = ['records' => $records];
            $response = $this->request('POST', "/bitable/v1/apps/{$baseId}/tables/{$tableId}/records/batch_update", $payload);
            return $response;
        } catch (Exception $e) {
            Log::error('Failed to batch update Lark Base records', [
                'base_id' => $baseId,
                'table_id' => $tableId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
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

        try {
            $lead->loadMissing(['industry', 'funnelStage', 'owner', 'contacts', 'activities', 'aiEvaluations', 'confidentialityAssessment']);

            $fields = self::mapLeadToBaseFields(
                $lead,
                $baseTable->field_mapping ?: self::DEFAULT_LEAD_FIELD_MAPPING,
                $fieldDefinitions
            );
            $mapping = LarkBaseRecordMapping::where('lark_base_table_id', $baseTable->id)
                ->where('leadsy_entity_type', 'lead')
                ->where('leadsy_entity_id', (string) $lead->id)
                ->first();
                
            $recordId = $mapping ? $mapping->lark_record_id : $lead->external_id;

            if ($recordId) {
                $this->updateRecord($baseTable->app_token, $baseTable->table_id, $recordId, $fields);
                $action = 'updated';

                if (!$mapping) {
                    $mapping = LarkBaseRecordMapping::create([
                        'tenant_id' => $baseTable->tenant_id,
                        'lark_base_table_id' => $baseTable->id,
                        'leadsy_entity_type' => 'lead',
                        'leadsy_entity_id' => (string) $lead->id,
                        'lark_record_id' => $recordId,
                    ]);
                }
            } else {
                $sync = $this->createRecord($baseTable->app_token, $baseTable->table_id, $fields, 'lead', (string) $lead->id);
                $action = 'added';

                $mapping = LarkBaseRecordMapping::create([
                    'tenant_id' => $baseTable->tenant_id,
                    'lark_base_table_id' => $baseTable->id,
                    'leadsy_entity_type' => 'lead',
                    'leadsy_entity_id' => (string) $lead->id,
                    'lark_record_id' => $sync->lark_entity_id,
                ]);
                
                Lead::withoutEvents(function() use ($lead, $sync) {
                    $lead->update(['external_id' => $sync->lark_entity_id]);
                });
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
        } catch (\Exception $e) {
            Log::error('Failed to push lead to Lark', [
                'lead_id' => $lead->id,
                'error' => $e->getMessage()
            ]);
            return [
                'action' => 'failed',
                'mapping' => null,
                'record_id' => null,
                'reason' => 'Push failed: ' . $e->getMessage(),
            ];
        }
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

        try {
            $record ??= $this->getRecord($baseTable->app_token, $baseTable->table_id, $recordId);
            $fields = $record['fields'] ?? [];
            $fields['Record ID'] = $record['record_id'] ?? $recordId;
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

            if (! $lead && !empty($attributes['leadsy_id'])) {
                $lead = Lead::where('tenant_id', $baseTable->tenant_id)->find($attributes['leadsy_id']);
            }
            
            if (! $lead && !empty($attributes['external_id'])) {
                $lead = Lead::where('tenant_id', $baseTable->tenant_id)
                    ->where('external_id', $attributes['external_id'])
                    ->first();
            }

            if (! $lead) {
                $lead = Lead::where('tenant_id', $baseTable->tenant_id)
                    ->where('external_id', $recordId)
                    ->first();
            }

            if (! $lead && !empty($attributes['company_name'])) {
                $nameLower = mb_strtolower(trim($attributes['company_name']));
                $lead = Lead::where('tenant_id', $baseTable->tenant_id)
                    ->whereRaw('LOWER(TRIM(company_name)) = ?', [$nameLower])
                    ->first();
            }
            
            $action = $lead ? 'updated' : 'added';

            $contactName = $attributes['contact_name'] ?? null;
            $contactPhone = $attributes['contact_phone'] ?? null;

            unset($attributes['leadsy_id'], $attributes['funnel_stage'], $attributes['owner'], $attributes['contact_name'], $attributes['contact_phone']);

            if ($lead) {
                // Check if this lead is already mapped to a DIFFERENT Lark record in this table.
                $existingMapping = LarkBaseRecordMapping::where('lark_base_table_id', $baseTable->id)
                    ->where('leadsy_entity_type', 'lead')
                    ->where('leadsy_entity_id', (string) $lead->id)
                    ->first();

                if ($existingMapping && $existingMapping->lark_record_id !== $recordId) {
                    return [
                        'action' => 'failed',
                        'lead' => $lead,
                        'lead_id' => $lead->id,
                        'reason' => "Duplicate mapping: Duplicate Lead detected. This Leadsy Lead (ID: {$lead->id}) is already linked to another Lark Record ({$existingMapping->lark_record_id}). Resolve the duplicate in Lark Base.",
                    ];
                }

                $attributes['external_id'] = $recordId;
                $attributes['lark_base_id'] = $baseTable->app_token;
                $attributes['lark_table_id'] = $baseTable->table_id;
                Lead::withoutEvents(fn () => $lead->update($attributes));

                $sourceType = \App\Models\LeadSourceType::firstOrCreate(
                    ['slug' => 'lark'],
                    [
                        'name' => 'Lark',
                        'description' => 'Lark Base sync',
                        'sort_order' => 50,
                        'is_active' => true,
                    ]
                );

                $channelSlug = \Illuminate\Support\Str::slug($baseTable->table_name);
                if (empty($channelSlug)) {
                    $channelSlug = 'lark-table-' . strtolower($baseTable->table_id);
                }
                
                $channelType = \App\Models\LeadChannelType::firstOrCreate(
                    ['slug' => $channelSlug, 'lead_source_type_id' => $sourceType->id],
                    [
                        'name' => $baseTable->table_name,
                        'description' => 'Synced from Lark Base',
                        'sort_order' => 10,
                        'is_active' => true,
                    ]
                );

                \App\Models\LeadSource::updateOrCreate([
                    'lead_id' => $lead->id,
                    'source_type' => 'lark_base',
                    'lark_app_token' => $baseTable->app_token,
                    'lark_table_id' => $baseTable->table_id,
                ], [
                    'channel_type_id' => $channelType->id,
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

                $sourceType = \App\Models\LeadSourceType::firstOrCreate(
                    ['slug' => 'lark'],
                    [
                        'name' => 'Lark',
                        'description' => 'Lark Base sync',
                        'sort_order' => 50,
                        'is_active' => true,
                    ]
                );

                $channelSlug = \Illuminate\Support\Str::slug($baseTable->table_name);
                if (empty($channelSlug)) {
                    $channelSlug = 'lark-table-' . strtolower($baseTable->table_id);
                }
                
                $channelType = \App\Models\LeadChannelType::firstOrCreate(
                    ['slug' => $channelSlug, 'lead_source_type_id' => $sourceType->id],
                    [
                        'name' => $baseTable->table_name,
                        'description' => 'Synced from Lark Base',
                        'sort_order' => 10,
                        'is_active' => true,
                    ]
                );

                \App\Models\LeadSource::create([
                    'lead_id' => $lead->id,
                    'source_type' => 'lark_base',
                    'lark_app_token' => $baseTable->app_token,
                    'lark_table_id' => $baseTable->table_id,
                    'channel_type_id' => $channelType->id,
                    'confidence' => 'high',
                    'last_verified_at' => now(),
                ]);
            }

            if ($contactName || $contactPhone) {
                $contactAttributes = [];
                if ($contactPhone) {
                    $contactPhone = substr(trim($contactPhone), 0, 30);
                    $contactAttributes['phone'] = $contactPhone;
                }
                if ($contactName) {
                    $contactName = substr(trim($contactName), 0, 255);
                    $lead->contacts()->updateOrCreate(
                        ['name' => $contactName],
                        $contactAttributes
                    );
                } elseif ($contactPhone) {
                    $lead->contacts()->updateOrCreate(
                        ['phone' => $contactPhone],
                        $contactAttributes
                    );
                }
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

            $mapping = $baseTable->field_mapping ?: self::DEFAULT_LEAD_FIELD_MAPPING;
            if (!empty($mapping['leadsy_id'])) {
                try {
                    $this->updateRecord($baseTable->app_token, $baseTable->table_id, $recordId, [
                        $mapping['leadsy_id'] => (string) $lead->id,
                    ]);
                } catch (\Exception $e) {
                    Log::warning('Failed to push leadsy_id feedback to Lark Base', [
                        'record_id' => $recordId,
                        'lead_id' => $lead->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            return [
                'action' => $action,
                'lead' => $lead,
                'lead_id' => $lead->id,
                'reason' => null,
            ];
        } catch (\Exception $e) {
            Log::error('Failed to pull Lark record to lead', [
                'record_id' => $recordId,
                'error' => $e->getMessage()
            ]);

            // Attempt to provide a cleaner message for common database constraints
            $reason = $e->getMessage();
            if (str_contains($reason, 'duplicate key value violates unique constraint')) {
                $reason = "Database duplicate constraint violated: " . preg_replace('/.*DETAIL:\s*/', '', $reason);
            }

            return [
                'action' => 'failed',
                'lead' => null,
                'lead_id' => null,
                'reason' => 'Pull failed: ' . $reason,
            ];
        }
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
        $latestAiEvaluation = $lead->aiEvaluations->first();

        $values = [
            'leadsy_id' => (string) $lead->id,
            'external_id' => $lead->external_id,
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
            'contact_name' => $lead->contacts?->first()?->name,
            'contact_phone' => $lead->contacts?->first()?->phone,
            'meeting_link' => $lead->meeting_link,
            'budget' => $lead->activities->whereNotNull('budget')->sortByDesc('created_at')->first()?->budget,
            'authority' => $lead->activities->whereNotNull('authority')->sortByDesc('created_at')->first()?->authority,
            'needs' => $lead->activities->whereNotNull('needs')->sortByDesc('created_at')->first()?->needs,
            'timeline' => $lead->activities->whereNotNull('timeline')->sortByDesc('created_at')->first()?->timeline,
            'competitor' => $lead->activities->whereNotNull('competitor')->sortByDesc('created_at')->first()?->competitor,
            'meeting_summary_attachment' => config('app.url') . "/api/leads/{$lead->id}/meeting-summary/pdf",
            'eligibility_status' => $lead->qualification_status,
            'confidentiality_score' => $lead->confidentialityAssessment?->score,
            'eligibility_reason' => $latestAiEvaluation?->eligibility_reason,
            'presales_analysis' => $latestAiEvaluation?->presales_analysis,
            'presales_recommendation' => $latestAiEvaluation?->presales_recommendation,
        ];

        return collect($fieldMapping)
            ->filter(fn ($larkField) => !empty($larkField) && strcasecmp($larkField, 'Record ID') !== 0)
            ->mapWithKeys(fn ($larkField, $leadsyField) => [$larkField => $values[$leadsyField] ?? null])
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
                'contact_name',
                'contact_phone',
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
