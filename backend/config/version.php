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
    'version' => '1.2.4',
    'released_at' => '2026-05-27',
    'type' => 'patch',   // major | minor | patch
    'notes' => 'Google Ads mode-specific Integration Setting fields',
];
