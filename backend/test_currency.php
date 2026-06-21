<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$service = app(\App\Services\CurrencyExchangeService::class);
try {
    $count = $service->syncRates('IDR');
    echo "Success: $count\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
