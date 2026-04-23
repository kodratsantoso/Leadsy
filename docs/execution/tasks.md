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

## Phase 4: Enterprise Lead Intelligence & AI Provider Engine (Completed ✅)

### Module A: Lead Intelligence Engine
- [x] MOD-A-001: Design and implement LeadScoringService (6-factor scoring with AI boost)
- [x] MOD-A-002: Design and implement LeadQualificationService (rule-based qualification with business type inference)
- [x] MOD-A-003: Design and implement LeadProductMatchingService (hybrid 70% rules + 30% AI matching)
- [x] MOD-A-004: Design and implement LeadAIAnalysisService (AI-powered opportunity analysis)
- [x] MOD-A-010: Add API routes for /leads/{id}/score, /qualify, /analyze, /match-products
- [x] MOD-A-011: Implement LeadController methods for all Module A operations with audit logging
- [x] MOD-A-020: Verify database schema (all 19 tables present with relationships)
- [x] MOD-A-021: Verify Lead model relationships (scores, qualifications, productMatches, aiAnalyses)

### Module B: Sales Activity & Lead Evaluation Engine
- [x] MOD-B-001: Design and implement LeadActivityService (activity timeline, type routing, recency tracking)
- [x] MOD-B-002: Design and implement LeadMeetingService (meeting CRUD with auto-activity logging)
- [x] MOD-B-003: Design and implement LeadTranscriptService (transcript storage with source tracking)
- [x] MOD-B-004: Design and implement LeadEvaluationService (AI sentiment, intent, signals detection)
- [x] MOD-B-005: Design and implement LeadFollowUpService (smart follow-up suggestions)
- [x] MOD-B-010: Add API routes for /leads/{id}/activities, /meetings, /transcripts, /evaluations, /follow-ups
- [x] MOD-B-011: Implement LeadController methods for all Module B operations with auto-integration
- [x] MOD-B-020: Build Lead Detail page with Overview, Intelligence, Activities, Meetings, Transcripts tabs
- [x] MOD-B-021: Integrate real API calls with TanStack Query on Lead Detail page
- [x] MOD-B-030: Add activity and meeting form components with mutations
- [x] MOD-B-031: Add progress summary aggregation (total activities, last interaction, next follow-up)

### Module C: AI Provider Settings & Priority Engine
- [x] MOD-C-001: Design and implement AIRouterService (provider selection, cost-aware routing, collision detection)
- [x] MOD-C-002: Design and implement AIUsageLogService (token tracking, cost analysis, anomaly detection)
- [x] MOD-C-010: Verify existing AI provider routes and controllers
- [x] MOD-C-011: Verify existing AI Settings UI (providers, routing, usage tabs)
- [x] MOD-C-020: Verify collision detection logic (30-second window, same entity)
- [x] MOD-C-021: Verify cost-aware routing (prefer low/medium cost tier models)
- [x] MOD-C-030: Consolidate all AI settings under `Settings → AI Default`
- [x] MOD-C-031: Add secure API-key masking/reveal flow with audit logging
- [x] MOD-C-032: Add consolidated feature routing controls with priorities 1–4
- [x] MOD-C-033: Add prompt template versioning, activation, and preview plumbing
- [x] MOD-C-034: Add provider health / connection test persistence and usage overview

### Frontend Enhancements
- [x] FE-A-001: Enhance Leads list page with Stage filter
- [x] FE-A-002: Enhance Leads list page with Score range filter (min/max)
- [x] FE-A-003: Enhance Leads list page with Qualification column
- [x] FE-B-001: Build Lead Detail page (5 tabs, quick stats, forms)
- [x] FE-B-002: Integrate real API data on Lead Detail page
- [x] FE-C-001: Verify AI Settings page (providers, routing, usage tabs)
- [x] FE-C-002: Replace active `frontend/` AI Defaults page with consolidated control center (providers, routing, prompts, usage/health)
- [x] FE-C-003: Remove AI credential messaging from Integrations and point operators to `Settings → AI Default`

