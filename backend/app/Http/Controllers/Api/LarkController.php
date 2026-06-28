<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessLarkWebhookEvent;
use App\Models\LarkBaseTable;
use App\Models\LarkEvent;
use App\Models\LarkIntegration;
use App\Models\LarkSync;
use App\Models\Lead;
use App\Services\Lark\LarkBaseService;
use App\Services\Lark\LarkService;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class LarkController extends Controller
{
    /**
     * Get Lark integration config
     */
    public function getConfig(Request $request)
    {
        $user = Auth::user();
        $tenantId = $user->tenant_id;

        $integration = LarkIntegration::where('tenant_id', $tenantId)->first();

        if (! $integration) {
            return response()->json([
                'configured' => false,
                'message' => 'Lark integration not configured',
            ]);
        }

        return response()->json([
            'configured' => true,
            'is_active' => $integration->is_active,
            'app_id' => $integration->app_id,
            'has_app_secret' => (bool) $integration->app_secret_encrypted,
            'has_verification_token' => (bool) $integration->verification_token_encrypted,
            'has_encrypt_key' => (bool) $integration->encrypt_key_encrypted,
            'base_url' => $integration->base_url,
            'enabled_modules' => $integration->enabled_modules ?? [],
            'last_sync_at' => $integration->last_sync_at,
        ]);
    }

    /**
     * Save Lark integration config
     */
    public function saveConfig(Request $request)
    {
        $request->validate([
            'app_id' => 'required|string',
            'app_secret' => 'nullable|string',
            'verification_token' => 'nullable|string',
            'encrypt_key' => 'nullable|string',
            'base_url' => 'nullable|url',
            'enabled_modules' => 'array',
        ]);

        $user = Auth::user();
        $tenantId = $user->tenant_id;

        $existingIntegration = LarkIntegration::where('tenant_id', $tenantId)->first();

        if (! $existingIntegration && ! $request->filled('app_secret')) {
            return response()->json([
                'success' => false,
                'message' => 'App Secret is required when creating Lark configuration.',
            ], 400);
        }

        $appSecretEncrypted = $request->filled('app_secret')
            ? encrypt($request->app_secret)
            : ($existingIntegration?->app_secret_encrypted ?? null);

        try {
            $integration = LarkIntegration::updateOrCreate(
                ['tenant_id' => $tenantId],
                [
                    'app_id' => $request->app_id,
                    'app_secret_encrypted' => $appSecretEncrypted,
                    'verification_token_encrypted' => $request->verification_token
                        ? encrypt($request->verification_token)
                        : ($existingIntegration?->verification_token_encrypted ?? null),
                    'encrypt_key_encrypted' => $request->encrypt_key
                        ? encrypt($request->encrypt_key)
                        : ($existingIntegration?->encrypt_key_encrypted ?? null),
                    'base_url' => $request->base_url,
                    'enabled_modules' => $request->enabled_modules ?? ($existingIntegration->enabled_modules ?? []),
                ]
            );

            // Test connection
            $larkService = new LarkService($integration);
            $testResult = $larkService->testConnection();

            if ($testResult['success']) {
                $integration->update(['is_active' => true]);

                return response()->json([
                    'success' => true,
                    'message' => 'Lark integration configured and verified',
                    'integration' => $integration,
                ]);
            } else {
                $error = $testResult['error'] ?? 'Unknown Lark connection error';

                return response()->json([
                    'success' => false,
                    'message' => 'Connection test failed: '.$error,
                    'error' => $error,
                ], 400);
            }
        } catch (Exception $e) {
            Log::error('Failed to save Lark config', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to save Lark integration: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Test Lark connection
     */
    public function testConnection(Request $request)
    {
        $user = Auth::user();
        $tenantId = $user->tenant_id;

        $integration = LarkIntegration::where('tenant_id', $tenantId)->first();

        if (! $integration) {
            return response()->json([
                'success' => false,
                'message' => 'Lark integration not configured',
            ], 400);
        }

        try {
            $larkService = new LarkService($integration);
            $result = $larkService->testConnection();

            return response()->json($result);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Enable/disable Lark module
     */
    public function toggleModule(Request $request)
    {
        $request->validate([
            'module' => 'required|in:messenger,meeting,calendar,task,base,sso',
            'enabled' => 'required|boolean',
        ]);

        $user = Auth::user();
        $tenantId = $user->tenant_id;

        $integration = LarkIntegration::where('tenant_id', $tenantId)->firstOrFail();

        if ($request->enabled) {
            $integration->enableModule($request->module);
        } else {
            $integration->disableModule($request->module);
        }

        Log::info('Lark module toggled', [
            'module' => $request->module,
            'enabled' => $request->enabled,
        ]);

        return response()->json([
            'success' => true,
            'message' => ucfirst($request->module).' module '.($request->enabled ? 'enabled' : 'disabled'),
            'enabled_modules' => $integration->enabled_modules,
        ]);
    }

    /**
     * Get Lark sync history
     */
    public function getSyncHistory(Request $request)
    {
        $user = Auth::user();
        $tenantId = $user->tenant_id;

        $syncs = LarkSync::where('tenant_id', $tenantId)
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json([
            'data' => $syncs,
        ]);
    }

    /**
     * Get Lark event log
     */
    public function getEventLog(Request $request)
    {
        $user = Auth::user();
        $tenantId = $user->tenant_id;

        $events = LarkEvent::where('tenant_id', $tenantId)
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json([
            'data' => $events,
        ]);
    }

    /**
     * Webhook endpoint for Lark events
     */
    public function handleWebhook(Request $request)
    {
        try {
            $payload = $request->all();

            if (isset($payload['challenge'])) {
                return response()->json(['challenge' => $payload['challenge']]);
            }

            Log::info('Received Lark webhook', [
                'payload' => $payload,
            ]);

            // Find integration by app_id
            $appId = $payload['header']['app_id'] ?? $payload['app_id'] ?? null;
            $integration = LarkIntegration::where('app_id', $appId)->firstOrFail();
            $eventPayload = $payload['event'] ?? [];
            $recordId = $eventPayload['record_id'] ?? $eventPayload['record']['record_id'] ?? null;
            $appToken = $eventPayload['app_token'] ?? $eventPayload['base_id'] ?? null;
            $tableId = $eventPayload['table_id'] ?? null;

            // Create event record
            $event = LarkEvent::create([
                'tenant_id' => $integration->tenant_id,
                'lark_integration_id' => $integration->id,
                'event_type' => $payload['header']['event_type'] ?? $payload['type'] ?? 'unknown',
                'lark_entity_type' => $eventPayload['entity_type'] ?? ($recordId ? 'bitable_record' : null),
                'lark_entity_id' => $eventPayload['entity_id'] ?? $recordId,
                'event_data' => array_merge($eventPayload, [
                    '_app_token' => $appToken,
                    '_table_id' => $tableId,
                    '_raw' => $payload,
                ]),
                'status' => 'received',
            ]);

            // Dispatch to queue for processing
            ProcessLarkWebhookEvent::dispatch($event);

            return response()->json([
                'code' => 0,
                'msg' => 'success',
            ]);
        } catch (Exception $e) {
            Log::error('Lark webhook handling failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'code' => -1,
                'msg' => 'error',
            ], 500);
        }
    }

    /**
     * Get Lark integration status
     */
    public function getStatus(Request $request)
    {
        $user = Auth::user();
        $tenantId = $user->tenant_id;

        $integration = LarkIntegration::where('tenant_id', $tenantId)->first();

        if (! $integration) {
            return response()->json([
                'configured' => false,
            ]);
        }

        return response()->json([
            'configured' => true,
            'is_active' => $integration->is_active,
            'enabled_modules' => $integration->enabled_modules ?? [],
            'last_sync_at' => $integration->last_sync_at,
            'sync_status' => $integration->sync_status,
        ]);
    }

    public function listBaseTables(Request $request)
    {
        $request->validate([
            'app_token' => 'required|string',
        ]);

        $service = new LarkBaseService($this->tenantIntegration());

        return response()->json($service->listTables($request->app_token));
    }

    public function listBaseFields(Request $request)
    {
        $request->validate([
            'app_token' => 'required|string',
            'table_id' => 'required|string',
        ]);

        $service = new LarkBaseService($this->tenantIntegration());

        return response()->json($service->listFields($request->app_token, $request->table_id));
    }

    public function previewBaseRecords(Request $request)
    {
        $request->validate([
            'app_token' => 'required|string',
            'table_id' => 'required|string',
            'page_size' => 'nullable|integer|min:1|max:500',
            'page_token' => 'nullable|string',
        ]);

        $service = new LarkBaseService($this->tenantIntegration());

        return response()->json($service->getRecords(
            $request->app_token,
            $request->table_id,
            $request->only(['page_size', 'page_token'])
        ));
    }

    public function getBaseMappings(Request $request)
    {
        $user = Auth::user();

        return response()->json([
            'data' => LarkBaseTable::where('tenant_id', $user->tenant_id)
                ->withCount('recordMappings')
                ->orderBy('created_at', 'desc')
                ->get(),
            'default_field_mapping' => LarkBaseService::DEFAULT_LEAD_FIELD_MAPPING,
        ]);
    }

    public function saveBaseMapping(Request $request)
    {
        $request->validate([
            'app_token' => 'required|string',
            'table_id' => 'required|string',
            'table_name' => 'nullable|string',
            'sync_direction' => 'required|in:leadsy_to_lark,lark_to_leadsy,two_way',
            'field_mapping' => 'nullable|array',
            'is_active' => 'boolean',
        ]);

        $integration = $this->tenantIntegration();

        $table = LarkBaseTable::updateOrCreate(
            [
                'tenant_id' => $integration->tenant_id,
                'app_token' => $request->app_token,
                'table_id' => $request->table_id,
            ],
            [
                'lark_integration_id' => $integration->id,
                'table_name' => $request->table_name,
                'leadsy_entity_type' => 'lead',
                'sync_direction' => $request->sync_direction,
                'field_mapping' => $request->field_mapping ?: LarkBaseService::DEFAULT_LEAD_FIELD_MAPPING,
                'is_active' => $request->boolean('is_active', true),
            ]
        );

        return response()->json([
            'success' => true,
            'data' => $table->fresh()->loadCount('recordMappings'),
        ]);
    }

    public function deleteBaseMapping(Request $request, LarkBaseTable $baseTable)
    {
        $this->authorizeTenantTable($baseTable);

        $baseTable->recordMappings()->delete();
        $baseTable->delete();

        return response()->json([
            'success' => true,
            'message' => 'Base mapping deleted successfully',
        ]);
    }

    public function syncBaseMapping(Request $request, LarkBaseTable $baseTable)
    {
        $this->authorizeTenantTable($baseTable);

        $request->validate([
            'direction' => 'required|in:push,pull',
            'limit' => 'nullable|integer|min:1|max:3000',
        ]);

        $service = new LarkBaseService($this->tenantIntegration());
        $count = 0;
        $attempted = 0;
        $skipped = 0;
        $added = 0;
        $updated = 0;
        $deleted = 0;
        $errors = [];
        $results = [];

        if ($request->direction === 'push') {
            $fieldDefinitions = $service->listFields($baseTable->app_token, $baseTable->table_id)['items'] ?? [];

            $limit = min($request->integer('limit', 50), 50);

            Lead::where(function ($query) use ($baseTable) {
                $query->where('tenant_id', $baseTable->tenant_id)
                    ->orWhereNull('tenant_id');
            })
                ->where(function ($query) use ($baseTable) {
                    $query->whereDoesntHave('larkBaseRecordMappings', function ($q) use ($baseTable) {
                        $q->where('lark_base_table_id', $baseTable->id);
                    })
                    ->orWhereHas('larkBaseRecordMappings', function ($q) use ($baseTable) {
                        $q->where('lark_base_table_id', $baseTable->id)
                          ->where(function ($sq) {
                              $sq->whereColumn('leads.updated_at', '>', 'lark_base_record_mappings.last_leadsy_updated_at')
                                 ->orWhereNull('lark_base_record_mappings.last_leadsy_updated_at');
                          });
                    });
                })
                ->with(['industry', 'funnelStage', 'owner'])
                ->limit($limit)
                ->get()
                ->each(function (Lead $lead) use ($service, $baseTable, $fieldDefinitions, &$count, &$attempted, &$skipped, &$added, &$updated, &$results, &$errors): void {
                    $attempted++;

                    try {
                        $result = $service->upsertLeadWithResult($lead, $baseTable, $fieldDefinitions);
                        $action = $result['action'];
                        $mapping = $result['mapping'];

                        if ($mapping) {
                            $count++;
                            if ($action === 'added') {
                                $added++;
                            } elseif ($action === 'updated') {
                                $updated++;
                            }
                        } else {
                            $skipped++;
                        }

                        $results[] = [
                            'status' => $mapping ? 'success' : 'skipped',
                            'action' => $action,
                            'lead_id' => $lead->id,
                            'company_name' => $lead->company_name,
                            'lark_record_id' => $result['record_id'],
                            'reason' => $result['reason'],
                        ];
                    } catch (\Exception $exception) {
                        $enhancedMessage = $this->enhanceErrorMessage($exception->getMessage());
                        $errors[] = [
                            'lead_id' => $lead->id,
                            'company_name' => $lead->company_name,
                            'message' => $enhancedMessage,
                        ];
                        $results[] = [
                            'status' => 'failed',
                            'action' => 'failed',
                            'lead_id' => $lead->id,
                            'company_name' => $lead->company_name,
                            'lark_record_id' => null,
                            'reason' => $enhancedMessage,
                        ];
                    }
                });
        } else {
            $limit = $request->integer('limit', 3000);
            $pageToken = null;
            $items = [];

            do {
                $records = $service->getRecords($baseTable->app_token, $baseTable->table_id, [
                    'page_size' => min(500, $limit - count($items)),
                    'page_token' => $pageToken,
                ]);

                $fetchedItems = $records['items'] ?? [];
                $items = array_merge($items, $fetchedItems);
                $pageToken = $records['page_token'] ?? null;
                $hasMore = $records['has_more'] ?? false;
            } while ($pageToken && $hasMore && count($items) < $limit);

            foreach ($items as $record) {
                $recordId = $record['record_id'] ?? null;
                if (! $recordId) {
                    $skipped++;
                    $results[] = [
                        'status' => 'skipped',
                        'action' => 'skipped',
                        'record_id' => null,
                        'company_name' => null,
                        'lead_id' => null,
                        'reason' => 'Lark Base record is missing record_id.',
                    ];

                    continue;
                }

                $attempted++;

                try {
                    $result = $service->syncRecordToLeadWithResult($baseTable, $recordId, $record);
                    $lead = $result['lead'];
                    $action = $result['action'];

                    if ($lead) {
                        $count++;
                        if ($action === 'added') {
                            $added++;
                        } elseif ($action === 'updated') {
                            $updated++;
                        }
                    } else {
                        $skipped++;
                    }

                    $results[] = [
                        'status' => $lead ? 'success' : 'skipped',
                        'action' => $action,
                        'record_id' => $recordId,
                        'lead_id' => $result['lead_id'],
                        'company_name' => $lead?->company_name,
                        'reason' => $result['reason'],
                    ];
                } catch (\Exception $exception) {
                    $enhancedMessage = $this->enhanceErrorMessage($exception->getMessage());
                    $error = [
                        'record_id' => $recordId,
                        'message' => $enhancedMessage,
                    ];
                    $errors[] = $error;
                    $results[] = [
                        'status' => 'failed',
                        'action' => 'failed',
                        'record_id' => $recordId,
                        'lead_id' => null,
                        'company_name' => null,
                        'reason' => $enhancedMessage,
                    ];
                }
            }
        }

        return response()->json([
            'success' => $errors === [],
            'synced_count' => $count,
            'attempted_count' => $attempted,
            'skipped_count' => $skipped,
            'added_count' => $added,
            'updated_count' => $updated,
            'deleted_count' => $deleted,
            'failed_count' => count($errors),
            'error_count' => count($errors),
            'errors' => array_slice($errors, 0, 5),
            'results' => array_slice($results, 0, 100),
        ]);
    }

    public function syncSingleLead(Request $request, Lead $lead)
    {
        $this->authorize('view', $lead);
        \App\Jobs\SyncLeadToLarkBaseJob::dispatch($lead->id);
        
        return response()->json([
            'message' => 'Lark Base sync job dispatched for the lead.'
        ]);
    }

    private function tenantIntegration(): LarkIntegration
    {
        $user = Auth::user();

        return LarkIntegration::where('tenant_id', $user->tenant_id)
            ->where('is_active', true)
            ->firstOrFail();
    }

    private function authorizeTenantTable(LarkBaseTable $baseTable): void
    {
        abort_unless($baseTable->tenant_id === Auth::user()->tenant_id, 404);
    }

    private function enhanceErrorMessage(string $message): string
    {
        $msg = strtolower($message);
        $suggestion = '';

        if (str_contains($msg, 'field') || str_contains($msg, 'invalid') || str_contains($msg, 'type') || str_contains($msg, 'format')) {
            $suggestion = ' Saran: Periksa kembali Field Mapping Anda. Pastikan tipe data kolom di Lark Base (misalnya Text, Number, Single Select) sesuai dengan tipe data dari Leadsy.';
        } elseif (str_contains($msg, 'permission') || str_contains($msg, 'unauthorized') || str_contains($msg, 'forbidden')) {
            $suggestion = ' Saran: Pastikan aplikasi Leadsy memiliki akses (permission) penuh ke Lark Base Table tersebut melalui pengaturan "Add Apps" di Base.';
        } elseif (str_contains($msg, 'not found') || str_contains($msg, 'notexist')) {
            $suggestion = ' Saran: Record atau tabel mungkin telah dihapus di Lark Base, atau pastikan Base App Token / Table ID valid.';
        } elseif (str_contains($msg, 'timeout') || str_contains($msg, 'time out')) {
            $suggestion = ' Saran: Terjadi gangguan jaringan ke server Lark. Silakan coba kembali beberapa saat lagi.';
        }

        return $message . $suggestion;
    }
}
