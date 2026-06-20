<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\CurrencyExchangeService;

class SyncExchangeRates extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:sync-exchange-rates';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fetch latest IDR exchange rates from open.er-api.com and update currencies table';

    /**
     * Execute the console command.
     */
    public function handle(CurrencyExchangeService $service)
    {
        $this->info('Starting exchange rates synchronization...');
        
        $count = $service->syncRates();

        $this->info("Successfully updated {$count} currencies.");
    }
}
