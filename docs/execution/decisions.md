# Architecture Decision Records (ADR)

## ADR-001: Interim Next.js API Layer
- **Date**: 2026-04-11
- **Status**: Active
- **Decision**: Since PHP/Docker are not available on the host, implement a Next.js API layer for frontend E2E validation while maintaining the Laravel backend as the production target.
- **Rationale**: Allows full feature validation without infrastructure dependencies.
- **Impact**: Frontend can be tested end-to-end; Laravel backend deploys via Docker when ready.

## ADR-002: Multi-Provider AI Architecture
- **Date**: 2026-04-11
- **Status**: Active
- **Decision**: Implement a provider-agnostic AI orchestration layer supporting OpenAI, Anthropic, and Google Gemini with automatic fallback routing.
- **Rationale**: BRD §4 requires multi-provider support with fallback. Each provider has different API contracts that must be abstracted.
- **Impact**: Services (AiOrchestrationService) handle provider-specific formatting. Model routes define primary + fallback for each function.

## ADR-003: 4-Tier Deduplication Priority
- **Date**: 2026-04-11
- **Status**: Active
- **Decision**: Dedup engine uses priority: Domain > Name+Location (500m) > Email > Phone. Exact domain match = exact_duplicate; others = probable_duplicate.
- **Rationale**: BRD §3.7 defines exact order. Domain is the strongest signal, name+proximity handles cases where companies have multiple entries.
- **Impact**: DeduplicationService implements this exactly. New contacts can be appended to existing leads without creating duplicates.

## ADR-004: Split Map Layout Architecture
- **Date**: 2026-04-11
- **Status**: Active
- **Decision**: Map page uses 3-panel layout: Left (controls + lead list) | Center (map + markers) | Right (slide-out lead drawer).
- **Rationale**: BRD §12.2B requires this exact layout for optimal sales workflow. No full-page reloads for lead selection.
- **Impact**: Map page is a single client component with state-driven drawer. Selected lead syncs between list and map markers.

## ADR-005: Queue-Based Async Processing
- **Date**: 2026-04-11
- **Status**: Active
- **Decision**: AI scoring, deduplication checks, and lead enrichment run as queued jobs (Redis/Horizon).
- **Rationale**: These operations involve external APIs with variable latency. Sync execution would degrade UX.
- **Impact**: ScoreLeadJob, DeduplicateLeadJob, EnrichLeadJob dispatch to named queues (scoring, enrichment, default).

## ADR-006: RBAC Middleware Pattern
- **Date**: 2026-04-11
- **Status**: Active
- **Decision**: Route-level RBAC via `permission` middleware alias. Super admins bypass all checks. Permission matrix loaded from database via role->permissions pivot.
- **Rationale**: BRD §5.1 requires permission matrix. Middleware approach is Laravel-standard and testable.
- **Impact**: Every sensitive route has ->middleware('permission:xxx'). CheckPermission middleware checks user role's permissions.

## ADR-007: Integration Configuration Layer
- **Date**: 2026-04-11
- **Status**: Active
- **Decision**: All 3rd party integration keys (Maps, Webhooks, WhatsApp, AI endpoints where needed) will be stored in an `integration_configs` table rather than hardcoded `.env` files.
- **Rationale**: The execution prompt requires a unified architecture for Integration setup, allowing admin users to dynamically change/test inputs.
- **Impact**: The UI polls `/api/settings/public` for safe keys. Encrypted keys stay strictly backend only.

## ADR-008: WhatsApp Session Mock Simulator
- **Date**: 2026-04-11
- **Status**: Active
- **Decision**: WhatsApp QR implementation will use a simulated mock-state-machine built on Laravel Cache to mimic QR generation and session scanning. 
- **Rationale**: Setting up a persistent Web Socket (Baileys/WWebJS) session requires a Node.js daemon which is outside the PHP standard infrastructure scope natively. This allows validation of the frontend UI polling logic exactly as intended by the BRD without heavy side-car architecture.
- **Impact**: Backend endpoint `POST /api/whatsapp/session/init` populates Cache and automatically transitions to `connected` after 8 seconds. Frontend correctly polls this state and unlocks WhatsApp UI actions.
## ADR-009: Real Session-Based WhatsApp Engine (Sidecar Pattern)
- **Date**: 2026-04-11
- **Status**: Active
- **Decision**: Replace the Mock WhatsApp payload logic with a standalone Node.js sidecar service (`whatsapp-service/`) running `@whiskeysockets/baileys`.
- **Rationale**: Real WhatsApp Web mirroring requires an active WebSocket daemon. Laravel (PHP) cannot natively host an ongoing WebSocket without complex secondary runner layers (e.g., Swoole/Reverb). A dedicated lightweight Node.js sidecar is standard practice for PHP ecosystems and cleanly handles QR bridging via webhooks.
- **Impact**: Requires users to spin up a secondary container/process (`npm start`) on port 3002. Mocks are explicitly disabled.

