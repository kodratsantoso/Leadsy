<?php

namespace App\Console\Commands;

use App\Services\CustomerSuccess\ChurnRiskDetectionService;
use Illuminate\Console\Command;

class DetectChurnRisksCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'leadsy:detect-churn-risks';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Scan won client accounts to detect early churn indicators and trigger CSM alerts';

    /**
     * Execute the console command.
     */
    public function handle(ChurnRiskDetectionService $service): int
    {
        $this->info('Scanning client accounts for churn risk signals...');
        $risks = $service->detectChurnRisks();

        if ($risks->isEmpty()) {
            $this->info('No accounts with elevated churn risk detected.');
            return self::SUCCESS;
        }

        $this->table(
            ['Lead ID', 'Company', 'Health Score', 'Status', 'Risk Level', 'Primary Factor', 'Intervention'],
            $risks->map(fn ($r) => [
                $r['lead_id'],
                $r['company_name'],
                $r['health_score'],
                $r['health_status'],
                $r['risk_level'],
                $r['primary_risk_factor'],
                $r['recommended_intervention'],
            ])->toArray()
        );

        $this->info("Flagged {$risks->count()} accounts with proactive alerts in AI Attention Center.");

        return self::SUCCESS;
    }
}
