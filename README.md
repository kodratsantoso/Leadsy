# Leadsy Platform

Web application for map-based lead discovery, AI-assisted qualification, funnel management, and governance (see `BRD`).

## Version

Current release: **v1.14.1** — 2026-07-09

## What's New in v1.14.1 (Brand Field & Lark Sync Updates)

- **Brand Identifier** — Added a dedicated `Brand` field to the Leads model. The brand is now editable, visible on lead lists and details, and supports CSV imports.
- **Always-on Lark Sync** — Modified the `LeadObserver` so that *any* update to a lead's record now automatically pushes updates to the integrated Lark Base (provided `company_name` is present and sync rules allow).

## What's New in v1.14.0 (AI Enrichment Automation)

- **Automated Lead Enrichment Pipeline** — Migrated from hardcoded data mapping to a strict JSON AI Orchestration pipeline (`LeadEnrichmentAiOrchestrator`). Leads are now automatically standardized, categorized, and scored via AI on creation.
- **AI Defaults Configuration** — Upgraded the Settings > AI Defaults panel to support complex AI configurations, including `System Prompt`, `User Prompt`, `Output Contract` (JSON Schema), and `Variables Schema` for strict orchestration.
- **Unified Location Discovery** — Fully integrated Google Maps text-search fallback during enrichment to maximize valid coordinates even when location data is minimal.

## What's New in v1.13.0 (IDX Public Companies Integration)

- **IDX Leads Generator** — Added a new sub-module under Leads Generator to search and import companies from Bursa Efek Indonesia (IDX).
- **Auto Data Mapping** — Automatically maps IDX Sektor and Industri into Leadsy Industry, SubIndustry, and Business Category structures. Leads imported from this module are tagged with Lead Source "IDX".

## What's New in v1.12.0 (Split Target & KPI)

- **Revenue and KPI Target Separation** — Refactored the unified Targets module into two distinct systems: `Revenue Targets` for monetary goals and cascading, and `KPI Targets` for non-monetary operational goals (e.g., meeting quantity, conversion rates).
- **Backend Schema Refactor** — Replaced `targets` and `target_cascade_allocations` tables with `revenue_targets` and `kpi_targets`. Reimplemented `RevenueTargetController` and `KpiTargetController` APIs.
- **Frontend Settings Split** — Updated the Settings navigation and created dedicated pages for `Target Revenue` and `Target KPI`. 
- **Dashboard Synchronization** — Updated the `DashboardController` so actual achievement percentages map to the correct new target schemas based on user roles.

## What's New in v1.11.0 (Advanced Lark Base Sync & Meeting Summary)

- **Advanced Lark Base Sync** — Upgraded the existing Lark Base integration to support robust record-level two-way synchronization. Users can now explicitly map Leadsy fields to Lark Base fields. The system automatically triggers syncing via queued jobs whenever a lead is updated. Added a manual "Sync to Lark Base" action on the Lead Detail page.
- **Meeting Summary PDF Automation** — AI transcript evaluations can now be converted to enterprise-grade Meeting Summary PDFs. Generating the PDF automatically uploads/attaches it to the mapped Lark Base attachment field using backend queues. Added manual generation and download buttons within the Transcripts tab.

## What's New in v1.10.0 (Target & Cascade V2)

- **Role-Based Target System** — Decoupled the target system from the rigid sales-revenue-only model. Users can now be assigned different target types (amount, percentage, quantity, score, days) based on their role (Sales, Presales, CSM, Account Manager).
- **Cascade Allocation Refinement** — Cascade allocation is now strictly reserved for Sales revenue targets. Other roles define independent goals without forced cascading down the hierarchy.
- **Team Performance Dashboard Update** — Integrated the new `targets` architecture into the Team Performance Dashboard, evaluating real-time actual achievements directly against the role-specific targets configured in the system.

## What's New in v1.9.4 (Confidentiality Engine)

- **10-Block Confidentiality Dashboard** — A robust, matrix-based dashboard identifying, explaining, and tracking data sensitivity and access exposure.
- **Rule-Based Scoring Engine** — Backend engine deriving sensitivity dynamically from deal stage, BANTC, transcripts, and financial value (ADR-028).
- **Explainable UI Drawers** — The dashboard provides transparent "Why This Score?" JSON-based drilldowns without polluting core data tables.