## ADR-010: Foundation Auth & Audit Interception
- **Date**: 2026-04-11
- **Status**: Active
- **Decision**: The Next.js frontend will use `zustand` (persist middleware via LocalStorage) to keep trace of the Sanctum JWT session state, actively excluding the `AppShell` Layout unless token exists. Backend will passively map `audit_log` records fetching explicit raw data `($request->method())` bypassing default Laravel magic properties.
- **Rationale**: Re-engineering full Next.js dynamic session interceptor causes flicker. Standalone SPA routing with Client-Side Redirect preserves speed. Audit log MUST have exact strings (IP, Method, Path, Status) without nested relations that fail to trace historical drops. Password resets are intentionally deferred for Phase 7 MVP rollout.
- **Impact**: Developers utilizing frontend locally will be immediately locked out until accessing `/login`.

## ADR-011: Docker Coexistence Port Strategy
- **Date**: 2026-04-11
- **Status**: Active
- **Decision**: Redesign the docker orchestration layer `docker-compose.yml` to utilize uniquely indexed container prefixes (`prasetia-leads-*`) and exclusively map offline data layers to safe random collision-free ports (`5435`/`6382`). Backend API exclusively bound to `3001`.
- **Rationale**: Strict compliance with Enterprise-Grade local testing requiring multiple sandbox clusters active simultaneously.
- **Impact**: All `.env` replicas and startup scripts must rigidly observe `5435`/`6382` defaults and `3001` backend configurations securely.

---

## ADR-012: Seeded DB Sample Data Strategy
- **Date**: 2026-04-12
- **Status**: Active
- **Decision**: Industries, products, and AI provider records are seeded via `DatabaseSeeder.php` (not hardcoded in the frontend). These are real DB rows — explicitly marked "seeded sample data" in code comments. They can be modified by admins at runtime.
- **Rationale**: SSOT §5 mandates that ALL runtime data originates from PostgreSQL. Hardcoding reference data in the frontend violates this. DB seeding is the approved pattern for bootstrapping an empty database.
- **Impact**: Running `php artisan db:seed --force` populates 10 industries, 3 products, 3 AI providers, 7 models, and 3 notification prefs. AI providers are seeded as `status=inactive` with placeholder API keys — admins must configure real keys in Settings → AI Defaults.

## ADR-013: AI Usage Summary — Empty State vs. Seeded Rows
- **Date**: 2026-04-12
- **Status**: Active
- **Decision**: The AI Providers "Usage" tab shows a proper empty state message ("No AI requests logged yet") when the `ai_requests` table is empty. We do NOT seed fake `ai_requests` rows.
- **Rationale**: `ai_requests` records are automatically created by `AiOrchestrationService` when leads are scored. Seeding fake request rows would produce misleading cost/latency figures that could confuse production users. An explicit empty state is more honest and operationally safer.
- **Impact**: New deployments will show the empty state until the first AI-scored lead is created. This is expected and correct behavior.

## ADR-014: Notification Preferences in integration_configs Table
- **Date**: 2026-04-12
- **Status**: Active
- **Decision**: User notification channel preferences (`notify_inapp_enabled`, `notify_email_enabled`, `notify_whatsapp_enabled`) are stored in the `integration_configs` table under `category = 'notifications'`, not in a separate `notification_preferences` table.
- **Rationale**: The `integration_configs` table already provides encrypted key-value storage, grouping by category, and a standardized CRUD API. Creating a new migrations file for 3 boolean flags would add unnecessary schema complexity.
- **Impact**: Notification preferences are loaded via `GET /settings/integrations` and saved via `POST /settings/integrations` (single-item format). The `IntegrationConfigController` was extended to support both single-item and bulk-array POST formats.

