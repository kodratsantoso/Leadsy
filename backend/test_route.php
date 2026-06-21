<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$request = Illuminate\Http\Request::create('/api/leads/25/customer-journey', 'GET');
$user = App\Models\User::first();
$app->make('auth')->guard()->login($user);
$request->setUserResolver(function () use ($user) { return $user; });
$response = $kernel->handle($request);
echo "STATUS: " . $response->getStatusCode() . "\n";
echo substr($response->getContent(), 0, 500) . "\n";