## What's New in v1.9.3

- **Database-Driven Team Performance Dashboard** — Rebuilt the Team Performance dashboard to completely drop all mocked data. The dashboard now strictly calculates real-time metrics across 10 structured blocks (Overview KPIs, Role Matrix, Risk Center, Lifecycle Funnel, Target vs Achievement, Revenue Contribution, Leaderboard, Historical Trends, Bottlenecks, and Manager Hierarchy) using native database queries via the unified `RoleKpiCalculationService`.

## What's New in v1.9.2

- **Lead Role Assignment & Order-to-Cash Module** — Upgraded the lead system to support assigning multiple commercial roles (Sales, Presales, CSM) per lead with defined contribution percentages. Added full Order-to-Cash lifecycle tracking, including Quotations and Sales Orders for revenue realization.
- **Team Performance Dashboard Update** — Adjusted the Team Performance Dashboard to accurately reflect role-based contribution percentages for revenue metrics, mapping to the new `lead_sales_orders` and `lead_role_assignments` tables.
- **Product Details UI Revamp & Bug Fixes** — Revamped the UI layout for Product SaaS Pricing tiers into a clean grid system. Fixed an async state bug that caused the Product Specification Comparison modal to render as blank, and improved UI component robustness.

## What's New in v1.9.1

- **Team Performance Dashboard UI Revamp & Drilldown** — Replaced individual user cards on the Team Performance tab with aggregated team-level KPI blocks (Sales, Presales, Account Manager, CSM) including dynamic widgets like progress donuts and key metrics. Clicking on any block now drills down directly into a filtered lead modal.
- **Product Details UI Revamp** — Completely overhauled the Product Management interface. Migrated from a single accordion layout to dedicated product detail pages (`/products/[id]`) with a structured 5-tab design: Overview, Targeting & Match AI, Product Tiers, Question Guide, and Comparison & Scraping. Added a dedicated `website_url` field to directly power automated feature scraping and specifications comparison over time.

## What's New in v1.9.0

- **AI Output Governance Layer** — Introduced a strict governance system for all AI-generated outputs (morph-mapped). Outputs can now be versioned, manually edited (with JSON validation), and explicitly approved to freeze their state.
- **Dashboard Confidentiality Matrix** — Replaced the generic KPI layout with an exposure-based confidentiality matrix panel displaying aggregate AI findings and active RBAC visibility limits.
- **Product Specification Scraping & Comparison** — Added an integrated UI to scrape product website updates, detect discrepancies between live specs and CRM data using AI, and submit `update_suggestions` for human approval instead of overwriting records silently.
- **AI Attention Highlights** — Added global tracking and widgets for entity-specific risk, data gap, and opportunity highlights extracted automatically from JSON payloads.
- **Database Snapshots Update** — Refreshed the PostgreSQL database snapshots to include new AI governance tables (`ai_generated_outputs`, `ai_output_versions`, `ai_attention_highlights`, `product_scrape_runs`, `product_specification_comparisons`, `product_update_suggestions`).

## What's New in v1.8.0

- **Batch Delete Leads** — Implemented bulk deletion for leads, restricted strictly to `super_admin` users, available from the Leads index page.
- **Lark Meeting Transcripts AI Analysis** — Added the ability to fetch meeting transcripts natively from Lark Minutes via a simple URL link. The AI automatically analyzes the transcript to extract intent, objections, and buying signals, integrating seamlessly into the existing Transcripts tab in Lead details.

## What's New in v1.7.4

- **Usage & Health Dashboard** — Improved UI rendering of ApexCharts in dark theme by overriding CSS variables with explicit hex colors. Added a new timeline Slicer (Today, Last 7 Days, Last 30 Days, Last 90 Days, This Year) mapped directly to API analytics filters.
- **Lark Base Integrations** — Expanded Lark Base capability to support multiple Bases and Tables per tenant. Moved Lark Base setup to a dedicated page (`Settings -> Integrations -> Lark Base`). Added URL token extraction to seamlessly support pasting full Lark Base URLs instead of only the raw token. Fixed API mismatches and improved error handling for 91402 (NOTEXIST) exceptions.
- **Database Snapshots Update** — Refreshed the PostgreSQL database snapshots (`leadsy_full_structure_and_data_2026_06_24.sql`) to include the new `lark_base_id` and `lark_table_id` schema on the `leads` table as well as the new `meeting_link` column.

