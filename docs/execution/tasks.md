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

## Phase 11: Lead Detail Page Improvements (2026-04-25)

### Lead Company Information — Edit Capability
- [x] LEAD-001: Add `company_size_estimate` field to `PUT /api/leads/{lead}` validation in `LeadController::update`
- [x] LEAD-002: Add edit button (Pencil icon) to Company Information card on Lead detail Overview tab
- [x] LEAD-003: Implement `CompanyInfoModal` using shared `Modal`, `Input`, `Select`, `Button` components
- [x] LEAD-004: Fetch industries and sub-industries from `GET /api/industries` (no hardcoded data)
- [x] LEAD-005: Sub-industry dropdown filtered dynamically by selected industry
- [x] LEAD-006: Form pre-populated from current lead data on open
- [x] LEAD-007: `PUT /api/leads/{id}` mutation with `AuditService::logUpdated` audit trail (existing backend)
- [x] LEAD-008: Show sub-industry and business category in read-only card view when present

## Phase 12: Maps Discovery Improvements (2026-04-25)

### Refresh Button & State Preservation
- [x] MAP-001: Add explicit Reset button (RotateCcw icon) to search panel that clears results, location, and keyword — the only way to reset state
- [x] MAP-002: Remove premature `setResults([])` on search start — existing results stay visible during loading (no flash to empty state)
- [x] MAP-003: Wire `onReset` callback from `map/page.tsx` to `MapSearchPanel` so parent state clears only on explicit reset

### Discovery Result Limit
- [x] MAP-004: Add `limit` param (max 50) to `GET /api/maps/search` backend validation
- [x] MAP-005: Implement automatic page-2 and page-3 fetch with 2-second delay when `limit > 20` and `next_page_token` is available (yields up to 60 results, capped at limit)
- [x] MAP-006: Frontend sends `limit=50` by default in `searchPlaces()` hook
- [x] MAP-007: Return `total` count alongside `data` in search response
- [x] MAP-008: Show result count badge in `MapResultsPanel` header (with filter indicator `n/total` when filters are active)

### AI Mode Validation
- [x] MAP-009: Fix critical bug — `aiMode` was hardcoded as `"hybrid"` in `MapResultsPanel` call, ignoring user's selection
- [x] MAP-010: Add `currentAiMode` state to `map/page.tsx`, captured from `handleSearch` params and passed correctly to `MapResultsPanel`
- [x] MAP-011: Backend `addToLeads()` checks for active AI provider when `ai_mode` is `full_ai` or `hybrid`; downgrades to `manual` and returns `ai_warning` if no active provider found
- [x] MAP-012: Frontend surfaces `ai_warning` from add-to-leads response as visible feedback to the user

### Radius Expansion
- [x] MAP-013: Frontend radius slider max changed from 20,000m (20km) to 50,000m (50km)
- [x] MAP-014: Backend already validated radius up to 50,000m — no backend change needed

### DB-Backed Dropdown Categories
- [x] MAP-015: Create `discovery_categories` migration with columns: `id`, `label`, `value`, `sort_order`, `is_active`
- [x] MAP-016: Create `DiscoveryCategory` Eloquent model
- [x] MAP-017: Add `seedDiscoveryCategories()` to `DatabaseSeeder` with 14 default categories (seeded, not hardcoded runtime)
- [x] MAP-018: Add `GET /api/maps/categories` route + `MapDiscoveryController::categories()` method returning active categories ordered by `sort_order`
- [x] MAP-019: Frontend `MapSearchPanel` fetches categories from API on mount, replaces hardcoded `<option>` list

## Phase 13: Lead Detail Full Feature Completion (2026-04-25)

### Backend — Activity Enhancement
- [x] ACT-001: Add `outcome` (string, max 1000) and `next_follow_up_date` (date) columns to `lead_activities` via migration `2026_04_25_110000`
- [x] ACT-002: Update `LeadActivity` model `$fillable` and `$casts`
- [x] ACT-003: Update `LeadController::logActivity()` — accepts `activity_type`, `description`, `outcome`, `activity_date`, `next_follow_up_date`, optional `funnel_stage_id` (triggers stage move + history + audit log)
- [x] ACT-004: Update `LeadController::updateActivity()` — same new fields
- [x] ACT-005: Update `LeadController::getActivities()` — eager-load `user` relation
- [x] ACT-006: Fix `rescore()` — `'queued'` violated DB check constraint; changed to `'pending'` then refactored to synchronous execution (no queue worker running in this deployment)
- [x] ACT-007: Fix `rescore()` — now calls `LeadScoringService::scoreLead()` directly, returns score/grade immediately; `ScoreLeadJob` preserved for future queue-based use

