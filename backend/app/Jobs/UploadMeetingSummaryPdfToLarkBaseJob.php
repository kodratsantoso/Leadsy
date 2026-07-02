<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use App\Models\MeetingSummaryDocument;
use App\Models\LarkIntegration;
use App\Models\LarkBaseTable;
use App\Services\Lark\LarkBaseService;
use Exception;
use Illuminate\Support\Facades\Log;

class UploadMeetingSummaryPdfToLarkBaseJob implements ShouldQueue
{
    use Queueable;

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

        try {
            $larkBaseService = new LarkBaseService($integration);
            
            // Upload the file to Lark Base
            $fileToken = $larkBaseService->uploadAttachment(
                $baseTable->app_token,
                storage_path('app/public/' . $document->file_path),
                $document->file_name
            );

            // Find which field is mapped for "Meeting Summary Attachment"
            $fieldDefinitions = $larkBaseService->listFields($baseTable->app_token, $baseTable->table_id)['items'] ?? [];
            
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

            // Log success
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
            // Log error
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
