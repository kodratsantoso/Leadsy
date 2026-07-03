<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RetryFailedLarkBaseSyncJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct(public int $syncJobId)
    {
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $syncJob = DB::table('lark_base_sync_jobs')->find($this->syncJobId);
        
        if (!$syncJob) {
            Log::warning("RetryFailedLarkBaseSyncJob aborted: Job ID {$this->syncJobId} not found");
            return;
        }
        
        if ($syncJob->status !== 'failed') {
            Log::info("RetryFailedLarkBaseSyncJob skipped: Job ID {$this->syncJobId} is not in failed state ({$syncJob->status})");
            return;
        }
        
        DB::table('lark_base_sync_jobs')->where('id', $this->syncJobId)->update([
            'status' => 'pending',
            'retry_count' => $syncJob->retry_count + 1,
            'updated_at' => now(),
        ]);
        
        if ($syncJob->sync_type === 'field_update') {
            SyncTranscriptAnalysisToLarkBaseJob::dispatch($syncJob->transcript_id);
        } elseif ($syncJob->sync_type === 'attachment_update') {
            // We need the document ID for the PDF job.
            // Let's find it via transcript_id
            $document = \App\Models\MeetingSummaryDocument::where('lead_transcript_id', $syncJob->transcript_id)
                ->where('generation_status', 'success')
                ->latest()
                ->first();
                
            if ($document) {
                SyncMeetingSummaryPdfToLarkBaseJob::dispatch($document->id);
            } else {
                Log::error("RetryFailedLarkBaseSyncJob failed: No successful PDF document found for transcript ID {$syncJob->transcript_id}");
            }
        }
    }
}