### Frontend — Activities Tab
- [x] ACT-008: Replace `getElementById`-based form with controlled `activityForm` state
- [x] ACT-009: Activity type dropdown (14 predefined types: Follow Up, Meeting, Demo, Proposal Sent, Negotiation, WhatsApp, Call, Email, Internal Note, Site Visit, Contract Discussion, Payment Discussion, Decision Maker Contact, Other)
- [x] ACT-010: Date/time picker, outcome field, next follow-up date, stage-move dropdown (live funnel stages from DB)
- [x] ACT-011: Timeline view with user attribution, edit/delete per activity, outcome block, follow-up date display
- [x] ACT-012: Activity modal reused for create and edit modes

### Frontend — Meetings Tab
- [x] MTG-001: Remove Meetings from tab navigation
- [x] MTG-002: Replace Meetings tab content with deprecation notice pointing to Activities; existing meeting records preserved below notice

### Frontend — Transcripts Tab
- [x] TRX-001: Full replacement of "coming soon" stub with working Transcript feature
- [x] TRX-002: Add/paste transcript form with source type selector (manual, meeting, call, whatsapp)
- [x] TRX-003: Transcript list with status badge (pending / evaluated)
- [x] TRX-004: Per-transcript "Analyse with AI" button calling `POST /leads/{id}/transcripts/{id}/evaluate`
- [x] TRX-005: Inline evaluation result display: sentiment, intent level, interest level, confidence %, buying signals, objections, recommended next action
- [x] TRX-006: Delete transcript with confirmation
- [x] TRX-007: Queries for transcripts and evaluations (lazy — only load when tab is active)

### Frontend — Contacts Tab
- [x] CON-001: Replace single "Enrich via Lusha" alert button with "Enrich Contacts" modal
- [x] CON-002: Enrichment source checklist (Lusha = active; LinkedIn/Apollo/Hunter = requires config; Manual always available)
- [x] CON-003: Link to Settings → Integrations from modal for unconfigured sources

### Frontend — Intelligence Tab
- [x] INT-001: Add "Run Intelligence Functions" action bar to Intelligence tab with 4 buttons: Rescore Lead, Re-qualify, Run ICP Match, Run AI Analysis
- [x] INT-002: Success/error feedback inline in the action bar
- [x] INT-003: Fix `scoreMutation.onSuccess` — now invalidates `lead`, `lead-intelligence`, and `lead-progress` queries
- [x] INT-004: Fix `qualifyMutation.onSuccess` — now invalidates `lead` and `lead-intelligence`
- [x] INT-005: Fix `icpMatchMutation.onSuccess` — now invalidates both `lead-intelligence` and `revenue-intelligence`
- [x] INT-006: Fix ICP Match card text — no longer says "go to Revenue tab"

### ICP Profiles Feature
- [x] ICP-001: Create full ICP Profiles management page at `/settings/icp-profiles`
- [x] ICP-002: List view with weight bar visualization per profile
- [x] ICP-003: Create/Edit modal with: name, description, target industries (comma-sep), company size chips, territories (comma-sep), min lead score, 5 weight sliders (sum indicator), active toggle
- [x] ICP-004: Delete confirmation modal
- [x] ICP-005: Batch Match button — runs the profile against all leads in the system
- [x] ICP-006: Add "ICP Profiles" to Settings page grid
- [x] ICP-007: Add "ICP Profiles" to sidebar navigation (Target icon)

## Phase 14: AI Product Matching Engine — Full BANT + Competitor (2026-04-25)

### Audit findings
- [x] PM-001: Confirm existing LeadProductMatchingService (hybrid rule+AI, feature route 'product_matching')
- [x] PM-002: Confirm lead_product_matches table exists (missing BANT/confidence/AI provenance columns)
- [x] PM-003: Confirm products table missing: supported_regions, budget_range, target_company_size, use_cases, competitor_notes, keywords
- [x] PM-004: Confirm "Run Product Match" button missing from Intelligence tab

### Backend — Schema
- [x] PM-005: Migration 2026_04_25_120000 — extend products with: supported_regions, budget_range, target_company_size, use_cases (json), competitor_notes, keywords (json)
- [x] PM-006: Migration 2026_04_25_120000 — extend lead_product_matches with: bant_analysis (json), reasoning (json), recommended_approach, competitor_context, match_level, confidence_score, ai_provider_used, ai_model_used
- [x] PM-007: Migration 2026_04_25_120000 — create lead_product_match_runs (audit trail: lead_id, triggered_by, products_evaluated, matches_created, ai_calls_made, total_cost_usd, duration_ms, status, error_message)

