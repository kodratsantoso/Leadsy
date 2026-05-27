# Leadsy Platform

Web application for map-based lead discovery, AI-assisted qualification, funnel management, and governance (see `BRD`).

Current release: **v1.2.1** — includes the Integration Module Phase 1 backend foundation, Lark SSO/Base integration, deploy snapshot refresh, and the companion Mobile Field Sales MVP in `mobile/`.

## Repository layout

| Path | Purpose |
|------|---------|
| `BRD` | Single source of truth for requirements |
| `docs/` | Phase plans, ADRs (`decisions.md`), progress, risks |
| `frontend/` | Active Next.js UI source of truth (App Router, Tailwind, React Query, Zustand) |
| `backend/` | Laravel API (bootstrap when PHP/Composer or Docker available) |

## Frontend source of truth

This directory is the authoritative UI application used by Docker and local development.

- Build context: `docker-compose.yml -> frontend -> context: ./frontend`
- Live app code belongs in `frontend/app`, `frontend/components`, `frontend/lib`, and `frontend/store`
- Root-level `app/`, `components/`, `lib/`, and `store/` are deprecated mirrors and should not receive new UI work

## Prerequisites

- Node.js 20+ (for `frontend/`)
- PHP 8.3+, Composer, extensions Laravel needs **or** Docker with Composer image
- Docker (optional): PostgreSQL 16 and Redis via `docker compose up -d`

## Quick start — frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quick start — data stores

```bash
docker compose up -d
```

Connection defaults (see `docker-compose.yml`): Postgres `postgres:16` exposed on host `localhost:5435` and mapped to container `5432`, database `leads`, user/password `leads`; Redis `localhost:6382`.

Runtime containers use the `leadsy-*` namespace for the frontend, backend, PostgreSQL, Redis, and WhatsApp sidecar services.

## Quick start — backend (Laravel)

Use `scripts/bootstrap-backend.sh` **or** follow `backend/README.md` to create the Laravel 12 project and configure `.env` for Postgres/Redis.

## Key frontend features

| Feature | Location |
|---------|----------|
| Product Tour | `components/ProductTour/` — 14-step guided tour, auto-starts on first visit, minimizable, restartable via the `?` button in the header |
| Leads Generator | `app/lead-generator/page.tsx`, `app/lead-generator/platforms/page.tsx`, `app/map/page.tsx` — groups Map & Territory with social/platform generator channels |
| Lark SSO | `app/login/page.tsx`, `app/auth/lark/callback/page.tsx` — tenant-aware Lark login starts from the login screen; callback stores the returned Sanctum token before routing to the dashboard |
| Lark Base Mapping | `app/settings/integrations/page.tsx` — maps Leadsy Leads fields to Lark Base fields, previews selected table records, and triggers manual pull/push sync |
| Product Question Guide | `components/products/QuestionGuide.tsx` — AI-generated + user-editable requirement question guide per product, shown in each product's expanded card |
| Customer BANTC Question Guide | `components/leads/LeadBantcQuestionGuide.tsx` — AI-generated + user-editable BANTC discovery questions per Lead, shown on Lead Detail → Intelligence |
| Dashboard Funnel Tracking | `app/page.tsx` — two cumulative/aggregate funnels for Leads → Won and Leads → Lost, with estimated amount conversion and drilldown via `funnel_min_sequence` |
| Dashboard Achievement Sales | `app/page.tsx` — target-period Closed Won realization from `lead_outcomes.deal_size`; this is intentionally distinct from funnel estimated amount |
| Lead Product Revenue | `app/leads/page.tsx`, `app/leads/[id]/page.tsx` — lead initial product selection plus product-specific deal outcomes for new sales and upsales amounts |
| Meeting BANTC & Transcripts | `app/leads/[id]/page.tsx` — Activities capture evolving BANTC notes for Meeting records; Transcripts can link to activities, accept text/files, and run AI analysis summaries |
| App Shell | `components/layout/app-shell.tsx` — sidebar nav, global search, user menu, tour trigger |
| Design system | `components/ui/` — Button, Card, Badge, Modal, Table, FilterBar, Input, Select, Tabs |
| Theme system | `app/globals.css` (CSS tokens), `lib/theme-context.tsx` (React context) |
| Auth store | `store/useAuthStore.ts` (Zustand + persist) |
| API client | `lib/apiFetch.ts` — attaches Authorization header, reads `NEXT_PUBLIC_API_BASE_URL` |

## Lark SSO frontend contract

- `/login` requests available Lark tenants from `/api/auth/lark/tenants`.
- Choosing a tenant calls `/api/auth/lark/url` and redirects the browser to Lark.
- `/auth/lark/callback` is a public auth route; it posts only `code` and `state` to the backend callback endpoint.
- The callback page uses plain `fetch`, not `apiFetch`, so an unauthenticated callback is not intercepted and redirected back to `/login`.
- On success, `useAuthStore.setAuth(token, user)` persists the session before the router replaces the page with `/`.

## Documentation

- Phase 1 plan: `docs/execution/phase-1/plan.md`
- Decisions (append-only): `docs/decisions.md`
- Frontend SSOT: `frontend/docs/ssot.md` (includes ProductTour data-tour contract)
