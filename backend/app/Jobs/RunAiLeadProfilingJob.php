<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Models\AiGeneratedOutput;
use App\Services\Lead\AiLeadProfilingService;
use Illuminate\Support\Facades\Log;

class RunAiLeadProfilingJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 180;

    public function __construct(
        public AiGeneratedOutput $output,
        public string $companyName
    ) {}

    public function handle(AiLeadProfilingService $profilingService): void
    {
        try {
            $profilingService->performProfiling($this->output, $this->companyName);
        } catch (\Throwable $e) {
            Log::error("[AiLeadProfiling] Profiling failed for {$this->companyName}", ['error' => $e->getMessage()]);
            
            $original = $this->output->original_output_json ?? [];
            $current = $this->output->current_output_json ?? [];
            
            $this->output->update([
                'status' => 'failed',
                'original_output_json' => array_merge(is_array($original) ? $original : [], ['error' => $e->getMessage()]),
                'current_output_json' => array_merge(is_array($current) ? $current : [], ['error' => $e->getMessage()]),
            ]);
        }
    }
}
