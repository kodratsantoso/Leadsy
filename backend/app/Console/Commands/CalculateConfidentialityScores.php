<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Lead;
use App\Services\Analytics\ConfidentialityScoringService;

class CalculateConfidentialityScores extends Command
{
    protected $signature = 'leadsy:calculate-confidentiality {--force : Recalculate for all leads}';
    protected $description = 'Calculate or recalculate confidentiality scores for leads';

    public function handle(ConfidentialityScoringService $service)
    {
        $this->info('Calculating confidentiality scores...');
        
        $query = Lead::query();
        
        if (!$this->option('force')) {
            $query->whereDoesntHave('confidentialityAssessment');
        }

        $leads = $query->get();
        $count = $leads->count();
        
        if ($count === 0) {
            $this->info('No leads require assessment.');
            return 0;
        }

        $bar = $this->output->createProgressBar($count);
        $bar->start();

        foreach ($leads as $lead) {
            $service->calculateForLead($lead);
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Successfully calculated scores for $count leads.");

        return 0;
    }
}