## ADR-015: Environment Page Hybrid Strategy (Static + API)
- **Date**: 2026-04-12
- **Status**: Active
- **Decision**: The Settings → Environment page fetches `APP_NAME` and `APP_ENV` from `/api/settings/public` (real DB + runtime config), but displays docker infrastructure port numbers (`3000`, `3001`, `5435`, `6382`) as static values with a `[Config]` badge.
- **Rationale**: Port numbers are defined in `docker-compose.yml` infrastructure — they are not runtime data and should not be stored in the database. However, `APP_NAME` and `APP_ENV` are meaningful runtime values that should reflect the actual backend configuration.
- **Impact**: Adding or removing ports requires a `docker-compose.yml` change and a frontend deploy, which is appropriate for infrastructure changes. Runtime app metadata (name, env) reflects the live backend instantly.

## ADR-016: apiFetch as Unified Frontend API Client
- **Date**: 2026-04-12
- **Status**: Active
- **Decision**: All authenticated API calls in the frontend MUST use `apiFetch` from `@/lib/apiFetch.ts`, not the raw `fetch()` Web API or the `api` client from `@/lib/api/client.ts`. `useQuery` hooks wrapping `apiFetch` are the approved pattern.
- **Rationale**: `apiFetch` injects the Sanctum Bearer token from `useAuthStore`, handles 401 auto-redirect to `/login`, and normalizes paths through the Next.js proxy. The `settings/ai-defaults/page.tsx` was found using raw `fetch()` without token injection, causing auth failures for protected endpoints.
- **Impact**: All future components must use `useQuery(() => apiFetch('/endpoint').then(r => r.json()))`. The `api` client in `lib/api/client.ts` uses `credentials: 'include'` (cookie-based) and may be deprecated in favor of `apiFetch` in a future cleanup pass.

## ADR-017: Incremental Monorepo Structure Refactor
- **Date**: 2026-04-18
- **Status**: Active
- **Decision**: Adopt a staged project structure refactor. Phases 1–3 executed immediately (safe, non-breaking). Phase 4 (`apps/` monorepo restructure) deferred pending explicit confirmation — it requires changes to Docker build contexts, Dockerfile paths, and resolution of the `frontend/` submodule situation.
- **Rationale**: Full monorepo restructure (`apps/frontend`, `apps/backend`) is the target architecture but carries high risk of breaking the Docker build pipeline, Next.js config, and CI. Incremental approach ensures the app stays functional throughout.
- **Impact**:
  - Phase 1 ✅: Removed `package.json.bak`, reorganized `docs/` (execution/, architecture/ subdirs), moved `routes.txt` into docs/.
  - Phase 2 ✅: Moved 4 root-level Laravel services to proper domain subdirectories (`Services/AI/AiOrchestrationService`, `Services/WhatsApp/WhatsAppSyncEngine`, `Services/Lead/LeadDiscoveryService`, `Services/Maps/MapSearchHistoryService`). Updated all 14 affected PHP files.
  - Phase 3 ✅: Created `modules/` directory. Moved feature components (`ai/`, `leads/`, `map/`) from `components/` into `modules/{feature}/components/`. Updated all import paths. `components/` now contains only shared UI (`ui/`, `layout/`).
  - Phase 4 ⏳: Pending confirmation — monorepo `apps/` restructure.

## ADR-018: Enterprise CRUD Audit & Full Coverage Implementation
- **Date**: 2026-04-18
- **Status**: Active
- **Decision**: All platform modules must have full CRUD coverage — every applicable entity requires backend routes (GET/POST/PUT/DELETE), frontend list/detail/form/delete UI, input validation, and confirmation dialogs for destructive actions.
- **Rationale**: Audit of all ~133 controller methods and 19 frontend pages revealed significant gaps: Territories (read-only UI), ICP Profiles (read-only UI), Revenue Rules (backend only, no UI), Roles (create/read only, no edit/delete), WhatsApp Campaigns (no delete), Funnel Stages (no delete). Incomplete CRUD creates orphaned data and forces manual DB intervention.
- **Impact**:
  - New pages: `app/territories/page.tsx`, `app/icp-profiles/page.tsx`, `app/settings/revenue-rules/page.tsx`
  - Enhanced pages: `app/qualification/page.tsx` (Parameter Sets tab), `app/settings/users/page.tsx` (Role CRUD, User deactivate)
  - Backend endpoints added: `PUT leads/{lead}/activities/{activity}`, `PUT leads/{lead}/meetings/{meeting}`, `DELETE funnel/stages/{stage}`, `DELETE roles/{role}`, `DELETE whatsapp/campaigns/{campaign}`
  - Navigation: Territories and ICP Profiles added to sidebar