## What's New in v1.7.3

- **Pre-Meeting Brief Endpoint Fix** — Fixed a `404 Route Not Found` error when generating Pre-Meeting Briefs by aligning the backend API route (`/generate`) with the frontend mutation call.

## What's New in v1.7.2

- **AI Formatting & PHP Timeouts Fix** — Fixed timeout errors on heavy AI calls (Pre-Meeting Brief & Customer Journey) by increasing max execution time. Also correctly passed the tenant's base currency to AI so it does not hallucinate "USD" on Customer Journey stories.
- **Sync Currency Permission Bug** — Fixed an implicit authorization block (`$this->authorize()`) that was throwing 403 errors when syncing the IDR exchange rate, even for users who possessed the `integrations.manage` role.

## What's New in v1.7.1

- **Customer Journey & Pre-Meeting Brief Fix** — Fixed a 403 Unauthorized error that was preventing the Pre-Meeting Brief and Customer Journey data from loading and displaying in the UI. Replaced implicit policy checks with explicit direct `visibleTo` checks.
- **Node.js Deprecation Fix** — Updated Github Actions `actions/checkout` to v4 and `shivammathur/setup-php` to v2 to resolve Node.js 20 deprecation warnings in CI/CD pipelines.

## What's New in v1.7.0

- **AI Feature Bug Fixes** — Fixed the "Generate Brief" and "Customer Journey" buttons that were failing due to incorrect AI response parsing logic on the backend.
- **IDR Exchange Rate Feature** — Added a new database-backed feature to fetch and store Exchange Rates for all currencies dynamically based on the active base currency (e.g. USD or IDR) using the Open ExchangeRate-API. Included a manual sync button in the Settings > Currency page.
- **Database Snapshots Update** — Refreshed the PostgreSQL database snapshots (`backup_leadsy_2026-06-20_v1.7.0.sql`) to include the new `exchange_rate`, `base_currency` and `exchange_rate_updated_at` columns on the `currencies` table.

## What's New in v1.6.4

## What's New in v1.6.3

- **UI & CI Fixes** — Restored missing `progressive-flux-loader` UI component to resolve CI/CD pipeline build errors.
- **Lead Detail Tabs Fix** — Fixed data binding and tab conditions for "Pre-Meeting Brief" and "Customer Journey" to render correctly instead of showing empty screens.
- **Integration Setting Layout Alignment** — Removed fixed-width constraints on the Integration Setting page so it scales dynamically to match other settings pages.

## What's New in v1.6.2

- **Team Performance Dashboard Improvement** — Revamped the dashboard visual layout by adding dynamic group-filtered summary cards, a top performers leaderboard ranking, interactive individual target progress trackers, and modern hover interactions for roles (Sales, Presales, Account Manager, CSM).

## What's New in v1.6.1

- **Database Snapshots Update** — Refreshed the PostgreSQL full structure+data and deploy snapshots (`leadsy_full_structure_and_data_2026_06_12.sql` and `leadsy_deploy_data_2026_06_12.sql`) and added a new forced re-import migration `2026_06_12_000001_force_reimport_snapshot_june12.php` to clean-apply the fresh data on the VPS during deployment.

## What's New in v1.6.0

- **Local WhatsApp Workspace Isolation** — Isolated contacts, messages, and active sockets per logged-in user to guarantee user data privacy.
- **Active WhatsApp Users Monitor** — Added an administration monitor dashboard under Settings -> Integrations displaying currently connected user sessions with a force disconnect action.
- **Mekari Qontak Auth Simplification** — Added support for simple Bearer token authentication in the Mekari Qontak service, falling back to HMAC signature verification if bearer parameters are missing.
- **Conversation-to-Lead Conversion** — Implemented a "Convert to Lead" button and stage/funnel selection modal next to "Analyze" on both Local WhatsApp and Qontak conversations.
- **User Deletion with Resource Transfer** — Implemented safe user deletion requiring the transfer of owned active leads and direct report relationships to another selected recipient user before permanent deactivation.

