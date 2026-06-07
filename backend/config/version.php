<?php

/*
|--------------------------------------------------------------------------
| Application Version Config
|--------------------------------------------------------------------------
| Single source of truth untuk versi aplikasi yang berjalan di backend.
| Update file ini setiap kali rilis versi baru, bersamaan dengan:
|   - CHANGELOG.md (di root repo)
|   - version.json (di root repo)
|   - git tag vX.Y.Z
*/

return [
    'version' => '1.6.0',
    'released_at' => '2026-06-07',
    'type' => 'minor',   // major | minor | patch
    'notes' => 'Add multi-user WhatsApp workspace isolation, simplified Mekari Qontak Auth, active sessions monitor, and user deletion resource transfer',
];
