<?php

namespace App\Console\Commands;

use App\Services\Sales\StalledDealDetectionService;
use Illuminate\Console\Command;

class DetectStalledDealsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'leadsy:detect-stalled-deals {--days= : Custom threshold in days for all open stages}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Scan open leads in pipeline and trigger AI alerts for stalled deals exceeding inactivity thresholds';

    /**
     * Execute the console command.
     */
    public function handle(StalledDealDetectionService $service): int
    {
        $days = $this->option('days') ? (int) $this->option('days') : null;

        $this->info('Scanning pipeline for stalled deals...');
        $stalledDeals = $service->detectStalledLeads($days);

        if ($stalledDeals->isEmpty()) {
            $this->info('No stalled deals detected. Pipeline momentum is healthy.');
            return self::SUCCESS;
        }

        $this->table(
            ['Lead ID', 'Company', 'Stage', 'Owner', 'Days Inactive', 'Severity', 'Recommended Action'],
            $stalledDeals->map(fn ($deal) => [
                $deal['lead_id'],
                $deal['company_name'],
                $deal['stage'],
                $deal['owner'],
                $deal['days_inactive'],
                $deal['severity'],
                $deal['recovery_action'],
            ])->toArray()
        );

        $this->info("Successfully highlighted {$stalledDeals->count()} stalled deals in AI Attention Center.");

        return self::SUCCESS;
    }
}
