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
    'version' => '1.2.0',
    'released_at' => '2026-05-27',
    'type' => 'minor',   // major | minor | patch
    'notes' => 'Integration Module Phase 1 foundation with isolated integration schema, AES-256-GCM credential envelopes, and webhook idempotency storage',
];
