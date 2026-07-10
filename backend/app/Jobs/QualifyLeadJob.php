<?php

namespace App\Jobs;

use App\Models\Lead;
use App\Services\Lead\LeadQualificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class QualifyLeadJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 30;

    public function __construct(
        private readonly int $leadId,
        private readonly bool $useAi = true
    ) {}

    public function handle(LeadQualificationService $qualificationService): void
    {
        $lead = Lead::find($this->leadId);

        if (! $lead) {
            Log::warning("[QualifyLeadJob] Lead {$this->leadId} not found, skipping.");
            return;
        }

        try {
            $qualificationService->qualifyLead($lead, $this->useAi);
            Log::info("[QualifyLeadJob] Lead {$this->leadId} qualified successfully.");
        } catch (\Throwable $exception) {
            Log::error("[QualifyLeadJob] Failed for lead {$this->leadId}", ['error' => $exception->getMessage()]);
        }
    }
}
