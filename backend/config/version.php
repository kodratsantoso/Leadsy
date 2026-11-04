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
    'version' => '1.44.0',
    'released_at' => '2026-11-04',
    'type' => 'minor',
    'notes' => 'Full AI Deep Company Profiling persistence & Lead Detail UI unification: added 5 firmographic scalar columns on leads (legal_name, ownership_type, year_established, operational_scope, whatsapp), created relational lead_office_locations table with manual/AI multi-site management, wired full manual/auto profiling hydration into Presales Discovery & BANTC Question Guides, and rendered AI Deep Profile & Presales Playbook across Overview, Intelligence, and Pre-Meeting Brief tabs.',
];