## What's New in v1.5.4

- **Local User Database & Structure Sync to VPS** — Refreshed the local database records and schema snapshots (`leadsy_full_structure_and_data_2026_05_30.sql` and `leadsy_deploy_data_2026_05_30.sql`) and added a new forced re-import migration `2026_06_04_000001_force_reimport_user_snapshot.php` to clean-apply the fresh data on the VPS during deployment.

## What's New in v1.5.3

- **Targeted Container Detection on VPS** — Enhanced `sync-db-local-to-vps.sh` and `db-restore-prod.sh` to prioritize the exact running PostgreSQL container UUID (`postgres-aps4zkidae9b54ogoz8uc6z4`) before falling back to generic name matching.
- **Forced Database Snapshot Sync** — Created a dedicated Laravel migration `2026_06_03_000001_force_reimport_leadsy_snapshot.php` to clean and re-import the database snapshot during VPS redeployment, ensuring all missing settings and records (Industries, Lead Channels, Users, Roles, Targets, and Leads) are successfully synchronized.

## What's New in v1.5.2

- **Database Triggers & Synchronization Fix** — Added `--disable-triggers` to the data-only pg_dump command, enabling the Laravel migration importer to match and truncate target tables on the production VPS before inserting fresh snapshots. This resolves sync discrepancies for Industries, Lead Channels, Users, Roles, Targets, and Leads.

## What's New in v1.5.1

- **Settings Navigation & Layout Reorganization** — Simplified the platform settings by clustering the 16 flat settings sub-menus into 5 logical categories (User & Targets, CRM Taxonomy, AI Intelligence, Integrations, System & Security) across the sidebar navigation and dashboard landing page.
- **Database Snapshots Update** — Refreshed the PostgreSQL full and deploy snapshots (`leadsy_full_structure_and_data_2026_05_30.sql` and `leadsy_deploy_data_2026_05_30.sql`) to keep production data records aligned with local development.

## What's New in v1.5.0

- Upgraded all dashboard widgets (funnels, volumes, markets, lead origins, pipeline quality, and revenue achievement) to use interactive, animated, client-side charts powered by ApexCharts and Highcharts.
- Added support for dark/light mode automatic theme synchronization across all chart layouts.
- Integrated a new AI Executive Insights panel at the top of the dashboard summarizing pipeline explanation, critical risk points, and strategic decisions for C-level executives.
- Configured prompt templates and provider model routing for the AI Insights feature in Settings -> AI Defaults.
- Refreshed PostgreSQL structure+data and deploy snapshots.

## What's New in v1.4.0

- Added a "Subsidiary of" (parent company) relationship to leads, allowing grouping and managing organizational hierarchies.
- Implemented Google Maps Preview embed card on the Lead Detail page for easier onsite meeting planning.
- Unified the Lead Edit Form so that editing lead details and company information uses the same complete modal with all fields, both in the overview summary and the detail view.
- Refreshed database migrations/snapshots so that fresh deployments carry the correct structure, passwords, and records.

## What's New in v1.3.0

- Migrated the complete development stack to run natively on macOS host using Homebrew services (PostgreSQL, Redis, native PHP, Node.js) instead of Docker Desktop.
- Configured Laravel backend, Next.js frontend, and WhatsApp sidecar services to run natively on local ports 3001, 3000, and 3002.
- Added a `LinkedIn URL / Username` input field to manual Add and Edit contact forms in the lead details view.
- Implemented automated backend validation and normalization for the manual LinkedIn field (normalizes usernames/handles to full URLs).
- Refreshed database migrations/snapshots so that fresh deployments carry the correct structure, passwords, and records.

## What's New in v1.2.9

- Aligned the Contact Search features to follow the OpenSearch 1.1 Draft 6 specification.
- Added a public OpenSearch Description Document (OSDD) XML descriptor file at `frontend/public/opensearch.xml`.
- Registered and implemented `GET /api/opensearch/contacts` on the Laravel backend to support queries via URL templates (substitutes `{searchTerms}`, `{count}`, and `{startIndex}`).
- Supported search outputs in OpenSearch-compliant RSS 2.0 (with XML namespaces), Atom 1.0, and JSON formats based on format parameters or Accept headers.
- Introduced Google Service Account credentials support (`GOOGLE_SEARCH_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SEARCH_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_SEARCH_SERVICE_ACCOUNT_PROJECT_ID`) for Custom Search configurations.

