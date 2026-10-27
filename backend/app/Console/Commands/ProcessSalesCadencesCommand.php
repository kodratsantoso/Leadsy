<?php

namespace App\Console\Commands;

use App\Services\Sales\SalesCadenceExecutionService;
use Illuminate\Console\Command;

class ProcessSalesCadencesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'leadsy:process-cadences';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process and execute due multi-touch sales cadence steps across all active lead enrollments.';

    /**
     * Execute the console command.
     */
    public function handle(SalesCadenceExecutionService $service): int
    {
        $this->info('Starting Sales Cadence execution cycle...');
        
        $count = $service->executeDueEnrollments();

        $this->info("Successfully processed {$count} due cadence step(s).");

        return Command::SUCCESS;
    }
}
