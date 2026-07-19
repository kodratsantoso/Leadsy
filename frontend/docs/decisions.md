# Architecture Decision Records (ADR)

## ADR-028: Isolated Confidentiality Engine
- **Date**: 2026-06-27
- **Status**: Active
- **Decision**: All sensitivity scoring is stored in `confidentiality_assessments` and `confidentiality_assessment_versions` derived via `ConfidentialityScoringService`.
- **Rationale**: Prevent polluting the core `leads` table and ensure an audit trail with explainable data-driven reasoning (Data Sensitivity, Revenue, Deal Stage, Access Exposure).
- **Impact**: Backend creates dedicated tables and API endpoints `/api/dashboard/confidentiality`. Frontend dashboard built to display explainable matrix without mock data.

## ADR-027: Data-Driven Role KPIs
- **Date**: 2026-06-27
- **Status**: Active
- **Decision**: Team Performance dashboard metrics are strictly calculated from active tables (`leads`, `lead_outcomes`, `lead_sales_orders`, etc.) grouping users by 4 macro roles (Sales, Presales, AM, CSM). If targets are missing or no data exists, the metric degrades gracefully instead of mocking data.
- **Rationale**: Prior approaches mocked data, destroying trust. A robust analytics engine must reflect true DB state.
- **Impact**: `RoleKpiCalculationService` rewritten to aggregate live data; `kpi_definitions` seeded; dashboard UI modernized for 10 blocks.

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

## ADR-021: Pre-Meeting Brief Industry & Business Category Extensibility
- **Date**: 2026-06-22
- **Status**: Active
- **Decision**: Extended the Pre-Meeting Brief AI Orchestration prompt and UI to factor in Industry, Business Category, and Product metadata. Outputs now include `industry_based_bantc_questions` and a distinct `product_industry_fit_score`. Missing industry metadata directly lowers the readiness score and presents UI warnings.
- **Rationale**: Provides hyper-specific discovery guidance based on known vertical operational challenges, reducing generic AI BANTC questions and forcing users to classify leads before demonstrations.
- **Impact**: `LeadPreMeetingBrief` model accepts additional JSON snapshots. The Pre-Meeting tab UI handles missing context gracefully.

## ADR-022: Pre-Meeting Brief Presales-Ready Overhaul
- **Date**: 2026-06-22
- **Status**: Active
- **Decision**: Completely overhauled the Pre-Meeting Brief output architecture to 11 discrete JSON blocks (e.g., `meeting_strategy_json`, `digitalization_resistance_json`, `demo_cycle_json`). The engine now merges both Product Question Guides and Customer BANTC Question Guides from the database. The UI is rewritten into a modular tabbed view using `Tabs` from `shadcn-ui`.
- **Rationale**: Sales needed actionable, targeted outputs adapted strictly to the `meeting_type` (Discovery vs Demo) rather than generic narrative. Extracting digital resistance and mapping exact demo cycles forces preparation standardisation.
- **Impact**: Added 11 new JSON columns to `lead_pre_meeting_briefs`, extensive refactoring of `PreMeetingBriefService.php` and `PreMeetingBriefTab.tsx`. Kept backward compatibility with old JSON payloads via UI-level mappings.

## ADR-023: Lark Transcript Fetch and Batch Actions
- **Date**: 2026-06-24
- **Status**: Active
- **Decision**: Enabled native fetching of Lark Meeting Transcripts via URL linking, integrated with the existing AI transcript evaluation workflow. Implemented a Batch Delete functionality for Leads, exclusively restricted to the `super_admin` role.
- **Rationale**: User needed a seamless way to pull transcripts directly from Lark Minutes without manual text extraction, allowing AI analysis on meeting outcomes automatically. Additionally, managing test/unqualified leads at scale required bulk deletion capabilities with strict governance.
- **Impact**: New route for fetching transcripts using the Lark Integration OAuth connection. UI enhancements in the Lead Form and Transcripts tab. Batch actions introduced to the Lead index page, gated by explicit role checks.

## ADR-024: AI Output Governance and Editability
- **Date**: 2026-06-26
- **Status**: Active
- **Decision**: Introduced a unified governance layer for all AI-generated outputs, allowing versioning, auditing, and manual user editing. Product specification comparisons were also implemented to scrape and compare competitor/product data, requiring user approval before updating the CRM database. Confidentiality Matrix was added to the Dashboard.
- **Rationale**: AI outputs cannot be 'final by default'. They require human-in-the-loop review, especially for product metadata and sensitive intelligence.
- **Impact**: All AI outputs now use the morph-mapped `ai_generated_outputs` and `ai_output_versions` structure. Product data is not updated automatically but generates `update_suggestions`.

## ADR-025: Product Details UI Revamp
- **Date**: 2026-06-27
- **Status**: Active
- **Decision**: Completely refactored the Product Management module. Replaced the single-page accordion design with dedicated product detail pages (`/products/[id]`) separated into 5 modular tabs (Overview, Targeting & Match AI, Product Tiers, Question Guide, and Comparison & Scraping). Introduced `website_url` field to explicitly power the Feature Scraping engine.
- **Rationale**: Grouping all fields and configuration into an accordion list was too dense and not scalable as the Product entity grew in features. Splitting them into distinct tabs allows for easier navigation and clear separation of concerns (Core details vs AI Targeting vs Pricing).
- **Impact**: Product management is now a robust multi-page application module. The Comparison & Scraping AI relies on the `website_url` explicit input for crawling.

