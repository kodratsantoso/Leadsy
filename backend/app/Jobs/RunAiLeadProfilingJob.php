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

    /**
     * Mark the row failed when the job dies outside handle()'s own try/catch.
     *
     * The catch above only runs for exceptions thrown inside performProfiling(). When the
     * worker kills the job on its $timeout, or the queue gives up on it, that catch never
     * executes — and because Horizon's default supervisor runs `tries => 1`, there is no
     * second attempt either. The AiGeneratedOutput row was then left saying "researching"
     * forever: the UI polls a status that can never change, and the run leaves no trace of
     * having failed.
     *
     * A SIGKILL (out of memory, pod eviction) still bypasses this — nothing in-process can
     * catch that — so a row can in principle still stick. This covers the common cases.
     */
    public function failed(?\Throwable $e = null): void
    {
        $reason = $e?->getMessage() ?? 'The job stopped before it finished.';

        Log::error("[AiLeadProfiling] Job failed for {$this->companyName}", ['error' => $reason]);

        $original = $this->output->original_output_json ?? [];
        $current = $this->output->current_output_json ?? [];

        $this->output->update([
            'status' => 'failed',
            'original_output_json' => array_merge(is_array($original) ? $original : [], ['error' => $reason]),
            'current_output_json' => array_merge(is_array($current) ? $current : [], ['error' => $reason]),
        ]);
    }
}
