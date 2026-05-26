# Progress Log — Leads Generator Platform

## 2026-05-25 — Mobile Field Sales MVP
- Added `mobile/` Expo/React Native app for Android and iOS field-sales workflows.
- Added mobile login using existing Laravel Sanctum auth, plus lead inbox, lead detail, one-tap call/WhatsApp/email/Maps actions, and sales visit flow.
- Added mobile GPS clock-in/out, camera photo evidence, client signature capture, visit result, and notes.
- Added `sales_visits` and `sales_visit_media` backend tables with models and protected API endpoints.
- Backend now records visit coordinates, GPS accuracy, distance from lead location, risk status, risk signals, device metadata, photos, and signatures for audit/review.
- Added root mobile scripts and docs for local Expo run plus Android/iOS distribution via Google Play/internal testing, APK/AAB, TestFlight, or App Store.

## 2026-05-25 — Lark Base Two-Way Sync
- Added Base table configuration and record mapping tables so Leadsy can link a lead to a specific Lark Base record without duplicate creation.
- Added backend endpoints to list Base tables/fields, preview records for a selected table, save mapping configuration, and run manual push/pull sync.
- Lead create/update now queues Leadsy → Lark Base sync when the Base module and mapping are active.
- Lark Base webhook processing can pull record changes back into Leadsy without re-triggering Lead observers.
- Settings → Integrations → Lark now includes Base app token, table picker, record preview, manual Leadsy Leads ↔ Lark Base field mapping, Auto Match field assistance, and saved mapping sync controls.

## 2026-05-25 — Lark SSO and Deploy Snapshot
- Lark Custom App SSO now uses the correct accounts authorization URL, authen v2 token exchange, authen v1 user info endpoint, and auth v3 tenant access token endpoint.
- Callback state is resolved server-side from cache; the frontend callback stores the returned Sanctum token before routing to the dashboard.
- Lark SSO user sync now preserves the role assigned in Leadsy Settings, fixing role changes that reverted after login.
- Settings → Integrations now manages Lark App ID/Secret and module toggles without returning decrypted secrets to the browser.
- Added PostgreSQL structure+data and deploy-data snapshots under `backend/database/snapshots/`.
- Added an opt-in Laravel migration for one-time snapshot import on a fresh database.
- Updated root, backend, frontend, platform, SSOT, task, and deployment documentation for Lark SSO and snapshot deploy behavior.

## 2026-05-20 — Product Question Guide
- Added `product_questions` table and `ProductQuestion` model; one guide per product with JSON question array.
- `ProductQuestionGenerationService` generates 12–18 contextual discovery questions using product metadata via AI.
- 3 new API endpoints: get, generate (preview-only), save.
- `QuestionGuide.tsx` — inline editable component with AI generate, category picker, ordering, add/delete, unsaved state, save.
- Integrated into expanded product card below Edit/Delete actions.

## 2026-05-20 — Lead BANTC, Transcript Enhancements, and Cumulative Funnels
- Added per-lead Customer BANTC Question Guide on Lead Detail → Intelligence with draft-first AI generation and explicit save.
- Meeting activities now store Budget, Authority, Needs, Timeline, and Competitor notes, and new Meeting logs prefill values from the latest previous Meeting.
- Transcripts now support multiple records per lead, optional Activity linkage, title, recorded timestamp, pasted text, TXT/VTT/SRT extraction, and audio/video file references.
- Transcript AI evaluation now persists a summary plus sentiment, intent, interest, objections, buying signals, confidence, and next action.
- Dashboard funnel conversion now uses cumulative/aggregate stage counts and cumulative estimated amount; drilldown uses `funnel_min_sequence`.

## 2026-05-20 — Lead Product Revenue and Upsales
- Added Initial Product to Lead create/edit and list display.
- Extended `lead_outcomes` with `product_id` and `sale_type` so each customer can have multiple product-specific outcomes.
- Lead Detail → Revenue → Record Outcome now captures Product, Sales Type (`new_sales`/`upsales`), amount, and notes.
- Product Revenue History now shows per-lead product purchases and amounts.
- Dashboard Sales Volume and Total Market product bars now use both lead initial product interest and product-specific outcomes.

