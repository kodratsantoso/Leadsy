# API Contract Mismatch Report

## Date
2026-04-20

## Scope
- `frontend/app`
- `frontend/lib`
- `backend/routes/api.php`
- active runtime vs deprecated root UI tree

## Summary
The backend API surface is substantially ahead of the live frontend runtime. The biggest contract issue is not a broken endpoint shape, but runtime drift: several newer pages were implemented only in the deprecated root app tree and never reached `frontend/`, which is the actual shipped UI.

## Findings

### 1. Live frontend is missing root-only feature pages
- Root-only pages found:
  - `app/icp-profiles/page.tsx`
  - `app/qualification/page.tsx`
  - `app/territories/page.tsx`
  - `app/settings/funnel-stages/page.tsx`
  - `app/settings/revenue-rules/page.tsx`
- Live runtime:
  - `frontend/app` does not contain those pages.
- Impact:
  - Backend routes for ICP profiles, qualification, territories, funnel stages, and revenue rules exist, but the running UI does not expose those modules.
  - Work landed in the compatibility mirror instead of the production frontend.

### 2. Navigation and permission metadata do not cover the missing runtime routes
- Files:
  - `frontend/components/layout/app-shell.tsx`
  - `frontend/lib/permissions.ts`
  - `frontend/app/settings/page.tsx`
- Detail:
  - The live sidebar has no entries for `territories`, `icp-profiles`, or `qualification`.
  - The settings index has no entries for `funnel-stages` or `revenue-rules`.
  - The permission map also omits those paths.
- Impact:
  - Even after page migration, route discovery and gating would still be incomplete unless the metadata layer is updated with it.

### 3. Two frontend API access patterns are still active
- Files:
  - `frontend/lib/apiFetch.ts`
  - `frontend/lib/api/client.ts`
- Detail:
  - `apiFetch()` uses the Next.js proxy path style and injects bearer-token auth from Zustand.
  - `api/client.ts` builds direct URLs from `NEXT_PUBLIC_API_URL` and relies on `credentials: "include"` instead.
- Impact:
  - Auth behavior, base-URL resolution, and error handling are not fully standardized.
  - Pages using `apiFetch()` and code using `api/client.ts` can diverge under different runtime setups.

### 4. Active frontend tolerates multiple response shapes because contracts were not fully normalized
- Files:
  - multiple live pages under `frontend/app`
- Detail:
  - Several pages still parse responses defensively with patterns like `data?.data ?? data ?? []`.
- Impact:
  - This keeps the app resilient during stabilization, but it also confirms contract drift between endpoints and generations of frontend code.

## Verified Strengths
- The active frontend builds successfully against the current codebase.
- The backend route surface for the audited modules exists and is coherent enough to wire into the live runtime.
- Central API error-envelope normalization is already in place on the Laravel side.

## Recommended Backlog
1. Migrate the five root-only pages into `frontend/app`.
2. Update live sidebar, settings index, and permission map for those routes.
3. Consolidate frontend HTTP access around one runtime contract path so auth and error handling stay consistent.

## 2026-05-19 Contract Additions

### Dashboard
- `GET /api/dashboard`
  - Adds `data.map_points[]` with `id`, `company_name`, `address`, `lat`, `lng`, `lead_score`, `qualification_status`, and `funnel_stage`.
  - Adds `data.sales_funnel_tracking` with `funnel[]`, `sales_volume[]`, and `total_market[]` aggregate arrays for the Dashboard funnel panel. Funnel rows include `percentage`, `estimated_amount`, and `estimated_percentage`, and start from `Belum Di Klasifikasi`.
  - Dashboard funnel rows are cumulative conversion rows: each stage counts leads whose current stage sequence is at that stage or beyond. Estimated amount uses the same cumulative logic.
  - Adds `data.source_channel_breakdown.sources[]` and `data.source_channel_breakdown.channels[]` with drilldown `href` values for total leads by source and channel. Counts use visible leads and `COUNT(DISTINCT leads.id)`.
  - Adds `data.sales_achievement` with `period`, `target_revenue`, `realized_revenue`, `achievement_percentage`, `closed_won_count`, `period_start`, `period_end`, and `trend[]`.
