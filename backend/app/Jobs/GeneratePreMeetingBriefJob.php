<?php

namespace App\Jobs;

use App\Models\Lead;
use App\Services\Sales\PreMeetingBriefService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class GeneratePreMeetingBriefJob implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public Lead $lead,
        public array $validatedData,
        public ?int $userId = null
    ) {}

    /**
     * Execute the job.
     */
    public function handle(PreMeetingBriefService $briefService): void
    {
        try {
            // Re-authenticate user context if needed (PreMeetingBriefService might need it)
            if ($this->userId) {
                auth()->loginUsingId($this->userId);
            }

            $briefService->generateBrief($this->lead, $this->validatedData);

            $this->lead->updateQuietly(['ai_processing_status' => 'completed']);
        } catch (\Throwable $e) {
            $this->lead->updateQuietly(['ai_processing_status' => 'failed']);
            Log::error('PreMeetingBrief Generation Failed', [
                'lead_id' => $this->lead->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }
}