## ADR-019: Referential Integrity Guard Pattern on Destroy Endpoints
- **Date**: 2026-04-18
- **Status**: Active
- **Decision**: All `destroy()` controller methods MUST check for dependent records and return HTTP 422 with a human-readable message before deleting. Hard cascade deletes are only allowed for owned child records (e.g., campaign recipients).
- **Rationale**: Laravel's DB-level cascade errors surface as 500s with opaque messages. A 422 with a message like "Cannot delete role: users are assigned to it" gives the frontend something actionable to display. This prevents broken FK state and data loss by accident.
- **Impact**: Pattern codified for: Role (users assigned check), FunnelStage (leads assigned check), WhatsAppCampaign (running/scheduled status check). All future destroy endpoints must follow this pattern.

## ADR-020: Soft-Delete Preference for Business-Critical Entities
- **Date**: 2026-04-18
- **Status**: Active
- **Decision**: Entities that represent historical business records (Leads, QualificationParameterSets, QualificationWorkflows, Tenants) use Laravel SoftDeletes. Entities that are pure configuration (Roles, FunnelStages, Territories, IcpProfiles) use hard delete.
- **Rationale**: Leads and qualification records have audit trail requirements — permanent deletion destroys historical analytics. Configuration entities are reference data with no audit history requirement; soft-deleting them adds query complexity (`withTrashed`) for no business benefit.
- **Impact**: Frontend confirmation modals for soft-delete entities mention "soft-delete" and "can be restored". Hard-delete modals use "permanently delete" language. QualificationParameterSet modal explicitly states this.

## ADR-021: Transcript UI Implemented Without Update Endpoint
- **Date**: 2026-04-19
- **Status**: Active
- **Decision**: Transcripts support Create, Read, Delete but not Update. The backend `storeTranscript` endpoint exists; no `updateTranscript` was added.
- **Rationale**: Transcripts are verbatim records (call recordings, meeting notes). Editing the text post-facto would destroy audit integrity. Delete + re-create is the correct workflow if a transcript needs correction.
- **Impact**: Frontend shows Create (form) + Read (list) + Delete (confirm modal). No edit button rendered.

## ADR-022: WhatsApp Campaign Update Restricted to Pending/Draft Status
- **Date**: 2026-04-19
- **Status**: Active
- **Decision**: `PUT /whatsapp/campaigns/{campaign}` returns 422 if campaign status is `sent`.
- **Rationale**: Editing a campaign that has already been broadcast would create a mismatch between what was sent and what the record shows. Only `draft` and `pending` campaigns may be edited (name + message_template).
- **Impact**: Frontend only shows Edit button for campaigns not in `sent`, `running`, or `scheduled` status.

## ADR-023: Sub-Industry Update via PUT Endpoint
- **Date**: 2026-04-19
- **Status**: Active
- **Decision**: Added `PUT /industries/{industry}/sub-industries/{sub}` route and `updateSub()` controller method.
- **Rationale**: Sub-industries were the only nested resource without an update path — creating them with a typo required delete + recreate.
- **Impact**: Frontend industries page now shows an Edit button (pencil icon) per sub-industry row on hover.

## ADR-024: Funnel Stage Management Page Added to Settings
- **Date**: 2026-04-19
- **Status**: Active
- **Decision**: Created `/settings/funnel-stages` as a dedicated CRUD page for pipeline stage management.
- **Rationale**: The backend already had full CRUD for funnel stages (`GET/POST/PUT/DELETE /funnel/stages`) but there was no frontend management UI. Users had no way to add, rename, or reorder stages without DB access.
- **Impact**: New page `app/settings/funnel-stages/page.tsx`. Settings index card added.

## ADR-025: AI Provider Management via UI (Replacing Seed-Only Workflow)
- **Date**: 2026-04-19
- **Status**: Active
- **Decision**: AI Defaults page now has real Create/Edit/Delete modals for providers and inline Add/Delete for models. The previous "Add Provider" button showed an `alert()` telling users to configure via Integrations.
- **Rationale**: Provider lifecycle should be fully manageable through the UI without DB seeds or manual config. API key is accepted in the create/edit form (password field).
- **Impact**: `app/settings/ai-defaults/page.tsx` significantly enhanced. Providers can be created, edited (name/URL/key/status), deleted with confirmation.

