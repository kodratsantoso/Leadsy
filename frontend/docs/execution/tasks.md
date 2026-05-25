# Real WhatsApp Mirroring Implementation Tasks

## Lark SSO Frontend Flow (Completed ✅)
- [x] Add tenant-aware Lark login entrypoint on `/login`.
- [x] Add `/auth/lark/callback` route that posts `code` and `state` to the backend.
- [x] Use plain `fetch` on callback so unauthenticated SSO completion is not intercepted by `apiFetch`.
- [x] Persist returned Sanctum token and user via `useAuthStore.setAuth` before routing to `/`.
- [x] Mark `/auth/*` as public auth routes in `frontend/app/template.tsx`.
- [x] Keep Lark configuration in `Settings -> Integrations`; remove duplicate Lark settings page pattern.
- [x] Update frontend README, SSOT, progress, and decisions.

## Lark Base Manual Mapping UI (Completed ✅)
- [x] Add Base app token input and table loading inside Settings → Integrations → Lark.
- [x] Add selected-table record preview.
- [x] Add manual mapping grid between Leadsy Leads fields and Lark Base fields.
- [x] Add Auto Match Fields behavior that loads Lark fields when needed and reports match count.
- [x] Add saved mapping list with manual Pull from Lark and Push to Lark actions.

## Product Question Guide (Completed ✅)
- [x] Migration: `product_questions` table (product_id FK, questions JSON, ai_generated, ai_model, updated_by).
- [x] Model: `ProductQuestion` with questions cast as array; `Product` model gets `questionGuide()` HasOne.
- [x] Service: `ProductQuestionGenerationService` — builds context-aware prompt, parses and normalizes structured JSON question list.
- [x] Controller: `getQuestions`, `generateQuestions`, `saveQuestions` in `ProductController`.
- [x] Routes: `GET /products/{id}/questions`, `POST /products/{id}/questions/generate`, `PUT /products/{id}/questions`.
- [x] Frontend `QuestionGuide.tsx`: fetch saved guide, AI generate, inline edit (text + category picker + order), add/delete, save with unsaved-changes indicator.
- [x] Integrated `<QuestionGuide>` into expanded product card in `app/products/page.tsx`.
- [x] Updated SSOT, tasks, progress.

## Lead Customer BANTC Question Guide (Completed ✅)
- [x] Migration/model/API for `lead_bantc_question_guides`.
- [x] AI feature route `lead_bantc_question_generation`.
- [x] `LeadBantcQuestionGenerationService` builds customer context and returns Budget, Authority, Need, Timeline, Competition questions.
- [x] `LeadBantcQuestionGuide.tsx` on Lead Detail → Intelligence supports generate, edit, reorder, add/delete, and explicit save.
- [x] Generated questions remain draft-only until saved by the user.

## Meeting BANTC and Transcript Enhancements (Completed ✅)
- [x] Add Budget, Authority, Needs, Timeline, and Competitor fields to Meeting activities.
- [x] Prefill new Meeting activity BANTC values from the latest previous Meeting activity.
- [x] Show BANTC values in the Activities timeline.
- [x] Extend transcripts with `activity_id`, title, file metadata, nullable text, and recorded timestamp handling.
- [x] Allow transcripts to be linked to an activity and created from text, TXT/VTT/SRT, audio, or video files.
- [x] Add AI transcript summary storage and display alongside sentiment, intent, interest, objections, buying signals, confidence, and next action.

## Dashboard Funnel Aggregate Correction (Completed ✅)
- [x] Update Dashboard funnels from current-stage counts to cumulative/aggregate conversion counts.
- [x] Cumulative stages count leads whose current funnel sequence is at that stage or beyond.
- [x] Cumulative estimated amount follows the same stage-or-beyond logic.
- [x] Add `GET /api/leads?funnel_min_sequence=N` drilldown support for cumulative funnel bars.

## Lead Product Revenue and Upsales (Completed ✅)
- [x] Add `product_id` selection to Leads create/edit UI and table display.
- [x] Extend `lead_outcomes` with `product_id` and `sale_type` so a customer can buy multiple products with separate deal amounts.
- [x] Add Product and Sales Type fields to Lead Detail → Revenue → Record Outcome.
- [x] Display Product Revenue History per lead/customer.
- [x] Update dashboard product aggregates to use lead initial products plus product-specific outcomes.

