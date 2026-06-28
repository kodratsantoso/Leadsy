<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

use App\Models\MeetingSummaryDocument;
use App\Models\LarkBaseRecordMapping;
use App\Services\Lark\LarkBaseService;
use Exception;

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
    public function handle(LarkBaseService $larkBaseService): void
    {
        $document = MeetingSummaryDocument::with(['lead'])->find($this->documentId);

        if (!$document || !$document->lead_id || $document->generation_status !== 'success') {
            return;
        }

        // Find if this lead is mapped to a Lark Base Record
        $mapping = LarkBaseRecordMapping::where('leadsy_entity_type', 'lead')
            ->where('leadsy_entity_id', $document->lead_id)
            ->whereNotNull('lark_record_id')
            ->first();

        if (!$mapping || !$mapping->lark_app_token || !$mapping->lark_table_id) {
            return;
        }

        // The field mapping should specify which field receives the attachment.
        // We will look up the field mapping for "meeting_summary_attachment"
        $connectionId = $mapping->baseTable->lark_integration_id ?? null; // using fallback or relation if possible
        
        // Actually since we separated lark_base_connections, we might need to find it
        // based on app_token and table_id
        $connection = \App\Models\LarkBaseConnection::where('app_token', $mapping->lark_app_token)->first();
        if (!$connection || !$connection->is_active) {
            return;
        }

        $fieldMapping = \App\Models\LarkBaseFieldMapping::where('connection_id', $connection->id)
            ->where('leadsy_field_key', 'meeting_summary_attachment')
            ->where('is_active', true)
            ->first();

        if (!$fieldMapping) {
            return;
        }

        try {
            // Upload the file to Lark Base
            $fileToken = $larkBaseService->uploadAttachment(
                $connection->app_id, 
                $connection->encrypted_app_secret,
                storage_path('app/public/' . $document->file_path),
                $document->file_name
            );

            // Update the record with the attachment token
            $payload = [
                'fields' => [
                    $fieldMapping->lark_field_id => [
                        [
                            'file_token' => $fileToken
                        ]
                    ]
                ]
            ];

            $larkBaseService->updateRecord(
                $connection->app_id,
                $connection->encrypted_app_secret,
                $mapping->lark_app_token,
                $mapping->lark_table_id,
                $mapping->lark_record_id,
                $payload
            );

            // Log success
            \App\Models\LarkBaseSyncLog::create([
                'connection_id' => $connection->id,
                'leadsy_entity_type' => 'lead',
                'leadsy_entity_id' => $document->lead_id,
                'lark_record_id' => $mapping->lark_record_id,
                'sync_direction' => 'leadsy_to_lark',
                'sync_action' => 'upload_attachment',
                'payload_json' => ['file_name' => $document->file_name],
                'response_json' => ['file_token' => $fileToken],
                'status' => 'success',
            ]);

        } catch (Exception $e) {
            // Log error
            \App\Models\LarkBaseSyncLog::create([
                'connection_id' => $connection->id ?? null,
                'leadsy_entity_type' => 'lead',
                'leadsy_entity_id' => $document->lead_id,
                'lark_record_id' => $mapping->lark_record_id,
                'sync_direction' => 'leadsy_to_lark',
                'sync_action' => 'upload_attachment',
                'payload_json' => ['file_name' => $document->file_name],
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);
            
            throw $e;
        }
    }
}
