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
    'version' => '1.12.0',
    'released_at' => '2026-06-28',
    'type' => 'minor',
    'notes' => 'Split target functionality into Revenue Target and KPI Target modules.',
];
