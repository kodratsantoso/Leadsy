<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$lead = App\Models\Lead::first();
if (!$lead) {
    echo "No lead found.\n";
    exit;
}

try {
    $service = app(App\Services\Sales\CustomerJourneyService::class);
    $data = $service->compileJourney($lead);
    echo "SUCCESS\n";
    print_r(array_keys($data));
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