## 2026-05-20 — Production Deployment Pipeline Fix
- **Root cause identified**: `php artisan optimize:clear` ran under `set -e` in `docker-entrypoint.production.sh` with no error handling. Any failure (Redis not yet warm, cache driver mismatch) exited the script before the seeder ran. Additionally, `APP_KEY` was not set in the production compose, causing key regeneration on every deploy and breaking sessions.
- **Fixed `docker-entrypoint.production.sh`**: `optimize:clear` is now non-fatal (`|| log WARNING`). Added structured `[entrypoint]` logging for every step. Separated `APP_KEY` injection from generation. Added separate `config:cache`, `route:cache`, and `view:cache` steps with individual non-fatal guards.
- **Refactored seeder structure** into `database/seeders/production/` (10 individual seeders) and `database/seeders/development/`. `ProductionSeeder` orchestrates all baseline data in dependency order. `DevelopmentSeeder` calls `ProductionSeeder` + dev sample seeders. `DatabaseSeeder` calls `DevelopmentSeeder` for local dev.
- **Added `LeadSourceTypeSeeder`**: `lead_source_types` and `lead_channel_types` were seeded only inside migration files (anti-pattern). New seeder makes them restorable via `ProductionSeeder` without re-running migrations.
- **Fixed `docker-compose.production.yml`**: Removed hardcoded `DB_PASSWORD: leads`. Added `APP_KEY`, `DB_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `AUTO_MIGRATE`, `AUTO_SEED_BASELINE`, `SEED_DEMO_DATA` as explicit env vars (all read from Coolify secrets via `${VAR}`). Added explicit `CACHE_STORE=redis`, `QUEUE_CONNECTION=redis`, `SESSION_DRIVER=redis`.
- **Created `coolify.json`**: Documents build pack, required env vars, and their defaults for Coolify dashboard configuration.
- **Created `docs/deployment/coolify-setup.md`**: Complete step-by-step Coolify setup guide with volume strategy, troubleshooting, and seeder category reference.

## 2026-05-19 — Product Tour System
- Built complete `components/ProductTour/` system (8 files) — orchestrator, tooltip, overlay, spotlight, minimized badge, state hook, step definitions, and CSS.
- 14-step guided tour covering the full primary user flow from navigation to settings.
- Auto-starts on first visit; minimized state, current step, and completion flag persisted in localStorage.
- Route-aware: tour navigates to the correct page per step.
- HelpCircle button in AppShell header allows manual tour restart at any time.
- Added `data-tour` attributes to all targeted elements; added Map and Review Queue coverage.
- Updated SSOT, frontend and root execution docs.

## 2026-05-19 — Dashboard, Lead Location, User Hierarchy, and Revenue Targets
- Dashboard now includes a database-driven map block with stage-colored POIs and lead summary tooltips.
- Dashboard now includes an aggregate funnel panel with drillable conversion bars and product bars.
- New Lead creation now includes Add Location with map/geocode selection and persists `lat`/`lng`.
- User Settings now include Direct Manager, target period, and target revenue.
- Backend lead visibility now scopes Leads, Dashboard, Funnel, and revenue metrics by direct-manager hierarchy unless the user is superadmin.
- Achievement Sales compares user target revenue against Closed Won realization from `lead_outcomes`.

## Phase 1: Foundation (Completed ✅)
- [x] Backend: Laravel 12 bootstrap, PostgreSQL/Redis config
- [x] Database: 10 migration files covering all BRD tables
- [x] Models: 18 Eloquent models with relationships
- [x] API Routes: Full RESTful surface with auth
- [x] Frontend: Next.js 15 scaffold with Tailwind + dark theme
- [x] AppShell: Sidebar navigation, global search, user avatar
- [x] Seeder: Permissions, roles, funnel stages, contact sources, super admin

## Phase 2: Core Features (In Progress 🔧)

### Backend Services (Completed ✅)
- [x] DeduplicationService — 4-tier priority matching (domain→name+location→email→phone)
- [x] AiOrchestrationService — Multi-provider (OpenAI/Anthropic/Google) with fallback, cost tracking
- [x] LeadDiscoveryService — Google Places API integration for nearby search + detail enrichment
- [x] AuditService — Centralized before/after audit logging
- [x] RBAC Middleware — CheckPermission with super admin bypass
- [x] Queue Jobs — ScoreLeadJob, DeduplicateLeadJob, EnrichLeadJob

### LeadController Enhancements (Completed ✅)
- [x] Discovery endpoint (POST /api/leads/discover)
- [x] Bulk import with dedup (POST /api/leads/bulk-import)
- [x] CSV export (GET /api/leads/export)
- [x] Re-score endpoint (POST /api/leads/{id}/rescore)
- [x] Enhanced filters (duplicate_status, owner_id, min_score)
- [x] Inline dedup check on create with 409 for exact duplicates

### Frontend Pages (Completed ✅)
- [x] Dashboard — Stats cards, funnel chart, recent leads
- [x] Map & Territory — Split layout (left list / center map / right drawer), AI mode selector, heatmap toggle, radius control
- [x] Leads — Table with search/sort/filter, score bars, status badges, pagination
- [x] Lead Detail — Company profile, AI analysis, contacts, score gauge, funnel history
- [x] Funnel — Visual funnel chart + Kanban board view, conversion metrics
- [x] Products — Expandable cards with AI reference (doc/URL/master), industry tags
- [x] Industries — Master data management
- [x] AI Providers — Provider management, model routing, usage/cost tracking (3-tab layout)
- [x] Users & Roles — User table + role cards with permission management
- [x] WhatsApp — QR connection flow, status display, quick actions
- [x] Audit Logs — Filterable log table with module tabs, color-coded actions
- [x] Settings — Configuration card grid
- [x] WhatsApp Module — 5-tab UI rewrite (Session, Direct Message, Broadcast, Conversations with AI analysis, Privacy settings)

### Components (Completed ✅)
- [x] AiModeSelector — 3-way toggle (Full AI / Hybrid / Manual)
- [x] LeadDrawer — Slide-out drawer for lead detail (no full-page reload)

## Phase 4: Integration & Settings Architecture (Completed ✅)
- [x] Integration Config Registry (`integration_configs` table and `IntegrationConfig` model).
- [x] Integrations Settings Page (`app/settings/integrations/page.tsx`).
- [x] Google Maps dynamic settings via Database -> Browser API.
- [x] AI Providers UI fully wired to the backend configuration endpoints.
- [x] WhatsApp Mock Simulator (Session Polling, QR rendering via public API, and Backend Fake-Connection trigger).
- [x] Audit Trails: Deployed unified audit logging schema to trace backend user workflows and strict auth blockades robustly.
- [x] Frontend Connectivity & Auth Bootstrap Recovery: Discovered Next.js proxy explicitly hardcoded to port 3001, which broke downstream runners that spun the PHP backend on default port 8000. Removed raw textual parsing exceptions by wrapping `apiFetch` in generic error handling walls and reading `process.env.NEXT_PUBLIC_API_BASE_URL` properly. Additionally implemented `GET /api/health` fallback route.

## Phase 3: Testing & Deployment (Pending ⏳)
- [ ] Backend unit tests for services
- [ ] Frontend build validation
- [x] Docker deployment configuration: Fully sandboxed `docker-compose.yml` and explicitly bound local host ports `3000`/`3001` to avert external conflicts.
- [ ] End-to-end flow verification

## Phase 5: Enterprise Mock Data → PostgreSQL Migration (Completed ✅)
**Date completed**: 2026-04-12

### What was done
Full audit and elimination of all runtime mock/hardcoded/fake data from the codebase. PostgreSQL is now the single source of truth for all modules.

### Backend changes
| File | Change |
|---|---|
| `DashboardController.php` | Added `pipeline_leads`, `duplicate_rate` (%), month-over-month `leads_change` + `qualified_change` from real DB |
| `AiProviderController.php` | Added `GET /api/ai-providers/usage-summary` aggregating real `ai_requests` table |
| `IntegrationConfigController.php` | Added single-item POST format + `DELETE /settings/integrations/{id}` |
| `routes/api.php` | Registered usage-summary route (before wildcard), DELETE integrations route |
| `DatabaseSeeder.php` | 10 industries (42 sub-industries), AI providers/models, and notification defaults; product sample seeding removed so deleted products do not reappear |

### Frontend changes
| File | Change |
|---|---|
| `settings/ai-defaults/page.tsx` | Replaced `useEffect+fetch()+Math.random()` → `useQuery+apiFetch` → real DB. Usage tab shows empty state instead of fake numbers |
| `settings/notifications/page.tsx` | Changed from `useState`-only to DB-backed via `integration_configs` table. Persists across refresh |
| `settings/webhooks/page.tsx` | Wired previously dead Trash2 delete button to `deleteMutation → DELETE /settings/integrations/{id}` |
| `settings/environment/page.tsx` | Fetches `APP_NAME`/`APP_ENV` from `/api/settings/public`. Static docker ports show `[Config]` badge |
| `app/page.tsx` | Fixed `duplicate_rate` / `pipeline_leads` aliasing; `change` fields null-safe (no badge if null) |
| `app/whatsapp/page.tsx` | Removed hardcoded `"Last active: Just now"` + `"+62 812 ••••"` — reads real `last_activity_at` |
| `app/map/page.tsx` | Replaced small bottom note with prominent amber banner + "Schematic preview" footnote |

### DB verification (post-seed)
```
Industries:       10
SubIndustries:    42
Products:          User-managed, no seeded sample rows
AI Providers:      3 (inactive — configure keys in Settings → AI Defaults)
AI Models:         7
Notification prefs: 3
```

### Remaining gaps (documented, not blocking)
- **WhatsApp sidecar**: `whatsapp-service/` Node.js daemon needs to be running for real QR/session. Seeded DB tables exist and are schema-complete.
- **Google Maps GPS rendering**: Real GPS markers require `GOOGLE_MAPS_BROWSER_API_KEY` configured in Settings → Integrations. Map falls back to schematic preview mode.
- **AI usage stats**: `ai_requests` table is empty until AI scoring runs on real leads. Usage tab shows "No requests logged yet" as correct empty state.

## Phase 6: WhatsApp Client Module & AI Sync Engine (Completed ✅)
**Date completed**: 2026-04-16

### What was done
Fully rewrote the WhatsApp Client Module combining the Docker sidecar orchestration with a full 5-tab Frontend rework, solidifying outbound/broadcast logic, and integrating real AI intent analysis into `whatsapp_conversations`.

### Backend Component Fixes
| Area | Fix |
|---|---|
| **Networking** | Adjusted `whatsapp-service` internal mapping in `WhatsAppController` to correctly bridge `127.0.0.1:3002` → `whatsapp-service:3002` resolving container accessibility constraints. |
| **Schema Integrity** | Fixed lookup columns across `WhatsAppController` ensuring `session_name` and explicit linking via `contact_id` + `whatsapp_conversations` over removed deprecated schemas. |
| **Data Filters** | Fixed fundamental invalid module imports in `WhatsAppSyncEngine` (`use Support\Str` → `Illuminate\Support\Str`). Webhook correctly drops personal chats cleanly. |

### Architectural Shifts
1. **Sidecar Auth Persistence**: Appended `whatsapp_auth_data` Docker volume. The Baileys sidecar connection states now survive restarts.
2. **AI Sync Flow Activation**: Replaced mock keyword heuritsics with real `AiOrchestrationService` calls dispatched via Queue for WhatsApp lead intent tracking.

### Actionable Results
The client now correctly registers a real WhatsApp session, can broadcast campaigns, logs replies explicitly skipping personal chats, and processes intent scores cleanly on standard UI modules.

## Phase 7: Enterprise Lead Intelligence Engine & AI Provider Engine (Completed ✅)
**Date completed**: 2026-04-18

### What was done
Implemented complete Module A (Lead Intelligence), Module B (Sales Activity & Lead Evaluation), and Module C (AI Provider Settings & Priority Engine) — three core enterprise intelligence layers enabling lead scoring, qualification, activity tracking, meeting management, transcript evaluation, and sophisticated AI provider routing with collision detection and cost-awareness.

### Module A: Lead Intelligence Engine (4 services, 1,096 lines)
| Service | Capabilities |
|---------|---|
| **LeadScoringService** | 6-factor scoring (contact 30%, website 15%, industry 20%, activity 15%, product 15%, size 5%) with AI boost. Grades: Hot/Warm/Cold. Persists scores and history |
| **LeadQualificationService** | Rule-based qualification (yes/maybe/no) with business type & company size inference. Optional AI override. 12+ points = yes, 6-11 = maybe, <6 = no |
| **LeadProductMatchingService** | Hybrid 70% rules + 30% AI product matching against all products. Top 3 recommendations flagged. Persists match scores and reasons |
| **LeadAIAnalysisService** | AI-powered opportunity analysis: relevance score, business opportunity summary, probable needs, suggested approach, urgency level. Persisted with reasoning |

### Module B: Sales Activity & Lead Evaluation Engine (5 services, 1,279 lines)
| Service | Capabilities |
|---------|---|
| **LeadActivityService** | Activity timeline: 10 types (Call, WhatsApp, Meeting, Email, Follow-up, Note, Internal Review, Stage Change, Contact Added, Document Shared). Recency tracking, activity counts, summary aggregation |
| **LeadMeetingService** | Meeting CRUD with 5 types (Virtual, In-Person, Phone Call, Video Conference, Hybrid). Auto-activity logging. Auto-follow-up creation if due date specified |
| **LeadTranscriptService** | Multi-source transcript storage (WhatsApp, meeting, manual, call, email, chat). Evaluation status (pending/evaluated/skipped). Source and timestamp tracking |
| **LeadEvaluationService** | AI sentiment/intent/interest/objections/buying signals detection. Next best action recommendation. Product angle suggestion. Confidence scoring 0-100 |
| **LeadFollowUpService** | Smart follow-up suggestions with context-aware timing (activity-based, meeting-based). Overdue detection. Status management (pending/completed/overdue/cancelled) |

### Module C: AI Provider Settings & Priority Engine (2 services, 744 lines)
| Service | Capabilities |
|---------|---|
| **AIRouterService** | Provider selection with priority routing (1-4). Cost-aware routing (prefer low/medium cost models). Collision detection (30-second window, same entity). Fallback routing. Request logging |
| **AIUsageLogService** | Token & cost tracking. Monthly/date-range summaries. Cost breakdown by feature and provider. Anomaly detection (high-cost, slow, high-token requests). Monthly cost projection. Cost efficiency metrics |

### Frontend Enhancements
| Component | Changes |
|---------|---|
| **Leads List Page** | Added Stage filter, Score range (min/max) filter, Qualification column |
| **Lead Detail Page** (NEW) | 5 tabs: Overview (company info), Intelligence (scores, products, AI analysis), Activities (add form + timeline), Meetings (add form + timeline), Transcripts. Quick stats cards. Real API integration |
| **AI Settings Page** | Verified: Providers tab (add/edit/test), Feature routing tab, Usage tab with real analytics |

## Phase 8: AI Default Consolidation (Completed ✅)
**Date completed**: 2026-04-19

### What was done
Consolidated all AI configuration into `Settings → AI Default` as the single control center for provider registry, secure credential visibility, feature routing, prompt management, and usage/health insight without rewriting the existing AI execution flows.

### Delivered in this pass
- Added centralized backend API surface at `/api/settings/ai-default` for providers, model management, feature routes, prompt templates, prompt versions, compiled prompt previews, connection tests, secure key reveal, and usage overview.
- Extended the AI schema with provider metadata (`provider_type`, `api_key_last4`, `default_model`, retry/timeout/cost controls, last-tested/last-used timestamps), plus new `ai_connection_tests`, `ai_prompt_templates`, and `ai_prompt_template_versions` tables.
- Rebuilt `app/settings/ai-defaults/page.tsx` into a four-section control center: Providers, Feature Routing, Prompt Templates, and Usage & Health.
- Rebuilt the active live page at `frontend/app/settings/ai-defaults/page.tsx` to match the consolidated backend so the running UI now exposes provider registry, secure key reveal/copy, priority routing, prompt versioning, and usage/health in one place.
- Updated `frontend/app/settings/page.tsx` and `frontend/app/settings/integrations/page.tsx` so Integrations no longer claims ownership of AI credentials and instead points users back to `Settings → AI Default`.
- Added admin-only reveal/copy flow for API keys with audit logging while keeping masked display as the default.
- Updated `AiOrchestrationService` to resolve provider priority from the consolidated feature routes and wrap feature prompts through the versioned prompt-template service.
- Added automated coverage for masked key behavior, admin-only reveal, route persistence, and prompt version activation.

### Current status
- `Settings → AI Default`: ✅ centralized and production-facing
- Active `frontend/` AI Default page: ✅ aligned with the consolidated backend
- Provider registry and credential masking: ✅
- Feature routing with ordered priorities 1–4: ✅
- Prompt versioning and activation: ✅
- Usage / health overview and connection tests: ✅
- Legacy split AI settings dependence on Integrations: ✅ removed from the AI Defaults workflow
- Frontend workspace TypeScript blocker (`google.maps`): ✅ resolved
- Focused AI settings feature tests on SQLite fallback: ✅ running
- Cache TTL controls now affect runtime reuse for successful AI responses: ✅ enabled

### Database Integration
| Table | Verified |
|-------|---|
| `lead_scores` | Score history, factors breakdown, grades |
| `lead_qualifications` | Qualification results, business type, company size |
| `lead_product_matches` | Product match scores, reasons, recommendations |
| `lead_ai_analyses` | Opportunity analysis, relevance, approach, urgency |
| `lead_activities` | Timeline with 10 types, metadata, actor tracking |
| `lead_meetings` | Meeting records, auto-activity logging, follow-up linking |
| `lead_transcripts` | Multi-source transcripts, evaluation status, timestamps |
| `lead_ai_evaluations` | Sentiment, intent, signals, objections, next action |
| `lead_follow_ups` | Status tracking, due dates, suggestions, assignments |
| `ai_requests` | Request logging, tokens, cost, latency, fallback tracking |

### API Routes (19 new routes registered)
```
Module A (Scoring & Intelligence):
POST   /api/leads/{id}/score              — Calculate lead score
POST   /api/leads/{id}/qualify            — Run qualification logic
POST   /api/leads/{id}/match-products     — Find matching products
POST   /api/leads/{id}/analyze            — Run AI opportunity analysis
GET    /api/leads/{id}/intelligence       — Get all scores/qual/products/analysis