### Backend — Models
- [x] PM-008: Update Product model — new fillable + json casts for use_cases, keywords
- [x] PM-009: Update LeadProductMatch model — new fillable + casts for bant_analysis, reasoning, confidence_score
- [x] PM-010: Create LeadProductMatchRun model

### Backend — Service
- [x] PM-011: Rewrite LeadProductMatchingService::matchLeadToProducts() — builds full lead context from: contacts, activities, qualifications, AI analyses, scores, meetings, transcript evaluations (BANT proxies)
- [x] PM-012: BANT context builder: Budget (size+industry proxy), Authority (contact title seniority), Need (pain points + AI analysis), Timeline (activity frequency + urgency signals + buying signals), Competitor (transcript objections + competitor_notes from product)
- [x] PM-013: AI prompt produces structured JSON: match_score, bant_analysis, reasoning[], recommended_approach, competitor_context, confidence_score
- [x] PM-014: Hybrid scoring: 60% rule-based + 40% AI (upgraded from 70/30)
- [x] PM-015: match_level derived: strong ≥70, moderate ≥45, weak <45
- [x] PM-016: Creates lead_product_match_runs audit record per run (duration, cost, status)
- [x] PM-017: Stores ai_provider_used + ai_model_used on each match record

### Backend — Controller
- [x] PM-018: LeadController::matchProducts() — passes request user ID for audit trail, returns enriched matches with summary (total, recommended, top match)
- [x] PM-019: LeadController::intelligence() — updated to load top 5 matches (all, not just recommended) ordered by score
- [x] PM-020: ProductController::store() + update() — accept all new product fields

### Frontend
- [x] PM-021: Add matchProductsMutation to lead detail page
- [x] PM-022: Add "Run Product Match" button to Intelligence tab action bar (5th button, ClipboardList icon)
- [x] PM-023: Replace basic Recommended Products card with full BANT Product Match display: TOP badge, match_level colored badge, score bar, BANT breakdown grid (Budget/Authority/Need/Timeline/Competitor), reasoning list, recommended approach block, confidence + model footer
- [x] PM-024: Product Match section always visible in Intelligence tab (empty state prompts to run)
- [x] PM-025: Products page edit modal — add all new targeting fields: target_company_size, budget_range, supported_regions, keywords, target_pain_points, use_cases, competitor_notes, ideal_company_profile

## Phase 15: AI-Generated ICP Profiles from Product Portfolio (2026-04-25)

### Backend
- [x] ICP-GEN-001: Add `icp_generation` to `AIRoutingService::FEATURE_CATALOG`
- [x] ICP-GEN-002: Add default prompt template for `icp_generation` in `AIPromptTemplateService`
- [x] ICP-GEN-003: Create `IcpGenerationService` — reads all active products, builds structured AI prompt, normalises response into ICP-compatible shape
- [x] ICP-GEN-004: Support two generation modes: `combined` (one ICP across whole portfolio) and `per_category` (one ICP per distinct product category)
- [x] ICP-GEN-005: Add `POST /api/icp-profiles/generate` endpoint in `IcpProfileController` — calls service, logs audit, returns suggestions WITHOUT persisting
- [x] ICP-GEN-006: Register route before `apiResource` to avoid route conflict with `{icpProfile}` param

### Frontend
- [x] ICP-GEN-007: Add "Generate with AI" split-button to ICP Profiles page header (left = trigger, right = mode dropdown)
- [x] ICP-GEN-008: Mode dropdown: Combined (one ICP) vs Per Category (one per product category)
- [x] ICP-GEN-009: Generation error displayed inline below header
- [x] ICP-GEN-010: Suggestions modal: shows each AI suggestion with name, description, criteria summary, weight bars, AI reasoning, missing data notes
- [x] ICP-GEN-011: "Use this ICP" button on each suggestion — calls `applySuggestion()` which pre-fills create/edit form with all AI values
- [x] ICP-GEN-012: Form remains fully editable after pre-fill — user adjusts weights, names, criteria before saving
- [x] ICP-GEN-013: TypeScript check ✅

## Deploy Bootstrap Standardisation (2026-04-26)