## Phase 9: Product Tour System (Completed ✅)

### Core Components
- [x] TOUR-001: Build `useTour.js` hook — active, minimized, currentStep, startTour, nextStep, prevStep, skipTour, minimizeTour, restoreTour, goToStep.
- [x] TOUR-002: Build `tourSteps.js` — 14-step tour covering navigation, search, dashboard, map, review queue, leads, products, and settings.
- [x] TOUR-003: Build `ProductTour.jsx` — orchestrator with route-aware navigation, element polling (20 retries × 120 ms), resize/scroll rect sync, and fallback centering.
- [x] TOUR-004: Build `TourTooltip.jsx` — fixed-position card with step progress, title, content, Skip / Back / Next (Finish) actions, and Minimize button.
- [x] TOUR-005: Build `TourOverlay.jsx` — four-piece `rgba(0,0,0,0.5)` overlay with animated transparent cutout around the spotlight rect.
- [x] TOUR-006: Build `TourSpotlight.jsx` — brand-colored border box anchored to the target element rect with smooth CSS transitions.
- [x] TOUR-007: Build `TourMinimized.jsx` — fixed bottom-right pill badge showing "Tour: Step N/M ▲"; restores tour on click.
- [x] TOUR-008: Build `ProductTour.css` — all `.leadsy-tour-*` styles; mobile responsive breakpoint; enter/exit keyframe animations.

### Integration
- [x] TOUR-010: Mount `<ProductTour />` inside `AppShell` so the tour is present on every authenticated page.
- [x] TOUR-011: Add `HelpCircle` button to the AppShell header (`data-tour="tour-trigger"`) that fires `leadsy:start-tour` event.
- [x] TOUR-012: Auto-start tour on first visit; skip if `leadsy-product-tour-completed=true` in localStorage.
- [x] TOUR-013: Persist active step and minimized state in localStorage so navigation between pages does not reset the tour.

### data-tour Attribute Coverage
- [x] TOUR-020: `sidebar-nav` — AppShell nav container.
- [x] TOUR-021: `global-search` — AppShell top-bar search input.
- [x] TOUR-022: `tour-trigger` — AppShell HelpCircle button.
- [x] TOUR-023: `dashboard-kpis` — Dashboard Key Metrics card.
- [x] TOUR-024: `dashboard-funnel` — Dashboard conversion funnel section.
- [x] TOUR-025: `dashboard-source-channel` — Dashboard Lead Sources & Channels card.
- [x] TOUR-026: `dashboard-map` — Dashboard Lead Geography card.
- [x] TOUR-027: `map-discovery` — Map & Territory page header card.
- [x] TOUR-028: `review-queue` — Qualification / Review Queue stats card.
- [x] TOUR-029: `leads-actions` — Leads page action group (create, import, export).
- [x] TOUR-030: `leads-filters` — Leads page filter bar.
- [x] TOUR-031: `leads-table` — Leads page data table container.
- [x] TOUR-032: `products-add` — Products page Add Product button.
- [x] TOUR-033: `settings-master-data` — Settings page master-data grid.

### Documentation
- [x] TOUR-040: Add ProductTour section to `frontend/docs/ssot.md` with component table, integration points, and `data-tour` contract.
- [x] TOUR-041: Update `frontend/docs/execution/tasks.md` and `progress.md`.
- [x] TOUR-042: Update root `docs/execution/tasks.md` and `progress.md`.
- [x] TOUR-043: Update `frontend/README.md` with ProductTour feature mention.

## Phase 8: Dashboard, Location, Hierarchy, and Revenue Improvements

### Dashboard Maps
- [x] DASH-MAP-001: Add database-backed map block on Dashboard.
- [x] DASH-MAP-002: Render leads/customers with coordinates and stage-colored POI markers.
- [x] DASH-MAP-003: Add pan/zoom and tooltip summary behavior through Google Maps.

### Lead Location Input
- [x] LEAD-LOC-001: Add Add Location action to New Lead form.
- [x] LEAD-LOC-002: Add map/geocode popup for location search.
- [x] LEAD-LOC-003: Persist selected `lat` and `lng` to the lead.

