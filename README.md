# Leadsy Platform

Web application for map-based lead discovery, AI-assisted qualification, funnel management, and governance (see `BRD`).

## Version

Current release: **v1.6.2** — 2026-06-14

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

- `leadsy_full_structure_and_data_2026_06_12.sql` — complete PostgreSQL structure + data archive.
- `leadsy_deploy_data_2026_06_12.sql` — public-schema application data imported by the guarded Laravel migration.

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
