<?php

namespace App\Console\Commands;

use App\Models\Lead;
use App\Services\Sales\PreMeetingAiScreeningOrchestratorService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Continuously chips away at the unassessed-leads backlog by running the
 * Pre-Meeting AI Screening pipeline directly in this process — no Redis
 * queue, no HTTP request, no Cloudflare gateway involved. This exists
 * because RunPreMeetingAiScreeningJob (queue-dispatched) has repeatedly
 * gone unprocessed for hours at a time whenever the Horizon worker died,
 * silently leaving leads stuck "Unassessed" with zero visible error.
 *
 * Scheduled every few minutes (see routes/console.php) and safe to also
 * run manually / more frequently for a one-off backlog catch-up:
 *   php artisan leadsy:screen-unassessed --limit=20 --max-seconds=600
 */
class ScreenUnassessedLeadsCommand extends Command
{
    protected $signature = 'leadsy:screen-unassessed
        {--limit=5 : Maximum number of leads to screen in this run}
        {--max-seconds=240 : Stop starting new leads once this many seconds have elapsed}';

    protected $description = 'Runs the Pre-Meeting AI Screening pipeline directly (no queue) for a batch of unassessed leads';

    public function handle(PreMeetingAiScreeningOrchestratorService $orchestrator): int
    {
        // Shared app-wide lock: the scheduled run (every 10 minutes) and the
        // "Screen a Few Now" manual button both invoke this same command.
        // Without this, two overlapping runs can pick up and process the
        // SAME lead concurrently (screenLead() deletes/recreates related
        // rows inside a DB transaction), which showed up in production as
        // the whole site slowing to a crawl under lock contention. Skip
        // rather than wait — the manual button is an HTTP request and
        // must not block on another run's lock.
        $lock = Cache::lock('leadsy-screen-unassessed-batch', 900);
        if (! $lock->get()) {
            $this->warn('Another screening batch is already running; skipping to avoid overlapping AI calls on the same leads.');

            return self::SUCCESS;
        }

        try {
            $limit = max(1, (int) $this->option('limit'));
            $maxSeconds = max(30, (int) $this->option('max-seconds'));
            $startedAt = microtime(true);

            $leads = $orchestrator->getUnassessedLeads($limit);

            if ($leads->isEmpty()) {
                $this->info('No unassessed leads found. Nothing to do.');

                return self::SUCCESS;
            }

            $this->info("Found {$leads->count()} unassessed lead(s) to screen (limit {$limit}, budget {$maxSeconds}s).");

            $processed = 0;
            $failed = 0;

            foreach ($leads as $lead) {
                if ((microtime(true) - $startedAt) >= $maxSeconds) {
                    $this->warn('Time budget exhausted; stopping before starting another lead.');
                    break;
                }

                // Re-check: a manual "Run Full Pipeline" click or another
                // overlapping run may have already assessed this lead since
                // getUnassessedLeads() ran its query above.
                $fresh = $lead->fresh();
                if (! $fresh || $this->isAlreadyAssessed($fresh)) {
                    continue;
                }

                $leadStart = microtime(true);
                $this->line("Screening Lead #{$fresh->id} ({$fresh->company_name})...");

                try {
                    $result = $orchestrator->screenLead($fresh);
                    $elapsed = round(microtime(true) - $leadStart, 1);
                    $processed++;
                    $this->info("  -> done in {$elapsed}s. Score: ".($result['lead_score'] ?? '—').", Qualification: ".($result['qualification_status'] ?? '—'));
                    Log::info("[ScreenUnassessedLeadsCommand] Screened lead {$fresh->id} in {$elapsed}s", $result);
                } catch (\Throwable $e) {
                    $failed++;
                    $this->error("  -> failed: {$e->getMessage()}");
                    Log::error("[ScreenUnassessedLeadsCommand] Failed to screen lead {$fresh->id}: {$e->getMessage()}");
                    // screenLead() already has its own internal safeguard that
                    // guarantees a fallback score/status before it would ever
                    // throw this far — a throw here means something unexpected
                    // (e.g. a DB error). Keep going; don't let one bad lead
                    // block the rest of the batch.
                }
            }

            $totalElapsed = round(microtime(true) - $startedAt, 1);
            $remaining = $orchestrator->getUnassessedLeadsCount();
            $this->info("Batch complete in {$totalElapsed}s. Processed: {$processed}, Failed: {$failed}, Still unassessed: {$remaining}.");

            return self::SUCCESS;
        } finally {
            $lock->release();
        }
    }

    private function isAlreadyAssessed(Lead $lead): bool
    {
        return $lead->lead_score !== null
            && ! empty($lead->qualification_status)
            && ! in_array($lead->qualification_status, ['pending', 'unassessed'], true);
    }
}