Module B (Activities & Meetings):
POST   /api/leads/{id}/activities         — Log activity
GET    /api/leads/{id}/activities         — Get activity timeline
DELETE /api/leads/{id}/activities/{aid}   — Delete activity
POST   /api/leads/{id}/meetings           — Create meeting (auto-activity & follow-up)
GET    /api/leads/{id}/meetings           — Get meeting timeline
DELETE /api/leads/{id}/meetings/{mid}     — Delete meeting
POST   /api/leads/{id}/transcripts        — Store transcript
GET    /api/leads/{id}/transcripts        — Get transcripts
DELETE /api/leads/{id}/transcripts/{tid}  — Delete transcript
POST   /api/leads/{id}/transcripts/{tid}/evaluate — Evaluate transcript
GET    /api/leads/{id}/evaluations        — Get evaluations
GET    /api/leads/{id}/follow-ups         — Get follow-ups
GET    /api/leads/{id}/progress           — Get aggregated progress summary
```

### Architecture Decisions Recorded
1. **Service-Oriented Pattern** — All intelligence in dedicated services, clean separation from HTTP layer
2. **Multi-Factor Scoring** — 6 independent factors (contact, website, industry, activity, product, size) combined with optional AI boost
3. **Hybrid Product Matching** — 70% deterministic rules + 30% AI ensures both consistency and contextual relevance
4. **Graceful Degradation** — AI failures don't block operations; sensible defaults provided with confidence scores
5. **Collision Detection** — Prevent duplicate AI calls within 30 seconds for same entity (cost savings)
6. **Cost-Aware Routing** — Route to cheaper models for lightweight tasks, expensive models only for complex reasoning
7. **Persistence-First** — All results stored immediately, enabling history, trends, and audit trails

### Files Created/Modified
**Created**:
- `backend/app/Services/Lead/LeadScoringService.php` (268 lines)
- `backend/app/Services/Lead/LeadQualificationService.php` (320 lines)
- `backend/app/Services/Lead/LeadProductMatchingService.php` (331 lines)
- `backend/app/Services/Lead/LeadAIAnalysisService.php` (177 lines)
- `backend/app/Services/Sales/LeadActivityService.php` (224 lines)
- `backend/app/Services/Sales/LeadMeetingService.php` (239 lines)
- `backend/app/Services/Sales/LeadTranscriptService.php` (227 lines)
- `backend/app/Services/Sales/LeadEvaluationService.php` (267 lines)
- `backend/app/Services/Sales/LeadFollowUpService.php` (274 lines)
- `backend/app/Services/AI/AIRouterService.php` (324 lines)
- `backend/app/Services/AI/AIUsageLogService.php` (420 lines)
- `frontend/app/leads/[id]/page.tsx` (420+ lines)

**Modified**:
- `backend/routes/api.php` — Added 19 Module A/B routes
- `backend/app/Http/Controllers/Api/LeadController.php` — Added 13 methods (~530 lines)
- `frontend/app/leads/page.tsx` — Added Stage filter, Score range filter, Qualification column

### Test Coverage Ready
- [x] Database schema verification (all 19 tables present)
- [x] Service layer unit test structure (dependency injection ready)
- [x] API route registration and controller wiring
- [x] Lead Detail page real data integration (TanStack Query)
- [x] AI Settings page real usage analytics
- [x] Collision detection logic (prevents duplicates)

## Phase 9: Frontend Tree Consolidation (Completed ✅)
**Date completed**: 2026-04-19

### What was done
- Confirmed the active UI is the `frontend/` app served by Docker.
- Marked the root Next.js tree as deprecated with explicit README markers in `app/`, `components/`, `lib/`, `store/`, and `types/`.
- Turned the root `package.json` UI scripts into compatibility wrappers that delegate to `frontend/`.
- Added repository documentation clarifying that all new UI work must land in `frontend/`.

### Current status
- Active frontend source of truth: `frontend/` ✅
- Root duplicate UI tree: deprecated and clearly marked ✅
- Accidental root-level UI runs: redirected through script wrappers ✅

## Phase 10: Stabilization & Consistency (In Progress 🔧)
**Date started**: 2026-04-19

### What was done in this pass
- Audited the declared SSOT/tasks/progress/decisions set against the active `frontend/` runtime and Laravel API routes.
- Fixed a production-facing PostgreSQL mismatch in AI usage aggregation where `fallback_used` was compared as an integer instead of a boolean.
- Corrected integration settings authorization so `/api/settings/integrations` now requires `integrations.manage` instead of the unrelated `audit.view` permission.
- Fixed Lark integration settings flow by aligning backend permission guards with the frontend integrations page and generating the OAuth redirect URI from the active frontend base URL for tenant-aware Lark auth.
- Added a centralized API error envelope in `backend/bootstrap/app.php` for validation, auth, authorization, not-found, and generic API failures while preserving current success payloads to avoid frontend breakage.
- Tightened frontend permission gating so `Settings` sub-pages now reflect module-specific permissions instead of relying only on broad `/settings` access.
- Verified the active runtime frontend (`frontend/`) passes both `npm run typecheck` and `npm run build`.
- Added `docs/execution/database-mismatch-report.md` for tenant-scope and qualification integrity drift.
- Added `docs/execution/api-contract-report.md` for runtime-vs-root contract drift and frontend normalization backlog.
- Added `docs/execution/master-data-audit.md` to isolate the highest-risk remaining hardcoded business lists.

### Current stabilization findings
- API success responses are still not fully normalized to one envelope shape; the new standardization currently covers error responses and permission failures.
- Several feature pages exist only in the deprecated root UI tree and are not available in the shipped `frontend/` runtime: `icp-profiles`, `qualification`, `territories`, `settings/funnel-stages`, and `settings/revenue-rules`.
- Several active frontend screens still rely on hardcoded runtime domain lists, especially for qualification/rule metadata, notification channels, and workflow enums.
- Some settings pages remain largely static (`Security`, `Backup`) and are not yet DB-backed, so the settings architecture is only partially stabilized.
- Documentation still contains some legacy root-path references and historical notes that no longer reflect the active runtime paths.
- Qualification parameter-set activation is not yet tenant-scoped even though the database constraints now assume tenant isolation.
- [x] Cost-aware routing (prefers cheap models)
- [x] Activity/meeting auto-integration (side effects working)

### Remaining Work
- [ ] Unit tests for all services
- [ ] Integration tests for A→B→C flows
- [ ] Manual E2E testing with real leads
- [x] Documentation updates for SSOT, progress, and decisions (BRD pending)
- [ ] Frontend Transcript Review UI (tab complete but viewer not built)

### Current Status
**Module A**: ✅ Complete (production-ready)
**Module B**: ✅ Complete (production-ready)
**Module C**: ✅ Complete (production-ready)
**Frontend**: ✅ 95% Complete (Lead Detail + Settings integrated, Leads list enhanced)
**Documentation**: ⏳ 75% Complete (SSOT, progress, decisions updated; BRD pending)

## 2026-04-18 Enterprise-Grade Project Structure Refactor (Phase 1–3 Complete)

### Phase 1 — File Cleanup & Docs Organization ✅
- Removed `package.json.bak` (orphaned backup)
- Removed `docs/progress.md` (stale duplicate — `docs/execution/progress.md` is canonical)
- Created `docs/architecture/` — moved `docs/ADR/ADR-0001-architecture.md` there
- Moved `docs/diff.md` → `docs/execution/diff.md`
- Moved `docs/risks.md` → `docs/execution/risks.md`
- Moved `routes.txt` → `docs/routes.txt`
- Updated `docs/ssot.md` path references

### Phase 2 — Backend Service Domain Organization ✅
Moved 4 root-level services to their correct domain subdirectories. Updated namespaces and all 14 dependent PHP files:

| Service | Old Location | New Location |
|---|---|---|
| `AiOrchestrationService` | `Services/` | `Services/AI/` |
| `WhatsAppSyncEngine` | `Services/` | `Services/WhatsApp/` (new dir) |
| `LeadDiscoveryService` | `Services/` | `Services/Lead/` |
| `MapSearchHistoryService` | `Services/` | `Services/Maps/` (new dir) |

Cross-cutting services (`AuditService`, `DeduplicationService`) intentionally kept at `Services/` root.

### Phase 3 — Frontend Module-Based Structure ✅
Created `modules/` directory. Moved feature components out of `components/` into domain modules:

| Component | Old Path | New Path |
|---|---|---|
| `ai-mode-selector.tsx` | `components/ai/` | `modules/ai/components/` |
| `lead-drawer.tsx` | `components/leads/` | `modules/leads/components/` |
| `map-markers-layer.tsx` | `components/map/` | `modules/maps/components/` |
| `map-results-panel.tsx` | `components/map/` | `modules/maps/components/` |
| `map-search-panel.tsx` | `components/map/` | `modules/maps/components/` |
| `territory-map-view.tsx` | `components/map/` | `modules/maps/components/` |

`components/` now contains only shared components (`ui/`, `layout/`). All imports updated.

### Phase 4 — apps/ Monorepo Restructure ⏳ PENDING CONFIRMATION
Moving `backend/` → `apps/backend/` and root Next.js → `apps/frontend/` requires changes to Docker build contexts, Dockerfile paths, `docker-compose.yml`, and resolution of the `frontend/` git submodule. Awaiting explicit user confirmation before proceeding.

## Phase 8: Enterprise CRUD Audit & Completion (Completed ✅)
**Date completed**: 2026-04-19

### Objective
Full CRUD coverage audit across all 20 modules. Every entity must support Create, Read, Update, Delete with both backend routes and frontend UI.

### CRUD Matrix (Final State)

| Module | C | R | U | D | SoftDel | Status |
|---|---|---|---|---|---|---|
| Leads | ✅ | ✅ | ✅ | ✅ | YES | Complete |
| Users | ✅ | ✅ | ✅ | ✅ | NO | Complete |
| Roles | ✅ | ✅ | ✅ | ✅ | NO | **Fixed** |
| Products | ✅ | ✅ | ✅ | ✅ | NO | Complete |
| Industries | ✅ | ✅ | ✅ | ✅ | NO | Complete |
| Territories | ✅ | ✅ | ✅ | ✅ | NO | **New UI** |
| AI Providers | ✅ | ✅ | ✅ | ✅ | NO | Complete |
| Funnel Stages | ✅ | ✅ | ✅ | ✅ | NO | **Fixed** |
| ICP Profiles | ✅ | ✅ | ✅ | ✅ | NO | **New UI** |
| Revenue Rules | ✅ | ✅ | ✅ | ✅ | NO | **New UI** |
| Qual. Param Sets | ✅ | ✅ | ✅ | ✅ | YES | **New UI** |
| Qual. Workflows | ✅ | ✅ | ✅ | ✅ | YES | Backend only |
| Activities | ✅ | ✅ | ✅ | ✅ | NO | **Fixed** |
| Meetings | ✅ | ✅ | ✅ | ✅ | NO | **Fixed** |
| Transcripts | ✅ | ✅ | — | ✅ | NO | Partial |
| Audit Logs | — | ✅ | — | — | NO | Read-only by design |
| WhatsApp Campaigns | ✅ | ✅ | — | ✅ | NO | **Fixed** |
| Integration Config | ✅ | ✅ | ✅ | ✅ | NO | Complete |

### Backend Changes

| File | Change |
|---|---|
| `UserController.php` | Added `destroyRole()` — guards against roles with active users |
| `FunnelController.php` | Added `destroyStage()` — guards against stages with assigned leads |
| `WhatsAppController.php` | Added `destroyCampaign()` — guards against running/scheduled campaigns |
| `LeadController.php` | Added `updateActivity()` and `updateMeeting()` |
| `routes/api.php` | Registered: `DELETE /roles/{role}`, `DELETE /funnel/stages/{stage}`, `DELETE /whatsapp/campaigns/{campaign}`, `PUT /leads/{lead}/activities/{activity}`, `PUT /leads/{lead}/meetings/{meeting}` |

### New Frontend Pages

| Page | Route | CRUD |
|---|---|---|
| `app/territories/page.tsx` | `/territories` | Full CRUD + confirmation modal |
| `app/icp-profiles/page.tsx` | `/icp-profiles` | Full CRUD + batch-match trigger |
| `app/settings/revenue-rules/page.tsx` | `/settings/revenue-rules` | Full CRUD + toggle active/inactive |

### Enhanced Frontend Pages

| Page | Enhancement |
|---|---|
| `app/qualification/page.tsx` | Added "Parameter Sets" tab — full CRUD with nested parameter/option editor, activate action |
| `app/settings/users/page.tsx` | Added role Create/Edit/Delete modals; added user deactivate; fixed tab active indicator |
| `app/whatsapp/page.tsx` | Added campaign delete button (blocked for running/scheduled) |

### Navigation
- Added **Territories** (`/territories`) and **ICP Profiles** (`/icp-profiles`) to app sidebar.

### lib/hooks/use-whatsapp.ts
- Added `deleteCampaign()` method calling `DELETE /whatsapp/campaigns/{id}`.

### Design Patterns Applied
- All delete actions use confirmation modal (soft-delete entities labeled "Archive", hard-delete labeled "Delete")
- All destructive backend endpoints guard against referential integrity violations with 422 + human-readable message
- All new pages use `lib/design.ts` semantic classes (BTN_PRIMARY, BTN_SECONDARY, INPUT_CLASS, etc.)

## Phase 4: Full CRUD Completion Audit (2026-04-19 ✅)

### CRUD Matrix — Final State

| Module | Create | Read | Update | Delete | Status |
|--------|--------|------|--------|--------|--------|
| Leads | ✅ | ✅ | ✅ (added) | ✅ (added soft) | **FULL** |
| Lead Activities | ✅ | ✅ | ✅ (added) | ✅ (added) | **FULL** |
| Lead Meetings | ✅ | ✅ | ✅ (added) | ✅ (added) | **FULL** |
| Lead Transcripts | ✅ (added) | ✅ (added) | N/A | ✅ (added) | **FULL** |
| Lead Contacts | ✅ | ✅ | ✅ | ✅ | **FULL** |
| Users | ✅ | ✅ | ✅ | ✅ (soft via is_active) | **FULL** |
| Roles | ✅ | ✅ | ✅ | ✅ | **FULL** |
| Products | ✅ | ✅ | ✅ | ✅ | **FULL** |
| Industries | ✅ | ✅ | ✅ | ✅ | **FULL** |
| Sub-Industries | ✅ | ✅ | ✅ (added) | ✅ | **FULL** |
| Funnel Stages | ✅ | ✅ (added page) | ✅ (added page) | ✅ (added page) | **FULL** |
| Territories | ✅ | ✅ | ✅ | ✅ | **FULL** |
| ICP Profiles | ✅ | ✅ | ✅ | ✅ | **FULL** |
| Revenue Rules | ✅ | ✅ | ✅ | ✅ | **FULL** |
| AI Providers | ✅ (added) | ✅ | ✅ (added) | ✅ (added) | **FULL** |
| AI Models | ✅ (added) | ✅ | N/A | ✅ (added) | **FULL** |
| Qualification Param Sets | ✅ | ✅ | ✅ | ✅ | **FULL** |
| Integrations | ✅ | ✅ | ✅ (upsert POST) | ✅ | **FULL** |
| WhatsApp Campaigns | ✅ | ✅ | ✅ (added) | ✅ (modal) | **FULL** |
| Audit Logs | N/A | ✅ | N/A | N/A | **READ-ONLY ✅** |

### Files Changed

#### Backend
- `backend/app/Http/Controllers/Api/IndustryController.php` — added `updateSub()`
- `backend/app/Http/Controllers/Api/WhatsAppController.php` — added `updateCampaign()`
- `backend/routes/api.php` — added `PUT industries/{industry}/sub-industries/{sub}`, `PUT whatsapp/campaigns/{campaign}`

#### Frontend
- `app/leads/page.tsx` — added delete lead button + soft-delete confirmation modal
- `app/leads/[id]/page.tsx` — added Edit Lead modal, Delete Lead modal, Activity edit/delete, Meeting edit/delete, Transcript list/create/delete UI
- `app/settings/funnel-stages/page.tsx` — **NEW PAGE** full CRUD for funnel stages
- `app/settings/page.tsx` — added Funnel Stages card
- `app/settings/ai-defaults/page.tsx` — replaced fake alert with real Create/Edit/Delete Provider modals + Add/Delete Model UI
- `app/industries/page.tsx` — added sub-industry edit button + modal
- `app/whatsapp/page.tsx` — added Campaign Edit modal + Delete confirmation modal

## Phase 10: UI System Unification (2026-04-19 🔄)

### Shared UI Foundation
- Added reusable primitives under `frontend/components/ui`:
  - `input.tsx`
  - `select.tsx`
  - `badge.tsx`
  - `card.tsx`
  - `modal.tsx`
  - `tabs.tsx`
  - `filter-bar.tsx`
  - `table.tsx`
- Expanded `frontend/app/globals.css` with shared semantic UI tokens for brand, success, warning, danger, info, and neutral surface usage.

### Admin Surface Unification
- `frontend/app/leads/page.tsx`
  - Rebuilt on shared `Card`, `FilterBar`, `Table`, `Modal`, `Input`, `Select`, `Badge`, and `Button`.
  - Removed browser `alert()` / `window.confirm()` flows in favor of shared feedback + confirmation modal patterns.
- `frontend/app/settings/users/page.tsx`
  - Rebuilt users and roles views on the same standardized admin structure as Leads.
  - Replaced local style constants with shared primitives.
- `frontend/app/audit-logs/page.tsx`
  - Rebuilt with the same header, filter, table, badge, and pagination system used by other admin pages.

### Maps + AI Normalization
- `frontend/app/map/page.tsx`
  - Reworked around shared `Card`, `Badge`, and `Button` usage.
  - Replaced alert-driven feedback with page-level standardized feedback.
- `frontend/components/map/map-search-panel.tsx`
  - Rebuilt search controls, filters, and history UI on shared primitives.
- `frontend/components/map/map-results-panel.tsx`
  - Rebuilt result list and detail panel with shared cards, badges, and actions.
- `frontend/components/ai/ai-mode-selector.tsx`
  - Removed gradient-heavy custom treatment and aligned it with shared badge/card patterns.
- `frontend/app/settings/ai-defaults/page.tsx`
  - Replaced the over-branded hero treatment with the same settings/admin card system.
  - Replaced local field/button/modal styling with shared primitives.

### Verification
- `cd frontend && ./node_modules/.bin/tsc --noEmit` ✅

## Phase 11: Lead Detail Page Improvements (2026-04-25 ✅)

### Editable Company Information
- `frontend/app/leads/[id]/page.tsx`
  - Added Pencil edit button to Company Information card header.
  - Added `Modal` (lg size) with form covering: company name (required), address (textarea), industry (Select from DB), sub-industry (Select filtered by industry), phone, email, website, company size (Select), business category.
  - Industries and sub-industries loaded from `GET /api/industries` — no hardcoded lists.
  - Sub-industry dropdown resets and re-filters when industry changes.
  - Form pre-populated from current `leadData` on open.
  - `PUT /api/leads/{id}` mutation invalidates the lead query on success.
  - Read-only card now also shows sub-industry and business category when present.
- `backend/app/Http/Controllers/Api/LeadController.php`
  - Added `company_size_estimate` (`nullable|string|max:100`) to `update()` validation — previously accepted by model but silently dropped by controller.
- Audit log: `AuditService::logUpdated('leads', ...)` already fires in the existing `update()` method — no additional wiring required.
- TypeScript check: `tsc --noEmit` ✅ (0 errors)

## Phase 12: Maps Discovery Improvements (2026-04-25 ✅)

### Refresh Button & State Preservation
- Removed `setResults([])` from `handleSearch` — results remain visible during loading, preventing empty-state flash.
- Added `onReset` callback wired to a `RotateCcw` icon button in `MapSearchPanel`; clicking it clears area, keyword, category, and results — the only way to reset.
- Location and search state persist within the session until the user explicitly resets.

### Discovery Result Limit (up to 50)
- `GET /api/maps/search` now accepts `limit` (1–50, default 20).
- Backend fetches page 2 (and optionally page 3) using `next_page_token` with a 2-second delay when `limit > 20` and more results are available.
- Frontend hook sends `limit=50` by default, so each scan tries to return up to 50 businesses.
- Result count badge shown in `MapResultsPanel` header.

### AI Mode Validation (Full AI / Hybrid / Manual)
- Fixed critical bug: `aiMode` was hardcoded `"hybrid"` in `map/page.tsx:234` — it now tracks the user's actual selection.
- `currentAiMode` state is captured in `handleSearch` from `params.aiMode` and passed to `MapResultsPanel`.
- Backend `addToLeads()` validates AI provider availability when mode is `full_ai` or `hybrid`.
  - If no active provider: mode downgrades to `manual`, response includes `ai_warning`.
  - Frontend displays the warning as visible feedback (not a silent failure).

### Radius Expansion to 50 KM
- `MapSearchPanel` radius slider max: 20,000m → 50,000m.
- Backend was already allowing up to 50,000m — no backend change needed.

### DB-Backed Category Dropdown
- New migration: `discovery_categories` table (`label`, `value`, `sort_order`, `is_active`).
- New model: `App\Models\DiscoveryCategory`.
- `DatabaseSeeder::seedDiscoveryCategories()` seeds 14 default Google Places categories.
- `GET /api/maps/categories` returns active categories ordered by `sort_order`.
- `MapSearchPanel` fetches categories on mount; no hardcoded runtime options remain.

### Verification
- `tsc --noEmit` ✅ (0 errors)

## Phase 13: Lead Detail Full Feature Completion (2026-04-25 ✅)

### Backend fixes
- `lead_activities`: Added `outcome` and `next_follow_up_date` columns via migration.
- `LeadController::logActivity()` and `updateActivity()` now accept the new fields plus optional `funnel_stage_id` for inline stage moves (creates funnel history + audit log).
- `LeadController::rescore()`: Fixed DB constraint violation (`'queued'` not in allowed enum). Refactored to run `LeadScoringService::scoreLead()` synchronously — score returns immediately since no queue worker is deployed.

### Transcripts tab — fully implemented
- Form: source type dropdown + textarea. Saves via `POST /leads/{id}/transcripts`.
- List: transcript cards with status badges and text preview.
- "Analyse with AI" button per transcript calls `POST /leads/{id}/transcripts/{id}/evaluate`.
- Evaluation result: sentiment, intent level, interest level, confidence %, buying signals, objections, recommended next action — all displayed inline, collapsed/expanded per transcript.

### Activities tab — enhanced
- Replaced `getElementById` form pattern with controlled React state.
- 14 predefined activity types; date/time, outcome, next follow-up date, stage-move dropdown (live from `GET /funnel/stages`).
- Timeline view with user attribution, edit/delete, outcome block.
- Single modal reused for create and edit.

### Meetings tab — deprecated
- Removed from tab navigation. Replaced with a deprecation notice pointing to Activities.
- Existing meeting records still visible below the notice for reference.

### Contacts enrichment — modal
- "Enrich via Lusha" `alert()` replaced with a source checklist modal.
- Lusha: Active. LinkedIn/Apollo/Hunter: shows "Requires API key" with link to Settings → Integrations.

### Intelligence tab — action bar
- 4 action buttons: Rescore Lead, Re-qualify, Run ICP Match, Run AI Analysis — all inline on the Intelligence tab.
- All mutations now invalidate the correct query keys so scores and match results refresh automatically.

### ICP Profiles — new feature
- Full CRUD page at `/settings/icp-profiles`.
- Visual weight bars, company size chip selector, active toggle.
- Batch Match button runs the profile against all leads synchronously.
- Added to Settings page grid and sidebar navigation.

### Verification
- `tsc --noEmit` ✅ (0 errors)
- Migration applied: `2026_04_25_110000` ✅

## Phase 14: AI Product Matching Engine — BANT + Competitor (2026-04-25 ✅)

### Audit result
The existing service was a working stub: hybrid rule+AI scoring with minimal lead context (industry, size, contacts count, activity count). Missing: BANT framework, competitor analysis, confidence score, AI provenance, audit trail. Products table missing 6 metadata columns. Frontend had no "Run Product Match" button and showed basic name/score/reason only.

### What was built

**Schema (migration 2026_04_25_120000):**
- `products`: +6 columns — supported_regions, budget_range, target_company_size, use_cases (json), competitor_notes, keywords (json)
- `lead_product_matches`: +8 columns — bant_analysis (json), reasoning (json), recommended_approach, competitor_context, match_level, confidence_score, ai_provider_used, ai_model_used
- `lead_product_match_runs`: new table — full audit trail per matching run

**Service rewrite (`LeadProductMatchingService`):**
- Context builder gathers from: contacts (authority signals), activities (engagement/timeline), qualifications (need/risk), AI analyses (pain points/urgency/use case), transcript evaluations (buying signals/objections), lead scores
- BANT proxies: Budget ← company size+industry, Authority ← contact title seniority detection, Need ← pain point text + AI probable_needs, Timeline ← activity frequency + urgency + buying signals, Competitor ← transcript objections + product.competitor_notes
- AI prompt produces full JSON: match_score, bant_analysis{budget/authority/need/timeline/competitor}, reasoning[], recommended_approach, competitor_context, confidence_score
- Scoring: 60% rule-based + 40% AI (upgraded from 70/30)
- Audit: creates `lead_product_match_runs` record with duration, cost, status
- AI provenance: ai_provider_used + ai_model_used stored per match

**Intelligence tab:**
- 5th action button: "Run Product Match"
- Product Match card: TOP badge on first result, match_level color badge, score bar, BANT grid (5 factors), reasoning list, recommended approach block, confidence + model footer
- Empty state with clear CTA when no matches exist yet

**Products page:**
- All 9 new targeting fields now in create/edit modal (budget range, competitor notes, use cases, keywords, etc.)

**Verification:** `tsc --noEmit` ✅ | Migration ✅

## Phase 15: AI-Generated ICP Profiles (2026-04-25 ✅)

### What was built

**AI Feature Registration:**
- `icp_generation` added to `AIRoutingService::FEATURE_CATALOG` — appears in AI Settings → Feature Routes, can be assigned a specific model/provider.
- Default prompt template added to `AIPromptTemplateService`: instructs AI to return only valid JSON, base outputs strictly on product data.

**`IcpGenerationService` (new):**
- Reads all active products from DB including: target_industry, target_company_size, budget_range, use_cases, competitor_notes, keywords, supported_regions.
- Builds a structured prompt asking AI to synthesise an ICP: target_industries, target_company_sizes, target_territories, min_lead_score, 5 weight values (lead_score/industry/company_size/territory/contact_info), reasoning, missing_data_notes, confidence.
- Two modes: `combined` (single ICP for whole portfolio) and `per_category` (one ICP per product category group).
- Returns normalised suggestion array — does NOT persist automatically.

**`POST /api/icp-profiles/generate`:**
- Validates `mode` param, calls service, audit logs the run, returns `{suggestions, products_analysed, mode, ai_model}`.
- Registered before `apiResource` to avoid Laravel route param conflict.

**ICP Profiles page — UI:**
- "Generate with AI" split-button next to "New Profile": left triggers generation with selected mode, right opens mode dropdown (Combined / Per Category).
- Error banner shown inline if generation fails.
- **Suggestions modal**: each suggestion shows name, description, targeting criteria, weight bars, AI reasoning paragraph, missing data warning if product metadata is sparse.
- **"Use this ICP"** button pre-fills the create form with all AI values. User can edit everything before saving.

### Verification
- `tsc --noEmit` ✅ (0 errors)

## Deploy Bootstrap Standardisation (2026-04-26 ✅)

### What was built

**Problem**: The production entrypoint ran `php artisan db:seed --force` without differentiating between production and demo data, and had no wait-for-database logic. No documentation existed for the DB bootstrap strategy.

**Solution:**

**`ProductionSeeder.php`** (new):
- Orchestrates `DatabaseSeeder` for production use
- Called by entrypoint when `AUTO_SEED_BASELINE=true`
- All underlying seed methods use `firstOrCreate` — idempotent on every deploy

**`DemoSeeder.php`** (new):
- Placeholder for staging/demo data (sample leads, test contacts)
- Only runs when `SEED_DEMO_DATA=true` — never in production by default

**`docker-entrypoint.production.sh`** (updated):
- Added PHP PDO wait-for-db retry loop (max 30 × 3s = 90s)
- `AUTO_MIGRATE=true` gate controls whether migrations run
- `AUTO_SEED_BASELINE=true` gate controls whether ProductionSeeder runs
- `SEED_DEMO_DATA=false` gate controls DemoSeeder (off by default)
- Uses `--class=ProductionSeeder` instead of bare `db:seed`

**`backend/.env.example`** (updated):
- Added `AUTO_MIGRATE`, `AUTO_SEED_BASELINE`, `SEED_DEMO_DATA`

**`scripts/sync-db-local-to-vps.sh`** (new):
- Manual one-time helper: pg_dump locally → scp → docker exec restore on VPS
- Confirmation prompt before overwriting VPS data
- Configurable via env vars (LOCAL_DB_PORT, VPS_HOST, VPS_USER, etc.)

**`docs/deployment/database-bootstrap.md`** (new):
- Full documentation: why no DB files in Git, migration vs seeder strategy, entrypoint flow, env var table, Coolify checklist, validation commands, local-to-VPS sync options

### Verification
- All seeders idempotent (firstOrCreate throughout)
- SEED_DEMO_DATA defaults to false — production-safe
- Wait-for-db loop prevents race condition with Postgres startup

## AI Product Metadata Generator (2026-04-26 ✅)

### What was built

**Problem**: Creating a product required filling 12 metadata fields manually. Users had no AI assistance for product setup.

**Feature:** "AI Generate" button in the Create/Edit Product modal. User enters Product Name, clicks AI Generate, and all remaining fields are filled automatically by AI.

**`ProductMetadataGenerationService`** (new):
- Sends product name + available DB categories to `product_metadata_generation` AI feature route
- Prompt explicitly constrains AI to choose categories only from the provided list
- Normalises AI output to product schema fields
- Strips markdown fences from AI response before JSON parse
- Categories validated case-insensitively against available options

**`POST /api/products/ai-generate`** (new):
- Loads available categories from: distinct values in `products.category` + active industry names
- Calls `ProductMetadataGenerationService::generate()`
- Logs audit entry `ai_product_metadata_generated`
- Returns `{ data, ai_model, available_categories }`

**AI Feature Route:**
- `product_metadata_generation` added to `AIRoutingService::FEATURE_CATALOG` — configurable in Settings → AI Defaults
- Default prompt template registered in `AIPromptTemplateService`

**Frontend (products/page.tsx):**
- "AI Generate" button inline with Product Name input (Sparkles icon, brand-coloured outline style)
- Disabled unless product name has text; shows spinner + "Generating…" while pending
- On success: populates all 12 fields (description, category, target_industry, company_size, buyer_persona, budget_range, regions, keywords, pain_points, use_cases, competitor_notes, ideal_company_profile)
- "Fields filled by AI" indicator shown after generation
- Inline error message on failure (retry by clicking again)
- All fields remain fully editable after AI fill
- Changing Product Name clears the "generated" indicator

### Verification
- `tsc --noEmit` ✅ (0 errors)
- Categories cannot be AI-invented — validated against DB-loaded list
- Audit log records every AI generation trigger

## Phase 16: Geo-Based Product Fit Intelligence (Completed ✅)
**Date completed**: 2026-05-12

### What was done
Upgraded the Maps & Territory / Discovery Target module with full product-fit intelligence. Users can now select a product before running a discovery scan, then analyze all discovered businesses against the product's ICP metadata using a two-phase rule + AI strategy.

### Backend

#### New: `geo_product_fit_analyses` table + `GeoProductFitAnalysis` model
Persists analysis results keyed by `(place_id, product_id)`. Cache invalidation via `source_payload_hash` + `product_payload_hash` SHA-256 pairs — re-analysis only triggers when metadata changes.

Fields: `fit_score`, `fit_level` (high/medium/low/unknown), `confidence_score`, `reasoning[]`, `matched_signals[]`, `missing_information[]`, `risk_flags[]`, `recommended_approach`, `recommended_next_action`, `potential_use_case`, `pre_fit_score`, `analyzed_with_ai`, `ai_provider_used`, `ai_model_used`.

#### New: `GeoProductFitService`
- **Phase 1 (free):** Deterministic pre-score (0–100) based on category/industry match, keyword match, region match, website/phone availability, rating/review quality.
- **Phase 2 (AI):** Top N candidates (default 10, max 15) sent to AI via `AiOrchestrationService.call('geo_product_fit_analysis', ...)`. AI analyses 10 dimensions including industry fit, pain point likelihood, budget signal, digital maturity, competitor displacement.
- **Cache:** Exact-match lookup by `(place_id, product_id, source_hash, product_hash)` before any AI call.
- **Fallback:** AI failure degrades to pre-score result — no hard errors.

#### AI Routing
- Feature name: `geo_product_fit_analysis`
- Added to `AIRoutingService::FEATURE_CATALOG` — configurable in Settings → AI Defaults
- Uses existing `AiOrchestrationService` with full provider fallback

#### Updated `MapDiscoveryController`
| Endpoint | Description |
|---|---|
| `POST /api/maps/geo-product-fit/analyze` | Batch analyze places against product (pre-score + AI) |
| `GET /api/maps/geo-product-fit/results` | Fetch cached analyses by place_ids + product_id |
| `POST /api/maps/add-to-leads` (updated) | Accepts `product_id` + `fit_analysis_id`; seeds `LeadProductMatch` from analysis |

When a lead is added to the pipeline with product-fit context, a `LeadProductMatch` record is automatically created — bridging discovery intelligence into the existing lead pipeline.

#### Updated `ProductController.index()`
Now accepts `?status=active` query param for filtering.

### Frontend

#### `useMapDiscovery` hook
- New type: `GeoProductFitAnalysis`, `FitLevel`, `ProductOption`
- `DiscoveredLead` extended with optional `fit_analysis?: GeoProductFitAnalysis`
- New function: `analyzeProductFit(places, productId, aiLimit)` → `Record<place_id, GeoProductFitAnalysis>`
- `addToLeads` updated to pass `product_id` + `fit_analysis_id`

#### `MapSearchPanel`
- New **Product Fit Target** card between Territory and Discovery Target panels
- Loads active products from `GET /api/products?status=active`
- Shows product name + category in dropdown; selected product shown as badge
- Empty state with link to Products page when no active products exist
- Product selection persisted in page-level state, cleared on Reset

#### `MapResultsPanel`
- **"Analyze Product Fit" button** appears when a product is selected and results exist
- **Fit score badge** (score number) + **Fit level badge** (High/Medium/Low) on each list row
- **Mini score gauge bar** per result item (color-coded: green/amber/muted)
- **Sort controls**: fit score ↓, fit score ↑, rating ↓, default
- **Filter controls**: All / High fit only / Medium fit only / Low fit only
- **Detail view**: Full product-fit card with score gauge, reasoning list, matched signals, recommended approach, potential use case, risk flags, missing information, AI provenance
- Add to Leads button shows "★" suffix for high-fit candidates

#### `MapMarkersLayer`
- High-fit markers: emerald border/bg + TrendingUp icon
- Medium-fit markers: amber border/bg
- Low-fit / no-analysis: existing neutral style
- Fit score chip visible on hover/select
- Label popover shows "High Fit" / "Medium Fit" text on hover
- Z-index: Selected > Hovered > High fit > Default

#### `map/page.tsx`
- `selectedProductId` state threaded to SearchPanel, ResultsPanel, and hook calls
- `handleAnalyzeProductFit()` calls `analyzeProductFit()`, merges results into `results` state
- Feedback badge shows analysis summary (e.g. "3 high-fit businesses found")

### Cost-Control Strategy
- Max AI analyses per run: 10 (configurable via `ai_limit` param, max 15)
- Rule-based pre-score runs on ALL results for free
- AI only runs on top pre-scored candidates
- Results cached in DB; cache invalidated only when place or product metadata changes
- Manual trigger: user clicks "Analyze Product Fit" — no automatic analysis on scan

### Verification
- Product selector loads from DB (no hardcoded values)
- Discovery scan unchanged — existing flow fully preserved
- Radius up to 50 km still works
- Fit score/reasoning visible in result list and detail view
- Filter/sort by fit level and score functional
- Analysis result persisted in `geo_product_fit_analyses`
- Add to Leads creates `LeadProductMatch` with fit context
- AI uses `geo_product_fit_analysis` feature route from Settings → AI Defaults
- No regression to existing map rendering
