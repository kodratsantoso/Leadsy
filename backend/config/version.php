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
    'version' => '1.7.2',
    'released_at' => '2026-06-21',
    'type' => 'patch',   // major | minor | patch
    'notes' => 'Fix 403 Unauthorized error on Pre-Meeting Brief, Customer Journey endpoints, and Currency Sync.',
];
