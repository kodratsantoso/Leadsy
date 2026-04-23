# Change log (diff summary)

## 2026-04-10 — Initial baseline

- **Prior state**: Single file `BRD` only (no application source).
- **Added**: `docs/` governance pack, gap analysis in repository notes, scaffold instructions.
- **Intent**: Establish traceability before first functional merge.

_Subsequent entries should summarize merged PRs or major commits._

---

## 2026-04-18 — Revenue intelligence contract alignment

- **Issue**: Lead Detail could crash with `Objects are not valid as a React child` when the revenue intelligence snapshot returned a full `icpProfile` relation and the UI rendered it as plain text.
- **Backend**: `backend/app/Http/Controllers/Api/LeadController.php` now normalizes `icp_match` so `icp_profile` is a human-readable label and `icp_profile_detail` carries the full related profile.
- **Frontend**: `app/leads/[id]/page.tsx` now resolves the ICP profile label defensively, so legacy payloads with object-shaped `icp_profile` values no longer break rendering.
- **Types**: `lib/api/client.ts` updated to reflect the stabilized response contract while remaining backward-compatible.

---

## 2026-04-18 — Enterprise qualification foundation

- **Docs**: added `docs/SSOT/*` and `docs/ADR/ADR-0001-architecture.md` to formalize the product as a pre-CRM lead qualification and revenue-intelligence layer.
- **Architecture decision**: documented that the repository will evolve the existing Laravel + Next.js stack instead of forcing an immediate NestJS rewrite.
- **Scope**: defined enterprise scoring dimensions, thresholds, hard-stop rules, governance requirements, and target database normalization strategy.
- **Backend policy engine**: added `backend/config/qualification.php` and `backend/app/Services/Lead/QualificationRuleEngineService.php` to execute the enterprise scoring model with explainable reasoning, risk flags, hard-stops, and review routing.
- **Qualification API**: added `POST /api/qualification/evaluate` in `backend/app/Http/Controllers/Api/QualificationController.php` for manual payloads and lead-record previews.
- **Persistence**: expanded `lead_qualifications` to store enterprise explainability fields including classification, score, dimension breakdown, risk flags, recommendation, hard-stops, and evaluation snapshot.
- **Existing lead flow**: upgraded `LeadQualificationService` so persisted lead qualification uses the new enterprise rule engine while preserving AI augmentation.
- **Frontend**: added `app/qualification/page.tsx` and sidebar navigation so users can run manual qualification scenarios and preview saved leads in the UI.
- **Tests**: added backend unit and feature tests covering strong-lead, missing-data, hard-stop, and API-contract scenarios.

---

## 2026-04-18 — Phase 2 architecture scaffolding

- **Parameter engine**: added normalized qualification policy tables for parameter sets, parameters, and parameter options.
- **Policy source**: introduced `QualificationPolicyRepository` so the rule engine can compile the active DB policy and fall back to config when needed.
- **Workflow engine**: added normalized workflow, workflow stage, and workflow review tables to support governed `need_review` handling and future override/approval flows.
- **API surface**: added parameter-set CRUD/activation APIs plus workflow/review APIs for backend module orchestration.
- **Seeded foundation**: the migration seeds one default active enterprise policy and one default review workflow aligned with SSOT.

---

## 2026-04-18 — Phase 3 database hardening

- **Multi-tenant readiness**: added `tenants` plus nullable `tenant_id` links on users, leads, audit logs, and qualification policy/workflow tables.
- **Backfill strategy**: seeded a default tenant and backfilled existing core records so the schema is tenant-ready without destructive rewrites.
- **Write-path alignment**: lead creation, policy-set creation, workflow creation, review creation, and audit logging now capture tenant context when the actor has one.
- **Validation**: added tenant-foundation test coverage to protect the new default-tenant/backfill behavior.

---

## 2026-04-18 — Core schema excellence hardening

- **Master/config tenant coverage**: extended `tenant_id` support to `products`, `territories`, `icp_profiles`, `integration_configs`, and `revenue_rules` so future governance work is consistent with the tenant-ready architecture.
- **Legacy lineage**: added `record_origin_mappings` to preserve traceability between imported `legacy_mgmt` records and current production records.
- **Database integrity**: enforced one primary contact per lead, one lead-source identity per lead, one active parameter set per tenant, and one active workflow per tenant/trigger directly in PostgreSQL.
- **Tenant-safe config**: replaced the old global `integration_configs.key` uniqueness with tenant-scoped uniqueness and aligned the controller/seeder behavior to match.
- **Operational indexes**: added targeted indexes for lead filtering plus latest score/qualification access patterns.
- **Verification**: migration applied successfully and targeted backend regression tests passed with 13 tests and 42 assertions.

---

## 2026-04-18 — Legacy management database import

- **Source identified**: previous records were not in the active `prasetialeadsgenerator` database; they lived in the older `prasetialeadsmanagement` PostgreSQL volume and database.
- **Preservation**: imported the full old 16-table structure and row data into the current database under the `legacy_mgmt` schema.
- **Operational migration**: added `scripts/db/migrate_legacy_management_into_generator.sql` to map legacy users, products, leads, contacts, sources, scores, qualifications, and activities into the current `public` schema.
- **Result**: the current app database now contains the migrated lead records while still preserving the original legacy structure separately.
- **Auth compatibility**: normalized imported legacy bcrypt hashes from `$2b$` to Laravel-compatible `$2y$` so imported users can sign in successfully.

---

## 2026-04-18 — Map discovery add-to-pipeline fix

