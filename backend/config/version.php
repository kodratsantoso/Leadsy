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
    'version' => '1.2.1',
    'released_at' => '2026-05-27',
    'type' => 'patch',   // major | minor | patch
    'notes' => 'Provider-specific Integration Setting credentials with OAuth URL generation, connection checks, and supported platform data previews',
];
