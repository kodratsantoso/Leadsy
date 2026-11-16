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
        /** @var \App\Models\LeadTranscript|null $transcript */
        $transcript = LeadTranscript::with(['lead.owner', 'lead.product', 'lead.industry', 'lead.funnelStage'])
            ->where('id', $this->transcriptId)
            ->first();
        if (!$transcript || !$transcript->lead) {
            Log::warning("SyncMeetingSummaryToLarkJob aborted: Transcript or Lead not found for ID {$this->transcriptId}");
            return;
        }

        $lead = $transcript->lead;
        $tenantId = $lead->tenant_id;

        // Get active Lark Integration
        $integration = LarkIntegration::query()->where('tenant_id', $tenantId)->where('is_active', true)->first();
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
                $userModel = User::query()->find($this->userId);
                if ($userModel && $userModel->email) {
                    $larkUserId = $larkDriveService->getLarkUserIdByEmail($userModel->email);
                }
            }

            // 2. Resolve Drive Folder (Create unique folder for Lead)
            $folderToken = $lead->lark_folder_token;
            if (empty($folderToken)) {
                $leadDisplayName = $lead->company_name ?? $lead->name ?? 'Unknown Lead';
                $leadFolderName = "{$leadDisplayName} - {$lead->id}";
                $folderToken = $larkDriveService->getOrCreateLeadFolder($sharedFolderToken, $leadFolderName);

                if (!empty($folderToken)) {
                    $lead->update(['lark_folder_token' => $folderToken]);
                }
            }

            if (empty($folderToken)) {
                $folderToken = $sharedFolderToken;
            }

            // 3. Ensure PDF document exists or compile if missing (supporting multi-pod storage disparity)
            $document = MeetingSummaryDocument::query()
                ->where('transcript_id', $transcript->id)
                ->where('generation_status', 'success')
                ->latest()
                ->first();

            if (!$document) {
                try {
                    GenerateMeetingSummaryPdfJob::dispatchSync($transcript->id);
                } catch (\Throwable $e) {
                    Log::warning("GenerateMeetingSummaryPdfJob dispatchSync failed: " . $e->getMessage());
                }

                $document = MeetingSummaryDocument::query()
                    ->where('transcript_id', $transcript->id)
                    ->where('generation_status', 'success')
                    ->latest()
                    ->first();
            }

            // Ensure physical PDF file exists on local storage
            if ($document) {
                $pdfDisk = \Illuminate\Support\Facades\Storage::disk('public');
                if (!$pdfDisk->exists($document->file_path)) {
                    $evaluation = $transcript->evaluations()->latest()->first();
                    if ($evaluation) {
                        try {
                            $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.meeting-summary', [
                                'transcript' => $transcript,
                                'evaluation' => $evaluation,
                                'lead' => $lead,
                                'documentId' => 'MS-' . str_pad($document->id, 6, '0', STR_PAD_LEFT),
                                'generatedDate' => now()->format('M d, Y H:i'),
                            ]);
                            $pdfDisk->put($document->file_path, $pdf->output());
                        } catch (\Throwable $e) {
                            Log::warning("Failed to compile missing PDF on worker: " . $e->getMessage());
                        }
                    }
                }
            }

            // 4. Fetch field definitions to verify mapping field existence
            $fields = [];
            try {
                $fields = $larkBaseService->listFields($appToken, $tableId)['items'] ?? [];
            } catch (Exception $e) {
                Log::warning('Failed to query Lark Base table fields: ' . $e->getMessage());
            }

            $fieldsById = collect($fields)->keyBy('field_id')->all();
            $fieldsByName = collect($fields)->keyBy('field_name')->all();

            $updateFields = [];

            // A. Handle PDF Attachment mapping
            $pdfFieldId = $mapping['pdf_field_id'] ?? null;
            $pdfFieldName = $mapping['pdf_field_name'] ?? null;
            $targetPdfField = $fieldsById[$pdfFieldId] ?? $fieldsByName[$pdfFieldName] ?? null;

            if (!$targetPdfField && !empty($fields)) {
                foreach ($fields as $f) {
                    if ((int)($f['type'] ?? 0) === 17) { // 17 = Attachment
                        $name = strtolower($f['field_name'] ?? '');
                        if (str_contains($name, 'pdf') || str_contains($name, 'dokumen') || str_contains($name, 'document') || str_contains($name, 'lampiran')) {
                            $targetPdfField = $f;
                            break;
                        }
                    }
                }
            }

            if ($targetPdfField && $document) {
                try {
                    $fullPath = storage_path('app/public/' . $document->file_path);
                    if (file_exists($fullPath)) {
                        $pdfFileToken = $larkBaseService->uploadAttachment(
                            $appToken,
                            $fullPath,
                            $document->file_name
                        );
                        $colName = $targetPdfField['field_name'];
                        $existing = $updateFields[$colName] ?? [];
                        $existing[] = ['file_token' => $pdfFileToken];
                        $updateFields[$colName] = $existing;
                    }
                } catch (\Throwable $e) {
                    Log::warning("PDF upload to Lark Base failed: " . $e->getMessage());
                }
            }

            // B. Handle Image Attachment mapping
            $imageFieldId = $mapping['image_field_id'] ?? null;
            $imageFieldName = $mapping['image_field_name'] ?? null;
            $targetImageField = $fieldsById[$imageFieldId] ?? $fieldsByName[$imageFieldName] ?? null;

            if (!$targetImageField && !empty($fields)) {
                foreach ($fields as $f) {
                    if ((int)($f['type'] ?? 0) === 17) {
                        $name = strtolower($f['field_name'] ?? '');
                        if (str_contains($name, 'image') || str_contains($name, 'gambar') || str_contains($name, 'infographic') || str_contains($name, 'visual')) {
                            $targetImageField = $f;
                            break;
                        }
                    }
                }
            }

            $imgFileToken = null;
            try {
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
                    ->noSandbox()
                    ->save($pngPath);

                if (file_exists($pngPath)) {
                    $imgFileToken = $larkBaseService->uploadAttachment(
                        $appToken,
                        $pngPath,
                        str_replace('.pdf', '.png', $document->file_name ?? 'summary.png')
                    );
                    @unlink($pngPath);
                } elseif ($document && file_exists(storage_path('app/public/' . $document->file_path))) {
                    $imgFileToken = $larkBaseService->uploadAttachment(
                        $appToken,
                        storage_path('app/public/' . $document->file_path),
                        $document->file_name
                    );
                }

                if ($targetImageField && $imgFileToken) {
                    $colName = $targetImageField['field_name'];
                    $existing = $updateFields[$colName] ?? [];
                    $existing[] = ['file_token' => $imgFileToken];
                    $updateFields[$colName] = $existing;
                }
            } catch (\Throwable $e) {
                Log::warning("Image generation/upload to Lark Base failed: " . $e->getMessage());
            }

            // C. Handle Lark Doc URL mapping & Always Create / Sync Doc
            $docFieldId = $mapping['doc_field_id'] ?? null;
            $docFieldName = $mapping['doc_field_name'] ?? null;
            $targetDocField = $fieldsById[$docFieldId] ?? $fieldsByName[$docFieldName] ?? null;

            if (!$targetDocField && !empty($fields)) {
                foreach ($fields as $f) {
                    $type = (int)($f['type'] ?? 0);
                    if ($type === 15 || $type === 1) { // 15 = Url, 1 = Text
                        $name = strtolower($f['field_name'] ?? '');
                        if (str_contains($name, 'doc') || str_contains($name, 'lark') || str_contains($name, 'notulen') || str_contains($name, 'summary doc')) {
                            $targetDocField = $f;
                            break;
                        }
                    }
                }
            }

            try {
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
                        }
                    }
                }

                if ($needCreation) {
                    $meetingDate = $transcript->created_at ? $transcript->created_at->format('Y-m-d') : date('Y-m-d');
                    $leadDisplayName = $lead->company_name ?? $lead->name ?? 'Unknown Lead';
                    $meetingType = $transcript->meeting_type ?: 'Meeting';
                    $docTitle = "Meeting Summary | {$leadDisplayName} | {$meetingType} | {$meetingDate}";
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

                // If Bitable field exists, format payload
                if ($targetDocField && !empty($docUrl)) {
                    if ((int) ($targetDocField['type'] ?? 0) === 15) {
                        $updateFields[$targetDocField['field_name']] = [
                            'link' => $docUrl,
                            'text' => 'View Lark Doc Summary'
                        ];
                    } else {
                        $updateFields[$targetDocField['field_name']] = $docUrl;
                    }
                }
            } catch (Exception $e) {
                Log::warning('Lark Doc generation/rendering encountered an issue, proceeding with attachment sync: ' . $e->getMessage(), [
                    'transcript_id' => $transcript->id,
                    'error' => $e->getMessage(),
                ]);
            }

            // 5. Update Lark Base record mapping
            $larkRecordId = $lead->external_id;
            if (empty($larkRecordId)) {
                // Find or fallback mapping
                $recordMapping = \App\Models\LarkBaseRecordMapping::query()
                    ->where('tenant_id', $tenantId)
                    ->where('leadsy_entity_type', 'lead')
                    ->where('leadsy_entity_id', (string) $lead->id)
                    ->first();
                $larkRecordId = $recordMapping?->lark_record_id;
            }

            if (!empty($larkRecordId) && !empty($updateFields)) {
                $larkBaseService->updateRecord($appToken, $tableId, $larkRecordId, $updateFields);
            } elseif (empty($larkRecordId)) {
                Log::warning("SyncMeetingSummaryToLarkJob: No mapped Lark Base record ID found for lead ID {$lead->id}. Base record update skipped, but Lark Doc and attachments processed.");
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
