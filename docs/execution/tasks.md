# Real WhatsApp Mirroring Implementation Tasks

## Audit Current Implementation
- [x] WA-001: Identify mock data in `frontend/app/whatsapp/page.tsx`
- [x] WA-002: Identify mock endpoints in `frontend/app/api/whatsapp/*`
- [x] WA-003: Identify mock state machine in `backend/app/Http/Controllers/Api/WhatsAppController.php`

## Real WhatsApp Provider Architecture
- [ ] WA-010: Design standalone `whatsapp-service` using Node.js, Express, and `@whiskeysockets/baileys`
- [ ] WA-011: Scaffold sidecar project (`package.json`, `index.js`, controllers)
- [ ] WA-012: Implement QR generation and session pairing listener
- [ ] WA-013: Implement session status endpoint
- [ ] WA-014: Implement send message emit logic
- [ ] WA-015: Implement receive message listener and Laravel Webhook bridge

## Backend Implementation
- [x] WA-020: Add database migrations: `whatsapp_sessions`, `whatsapp_conversations`, `whatsapp_messages`
- [x] WA-021: Create Eloquent Models (`WhatsappSession`, `WhatsappConversation`, `WhatsappMessage`)
- [x] WA-022: Implement `POST /api/webhooks/whatsapp` to listen for QR, status, and message payloads
- [x] WA-023: Refactor `WhatsAppController` to proxy start commands to `whatsapp-service` and serve real DB statuses

## Frontend Implementation
- [x] WA-030: Strip `frontend/app/api/*` mock folder completely
- [x] WA-031: Update `app/whatsapp/page.tsx` to read real DB statuses mapped from Laravel instead of Next.js mocks
- [x] WA-032: Integrate chat messaging UI to see inbound/outbound real messages
- [x] WA-033: Update SSOT for new environment variables and behavior

## Testing & Validation
- [x] WA-040: Validate End-to-End messaging (inbound, outbound, QR rendering).

## Authentication & Audit Recovery (Phase 1)
### Backend
- [x] AU-001: Add migration `alter_audit_logs_table_add_auth_fields.php`
- [x] AU-002: Upgrade `AuditService.php` to gather `$request` metadata explicitly and provide `logAccessDenied`/`logFailedLogin` methods.
- [x] AU-003: Update `AuthController.php` to trap rejected passwords/emails and generate audit rows.
- [x] AU-004: Attach `CheckPermission.php` failure event explicitly to `AuditService`.
### Frontend
- [x] AU-005: Create `frontend/app/(auth)/login/page.tsx` displaying email/password interface.
- [x] AU-006: Build `zustand` persist store `useAuthStore` to securely hold the frontend `token`.
- [x] AU-007: Wire `apiFetch.ts` client to prepend `Authorization` logic for all requests smoothly.
- [x] AU-008: Encircle `AppShell` with strong logic returning `<Redirect>` to `/login` if authentication breaks.
- [x] AU-009: Bind `audit-logs` Data Table directly to Laravel payload (`GET /api/audit-logs`) instead of mocked constants.

### Network Recovery
- [x] NR-001: Standardize API runtime to allow `NEXT_PUBLIC_API_BASE_URL` routing explicitly and avoid fixed `3001` crashes.
- [x] NR-002: Distinguish between validation errors and fatal upstream backend disconnections securely in `login/page.tsx`.
- [x] NR-003: Add `/api/health` validation route to Laravel layer to confirm readiness safely.

### Docker Sandbox Configuration
- [x] DS-001: Implement safe `prasetia-*` namespace collision handlers in `docker-compose.yml`.
- [x] DS-002: Translate PostgreSQL/Redis mapping interfaces to distinct safe ports (`5435`, `6382`).
- [x] DS-003: Lock Laravel backend to target native frontend API expectation (`3001`) inside `composer.json` loops.
- [x] DS-004: Align Frontend `.env` explicitly with `NEXT_PUBLIC_API_BASE_URL`.

