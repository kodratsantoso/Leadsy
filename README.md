# Leads Generator Platform

Web application for map-based lead discovery, AI-assisted qualification, funnel management, and governance (see `BRD`).

## Repository layout

| Path | Purpose |
|------|---------|
| `BRD` | Single source of truth for requirements |
| `docs/` | Phase plans, ADRs (`decisions.md`), progress, risks |
| `frontend/` | Next.js (App Router), Tailwind, React Query, Zustand |
| `backend/` | Laravel API (bootstrap when PHP/Composer or Docker available) |

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

Connection defaults (see `docker-compose.yml`): Postgres `localhost:5432`, database `leads`, user/password `leads`; Redis `localhost:6379`.

## Quick start — backend (Laravel)

Use `scripts/bootstrap-backend.sh` **or** follow `backend/README.md` to create the Laravel 12 project and configure `.env` for Postgres/Redis.

## Documentation

- Phase 1 plan: `docs/execution/phase-1/plan.md`
- Decisions (append-only): `docs/decisions.md`