## ADR-026: Role-Based Commission & Order-to-Cash Module
- **Date**: 2026-06-27
- **Status**: Active
- **Decision**: Evolved from a single `owner_id` to a `lead_role_assignments` model, allowing multiple users (Sales, Presales, CSM) to be assigned to one lead with distinct roles and `contribution_percentage`. Implemented a full Order-to-Cash module with `lead_quotations` and `lead_sales_orders` to track revenue realization.
- **Rationale**: Real-world sales cycles involve multiple contributors. Accurately attributing revenue for commission requires distributing the Closed Won amount across the assigned roles.
- **Impact**: Analytics queries (like the Team Performance Dashboard) now calculate revenue by joining `lead_sales_orders` and `lead_role_assignments`. Primary ownership remains for hierarchy access, but revenue distribution is decentralized.

## [2026-06-28] Role-Based Target & Cascade Module
- **Decision:** Shifted the Target and Cascade logic from relying on `users` table metadata (`target_revenue`) to a dedicated `targets` table and `target_cascade_allocations` table.
- **Rationale:** The system needs to support multiple target types (amount, percentage, quantity, score, days) across different roles (Sales, Presales, CSM, AM), breaking away from the rigid sales-revenue-only model.
- **Impact:** Target configurations are now flexible and can be created via `GET /api/targets/config`. Sales is the only role that supports revenue target cascade.

## ADR-029: Automated Lead Enrichment Pipeline
- **Date**: 2026-07-06
- **Status**: Active
- **Decision**: Implemented `LeadEnrichmentTriggerService` to safely orchestrate automated enrichments on lead creation and Lark Base sync. Migrated from hardcoded master data mapping to `LeadEnrichmentAiOrchestrator` driven by strict JSON output contracts and runtime AI prompt settings.
- **Rationale**: Manual data entry and raw Lark imports often lack standardized fields required for accurate AI ICP matching and scoring. The new unified pipeline leverages system/user prompts with JSON schema validation to dynamically enrich leads, discover location details, and map fields to the system's Taxonomy before firing the AI Rescore and Re-qualify pipeline. AI settings are fully configurable via the UI.
- **Impact**: All newly created leads (manual or via Lark) automatically enter the `EnrichLeadJob` pipeline which utilizes `LeadEnrichmentAiOrchestrator` and subsequently the `ScoreLeadJob` pipeline, ensuring fully populated and scored records without user intervention and without hardcoded AI prompts.

## ADR-030: Order to Cash Foundation Audit and Restructure
- **Date**: 2026-07-18
- **Status**: Active
- **Decision**: Restructured the O2C API routes and controller logic (`LeadOrderToCashController`) to strictly enforce default currency validation, dynamic backend price/discount/tax recalculations, transactional quotation-to-sales-order conversion, and full audit and activity logging.
- **Rationale**: The previous implementation had key property name mismatches between the frontend and database models, lacked direct sales order creation APIs, and allowed invalid status transitions and duplicate conversions. Enforcing transaction boundaries and logging at the database controller level ensures a reliable, trackable pipeline.
- **Impact**: Backend APIs and the `OrderToCash.tsx` component are fully aligned. Integrates direct sales order creation with warnings, prevents duplicate conversions, and updates Lead closing amounts on confirmed orders. Fully covered by feature tests.

## ADR-031: NetSuite-style Quotation Input System Improvement
- **Date**: 2026-07-19
- **Status**: Active
- **Decision**: Upgraded the Create Quotation input layout into an enterprise-grade form with sub-tabs (Primary, Commercial, Items, Terms & Exclusions, Summary) using dynamic dropdowns for Contacts, Sales/Presales Owners, and Product Masters. Also implemented multi-item line discounts (percentage & absolute amount), tax rates, header-level discounts, other costs, and custom terms.
- **Rationale**: Real-world corporate quotations require multi-faceted pricing models, specific payment terms (e.g. Net 30), contract start/end boundaries, and custom scope definitions. Moving away from a simple single-level modal to a tabbed enterprise interface makes Leadsy capable of handling complex B2B sales agreements.
- **Impact**: Added a safe schema migration expanding `lead_quotations` and `lead_quotation_items` tables. Updated model casts and relation maps. Rewrote controller calculation algorithms and validation constraints, supported by an updated integration test suite.

## ADR-032: Interactive Sales Stage Flow with Activity Logging
- **Date**: 2026-07-19
- **Status**: Active
- **Decision**: Implemented an interactive Sales Stage Flow above the Human Verification Card in the Lead Detail page. The flow represents the stages dynamically based on the active funnel stages from database and settings. Any stage transition (either by clicking a stage or clicking "Complete Step") forces the user to write an activity log first.
- **Rationale**: Pipeline stage changes are critical milestones that should always have explanation/context (e.g. why did the deal stall, or what was agreed during negotiation). Intercepting stage changes with the Log Activity modal ensures that stage history transitions are always accompanied by context.
- **Impact**: The Lead Detail page now renders a modern chevron flow. Clicking a stage pre-populates and opens the Log Activity modal. Successfully compiles and passes type checks.

## ADR-033: Wide-Layout Estimate Modal and SaaS Period Fields
- **Date**: 2026-07-19
- **Status**: Active
- **Decision**: Enlarged the quotation creation modal to `7xl` (`max-w-7xl`). Added `Start Date Period`, `Duration` (with Day, Month, Year unit dropdown), and `End Date Period` to the line items table for SaaS products. Implemented dynamic calculations where changing start/duration automatically updates end date, and changing end date updates duration. Added database columns to store these attributes on line items.
- **Rationale**: SaaS pricing contracts are period-bound (e.g. 1 year, 3 months). Making these columns available and automatically calculated inside a spacious modal layout simplifies contract generation and prevents human calculation errors.
- **Impact**: Added a database migration for `duration_value` and `duration_unit` columns. Updated `LeadQuotationItem` and `LeadSalesOrderItem` models and backend controllers. Table component in frontend was modified to render period columns, with a TypeScript build succeeding.
