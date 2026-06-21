<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = App\Models\User::first();
echo "User: " . $user->name . "\n";
echo "Has settings.manage: " . ($user->can('settings.manage') ? 'yes' : 'no') . "\n";
echo "Has integrations.manage: " . ($user->can('integrations.manage') ? 'yes' : 'no') . "\n";