### Integration & Testing
- [x] INT-001: Verify Module A services use AiOrchestrationService for AI calls
- [x] INT-002: Verify Module B services use AiOrchestrationService for AI calls
- [x] INT-003: Verify all API routes registered and working
- [x] INT-004: Verify Lead Detail page loads with real data
- [x] INT-005: Verify AI Settings page shows real usage data
- [x] INT-006: Test collision detection prevents duplicate API calls
- [x] INT-007: Test cost-aware routing selects cheaper models

### Documentation
- [x] DOC-001: Update SSOT with Module A/B/C requirements and implementation
- [ ] DOC-002: Update BRD with Lead Intelligence, Sales Activity, AI Provider sections
- [x] DOC-003: Update progress.md with completion status
- [x] DOC-004: Update decisions.md with architectural decisions

## Phase 9: Stabilization & Consistency (In Progress 🔧)

- [x] STAB-001: Audit active UI tree vs deprecated root tree and keep `frontend/` as the runtime source of truth
- [x] STAB-002: Fix PostgreSQL-safe AI usage aggregation for `fallback_used` boolean handling
- [x] STAB-003: Correct integration settings permission guard from `audit.view` to `integrations.manage`
- [x] STAB-004: Standardize API error envelopes for API routes in Laravel bootstrap exception handling
- [x] STAB-005: Tighten frontend route gating for settings sub-pages by permission
- [x] STAB-006: Produce database mismatch report and data integrity findings
- [x] STAB-007: Produce API contract mismatch report and remaining normalization backlog
- [ ] STAB-008: Audit master-data hardcoding and convert highest-risk runtime lists to DB/API-backed sources
- [ ] STAB-009: Migrate root-only runtime pages (`icp-profiles`, `qualification`, `territories`, `settings/funnel-stages`, `settings/revenue-rules`) into `frontend/`
- [ ] STAB-010: Unify frontend HTTP access patterns around one auth/base-URL contract

## Phase 10: UI System Unification (In Progress 🎨)

- [x] UI-001: Create shared UI primitives in `frontend/components/ui` for `Input`, `Select`, `Badge`, `Card`, `Modal`, `Tabs`, `FilterBar`, and `Table`
- [x] UI-002: Migrate `frontend/app/leads/page.tsx` to shared admin primitives
- [x] UI-003: Migrate `frontend/app/settings/users/page.tsx` to shared admin primitives
- [x] UI-004: Migrate `frontend/app/audit-logs/page.tsx` to shared admin primitives
- [x] UI-005: Normalize `frontend/app/map/page.tsx` and map side panels to shared buttons, cards, and feedback patterns
- [x] UI-006: Normalize `frontend/app/settings/ai-defaults/page.tsx` to the same settings/admin visual language
- [ ] UI-007: Extend the shared UI system to remaining runtime pages outside this pass

## Phase 4: Full CRUD Completion (2026-04-19)

### CRUD Gaps — All Resolved
- [x] CRUD-001: Add Edit Lead + Delete Lead to leads list and detail pages
- [x] CRUD-002: Add Edit + Delete buttons to Lead Activities
- [x] CRUD-003: Add Edit + Delete buttons to Lead Meetings
- [x] CRUD-004: Implement Transcript UI (replace "coming soon")
- [x] CRUD-005: Create Funnel Stages management page (/settings/funnel-stages)
- [x] CRUD-006: Add Funnel Stages to Settings nav
- [x] CRUD-007: Replace fake AI Provider "Add" alert with real Create/Edit/Delete modals
- [x] CRUD-008: Add per-model Delete button in AI Defaults provider card
- [x] CRUD-009: Add Add Model inline form in AI Defaults provider card
- [x] CRUD-010: Add Sub-Industry edit modal in Industries page
- [x] CRUD-011: Add sub-industry updateSub backend endpoint
- [x] CRUD-012: Add WhatsApp Campaign Edit modal
- [x] CRUD-013: Replace inline confirm() on campaign delete with proper modal
- [x] CRUD-014: Add updateCampaign backend endpoint
