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
    'version' => '1.7.0',
    'released_at' => '2026-06-20',
    'type' => 'minor',   // major | minor | patch
    'notes' => 'Fix Pre-Meeting Brief and Customer Journey AI generation. Support dynamic base currency exchange rates synchronization.',
];