## What's New in v1.2.8

- Lead Detail Contacts now supports Add Contact → Search by AI for LinkedIn PIC discovery from the lead company name.
- Settings → AI Default now includes the `lead_contact_ai_search` feature route for choosing the AI provider/model behind contact search.
- AI Search candidates stay as previews until the user clicks Add to Contact, then they become lead contact records with LinkedIn URL/ID context.
- Lusha is now exposed from each LinkedIn-backed contact, so hidden email/phone enrichment runs after a contact exists instead of replacing Add Contact.

## What's New in v1.2.7

- Lark Base Push to Lark now reads field metadata and coerces Leadsy values to the target Lark field type before writing, reducing `TextFieldConvFail` and similar conversion errors.
- Added the Leadsy → Lark Base field type guide in `docs/strategy/lark-base-field-type-guide.md`.
- Lark Base Push/Pull now opens a progress popup and finishes with per-sync Add, Update, Delete, Failed, Attempted, and per-record result details.
- Failed Lark Base sync rows now show the provider/application reason so users can see whether the issue is credential, record, mapping, or API related.
- Lark Base Push to Lark now includes legacy/global Lead records with empty `tenant_id`, so existing generated/imported leads can be synced from saved Base mappings.
- Lark Base manual sync now reports attempted, synced, skipped, and failed records, with the first provider error surfaced in Integration Setting.
- Lark Base saved mapping controls now disable impossible push/pull actions based on the selected sync direction.
- Long-term CRM expansion is on hold while active development focuses on Lead Generator and Lead Intelligence.
- Active focus plan: `docs/strategy/lead-generator-intelligence-focus.md`.
- Integration Module Phase 1 adds isolated integration tables plus AES-256-GCM credential storage for future inbound lead channels.
- Frontend navigation now groups Map & Territory under Leads Generator, with a Social & Platform Generator submenu and credential setup in Settings → Integration Setting.
- Integration Setting now uses a researched platform-specific credential matrix and active connection checks/previews where official lightweight API validation is available.
- Google Ads Integration Setting now shows a mode dropdown and only displays fields related to Google Ads API OAuth or Lead Form Webhook mode.
- Google Ads Integration Setting now supports OAuth URL generation and refresh-token based API connection testing against accessible customers.
- Lusha enrichment now uses a two-step V3 journey: preview PIC candidates first, then reveal phone and save to the current lead only after user confirmation.
- Lusha reveal is gated until the lead's initial score reaches 60, reducing paid enrichment on low-fit leads.
- Integration credentials now use authenticated encryption envelopes with scoped AAD and HMAC-SHA256 blind fingerprints for duplicate detection without plaintext exposure.
- Integration foundation tests cover encryption/decryption, AAD rejection, tenant-linked connections, credential stores, entity mappings, webhook idempotency keys, and provider auth failure state changes.
- Recent completed slice from the paused v1.2 track: Lead Pool ownership controls with unassigned filter, claim, and assign/reassign owner actions.

## What's New in v1.1.0

- Mobile Field Sales MVP under `mobile/` for Android/iOS with Lead Inbox, Lead Detail, one-tap sales actions, Sales Visit, GPS Clock In/Out, photo evidence, client signature, visit result, and notes.
- Sales Visit backend tables and APIs for visit audit trails, GPS distance checks, evidence media, and fake-location risk signals.
- Expo Go testing helper: run `npm run mobile:expo-go`, scan the QR, and test on a phone on the same Wi-Fi.
- Lark SSO Custom App login flow with backend callback, Sanctum token persistence, and role preservation.
- Lark Base two-way sync with table preview, manual Leadsy Leads ↔ Lark Base field mapping, Auto Match assistance, and manual push/pull controls.
- Deploy database snapshots refreshed so fresh environments can import current schema and data.
- Dashboard sales metrics documented: Achievement Sales uses realized Closed Won deal value, while funnel Won remains a pipeline/terminal estimate unless explicitly changed.

## Repository layout

