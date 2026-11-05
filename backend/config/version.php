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
    'version' => '1.44.1',
    'released_at' => '2026-11-05',
    'type' => 'patch',
    'notes' => 'Hotfix React Error #31 on Lead Detail (/leads/[id]): safely extract display labels from Eloquent snake_case relation objects (business_category, industry, sub_industry, product) and harden AI profile JSON rendering across OverviewTab, AiDeepProfileSection, IntelligenceTab, and PreMeetingBriefTab.',
];
