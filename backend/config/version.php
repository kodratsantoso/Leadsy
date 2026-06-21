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
    'version' => '1.7.3',
    'released_at' => '2026-06-21',
    'type' => 'patch',   // major | minor | patch
    'notes' => 'Fix 404 Route Not Found error for Pre-Meeting Brief generate endpoint.',
];