### Dashboard Funnels
- [x] DASH-FUN-001: Add aggregate Tracking Customer Sales Funnel dashboard panel.
- [x] DASH-FUN-002: Source funnel counts from DB.
- [x] DASH-FUN-003: Make funnel stages drillable into filtered Leads.
- [x] DASH-ORIGIN-001: Add Dashboard block for total leads by Lead Sources and Lead Channels.
- [x] DASH-ORIGIN-002: Aggregate lead origin counts with distinct visible leads and drilldown filters.

### User Hierarchy and Revenue Targets
- [x] USER-HIER-001: Add `direct_manager_id` to users.
- [x] USER-HIER-002: Apply hierarchy-based lead visibility to lead, dashboard, funnel, and revenue queries.
- [x] USER-REV-001: Add target period and target revenue fields.
- [x] USER-REV-002: Calculate realization from Closed Won outcomes by close date.
- [x] USER-REV-003: Add Achievement Sales dashboard block.

### Documentation
- [x] DOC-DASH-001: Update SSOT, tasks, progress, decisions, README, and API reference notes.

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
- [x] DS-001: Implement safe `leadsy-*` namespace collision handlers in `docker-compose.yml`.
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
- [x] MD-014: DatabaseSeeder — seeded 10 industries (42 sub-industries), AI providers/models, and notification pref defaults; product sample seeding removed

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

### Frontend Enhancements
- [x] FE-A-001: Enhance Leads list page with Stage filter
- [x] FE-A-002: Enhance Leads list page with Score range filter (min/max)
- [x] FE-A-003: Enhance Leads list page with Qualification column
- [x] FE-B-001: Build Lead Detail page (5 tabs, quick stats, forms)
- [x] FE-B-002: Integrate real API data on Lead Detail page
- [x] FE-C-001: Verify AI Settings page (providers, routing, usage tabs)

### Integration & Testing
- [x] INT-001: Verify Module A services use AiOrchestrationService for AI calls
- [x] INT-002: Verify Module B services use AiOrchestrationService for AI calls
- [x] INT-003: Verify all API routes registered and working
- [x] INT-004: Verify Lead Detail page loads with real data
- [x] INT-005: Verify AI Settings page shows real usage data
- [x] INT-006: Test collision detection prevents duplicate API calls
- [x] INT-007: Test cost-aware routing selects cheaper models

### Documentation
- [ ] DOC-001: Update SSOT with Module A/B/C requirements and implementation
- [ ] DOC-002: Update BRD with Lead Intelligence, Sales Activity, AI Provider sections
- [ ] DOC-003: Update progress.md with completion status
- [ ] DOC-004: Update decisions.md with architectural decisions

## Phase 5: Leadsy Runtime Rename & Lead Taxonomy Settings

### Runtime Namespace
- [x] LS-001: Rename Docker container, network, and volume namespace to `leadsy-*`.
- [x] LS-002: Update app-facing brand and documentation references to Leadsy.
- [x] LS-003: Add frontend Docker ignore/install guard so runtime containers start consistently.

### Lead Source Settings
- [x] LS-010: Add `lead_source_types` database table with seeded defaults.
- [x] LS-011: Add `LeadSourceType` model, controller, and protected Settings CRUD routes.
- [x] LS-012: Add Settings → Lead Sources UI.
- [x] LS-013: Add source create/edit, display, and filtering to Leads.

### Lead Channel Settings
- [x] LS-020: Add `lead_channel_types` database table scoped to source types.
- [x] LS-021: Add nullable `lead_sources.channel_type_id` relationship.
- [x] LS-022: Add `LeadChannelType` model, controller, and protected Settings CRUD routes.
- [x] LS-023: Add Settings → Lead Channels UI.
- [x] LS-024: Add channel create/edit, display, and filtering to Leads.

### Validation
- [x] LS-030: Run migrations against the Docker PostgreSQL database.
- [x] LS-031: Validate backend route registration and PHP syntax.
- [x] LS-032: Validate frontend TypeScript.
- [x] LS-033: Smoke test authenticated Settings and Leads API responses.

## Funnel UI Update
- [x] FUNNEL-UI-001: Replace vertical funnel segments with horizontal conversion bars.
- [x] FUNNEL-UI-002: Keep two separate pipelines for Closed Won and Closed Lost.
- [x] FUNNEL-UI-003: Start conversion calculation from `Belum Di Klasifikasi`.
- [x] FUNNEL-UI-004: Add estimated amount conversion per funnel step.
- [x] FUNNEL-UI-005: Preserve drilldown links and DB aggregate data contract.
