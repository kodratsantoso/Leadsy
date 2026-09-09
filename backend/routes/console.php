<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

\Illuminate\Support\Facades\Schedule::command('leadsy:lark-pull')->hourly();
\Illuminate\Support\Facades\Schedule::command('leadsy:detect-stalled-deals')->dailyAt('08:00');
\Illuminate\Support\Facades\Schedule::command('leadsy:detect-churn-risks')->dailyAt('08:30');
\Illuminate\Support\Facades\Schedule::command('leadsy:detect-csm-alerts')->dailyAt('09:00');
