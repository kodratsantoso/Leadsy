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
    'version' => '1.47.0',
    'released_at' => '2026-11-07',
    'type' => 'minor',
    'notes' => 'Enterprise security posture hardening based on SecureScope Pen-Test findings (Strict-Transport-Security, Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, server header masking via Laravel middleware) and Client-Side Privacy & Data Loss Prevention Shield (Dynamic Forensics Watermark with user identity/timestamp, inspect shortcuts deterrent, context menu lock, and CSS print-to-PDF blocking).',
];