## ADR-026: AI Configuration Consolidated into Settings → AI Default
- **Date**: 2026-04-19
- **Status**: Active
- **Decision**: All AI provider credentials, feature routing, fallback order, prompt templates, and AI health/usage visibility are consolidated into `Settings → AI Default`. Older split responsibilities are deprecated in favor of this single control center.
- **Rationale**: AI configuration had grown across provider CRUD, routing, and runtime assumptions. Centralizing it reduces operator confusion, avoids provider collisions, supports governed prompt changes, and gives admins one source of truth for secrets and fallback behavior.
- **Impact**:
  - Added `/api/settings/ai-default` endpoints for provider registry, secure key reveal, route management, prompt versioning, connection tests, and usage overview.
  - Added `ai_connection_tests`, `ai_prompt_templates`, and `ai_prompt_template_versions` tables plus enriched `ai_providers` metadata fields.
  - API keys remain masked by default; full reveal and copy are limited to admin-authorized roles and are audit logged.
  - `AiOrchestrationService` now resolves priority routes from the consolidated feature-route source and prepends active prompt-template instructions per feature at runtime.

## ADR-027: SQLite-Safe Test Fallback for Enterprise Schema Hardening
- **Date**: 2026-04-19
- **Status**: Active
- **Decision**: The migration `2026_04_18_170000_harden_core_business_schema.php` now branches by driver so PostgreSQL-only DDL is only used on PostgreSQL, while SQLite test runs receive equivalent compatible indexes.
- **Rationale**: The focused AI settings tests should be able to run in fallback SQLite mode without being blocked by production-only Postgres syntax such as `DROP CONSTRAINT IF EXISTS`, `COALESCE(... )` partial indexes, and `pg_tables` checks.
- **Impact**: Feature tests for the consolidated AI settings API now run with `DB_CONNECTION=sqlite DB_DATABASE=:memory:`. PostgreSQL remains the production source of truth.

## ADR-028: `frontend/` Is the Only Active UI Source of Truth
- **Date**: 2026-04-19
- **Status**: Active
- **Decision**: The repository standardizes `frontend/` as the only active UI source of truth. The root Next.js tree (`app/`, `components/`, `lib/`, `store/`, related config) is deprecated and retained only as a compatibility layer until a later removal pass.
- **Rationale**: Docker and local runtime already mount and serve `./frontend`, while the duplicate root tree caused fixes to land in the wrong place and never reach the live app.
- **Impact**:
  - Root `package.json` now delegates UI scripts to `frontend/`.
  - Root duplicate UI directories are explicitly marked deprecated.
  - Future frontend feature work must land in `frontend/` only.

## ADR-029: Live AI Default UI Moved Fully Into `frontend/`
- **Date**: 2026-04-19
- **Status**: Active
- **Decision**: The consolidated `Settings → AI Default` control center is implemented in `frontend/app/settings/ai-defaults/page.tsx`, and Integrations no longer presents AI credentials as an alternative management surface.
- **Rationale**: The original enterprise AI consolidation work had landed in the deprecated root UI tree, while the running app still showed the legacy 3-tab AI screen. Operators need the live UI to match the consolidated backend and governance model.
- **Impact**:
  - The running frontend now exposes Providers, Feature Routing, Prompt Templates, and Usage & Health from the `/api/settings/ai-default` backend.
  - The settings index and integrations messaging now reinforce `Settings → AI Default` as the single AI control center.

## ADR-030: API Failures Use a Standard Error Envelope
- **Date**: 2026-04-19
- **Status**: Active
- **Decision**: API failures are now rendered centrally in `backend/bootstrap/app.php` with a consistent envelope: `success`, `data`, `meta`, `error`, and a compatibility `message` field.
- **Rationale**: Controller-by-controller error payload drift made failures harder to audit, harder for the frontend to handle uniformly, and easier to miss during stabilization.
- **Impact**:
  - Validation, authentication, authorization, not-found, and generic API exceptions now return a shared JSON structure for `/api/*` requests.
  - Existing successful responses remain unchanged for now to avoid breaking the current frontend during stabilization.

## ADR-031: Integration Settings Permission Bound to Integrations Module
- **Date**: 2026-04-19
- **Status**: Active
- **Decision**: `/api/settings/integrations` is protected by `integrations.manage` instead of `audit.view`, and frontend settings sub-route gating now reflects module-specific permissions.
- **Rationale**: Integration configuration is a settings concern, not an audit-log concern. Using `audit.view` created hidden authorization drift where the wrong roles could modify operational settings.
- **Impact**:
  - Backend integration settings routes now match the permission seed and intended RBAC model.
  - Frontend access checks distinguish AI, user, and integration settings more clearly.

