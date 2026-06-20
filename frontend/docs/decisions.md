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
- **Status**: Deprecated (Replaced by ADR-010)
- **Decision**: WhatsApp QR implementation will use a simulated mock-state-machine built on Laravel Cache to mimic QR generation and session scanning. 
- **Rationale**: Setting up a persistent Web Socket (Baileys/WWebJS) session requires a Node.js daemon which is outside the PHP standard infrastructure scope natively. This allows validation of the frontend UI polling logic exactly as intended by the BRD without heavy side-car architecture.
- **Impact**: Backend endpoint `POST /api/whatsapp/session/init` populates Cache and automatically transitions to `connected` after 8 seconds. Frontend correctly polls this state and unlocks WhatsApp UI actions.

## ADR-009: Map Discovery Module & Strategy
- **Date**: 2026-04-16
- **Status**: Active
- **Decision**: Separated Google Maps querying into its own controller (`MapDiscoveryController`) and introduced caching (`map_candidates`) and a history table (`map_search_history`). Frontend was shifted to a pure 3-pane sync state with `use-map-discovery` hook separating UI from API. `external_place_id` added as #1 dedup rule.
- **Rationale**: Keeps `LeadController` focused strictly on the pipeline CRM logic. Caching prevents extremely expensive Google Maps API loops. Dedup via place ID ensures the highest fidelity pipeline possible (preventing double entry before even reaching website/email matching logic).
- **Impact**: Map Discovery represents a top-level independent flow, with strict CRM handover.

## ADR-010: WhatsApp Real Baileys Sidecar Architecture
- **Date**: 2026-04-16
- **Status**: Active
- **Decision**: Replaced the WhatsApp mock simulator (ADR-008) with a real Node.js Baileys-based sidecar container (`whatsapp-service`). Integrated conversational DB schema (`whatsapp_conversations`, `whatsapp_contacts`), AI-based intent analysis via `AnalyzeWhatsAppConversationJob`, and a 5-tab Next.js frontend UI for Session, Direct Messaging, Broadcasts, AI-analyzed Conversations, and Privacy Rules.
- **Rationale**: Required for genuine WhatsApp capability matching the BRD. Docker volume persistence provides stable QR sessions, resolving earlier limitations. AI queue separation isolates expensive LLM conversational intent analysis from incoming real-time webhooks.
- **Impact**: Real WhatsApp capability activated. Backend now communicates to `whatsapp-service:3002` internally. Sessions survive container restarts.

## ADR-011: Post-Standardization UI Governance Lock
- **Date**: 2026-04-20
- **Status**: Active
- **Decision**: The active runtime frontend is now locked to shared UI primitives and tokenized styling. Browser-native `alert()` / `window.confirm()` flows and page-local button/modal systems are not allowed on admin surfaces.
- **Rationale**: The UI standardization pass only stays effective if follow-up work cannot quietly reintroduce isolated styling or inconsistent destructive flows. A governance lock turns the refactor into an enforceable baseline instead of a one-time cleanup.
- **Impact**:
  - `frontend/AGENTS.md` is the enforcement reference for runtime UI work.
  - `frontend/docs/ssot.md` defines the baseline pages and design-system contract.
  - Low-risk cleanup aligned `Industries`, `Products`, and `Settings → Webhooks` to shared `Button`, `Card`, `Input`, `Badge`, `FilterBar`, `Select`, and `Modal` primitives.

## ADR-012: DB-Backed Lead Source and Channel Taxonomy
- **Date**: 2026-05-17
- **Status**: Active
- **Decision**: Lead source and channel type classification are master data stored in PostgreSQL via `lead_source_types` and `lead_channel_types`, then referenced from `lead_sources`.
- **Rationale**: Lead origin taxonomy must be configurable by admins and reusable across imports, manual entry, map discovery, WhatsApp, referrals, and future channels without hardcoded frontend lists.
- **Impact**: Settings now exposes Lead Sources and Lead Channels CRUD. The Leads page can classify, display, and filter by both levels, with channel options scoped to the selected source.

## ADR-013: Dashboard Geography, Conversion Funnels, and Sales Achievement
- **Date**: 2026-05-19
- **Status**: Active
- **Decision**: Dashboard geography, conversion funnels, and achievement metrics are served from `/api/dashboard` rather than hardcoded frontend fixtures.
- **Rationale**: Dashboard modules must reflect real lead state, funnel stage colors, user hierarchy visibility, and Closed Won realization without duplicate client logic.
- **Impact**:
  - Map POI colors resolve from `funnel_stages.color` through shared stage color tokens.
  - Conversion is shown as aggregate horizontal funnel bars with `Belum Di Klasifikasi` as the 100% baseline, plus estimated amount conversion and drillable product bars.
  - Realisasi Revenue is calculated from `lead_outcomes` where `outcome = won` and `closed_at` falls inside the user's target period.

