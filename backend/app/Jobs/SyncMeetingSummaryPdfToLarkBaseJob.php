<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Models\MeetingSummaryDocument;
use App\Models\LarkIntegration;
use App\Models\LarkBaseTable;
use App\Services\Lark\LarkBaseService;
use Exception;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class SyncMeetingSummaryPdfToLarkBaseJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    protected $documentId;

    /**
     * Create a new job instance.
     */
    public function __construct($documentId)
    {
        $this->documentId = $documentId;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $document = MeetingSummaryDocument::with(['lead'])->find($this->documentId);

        if (!$document || !$document->lead_id || $document->generation_status !== 'success') {
            return;
        }

        $lead = $document->lead;

        if (empty($lead->external_id)) {
            Log::info('Lead external_id is empty, skipping Lark Base PDF Upload', ['lead_id' => $lead->id]);
            return;
        }

        $larkRecordId = $lead->external_id;
        $tenantId = $lead->tenant_id;

        // Get active Lark Integration
        $integration = LarkIntegration::where('tenant_id', $tenantId)->where('is_active', true)->first();
        if (!$integration) {
            return;
        }

        // Get active Base Table
        $baseTable = LarkBaseTable::where('tenant_id', $tenantId)->where('is_active', true)->first();
        if (!$baseTable || !$baseTable->app_token || !$baseTable->table_id) {
            return;
        }
        
        // Track job in DB
        $syncJobId = DB::table('lark_base_sync_jobs')->insertGetId([
            'lead_id' => $lead->id,
            'transcript_id' => $document->transcript_id,
            'connection_id' => $integration->id,
            'sync_type' => 'attachment_update',
            'lark_record_id' => $larkRecordId,
            'status' => 'processing',
            'last_attempt_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        try {
            $larkBaseService = new LarkBaseService($integration);
            
            // Upload the file to Lark Base
            $fileToken = $larkBaseService->uploadAttachment(
                $baseTable->app_token,
                storage_path('app/public/' . $document->file_path),
                $document->file_name
            );

            // Find which field is mapped for "Meeting Summary Attachment"
            $fieldDefinitions = [];
            try {
                $fieldDefinitions = $larkBaseService->listFields($baseTable->app_token, $baseTable->table_id)['items'] ?? [];
            } catch (Exception $e) {
                // proceed
            }
            
            $fieldMapping = $baseTable->field_mapping ?: LarkBaseService::DEFAULT_LEAD_FIELD_MAPPING;
            $mappedFieldName = $fieldMapping['meeting_summary_attachment'] ?? 'Meeting Summary Attachment';
            $fieldId = null;
            
            foreach ($fieldDefinitions as $fieldDef) {
                if ($fieldDef['field_name'] === $mappedFieldName) {
                    $fieldId = $fieldDef['field_id'];
                    break;
                }
            }
            
            if (!$fieldId) {
                Log::warning('Lark Base Upload skipped: PDF attachment field not found in table', [
                    'expected_field_name' => $mappedFieldName,
                    'table_id' => $baseTable->table_id
                ]);
                
                DB::table('lark_base_sync_jobs')->where('id', $syncJobId)->update([
                    'status' => 'skipped',
                    'error_message' => 'PDF attachment field not found in table: ' . $mappedFieldName,
                    'updated_at' => now(),
                ]);
                return;
            }

            // Update the record with the attachment token
            $payloadFields = [
                $mappedFieldName => [
                    [
                        'file_token' => $fileToken
                    ]
                ]
            ];

            $larkBaseService->updateRecord(
                $baseTable->app_token,
                $baseTable->table_id,
                $larkRecordId,
                $payloadFields
            );

            DB::table('lark_base_sync_jobs')->where('id', $syncJobId)->update([
                'status' => 'success',
                'payload_json' => json_encode(['file_name' => $document->file_name]),
                'response_json' => json_encode(['file_token' => $fileToken]),
                'updated_at' => now(),
            ]);

            // Log legacy success for compatibility
            \App\Models\LarkSync::create([
                'tenant_id' => $tenantId,
                'lark_integration_id' => $integration->id,
                'module' => 'base',
                'action' => 'upload_attachment',
                'lark_entity_type' => 'record',
                'lark_entity_id' => $larkRecordId,
                'leadsy_entity_type' => 'lead',
                'leadsy_entity_id' => $lead->id,
                'status' => 'success',
                'request_data' => ['file_name' => $document->file_name],
                'response_data' => ['file_token' => $fileToken],
            ]);

        } catch (Exception $e) {
            DB::table('lark_base_sync_jobs')->where('id', $syncJobId)->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'updated_at' => now(),
            ]);
            
            // Log legacy error
            \App\Models\LarkSync::create([
                'tenant_id' => $tenantId,
                'lark_integration_id' => $integration->id,
                'module' => 'base',
                'action' => 'upload_attachment',
                'lark_entity_type' => 'record',
                'lark_entity_id' => $larkRecordId,
                'leadsy_entity_type' => 'lead',
                'leadsy_entity_id' => $lead->id,
                'status' => 'failed',
                'request_data' => ['file_name' => $document->file_name],
                'error_message' => $e->getMessage(),
            ]);
            
            throw $e;
        }
    }
}