## ADR-032: Runtime Admin UI Must Use Shared Primitives
- **Date**: 2026-04-19
- **Status**: Active
- **Decision**: Active runtime admin pages must use shared primitives from `frontend/components/ui` instead of page-local button, input, table, modal, badge, or tab implementations.
- **Rationale**: The UI audit showed the same CRUD/admin patterns being reimplemented separately across Leads, Users, Audit Logs, Maps, and AI Defaults, creating drift in spacing, button behavior, feedback patterns, and visual hierarchy.
- **Impact**:
  - Shared primitives now exist for `Input`, `Select`, `Badge`, `Card`, `Modal`, `Tabs`, `FilterBar`, and `Table`.
  - `frontend/app/leads/page.tsx`, `frontend/app/settings/users/page.tsx`, and `frontend/app/audit-logs/page.tsx` now share one admin interaction pattern.
  - `frontend/app/map/page.tsx` and `frontend/app/settings/ai-defaults/page.tsx` were normalized to the same runtime design language.

## ADR-033: Company Information Edit Uses Inline Modal, Not Drawer or Separate Page
- **Date**: 2026-04-25
- **Status**: Active
- **Decision**: Company Information editing is implemented as a `Modal` (lg, scrollable) launched from a Pencil icon in the card header, reusing the existing shared `Modal`, `Input`, `Select`, and `Button` primitives.
- **Rationale**: The contact edit pattern already established a modal-per-entity convention on this page (ContactFormModal). A modal is appropriate for a bounded field set (9 fields) and keeps the user in context. A separate route would break the single-page detail flow; a drawer was not considered because no drawer primitive exists in the shared UI system.
- **Impact**: Consistent with ADR-032 (admin UI must use shared primitives). No new UI pattern introduced.

## ADR-034: Industry/Sub-Industry Data Fetched from API, Never Hardcoded
- **Date**: 2026-04-25
- **Status**: Active
- **Decision**: The edit form populates the Industry and Sub-Industry dropdowns from `GET /api/industries` (which returns each industry with its `sub_industries`). Sub-industries are filtered client-side by the selected `industry_id`.
- **Rationale**: Industry and sub-industry master data is owned by the DB and managed through the Industries admin page. Hardcoding them in the lead edit form would create a maintenance divergence and violate STAB-008 (convert runtime lists to DB/API-backed sources).
- **Impact**: The `industries` query is cached by React Query; no extra round-trips on subsequent opens of the same session.

## ADR-035: company_size_estimate Uses a Constrained Select in the Edit Form
- **Date**: 2026-04-25
- **Status**: Active
- **Decision**: The company size field is presented as a `Select` with six predefined bands (1–10, 11–50, 51–200, 201–500, 501–1000, 1000+), matching common CRM conventions. The backend stores it as a free-text string (`nullable|string|max:100`), so existing values are preserved.
- **Rationale**: Free-text entry for company size produces inconsistent data (e.g. "~200", "200 people", "201-500"). Banding at input time improves data quality for scoring and ICP matching without requiring a DB schema change.
- **Impact**: If an existing lead has a value that does not match one of the bands, the Select will show an empty selection on open. This is acceptable for now; the user can pick the nearest band and save.

## ADR-036: Maps Discovery Refresh = Explicit User Action Only
- **Date**: 2026-04-25
- **Status**: Active
- **Decision**: Results are not cleared until the user explicitly clicks the Reset button (RotateCcw icon). Clicking "Run Discovery Scan" again replaces results only when the new scan completes, keeping existing results visible during loading.
- **Rationale**: Auto-clearing on scan start caused a flash of empty state that felt like a page reset to users. Preserving results during loading is consistent with how other list views in the app behave.
- **Impact**: `handleSearch` no longer calls `setResults([])`. A `RotateCcw` Reset button is added to `MapSearchPanel` as the single intentional reset path.

## ADR-037: Discovery Result Limit Uses Sequential Page Fetching with Mandatory Delay
- **Date**: 2026-04-25
- **Status**: Active
- **Decision**: When `limit > 20`, the backend fetches page 2 (and page 3 when `limit > 40`) using Google's `next_page_token` with a 2-second `sleep()` between each request.
- **Rationale**: Google Places API requires a minimum 2-second delay before a `next_page_token` request is valid. Client-side pagination would require multiple round-trips and a timer; server-side pagination keeps the client simple. The `MapCandidate` cache (`cacheCandidates`) reduces repeat costs for the same places.
- **Impact**: Searches requesting limit=50 may take 4–6 seconds. Searches that stay within 20 results are unaffected. Documented as expected latency, not a bug.

