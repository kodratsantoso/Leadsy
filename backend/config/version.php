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
    'version' => '1.43.0',
    'released_at' => '2026-11-04',
    'type' => 'minor',
    'notes' => 'Added DB-cached Industry Intelligence Newsletter (/lead-generator/newsletter) with corporate/brand entity extraction, structured editorial telemetry headers, live CRM lead cross-matching, and 1-click/batch Convert to Lead workflow; hardened Lark SSO global email reconciliation and K3s frontend pod memory limits.',
];