## ADR-014: Direct Manager Hierarchy Visibility
- **Date**: 2026-05-19
- **Status**: Active
- **Decision**: `users.direct_manager_id` defines the reporting tree used for lead visibility. Superadmin sees all; individual users see own leads; manager/admin-like roles see own leads plus recursive team leads.
- **Rationale**: Hierarchical access should be consistent across list views and dashboard aggregations without requiring page-specific permission rules.
- **Impact**: Lead queries now use `Lead::visibleTo($user)` for Leads, Dashboard, Funnel, Map, and revenue calculations. User updates are audit logged by existing `AuditService::logUpdated`.

## ADR-015: Horizontal Dashboard Funnel Visualization
- **Date**: 2026-05-19
- **Status**: Active
- **Decision**: Dashboard funnels use horizontal conversion bars for each pipeline path while preserving DB-backed aggregate counts and drilldown links.
- **Rationale**: The horizontal style makes count and conversion percentage comparison clearer and starts conversion from the pre-classification baseline.
- **Impact**: `frontend/app/page.tsx` renders two separate funnels, Belum Di Klasifikasi → Won and Belum Di Klasifikasi → Lost, using existing Card, Badge, and token-based colors.

## ADR-017: Product Tour — Lazy State Init to Fix StrictMode Race Condition
- **Date**: 2026-05-20
- **Status**: Active
- **Decision**: `useTour.js` initializes `isActive`, `currentStep`, and `isMinimized` via lazy `useState` initializers that read localStorage synchronously, instead of a `useEffect` that ran after the first render.
- **Rationale**: React StrictMode (enabled by default in Next.js 15 dev mode) double-invokes effects. The original init-`useEffect`/persist-`useEffect` pair created a race: persist ran with stale initial state (`active=false, step=0`) between the two StrictMode invocations of the init effect, so the second invocation read corrupted localStorage and reset the tour to step 0 while `isActive=true`. The routing effect then saw `step.route='/'` while `pathname='/map'` and pushed back to `/`, creating an infinite loop. Lazy initializers execute once at component creation — before any effect — eliminating the race window entirely.
- **Impact**: The tour correctly navigates across all 14 steps and 6 distinct routes without resetting. A secondary `routeReady` guard (`setTimeout(...,0)`) in `ProductTour.jsx` prevents the routing effect from firing until after the first render commit, adding an extra safety margin.

## ADR-016: Dashboard Lead Origin Aggregation
- **Date**: 2026-05-19
- **Status**: Active
- **Decision**: Dashboard lead source and channel totals are served by `/api/dashboard` as DB-backed aggregates using `COUNT(DISTINCT leads.id)` and `Lead::visibleTo($user)`.
- **Rationale**: Lead origin analytics must respect hierarchy visibility and avoid double-counting duplicate join rows while still allowing each source/channel row to drill into filtered Leads.
- **Impact**: `frontend/app/page.tsx` renders a Lead Sources & Channels block with token-based bars and links to `source_type` or `channel_type_id` filters.

## ADR-018: Collapsible Sidebar Parent Toggle Controls
- **Date**: 2026-06-02
- **Status**: Active
- **Decision**: Parent menus with submenus are rendered as `<button>` elements instead of `<Link>` components, avoiding default route navigation and only toggling expand/collapse states of the children items.
- **Rationale**: Prevents default page route navigation from triggering when clicking parent menus (such as Settings, WhatsApp, and Leads Generator), keeping the user's active page intact while navigating menu options.
- **Impact**: All main menus with children (Settings, WhatsApp, Leads Generator) support toggled collapse and expand states. Parent menu pages are no longer loaded directly, and clicking a parent menu item when the sidebar is collapsed automatically expands the sidebar and opens the corresponding submenu.

## ADR-019: Pre-Meeting Brief Intelligence Layer
- **Date**: 2026-06-20
- **Status**: Active
- **Decision**: Implemented Pre-Meeting Brief as an intelligence layer utilizing existing data (leads, activities, transcripts, product matches). Results are stored as a single `LeadPreMeetingBrief` relationship. No new core entities created.
- **Rationale**: User requested that no new separate tracking module be built, avoiding data duplication. The brief aggregates context and orchestrates the AI via existing prompt templates and AI services.
- **Impact**: Provides sales teams with structured preparation directly in the Lead view without fragmented contexts.

## ADR-020: Customer Journey Compilation Feature
- **Date**: 2026-06-20
- **Status**: Active
- **Decision**: Implemented Customer Journey as an aggregation layer across existing data models (leads, activities, transcripts, AI insights, revenue, product matching). The generated narrative is cached in a `customer_story` column on the `leads` table. Output is rendered on a dedicated tab in a 3-column responsive layout, supporting native browser PDF exports using standard `@media print` CSS classes.
- **Rationale**: User required a compiled chronological end-to-end view without creating duplicate core entities. Standard browser print functionality avoids heavyweight backend PDF generation dependencies while fulfilling the PDF export requirement.
- **Impact**: Provides an integrated, exportable high-level executive summary of the entire customer lifecycle without redundant tables.