- [x] DB-BOOT-001: Create `backend/database/seeders/ProductionSeeder.php` — orchestrates DatabaseSeeder for production
- [x] DB-BOOT-002: Create `backend/database/seeders/DemoSeeder.php` — empty placeholder for staging demo data (never runs in production)
- [x] DB-BOOT-003: Update `backend/docker-entrypoint.production.sh` — add wait-for-db loop (PHP PDO retry), env-var-controlled migrate and seed steps
- [x] DB-BOOT-004: Update `backend/.env.example` — add AUTO_MIGRATE, AUTO_SEED_BASELINE, SEED_DEMO_DATA
- [x] DB-BOOT-005: Create `scripts/sync-db-local-to-vps.sh` — manual one-time pg_dump/restore helper with confirmation prompt
- [x] DB-BOOT-006: Create `docs/deployment/database-bootstrap.md` — full deployment database strategy reference
- [x] DB-BOOT-007: Update execution docs (decisions, tasks, progress)
- [x] DB-BOOT-008: Commit and push to GitHub

## AI Product Metadata Generator (2026-04-26)

### Backend
- [x] APM-001: Add `product_metadata_generation` to `AIRoutingService::FEATURE_CATALOG`
- [x] APM-002: Add default prompt template for `product_metadata_generation` in `AIPromptTemplateService`
- [x] APM-003: Create `ProductMetadataGenerationService` — builds AI prompt with product name + DB category list, normalises output, validates categories against available list
- [x] APM-004: Add `aiGenerate()` to `ProductController` — loads categories from products+industries DB, calls service, logs audit
- [x] APM-005: Register `POST /api/products/ai-generate` before `apiResource` to avoid `{product}` collision

### Frontend
- [x] APM-006: Add `aiGenerateMutation` to products page (calls `/api/products/ai-generate`)
- [x] APM-007: Add `aiGenerated` / `aiError` state for indicator and error display
- [x] APM-008: Add "AI Generate" button inline next to Product Name field (Sparkles icon, brand color, disabled unless name filled)
- [x] APM-009: On success: populate all 12 form fields from AI response
- [x] APM-010: Show "Fields filled by AI — review and edit before saving" indicator after generation
- [x] APM-011: Show inline error message below button if AI call fails
- [x] APM-012: All form fields remain fully editable after AI fill
- [x] APM-013: Changing Product Name clears `aiGenerated` indicator (user must re-generate)
- [x] APM-014: TypeScript check ✅ (0 errors)

## Phase 16: Geo-Based Product Fit Intelligence (Completed ✅)

### Backend
- [x] GEO-001: Create `geo_product_fit_analyses` migration with `(place_id, product_id)` unique key, hash fields, AI provenance, scoring fields
- [x] GEO-002: Create `GeoProductFitAnalysis` Eloquent model with casts and relationships
- [x] GEO-003: Create `GeoProductFitService` with rule-based pre-score + AI batch analysis + DB cache
- [x] GEO-004: Add `geo_product_fit_analysis` to `AIRoutingService::FEATURE_CATALOG`
- [x] GEO-005: Update `ProductController.index()` to support `?status=active` query param
- [x] GEO-006: Add `analyzeProductFit()` and `productFitResults()` methods to `MapDiscoveryController`
- [x] GEO-007: Update `addToLeads()` to accept `product_id` + `fit_analysis_id` and seed `LeadProductMatch`
- [x] GEO-008: Register new routes in `api.php`: `POST maps/geo-product-fit/analyze`, `GET maps/geo-product-fit/results`

### Frontend
- [x] GEO-010: Extend `DiscoveredLead` type with `fit_analysis?`, add `GeoProductFitAnalysis`, `FitLevel`, `ProductOption` types
- [x] GEO-011: Add `analyzeProductFit()` to `useMapDiscovery` hook; update `addToLeads` to pass product context
- [x] GEO-012: Add Product Fit Target card to `MapSearchPanel` with DB-loaded active products
- [x] GEO-013: Update `MapResultsPanel` with Analyze button, fit score/level badges, score gauge bar, filter/sort controls, full detail view card
- [x] GEO-014: Update `MapMarkersLayer` with fit-level coloring (emerald/amber/neutral), score chip on hover, label popover fit text
- [x] GEO-015: Update `map/page.tsx` to thread `selectedProductId`, wire `handleAnalyzeProductFit`, merge analysis into results state

### Docs
- [x] GEO-020: Update `docs/execution/progress.md` — Phase 16 summary
- [x] GEO-021: Update `docs/execution/decisions.md` — ADR-016, ADR-017, ADR-018
- [x] GEO-022: Update `docs/execution/tasks.md` — Phase 16 task list
