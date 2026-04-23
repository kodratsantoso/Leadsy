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
