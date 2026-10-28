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
    'version' => '1.37.0',
    'released_at' => '2026-10-28',
    'type' => 'minor',
    'notes' => 'Purge deprecated root mirrors, K3s staging pipeline with serialized CI runners, WhatsApp sidecar exponential backoff, and cadence scheduler cron.',
];
