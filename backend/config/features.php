<?php

/*
|--------------------------------------------------------------------------
| Feature Kill-Switches
|--------------------------------------------------------------------------
| Runtime toggles for features that touch production-critical automatic
| flows, so they can be disabled via env var without a code deploy if
| something goes wrong.
*/

return [
    'lead_ai_pipeline_enabled' => env('LEAD_AI_PIPELINE_ENABLED', true),
];
