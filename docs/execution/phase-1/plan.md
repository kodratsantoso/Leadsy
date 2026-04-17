# Phase 1 — MVP (aligned with BRD §9)

## Objective

Deliver the BRD **MVP In Scope** items as the first shippable increment, with foundations for later phases.

## Scope (from BRD §9 MVP)

| Area | Deliverable |
|------|-------------|
| Map | Google Maps embed, location search, center point, radius, territory visualization, saved territories |
| Product | Master product CRUD (required fields), manual product name, AI reference: upload / URL / master selection |
| Lead discovery | Businesses in radius, company fields per BRD §3.3, enrichment pipeline (async where heavy) |
| Visualization | Basic heatmap, filters (product, industry, score, stage), cluster → leads |
| Lead UX | List (required columns), sort/filter/search, export CSV/XLSX, detail page (BRD §3.6) |
| Dedup | Rules per BRD §3.7 hierarchy, duplicate statuses, merge/review path |
| Funnel | Default stages (BRD §3.8), push to funnel, history, funnel dashboard, conversion metrics |
| Identity | Users, roles (BRD §5.1), RBAC, team visibility baseline |
| Audit | Mandatory events per BRD §5.2 |
| WhatsApp | QR connect, status, chat from lead, log initiation metadata (compliant provider path) |
| AI modes | Full / Hybrid / Manual (BRD §3.11) + `use_ai_reference`, `ai_mode`, processing status fields |
| AI admin | Providers, encrypted credentials, model registry, routing + fallback, cost metadata logging |

## Out of scope for Phase 1 (BRD §9 Phase 2 / Later)

- Polygon search (explicitly future in BRD §3.1)
- SSO/MFA (future §5.1)
- CRM sync, advanced playbooks, SLA automation (later)
- Full secret-manager integration (future §11.3)

## Technical tasks (sequenced)

1. **Foundation**: Monorepo layout, `docker-compose` (PostgreSQL 16, Redis, API, web, Traefik labels for Coolify), env separation.
2. **Backend**: Laravel 12 API, Sanctum/Passport auth, migrations for core tables (users, roles, permissions, products, leads, contacts, sources, funnel, AI, audit_logs).
3. **Frontend**: Next.js App Router, Tailwind, shadcn/ui, React Query + Zustand, API client.
4. **Map module**: Google Maps JS API, territory save/load API.
5. **Lead engine**: Places/discovery integration (provider TBD — BRD §10), jobs for enrichment + scoring.
6. **Dedup service**: Priority rules, probable duplicate queue, merge API.
7. **Funnel**: Stages seed, transitions, dashboard aggregates.
8. **AI layer**: Provider manager, encryption, router, prompt engine, audit-safe logging.
9. **WhatsApp**: Adapter behind interface; QR flow per chosen provider.
10. **QA**: PHPUnit feature tests, frontend component tests, one E2E happy path.

## Exit criteria

- All MVP checklist rows in BRD have a mapped implementation and test.
- No mock data in production paths; integrations use real APIs with dev/staging keys.
- Documentation updated (`docs/progress.md`, ADR append-only).