## ADR-038: AI Mode Validation Is Non-Blocking — Warning, Not Error
- **Date**: 2026-04-25
- **Status**: Active
- **Decision**: If a user selects `full_ai` or `hybrid` but no active AI provider is configured, the lead is still saved (mode downgraded to `manual`) and an `ai_warning` field is returned in the response.
- **Rationale**: Blocking the lead addition when AI is unavailable would prevent data capture. The warning surface makes the degradation visible without losing the lead. This matches the pattern used elsewhere (e.g., enrichment jobs — the lead is created and jobs are queued; if the queue worker fails, the lead data is not lost).
- **Impact**: Frontend surfaces `ai_warning` as a feedback message. Backend downgrades mode to `manual` when no active provider exists, ensuring no AI job is dispatched unnecessarily.

## ADR-039: Discovery Categories Stored in DB, Seeded Once, Managed at Runtime
- **Date**: 2026-04-25
- **Status**: Active
- **Decision**: Place category options in the Maps Discovery search panel come from the `discovery_categories` DB table via `GET /api/maps/categories`, not from hardcoded JSX.
- **Rationale**: Satisfies STAB-008 (convert runtime lists to DB/API-backed sources). Categories may need to be updated as the business expands to new verticals; DB-backed storage allows an admin to add/deactivate categories without a code deploy.
- **Impact**: `DatabaseSeeder::seedDiscoveryCategories()` provides 14 initial categories. The `MapSearchPanel` fetches categories on mount via `apiFetch`. If the fetch fails, the dropdown renders empty (graceful degradation — the user can still type a keyword to search).

## ADR-040: Meetings Tab Deprecated — Activities Is the Single Timeline
- **Date**: 2026-04-25
- **Status**: Active
- **Decision**: The Meetings tab is removed from the Lead Detail navigation. Users log meetings as a "Meeting" activity in the Activities tab. Legacy meeting records from `lead_meetings` remain visible via a read-only archive block in the deprecated Meetings view (accessible only via direct URL).
- **Rationale**: `logMeeting()` already created a `LeadActivity` entry, so meetings already appeared in the activities list. Having two separate tabs for the same interaction timeline caused confusion. Activities is a superset of meetings.
- **Impact**: No data loss — `lead_meetings` table is unchanged. The Meetings tab is reachable at `/leads/[id]?tab=meetings` but not surfaced in the nav.

## ADR-041: Rescore Runs Synchronously — No Dedicated Queue Worker
- **Date**: 2026-04-25
- **Status**: Active
- **Decision**: `POST /leads/{lead}/rescore` now calls `LeadScoringService::scoreLead()` inline and returns the score result directly. `ScoreLeadJob` is preserved in the codebase for future use but is not dispatched on manual rescore.
- **Rationale**: The container only runs `php artisan serve`. There is no `php artisan queue:work` process, so dispatched jobs sit in the queue forever and never execute. Synchronous execution gives immediate feedback.
- **Impact**: Rescore is slightly slower under load (blocking the request thread for the duration of scoring). Acceptable for a manual trigger. If a queue worker is added later, the job-based path can be restored.

## ADR-042: ICP Profile Weights Are User-Configurable Sliders
- **Date**: 2026-04-25
- **Status**: Active
- **Decision**: The five ICP matching weights (lead_score, industry, company_size, territory, contact_info) are exposed as sliders in the ICP Profile editor. A live "total" indicator shows when weights sum to 100%.
- **Rationale**: Different target segments require different relative emphasis. A manufacturing ICP might weight territory heavily; a tech SaaS ICP might weight contact info more. Hardcoding weights would make the system inflexible.
- **Impact**: Users are responsible for ensuring weights are coherent. The system does not enforce that they sum to exactly 1.0 — the ICPMatchingService normalises them during computation.

## ADR-043: Transcript Analysis Is Initiated Manually Per Transcript
- **Date**: 2026-04-25
- **Status**: Active
- **Decision**: AI transcript analysis is triggered by an explicit "Analyse with AI" button per transcript rather than running automatically on save.
- **Rationale**: AI calls have a cost. Running analysis on every paste/save could consume significant tokens for transcripts that are draft or may be discarded. Explicit opt-in keeps the user in control of when AI is invoked.
- **Impact**: Users must click the button to see analysis. The transcript status badge (`pending` vs `evaluated`) gives clear visibility of which transcripts have been analysed.

