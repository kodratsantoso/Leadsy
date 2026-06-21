<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $lead = App\Models\Lead::first();
    echo "Using Lead ID: " . $lead->id . "\n";
    $service = app(App\Services\Sales\PreMeetingBriefService::class);
    $brief = $service->generateBrief($lead);
    echo "Success! Brief ID: " . $brief->id . "\n";
    echo "Summary JSON: " . json_encode($brief->summary_json) . "\n";
} catch (\Exception $e) {
    echo "Exception: " . $e->getMessage() . "\n";
} catch (\TypeError $e) {
    echo "TypeError: " . $e->getMessage() . "\n";
}
