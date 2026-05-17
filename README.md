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