## ADR-044: Product Matching Uses 60/40 Rule+AI Split (Upgraded from 70/30)
- **Date**: 2026-04-25
- **Status**: Active
- **Decision**: The hybrid scoring formula is 60% rule-based (industry, size, authority, engagement, contact completeness) + 40% AI BANT analysis.
- **Rationale**: The original 70/30 underweighted AI context. With BANT variables now passed to AI (authority, timeline, competitor), the AI score is more informative and deserves higher weighting. The rule-based floor prevents garbage AI scores from dominating.

## ADR-045: BANT Variables Are Derived from Existing Lead Data, Not a Separate Form
- **Date**: 2026-04-25
- **Status**: Active
- **Decision**: Budget, Authority, Need, Timeline, and Competitor signals are inferred from existing lead relations (contacts, activities, qualifications, AI analyses, transcript evaluations) — not captured via a dedicated BANT form.
- **Rationale**: Adding a BANT questionnaire form would require users to re-enter data they've already captured through activities, transcripts, and meetings. The derivation approach makes matching available immediately without extra data entry.
- **Impact**: BANT quality depends on data richness. Leads with activities, transcripts, and contacts will get more accurate matches. Empty leads default to the rule-based score.

## ADR-046: lead_product_match_runs Is a Dedicated Audit Table (Not Reusing ai_requests)
- **Date**: 2026-04-25
- **Status**: Active
- **Decision**: A dedicated `lead_product_match_runs` table captures per-run metadata (products evaluated, matches created, total AI cost, duration, status). Individual AI calls still log to `ai_requests`.
- **Rationale**: `ai_requests` captures individual model calls. A "run" spans multiple products and multiple AI calls. The run table aggregates business-level metrics (how many products were evaluated, how many matched) that are not representable in `ai_requests`.

## ADR-047: Product Metadata Is Editable per Product, Not Global Config
- **Date**: 2026-04-25
- **Status**: Active
- **Decision**: All product matching metadata (budget_range, competitor_notes, use_cases, keywords, target_company_size) is stored per-product in the `products` table and editable in the Products admin page.
- **Rationale**: Different products have different positioning, pricing, and competitor landscapes. A global config cannot represent per-product nuance. Richer per-product metadata directly improves AI prompt quality and therefore match accuracy.

## ADR-048: AI-Generated ICP Is a Suggestion, Not an Auto-Save
- **Date**: 2026-04-25
- **Status**: Active
- **Decision**: `POST /api/icp-profiles/generate` returns suggestion data but does NOT create an ICP record. The user must review, edit, and explicitly click Save.
- **Rationale**: ICP profiles directly affect lead scoring and pipeline entry gates across all leads. Auto-saving an AI-generated profile without human review could silently change qualification outcomes for the entire lead database. Human confirmation is required.
- **Impact**: The flow is: Generate → Review modal → "Use this ICP" pre-fills form → User edits → Save. This adds one explicit confirmation step that carries significant consequence.

## ADR-049: Two Generation Modes — Combined vs Per Category
- **Date**: 2026-04-25
- **Status**: Active
- **Decision**: The generate endpoint accepts a `mode` param: `combined` (one ICP synthesised across all products) or `per_category` (one ICP per distinct product category). Per-category makes one AI call per category group.
- **Rationale**: A company selling both ERP software and fleet management systems has fundamentally different target customers per product line. A single combined ICP would be too broad to be useful. Per-category produces more targeted, actionable profiles.
- **Impact**: Per-category mode consumes one AI call per category. If there are 5 categories and AI costs $0.01/call, a single generation run costs ~$0.05. Documented in AI usage logs.

## ADR-050: `icp_generation` Uses the Configured AI Default Route
- **Date**: 2026-04-25
- **Status**: Active
- **Decision**: `IcpGenerationService` calls `AiOrchestrationService::call('icp_generation', ...)` using the standard feature routing. The feature `icp_generation` appears in the AI Defaults → Feature Routes table and can be assigned any provider/model.
- **Rationale**: Consistent with all other AI features in the platform. No hardcoded providers. Users can assign a cheaper model (e.g. GPT-4o mini, Claude Haiku) to ICP generation since it runs infrequently and the output is human-reviewed before saving.
