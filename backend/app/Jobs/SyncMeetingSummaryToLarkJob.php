<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Models\LeadTranscript;
use App\Models\MeetingSummaryDocument;
use App\Models\LarkIntegration;
use App\Models\LarkBaseTable;
use App\Models\Lead;
use App\Models\User;
use App\Jobs\GenerateMeetingSummaryPdfJob;
use App\Services\Lark\LarkBaseService;
use App\Services\Lark\LarkDriveService;
use Exception;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class SyncMeetingSummaryToLarkJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    protected $transcriptId;
    protected $userId;

    /**
     * Create a new job instance.
     */
    public function __construct(int $transcriptId, ?int $userId = null)
    {
        $this->transcriptId = $transcriptId;
        $this->userId = $userId;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $transcript = LeadTranscript::with(['lead.owner', 'lead.product', 'lead.industry', 'lead.funnelStage'])->find($this->transcriptId);
        if (!$transcript || !$transcript->lead) {
            Log::warning("SyncMeetingSummaryToLarkJob aborted: Transcript or Lead not found for ID {$this->transcriptId}");
            return;
        }

        $lead = $transcript->lead;
        $tenantId = $lead->tenant_id;

        // Get active Lark Integration
        $integration = LarkIntegration::where('tenant_id', $tenantId)->where('is_active', true)->first();
        if (!$integration) {
            Log::info("No active Lark integration for tenant {$tenantId}");
            return;
        }

        $mapping = $integration->meeting_summary_mapping;
        if (empty($mapping) || empty($mapping['app_token']) || empty($mapping['table_id']) || empty($mapping['shared_folder_token'])) {
            Log::info("Meeting summary mapping not configured or incomplete for tenant {$tenantId}");
            return;
        }

        $appToken = $mapping['app_token'];
        $tableId = $mapping['table_id'];
        $sharedFolderToken = $mapping['shared_folder_token'];

        // Track job in DB
        $syncJobId = DB::table('lark_base_sync_jobs')->insertGetId([
            'lead_id' => $lead->id,
            'transcript_id' => $transcript->id,
            'connection_id' => $integration->id,
            'sync_type' => 'meeting_summary_sync',
            'status' => 'processing',
            'last_attempt_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        try {
            $larkBaseService = new LarkBaseService($integration);
            $larkDriveService = new LarkDriveService($integration);

            // 1. Resolve User email lookup in Lark if user trigger ID was passed
            $larkUserId = null;
            if ($this->userId) {
                $userModel = User::find($this->userId);
                if ($userModel && $userModel->email) {
                    $larkUserId = $larkDriveService->getLarkUserIdByEmail($userModel->email);
                }
            }

            // 2. Resolve Drive Folder (Create unique folder for Lead)
            $leadDisplayName = $lead->company_name ?? $lead->name ?? 'Unknown Lead';
            $leadFolderName = "{$leadDisplayName} - {$lead->id}";
            $folderToken = $larkDriveService->getOrCreateLeadFolder($sharedFolderToken, $leadFolderName);

            // 3. Ensure PDF document exists or wait / load the latest successful PDF
            $document = MeetingSummaryDocument::where('transcript_id', $transcript->id)
                ->where('generation_status', 'success')
                ->latest()
                ->first();

            if (!$document) {
                // If PDF is not generated yet, try to dispatch PDF generation synchronously
                GenerateMeetingSummaryPdfJob::dispatchSync($transcript->id);

                $document = MeetingSummaryDocument::where('transcript_id', $transcript->id)
                    ->where('generation_status', 'success')
                    ->latest()
                    ->first();
            }

            if (!$document) {
                throw new Exception('No generated PDF document found for this transcript summary.');
            }

            // 4. Fetch field definitions to verify mapping field existence
            $fields = [];
            try {
                $fields = $larkBaseService->listFields($appToken, $tableId)['items'] ?? [];
            } catch (Exception $e) {
                throw new Exception('Failed to query Lark Base table fields: ' . $e->getMessage());
            }

            $fieldsById = collect($fields)->keyBy('field_id')->all();
            $fieldsByName = collect($fields)->keyBy('field_name')->all();

            $updateFields = [];

            // A. Handle PDF Attachment mapping
            $pdfFieldId = $mapping['pdf_field_id'] ?? null;
            $pdfFieldName = $mapping['pdf_field_name'] ?? null;
            if ($pdfFieldId || $pdfFieldName) {
                // Revalidate mapping matching preference to ID
                $targetField = $fieldsById[$pdfFieldId] ?? $fieldsByName[$pdfFieldName] ?? null;
                if (!$targetField) {
                    throw new Exception("Meeting Summary PDF mapping is no longer valid. The configured Lark Base field could not be found. Please review Lark Integration Settings.");
                }

                // Upload PDF and append it to Bitable
                $pdfFileToken = $larkBaseService->uploadAttachment(
                    $appToken,
                    storage_path('app/public/' . $document->file_path),
                    $document->file_name
                );

                $updateFields[$targetField['field_name']] = [['file_token' => $pdfFileToken]];
            }

            // B. Handle Image Attachment mapping
            $imageFieldId = $mapping['image_field_id'] ?? null;
            $imageFieldName = $mapping['image_field_name'] ?? null;
            if ($imageFieldId || $imageFieldName) {
                $targetField = $fieldsById[$imageFieldId] ?? $fieldsByName[$imageFieldName] ?? null;
                if (!$targetField) {
                    throw new Exception("Meeting Summary Image mapping is no longer valid. The configured Lark Base field could not be found. Please review Lark Integration Settings.");
                }

                $tempDir = storage_path('app/public/meeting-summaries');
                if (!is_dir($tempDir)) {
                    mkdir($tempDir, 0755, true);
                }
                $pngPath = $tempDir . '/beautiful_img_' . $transcript->id . '.png';

                // Clean up previous temporary file if exists
                if (file_exists($pngPath)) {
                    @unlink($pngPath);
                }

                // Render Beautiful Blade View and capture screenshot using Browsershot
                $evaluation = $transcript->evaluations()->latest()->first();
                $html = \Illuminate\Support\Facades\View::make('reports.beautiful-meeting-summary', [
                    'transcript' => $transcript,
                    'lead' => $lead,
                    'evaluation' => $evaluation,
                ])->render();

                \Spatie\Browsershot\Browsershot::html($html)
                    ->windowSize(1200, 1600)
                    ->fullPage()
                    ->deviceScaleFactor(2)
                    ->waitUntilNetworkIdle() // wait for CDN and ApexCharts
                    ->delay(1500) // extra delay for chart animation
                    ->save($pngPath);

                if (file_exists($pngPath)) {
                    $imgFileToken = $larkBaseService->uploadAttachment(
                        $appToken,
                        $pngPath,
                        str_replace('.pdf', '.png', $document->file_name)
                    );
                    // Clean up temp image
                    if (file_exists($pngPath)) {
                        @unlink($pngPath);
                    }
                } else {
                    // Fallback: upload PDF if PNG generation failed
                    $imgFileToken = $larkBaseService->uploadAttachment(
                        $appToken,
                        $pdfFullPath,
                        $document->file_name
                    );
                }

                $updateFields[$targetField['field_name']] = [['file_token' => $imgFileToken]];
            }

            // C. Handle Lark Doc URL mapping
            $docFieldId = $mapping['doc_field_id'] ?? null;
            $docFieldName = $mapping['doc_field_name'] ?? null;
            if ($docFieldId || $docFieldName) {
                $targetField = $fieldsById[$docFieldId] ?? $fieldsByName[$docFieldName] ?? null;
                if (!$targetField) {
                    throw new Exception("Meeting Summary Lark Docs mapping is no longer valid. The configured Lark Base field could not be found. Please review Lark Integration Settings.");
                }

                $docId = $transcript->lark_doc_id;
                $docUrl = $transcript->lark_doc_url;

                $needCreation = empty($docId);

                if (!$needCreation) {
                    try {
                        // Verify existence by fetching root doc info
                        $larkDriveService->request('GET', "/docx/v1/documents/{$docId}");
                    } catch (Exception $e) {
                        if (str_contains($e->getMessage(), 'resource deleted') || str_contains($e->getMessage(), '1770003')) {
                            $needCreation = true;
                        } else {
                            throw $e;
                        }
                    }
                }

                if ($needCreation) {
                    $meetingDate = $transcript->created_at ? $transcript->created_at->format('Y-m-d') : date('Y-m-d');
                    $leadDisplayName = $lead->company_name ?? $lead->name ?? 'Unknown Lead';
                    $docTitle = "Meeting Summary | {$leadDisplayName} | {$transcript->meeting_type} | {$meetingDate}";
                    $docData = $larkDriveService->createDoc($folderToken, $docTitle);
                    $docId = $docData['document_id'];
                    $docUrl = $docData['url'];

                    // Persist document info immediately
                    $transcript->lark_doc_id = $docId;
                    $transcript->lark_doc_url = $docUrl;
                    $transcript->save();
                }

                $renderer = new \App\Services\Lark\LarkDocsRenderer($larkDriveService);
                $renderer->renderDoc($docId, $transcript, $lead, $imgFileToken ?? null);

                // If Bitable field is type 15 (Url), format payload, otherwise write text
                if ((int) ($targetField['type'] ?? 0) === 15) {
                    $updateFields[$targetField['field_name']] = [
                        'link' => $docUrl,
                        'text' => 'View Lark Doc Summary'
                    ];
                } else {
                    $updateFields[$targetField['field_name']] = $docUrl;
                }
            }

            // 5. Update Lark Base record mapping
            $larkRecordId = $lead->external_id;
            if (empty($larkRecordId)) {
                // Find or fallback mapping
                $mappingRecord = \App\Models\LarkBaseRecordMapping::where('tenant_id', $tenantId)
                    ->where('leadsy_entity_type', 'lead')
                    ->where('leadsy_entity_id', (string) $lead->id)
                    ->first();
                $larkRecordId = $mappingRecord?->lark_record_id;
            }

            if (empty($larkRecordId)) {
                throw new Exception("Sync failed: Mapped Lark Base record ID not found for this lead. Sync lead properties first.");
            }

            if (!empty($updateFields)) {
                $larkBaseService->updateRecord($appToken, $tableId, $larkRecordId, $updateFields);
            }

            DB::table('lark_base_sync_jobs')->where('id', $syncJobId)->update([
                'status' => 'success',
                'lark_record_id' => $larkRecordId,
                'response_json' => json_encode(['updated_fields' => array_keys($updateFields)]),
                'updated_at' => now(),
            ]);

        } catch (Exception $e) {
            Log::error('SyncMeetingSummaryToLarkJob failed', [
                'transcript_id' => $this->transcriptId,
                'error' => $e->getMessage()
            ]);

            DB::table('lark_base_sync_jobs')->where('id', $syncJobId)->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'updated_at' => now(),
            ]);

            throw $e;
        }
    }
}
