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
    'version' => '1.42.0',
    'released_at' => '2026-10-28',
    'type' => 'minor',
    'notes' => 'Added Motion UI skill (.agents/skills/motion-ui), interactive Help Center & Learning Management System (/help), updated Landing Page with LMS CTAs, enterprise functional audit report, and complete 32-case User Acceptance Testing (UAT) matrix.',
];
