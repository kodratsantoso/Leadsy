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
    protected $signature = 'app:sync-exchange-rates {base_currency=IDR : The base currency code to fetch rates against}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fetch latest exchange rates from open.er-api.com and update currencies table';

    /**
     * Execute the console command.
     */
    public function handle(CurrencyExchangeService $service)
    {
        $base = strtoupper($this->argument('base_currency'));
        $this->info("Starting exchange rates synchronization with base {$base}...");
        
        $count = $service->syncRates($base);

        $this->info("Successfully updated {$count} currencies relative to {$base}.");
    }
}