- **Issue**: Clicking `Add to Leads Pipeline` after opening an enriched map result could fail with `The external place id field is required.`
- **Root cause**: Google Place Details requests did not include `place_id`, so the detail merge could overwrite `external_place_id` with `null`.
- **Backend**: `backend/app/Services/LeadDiscoveryService.php` now requests `place_id` in the Place Details field list.
- **Frontend**: `app/map/page.tsx` now preserves the existing `external_place_id` during detail merges, and `lib/hooks/use-map-discovery.ts` surfaces a clearer client-side error if a result is ever missing its place ID.

---

## 2026-04-18 — Map discovery key stability hardening

- **Issue**: The map page could emit React duplicate-key warnings when one or more discovery results had `external_place_id = null`.
- **Markers**: `components/map/map-markers-layer.tsx` now uses a stable fallback key derived from company name and coordinates, and it skips forced marker interactions for non-identifiable results.
- **Result list**: `components/map/map-results-panel.tsx` now uses the same fallback-key strategy and visually flags results missing a place ID instead of treating them as fully selectable.

---

## 2026-04-18 — WhatsApp QR/session reliability fix

- **Issue**: WhatsApp integration could stay `Disconnected` and never surface a QR code even after pressing `Connect`.
- **Root cause**: `WhatsAppController` was hardcoded to `http://whatsapp-service:3002/api`, which only resolves inside Docker, and session status depended too heavily on asynchronous webhook updates.
- **Backend**: `backend/app/Http/Controllers/Api/WhatsAppController.php` now resolves the sidecar URL from `WHATSAPP_SIDECAR_URL`, defaults sanely for local vs Docker runs, and syncs live status directly from the sidecar.
- **Sidecar**: `whatsapp-service/index.js` now includes the connected account number in `/api/session/status` and force-clears stale auth on Baileys `401`/logged-out events so QR regeneration can recover automatically.
- **Dependency**: `whatsapp-service/package.json` now pins Baileys to stable `6.7.18` instead of floating on `latest` RC builds.
- **Config**: `backend/.env.example` and `docker-compose.yml` now document and wire the WhatsApp sidecar endpoint explicitly.
- **Recovery**: pressing `Connect` now auto-refreshes the WhatsApp auth store when the sidecar reports stale saved auth without a QR, which fixes the observed `401`/no-QR state.
- **Action routing**: `backend/app/Http/Controllers/Api/WhatsAppController.php` now tries the configured sidecar URL plus Docker and localhost fallbacks, which fixes message/broadcast actions when backend container env does not contain `WHATSAPP_SIDECAR_URL`.
- **Frontend resilience**: `lib/hooks/use-whatsapp.ts` now clears stale connection errors after successful polling and reports load failures for conversations, campaigns, and sync rules.

---

## 2026-04-10 — Frontend foundation

- **Next.js** bumped to **15.5.15** (addresses `npm audit` advisories for Next).
- **shadcn/ui** initialized (Tailwind v4 + `components/ui/button`, `lib/utils`).
- **Routes**: `/` (app shell), `/map`, `/leads` placeholders aligned to BRD modules.
- **Fix**: `app/globals.css` theme `--font-sans` now maps to Geist via `--font-geist-sans` (avoids self-referential CSS variable).
- **Config**: `frontend/.env.example` documents API and Maps keys.

---

## 2026-04-10 — Map territory UI

- **Dependency**: `@vis.gl/react-google-maps` for Maps JavaScript API + Geocoding library.
- **Component**: `frontend/components/map/territory-map-view.tsx` — search, radius, circle, marker, JSON copy.
- **Route**: `frontend/app/map/page.tsx` loads the map when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set; otherwise shows setup instructions.

---

## 2026-04-10 — Leads list, detail, territories storage

- **API**: `frontend/lib/api/client.ts`, `frontend/lib/api/leads.ts`, `frontend/lib/types/lead.ts`, `frontend/lib/env.ts` — JSON fetch with credentials; list/detail helpers.
- **UI**: `frontend/components/leads/leads-list.tsx`, `lead-detail-view.tsx`; routes `app/leads/page.tsx`, `app/leads/[id]/page.tsx`.
- **Map**: `frontend/lib/territory-storage.ts` + save / apply / remove in `territory-map-view.tsx` (browser `localStorage`).

---

## 2026-04-10 — Same-origin API stub + URL resolution

- **`resolveApiUrl`**: empty `NEXT_PUBLIC_API_URL` → relative `/api/*` (Next handlers); otherwise prepend Laravel origin.
- **Routes**: `frontend/app/api/leads/route.ts`, `frontend/app/api/leads/[id]/route.ts` (empty list / 404).
- **Backend README**: documents the JSON contract for Laravel implementation.

---

## 2026-04-20 — Stabilization audit reports and runtime drift confirmation

- **Verification**: confirmed the active runtime frontend in `frontend/` passes both `npm run typecheck` and `npm run build`.
- **Database audit**: added `docs/execution/database-mismatch-report.md`, documenting that qualification parameter-set and workflow slugs are still globally unique despite tenantization, and that parameter-set activation is not tenant-scoped.
- **API/runtime audit**: added `docs/execution/api-contract-report.md`, documenting that several newer feature pages were implemented only in the deprecated root `app/` tree and are not available in the live `frontend/` runtime.
- **Master-data audit**: added `docs/execution/master-data-audit.md` to isolate the highest-risk remaining hardcoded business lists and separate them from lower-risk UI-only lists.
- **Backlog clarification**: split the remaining stabilization work into page migration from root `app/` to `frontend/` and frontend HTTP-client unification, so the next pass can target shipped runtime behavior directly.
