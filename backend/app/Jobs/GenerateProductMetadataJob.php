<?php

namespace App\Jobs;

use App\Services\AuditService;
use App\Services\ProductMetadataGenerationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class GenerateProductMetadataJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 300;

    public function __construct(
        public readonly string $jobId,
        public readonly ?string $productName,
        public readonly ?string $referenceUrl,
        public readonly ?string $pdfPath,
        public readonly array $availableCategories = [],
        public readonly ?int $userId = null
    ) {}

    public function handle(ProductMetadataGenerationService $service): void
    {
        Log::info("[GenerateProductMetadataJob] Starting job {$this->jobId}", [
            'product_name' => $this->productName,
            'url' => $this->referenceUrl,
            'has_pdf' => (bool) $this->pdfPath,
        ]);

        try {
            $auditSource = 'name';
            if ($this->pdfPath) {
                $fullPath = Storage::disk('local')->path($this->pdfPath);
                $result = $service->generateFromPdf($fullPath, (string) $this->productName, $this->availableCategories);
                $auditSource = 'pdf';
                if (Storage::disk('local')->exists($this->pdfPath)) {
                    Storage::disk('local')->delete($this->pdfPath);
                }
            } elseif ($this->referenceUrl) {
                $result = $service->generateFromUrl($this->referenceUrl, (string) $this->productName, $this->availableCategories);
                $auditSource = 'url';
            } else {
                $result = $service->generate((string) $this->productName, $this->availableCategories);
                $auditSource = 'name';
            }

            if (! ($result['success'] ?? false)) {
                $errorMessage = $result['error'] ?? 'AI generation failed. Please try again.';
                Log::warning("[GenerateProductMetadataJob] AI generation failed for job {$this->jobId}: {$errorMessage}");
                Cache::put("product_ai_job_{$this->jobId}", [
                    'success' => false,
                    'status' => 'failed',
                    'job_id' => $this->jobId,
                    'error' => $errorMessage,
                ], 900);
                return;
            }

            AuditService::log(
                'ai_product_metadata_generated',
                'products',
                null,
                null,
                [
                    'product_name' => $this->productName ?: null,
                    'source' => $auditSource,
                    'reference_url' => $this->referenceUrl ?: null,
                    'ai_model' => $result['ai_model'] ?? null,
                    'user_id' => $this->userId,
                    'job_id' => $this->jobId,
                ]
            );

            Cache::put("product_ai_job_{$this->jobId}", [
                'success' => true,
                'status' => 'completed',
                'job_id' => $this->jobId,
                'data' => $result['data'],
                'ai_model' => $result['ai_model'] ?? null,
                'source' => $auditSource,
                'completed_at' => now()->toIso8601String(),
            ], 900);

            Log::info("[GenerateProductMetadataJob] Completed job {$this->jobId}");
        } catch (\Throwable $e) {
            Log::error("[GenerateProductMetadataJob] Exception in job {$this->jobId}: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            if ($this->pdfPath && Storage::disk('local')->exists($this->pdfPath)) {
                Storage::disk('local')->delete($this->pdfPath);
            }
            Cache::put("product_ai_job_{$this->jobId}", [
                'success' => false,
                'status' => 'failed',
                'job_id' => $this->jobId,
                'error' => $e->getMessage(),
            ], 900);
        }
    }
}
