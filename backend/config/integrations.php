<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Integration Credential Encryption
    |--------------------------------------------------------------------------
    |
    | Use a dedicated 32-byte base64 key for third-party credentials:
    | php -r "echo 'base64:'.base64_encode(random_bytes(32)).PHP_EOL;"
    |
    | The fallback to APP_KEY keeps local/dev environments usable, but
    | production should always set INTEGRATION_CREDENTIAL_KEY separately.
    |
    */

    'credential_key' => env('INTEGRATION_CREDENTIAL_KEY', env('APP_KEY')),
    'credential_key_id' => env('INTEGRATION_CREDENTIAL_KEY_ID', 'primary'),
];
