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
