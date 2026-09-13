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
    'version' => '1.24.0',
    'released_at' => '2026-09-13',
    'type' => 'minor',
    'notes' => 'System Audit remediation (Fase 0-4): modul Customer Success baru, Session Timeout & Password Policy sungguhan, perluasan Global Search, rekonsiliasi 3 sumber revenue, dan puluhan perbaikan RBAC/WhatsApp/Professional Services.',
];
