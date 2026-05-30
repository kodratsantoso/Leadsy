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
    'version' => '1.4.0',
    'released_at' => '2026-05-30',
    'type' => 'minor',   // major | minor | patch
    'notes' => 'Add lead subsidiary relationship, Detail page map preview, and unified edit leads form',
];
