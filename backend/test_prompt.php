<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$template = App\Models\AiPromptTemplate::where('feature_name', 'pre_meeting_brief_generation')->first();
$activeVersion = $template->activeVersion;
echo "Active version ID: " . ($activeVersion ? $activeVersion->id : 'NONE') . "\n";
echo "Content: \n" . ($activeVersion ? $activeVersion->content : 'NONE') . "\n";