| Path | Purpose |
|------|---------|
| `BRD` | Single source of truth for requirements |
| `docs/` | Phase plans, ADRs (`decisions.md`), progress, risks |
| `frontend/` | Active Next.js UI source of truth (App Router, Tailwind, React Query, Zustand) |
| `mobile/` | Expo/React Native field-sales app for Android and iOS |
| `backend/` | Laravel API (bootstrap when PHP/Composer or Docker available) |
| `app/`, `components/`, `lib/`, `store/` | Deprecated root UI mirror kept only as a compatibility layer |

## Frontend source of truth

The running UI is `frontend/`.

- `docker-compose.yml` builds the frontend service from `./frontend`
- local UI commands should be run in `frontend/`
- new pages, components, stores, and helpers should be created in `frontend/`
- the root Next.js tree is deprecated and should not receive new feature work

## Prerequisites

- Node.js 20+ (for `frontend/`)
- PHP 8.3+, Composer, extensions Laravel needs **or** Docker with Composer image
- Docker (optional): PostgreSQL 16 and Redis via `docker compose up -d`

## Quick start — frontend

```bash
npm run dev
```

The root `npm run dev` command is now a compatibility wrapper that delegates to `frontend/`.

Direct usage is still preferred:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Feature Usage Notes

- Mobile field sales app: `mobile/` provides the Android/iOS companion for sales users, focused on lead inbox, lead detail, one-tap call/WhatsApp/email/Maps actions, sales visit clock-in/out, photo evidence, client signature, GPS capture, and fake-location risk signals.
- Dashboard map: open Dashboard to view lead/customer POIs for records with `lat` and `lng`. Marker colors follow each lead's funnel stage color, and clicking a marker shows a lead summary.
- Add Location: in Leads → New Lead, use `Add Location` to search an address on the map and save latitude/longitude with the lead.
- Dashboard funnel tracking: Dashboard shows horizontal conversion funnels that start from `Belum Di Klasifikasi`, with drillable stage bars, lead conversion, estimated amount conversion, sales volume bars, and total market bars.
- Funnel conversion logic is cumulative/aggregate: each step counts leads that have reached that stage or a later stage. Drilldown uses `funnel_min_sequence`, so clicking `Enriched` opens all leads at Enriched or beyond.
- Lead origin dashboard: Dashboard includes a Lead Sources & Channels block that aggregates total leads by source and channel, with each row drilling down to filtered Leads.
- Lead product revenue: Leads → New/Edit Lead includes an Initial Product field. Lead Detail → Revenue → Record Outcome can record product-specific Closed Won/Lost entries, with `new_sales` for the first product and `upsales` for additional products; each outcome stores its own amount.
- Customer BANTC Question Guide: Lead detail → Intelligence can generate customer-specific Budget, Authority, Need, Timeline, and Competition questions with AI. Generated questions remain draft-only until the user saves them.
- Meeting BANTC capture: Lead detail → Activities → Log Activity shows Budget, Authority, Needs, Timeline, and Competitor fields when the activity type is `Meeting`; the next meeting preloads the latest BANTC notes for iterative updates.
- Transcript management: Lead detail → Transcripts supports multiple transcripts, each linkable to an Activity. Users can paste text, upload TXT/VTT/SRT, or attach audio/video files; AI analysis summarizes text transcripts and extracts sentiment, intent, objections, buying signals, and next action.
- Lark SSO integration is configured from Settings → Integrations and protected by backend `integrations.manage`; redirect URIs are generated from the active frontend base URL for tenant-aware login flows.
- Lark SSO uses the Lark Custom App OAuth flow: frontend opens the authorization URL, backend stores OAuth `state` in cache, callback exchanges `code` for a user token, resolves Lark user info, persists the Lark identity link, then creates a Laravel Sanctum token before redirecting to the dashboard.
- Lark Base two-way sync is configured from Settings → Integrations → Lark: enter a Base app token, load tables, preview a selected table, manually map Leadsy Leads fields to Lark Base fields, then push Leadsy leads to Base or pull Base records back into Leadsy.
- Mobile Field Sales: `mobile/` provides the Android/iOS field app for sales users. It supports Expo Go testing, lead inbox/detail, one-tap actions, GPS visit clock-in/out, photo evidence, client signature, and visit risk signals.
- Dashboard sales metric contract: Achievement Sales uses `lead_outcomes.deal_size` for Closed Won realization inside the user's target period. Funnel Won uses terminal/pipeline lead membership and `leads.estimated_closing_amount`, so it can intentionally differ unless the funnel contract is changed.
- Revenue tracking: Settings → Users lets admins set Direct Manager, target period, and target revenue. Dashboard Achievement Sales compares target revenue against Closed Won realization for the user's visible hierarchy.
- Hierarchy visibility: regular users see their own leads, managers/admin-like roles see their recursive team, and superadmin sees all leads.

