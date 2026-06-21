<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$request = Illuminate\Http\Request::create('/api/leads/1/customer-journey', 'GET');
// Mock user
$user = App\Models\User::first();
$app->make('auth')->login($user);
$response = $kernel->handle($request);
echo "STATUS: " . $response->getStatusCode() . "\n";
echo substr($response->getContent(), 0, 500) . "\n";
