# Leadsy Platform

Web application for map-based lead discovery, AI-assisted qualification, funnel management, and governance (see `BRD`).

## Repository layout

| Path | Purpose |
|------|---------|
| `BRD` | Single source of truth for requirements |
| `docs/` | Phase plans, ADRs (`decisions.md`), progress, risks |
| `frontend/` | Active Next.js UI source of truth (App Router, Tailwind, React Query, Zustand) |
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

- Dashboard map: open Dashboard to view lead/customer POIs for records with `lat` and `lng`. Marker colors follow each lead's funnel stage color, and clicking a marker shows a lead summary.
- Add Location: in Leads → New Lead, use `Add Location` to search an address on the map and save latitude/longitude with the lead.
- Dashboard funnel tracking: Dashboard shows horizontal conversion funnels that start from `Belum Di Klasifikasi`, with drillable stage bars, lead conversion, estimated amount conversion, sales volume bars, and total market bars.
- Funnel conversion logic is cumulative/aggregate: each step counts leads that have reached that stage or a later stage. Drilldown uses `funnel_min_sequence`, so clicking `Enriched` opens all leads at Enriched or beyond.
- Lead origin dashboard: Dashboard includes a Lead Sources & Channels block that aggregates total leads by source and channel, with each row drilling down to filtered Leads.
- Lead product revenue: Leads → New/Edit Lead includes an Initial Product field. Lead Detail → Revenue → Record Outcome can record product-specific Closed Won/Lost entries, with `new_sales` for the first product and `upsales` for additional products; each outcome stores its own amount.
- Customer BANTC Question Guide: Lead detail → Intelligence can generate customer-specific Budget, Authority, Need, Timeline, and Competition questions with AI. Generated questions remain draft-only until the user saves them.
- Meeting BANTC capture: Lead detail → Activities → Log Activity shows Budget, Authority, Needs, Timeline, and Competitor fields when the activity type is `Meeting`; the next meeting preloads the latest BANTC notes for iterative updates.
- Transcript management: Lead detail → Transcripts supports multiple transcripts, each linkable to an Activity. Users can paste text, upload TXT/VTT/SRT, or attach audio/video files; AI analysis summarizes text transcripts and extracts sentiment, intent, objections, buying signals, and next action.
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

## Documentation

- Phase 1 plan: `docs/execution/phase-1/plan.md`
- Decisions (append-only): `docs/decisions.md`