## Enterprise Recovery Round 2 (Phase 2)

### Foundation & UI Rationalization
- [x] ER2-001: Demolish all remnant Next.js hardcoded overrides inside `frontend/app/api`.
- [x] ER2-002: Remove fake duplicate `frontend/app/funnel`, `frontend/app/ai-providers`, `frontend/app/users` paths.
- [x] ER2-003: Update AppShell global navigation to remove duplicated links and fix Logout bindings securely to `useAuthStore`.

### Settings Information Architecture (IA)
- [x] ER2-010: Reconstruct `/settings` root into proper sub-navigation cards (Users, AI Defaults, Integrations, Webhooks, etc).
- [x] ER2-011: Build robust real-API CRUD interface for Users & Roles inside Settings tree.
- [x] ER2-012: Safely migrate AI Defaults and Model Routing to specific Settings sub-category.
- [x] ER2-013: Map active Webhooks array controls visually with `POST/DELETE /settings/integrations`.

### Core Data CRUD Activation
- [x] ER2-020: Convert `Industries` and `SubIndustries` arrays to interactive database `POST/PUT/DELETE` commands visually.
- [x] ER2-021: Connect CRM Funnel metrics effectively to `GET /dashboard` endpoints with active statistics and new charts.
- [x] ER2-022: Remap Map Radius Search directly into `POST /leads/discover` binding properly with unified query hooks.
- [x] ER2-023: Link raw Product catalogs actively against `GET /products` logic eliminating dummy variables.

### Module Upgrades
- [x] ER2-030: Equip Audit Logs specifically with live frontend-to-Excel (CSV/XLSX) and TXT flat export capabilities natively.
- [x] ER2-031: Hook WhatsApp interactive session links properly to raw Leads list for Direct Action messaging buttons.

## Phase 3: Enterprise Mock Data → PostgreSQL Migration (Completed ✅)

### Codebase Audit
- [x] MD-001: Full repository scan — identified 4 critical, 4 partial, 2 minor mock data violations
- [x] MD-002: Built Gap Matrix with Before/After/Status for all 10 modules

### Backend
- [x] MD-010: DashboardController — added `pipeline_leads`, `duplicate_rate` (%), `leads_change`, `qualified_change` from real DB queries
- [x] MD-011: AiProviderController — added `GET /ai-providers/usage-summary` reading real `ai_requests` aggregation
- [x] MD-012: IntegrationConfigController — added single-item POST format (for webhooks/notifications), `DELETE` endpoint
- [x] MD-013: api.php — registered `ai-providers/usage-summary` (before wildcard), `DELETE /settings/integrations/{id}`
- [x] MD-014: DatabaseSeeder — seeded 10 industries (42 sub-industries), 3 sample products, 3 AI providers (7 models, inactive), 3 notification pref defaults

### Frontend
- [x] MD-020: `settings/ai-defaults/page.tsx` — replaced `useEffect+fetch` with `useQuery+apiFetch`; removed `Math.random()`; Usage tab reads real `ai_requests` data with proper empty state
- [x] MD-021: `settings/notifications/page.tsx` — DB-backed toggles via `integration_configs` (value persists across refresh)
- [x] MD-022: `settings/webhooks/page.tsx` — wired dead Trash2 delete button to `deleteMutation` calling `DELETE /settings/integrations/{id}`
- [x] MD-023: `settings/environment/page.tsx` — fetches `APP_NAME`/`APP_ENV` from `/api/settings/public`; static ports show `[Config]` badge
- [x] MD-024: `app/page.tsx` (Dashboard) — fixed field aliasing for `duplicate_rate`, `pipeline_leads`, null-safe `change` fields
- [x] MD-025: `app/whatsapp/page.tsx` — removed hardcoded `"Last active: Just now"` / `"+62 812 ••••"` — reads real `last_activity_at` from session API
- [x] MD-026: `app/map/page.tsx` — replaced bottom-left note with prominent amber banner + direct link to Settings; added "Schematic preview" footnote
