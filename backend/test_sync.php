<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $user = App\Models\User::first(); // Assuming first user is admin
    echo "User: " . $user->name . " Role: " . ($user->role ? $user->role->name : 'none') . "\n";
    $request = Illuminate\Http\Request::create('/api/settings/currency/sync-rates', 'POST');
    $request->setUserResolver(function() use ($user) { return $user; });
    $controller = app(App\Http\Controllers\Api\CurrencySettingController::class);
    $response = $controller->syncRates($request, app(App\Services\CurrencyExchangeService::class));
    echo "Response: " . $response->getContent() . "\n";
} catch (\Exception $e) {
    echo "Exception: " . $e->getMessage() . "\n";
}
