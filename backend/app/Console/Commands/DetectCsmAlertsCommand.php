<?php

namespace App\Console\Commands;

use App\Services\CustomerSuccess\CsmProactiveAlertService;
use Illuminate\Console\Command;

class DetectCsmAlertsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'leadsy:detect-csm-alerts';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Scan client accounts for renewal windows, detractor surveys, and trigger proactive CSM highlights';

    /**
     * Execute the console command.
     */
    public function handle(CsmProactiveAlertService $service): int
    {
        $this->info('Scanning accounts for proactive CSM alerts...');
        $alerts = $service->runProactiveScan();

        if ($alerts->isEmpty()) {
            $this->info('All accounts are healthy and contract renewal windows are clear.');
            return self::SUCCESS;
        }

        $this->table(
            ['Type', 'Lead ID', 'Company'],
            $alerts->map(fn ($a) => [
                $a['type'],
                $a['lead_id'],
                $a['company_name'],
            ])->toArray()
        );

        $this->info("Successfully flagged {$alerts->count()} proactive CSM alerts.");

        return self::SUCCESS;
    }
}
