<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$request = Illuminate\Http\Request::create('/api/leads/1/transcripts/4/evaluate', 'POST');
$request->headers->set('Accept', 'application/json');
$response = $kernel->handle($request);
echo $response->getContent();