## Quick start — data stores

```bash
docker compose up -d
```

Connection defaults (see `docker-compose.yml`): Postgres `postgres:16` exposed on host `localhost:5435` and mapped to container `5432`, database `leads`, user/password `leads`; Redis `localhost:6382`.

## Docker URL and port contract

A normal `docker compose restart` or container restart must not change the host URLs or ports.

- Container namespace: `leadsy-*`
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001`
- WhatsApp sidecar: `http://localhost:3002`
- PostgreSQL: `localhost:5435`
- Redis: `localhost:6382`

These bindings are intentionally fixed in `docker-compose.yml`. Only change them for an explicit infrastructure update, not as part of routine app work.

## Quick start — backend (Laravel)

Use `scripts/bootstrap-backend.sh` **or** follow `backend/README.md` to create the Laravel 12 project and configure `.env` for Postgres/Redis.

## Quick start — mobile

The mobile app is an Expo app under `mobile/`.

```bash
npm --prefix mobile install
cp mobile/.env.example mobile/.env
npm run mobile:start
```

Use `EXPO_PUBLIC_API_BASE_URL` to point the app at the local backend, LAN backend, or deployed VPS API. Android can be distributed through Google Play/internal testing or signed APK/AAB, while iOS distribution goes through TestFlight or the Apple App Store.

## Deploying with database contents

Schema lives in `backend/database/migrations/`. A deploy snapshot is also committed under `backend/database/snapshots/` for one-time fresh environment imports:

- `leadsy_full_structure_and_data_2026_06_21.sql` — complete PostgreSQL structure + data archive.
- `leadsy_deploy_data_2026_06_21.sql` — public-schema application data imported by the guarded Laravel migration.

Set `IMPORT_LEADSY_DB_SNAPSHOT=true` only on a fresh database where application tables are empty. The snapshot carries encrypted secrets; keep the same `APP_KEY` from the source environment or re-enter AI/Lark credentials after deploy.

## Git Hooks

This repository uses tracked Git hooks under `.githooks/`.

After cloning the repository, configure hooks with:

```bash
git config core.hooksPath .githooks
```

or run:

```bash
npm run setup:githooks
```

The pre-commit hook runs:

```bash
sh scripts/validate-pre-commit.sh
```

That validates the active frontend TypeScript compile, Laravel Pint formatting, PHP syntax, local Docker Compose syntax, and WhatsApp sidecar JavaScript syntax.

The pre-push hook runs:

```bash
sh scripts/validate-pre-push.sh
```

That includes the pre-commit checks plus the active frontend production build, Composer manifest validation, and production Docker Compose syntax.

Audited exceptions:

- `npm --prefix frontend run lint` currently fails on pre-existing legacy `@typescript-eslint/no-explicit-any` and JSX escaping violations. It is not disabled in ESLint and should be fixed before lint becomes a blocking hook gate.
- `cd backend && php artisan test` currently requires PostgreSQL on `localhost:5435`; without the local Docker database running, the suite fails during database connection setup. The hook uses PHP syntax and formatting checks as the database-independent backend gate.

## Documentation

- Long-term roadmap: `docs/strategy/leadsy-beyond-sharecrm-roadmap.md`
- Active focus plan: `docs/strategy/lead-generator-intelligence-focus.md`
- Integration Module Phase 1: `docs/strategy/integration-module-phase-1.md`
- Integration platform credential matrix: `docs/strategy/integration-platform-credential-matrix.md`
- Phase 1 plan: `docs/execution/phase-1/plan.md`
- Decisions (append-only): `docs/execution/decisions.md`