- `GET /api/dashboard/heatmap`
  - Now respects hierarchy visibility and includes funnel stage metadata for mapped leads.

### Leads
- `GET /api/leads?funnel_min_sequence=N`
  - Filters leads to current funnel stages with `sequence >= N`, used by cumulative dashboard funnel drilldown.
- `GET /api/leads?outcome=won|lost`
  - Filters leads by related `lead_outcomes.outcome` for dashboard funnel drilldown.
- `POST /api/leads` / `PUT /api/leads/{lead}`
  - Existing `lat` and `lng` payload fields are now used by the New Lead Add Location flow.
  - Accepts optional `product_id` for the lead's initial product interest.
- `POST /api/leads/{lead}/outcome`
  - Accepts optional `product_id`, `sale_type` (`new_sales` or `upsales`), and `deal_size` so one lead/customer can record multiple product-specific won/lost outcomes with separate amounts.
- `POST /api/leads/{lead}/activities` / `PUT /api/leads/{lead}/activities/{activity}`
  - Meeting activities accept optional `budget`, `authority`, `needs`, `timeline`, and `competitor`.
- `GET /api/leads/{lead}/bantc-questions`
  - Returns saved customer BANTC question guide for a lead.
- `POST /api/leads/{lead}/bantc-questions/generate`
  - Generates draft customer BANTC questions via `lead_bantc_question_generation`.
- `PUT /api/leads/{lead}/bantc-questions`
  - Persists user-approved BANTC questions.
- `POST /api/leads/{lead}/transcripts`
  - Accepts JSON text transcripts or multipart uploads with `transcript_file`, optional `activity_id`, `title`, `recorded_at`, and `transcript_text`.
- `POST /api/leads/{lead}/transcripts/{transcript}/evaluate`
  - Runs AI evaluation when transcript text exists and returns summary, sentiment, intent, interest, objections, buying signals, confidence, and next action.

### Maps
- `GET /api/maps/geocode?query=...`
  - Used by New Lead Add Location to search and select coordinates.

### Users
- `GET /api/users`
  - Includes `direct_manager` relation and target fields.
- `POST /api/users` / `PUT /api/users/{user}`
  - Accepts `direct_manager_id`, `target_period`, and `target_revenue`.
  - Existing audit logging records permission/hierarchy/target changes through user update audit rows.

## 2026-05-25 Contract Additions

### Lark Auth
- `GET /api/auth/lark/tenants`
  - Returns active tenants with Lark SSO enabled.
- `GET /api/auth/lark/url?tenant_id=ID&redirect_uri=URL`
  - Returns `auth_url` and backend-generated `state`.
  - Backend stores the tenant and redirect URI in cache using the `state`.
- `POST /api/auth/lark/callback`
  - Accepts `code` and `state`.
  - Returns `token` and `user` with role/permissions after successful Lark OAuth exchange.
  - Existing Leadsy user roles are preserved during SSO sync.

### Lark Integration Settings
- `GET /api/lark/integration`
  - Returns saved App ID, module toggles, connection metadata, and boolean secret-presence flags.
  - Does not return decrypted App Secret, Verification Token, or Encrypt Key values.
- `POST /api/lark/integration`
  - Saves Lark App credentials and enabled module toggles for the tenant.
- `POST /api/lark/test-connection`
  - Tests tenant access token retrieval and returns a success/error envelope without exposing tokens.

### Lark Base
- `GET /api/lark/base/tables?app_token=...`
  - Lists tables inside a Lark Base app token.
- `GET /api/lark/base/fields?app_token=...&table_id=...`
  - Lists fields for one Base table.
- `GET /api/lark/base/records/preview?app_token=...&table_id=...&page_size=10`
  - Returns a bounded record preview for the selected Base table.
- `GET /api/lark/base/mappings`
  - Returns saved Base mappings and the default Lead field mapping.
- `POST /api/lark/base/mappings`
  - Saves a Lead ↔ Base table mapping with `sync_direction`, manually selected `field_mapping`, and active state.
- `POST /api/lark/base/mappings/{baseTable}/sync`
  - Runs manual `push` (Leadsy to Lark) or `pull` (Lark to Leadsy) sync.
