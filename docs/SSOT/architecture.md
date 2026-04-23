# Architecture

## Executive Summary
The product target is a web-based lead qualification and eligibility platform that acts as a pre-CRM revenue intelligence layer.

Current implementation strategy:
- preserve the existing Laravel + Next.js production baseline
- evolve qualification into a stricter enterprise module
- document the future-state modular architecture without forcing an immediate backend rewrite

## Current Stack
- Frontend: Next.js App Router, TypeScript, React Query
- Backend: Laravel 11 API
- Database: PostgreSQL
- Queue / cache: Redis-capable architecture
- Integrations: Google Maps, WhatsApp sidecar, AI provider routing

## Target Logical Modules
1. Lead Management
2. Parameter & Criteria Engine
3. Scoring Engine
4. Qualification Result Engine
5. Review & Approval Workflow
6. Activity & Notes Tracking
7. Dashboard & Analytics

## Phase 2 Module Realization

### Parameter & Criteria Engine
- `qualification_parameter_sets`
- `qualification_parameters`
- `qualification_parameter_options`
- active policy compiled at runtime by `QualificationPolicyRepository`

### Scoring Engine
- `QualificationRuleEngineService`
- explainable status, score, risk flags, hard-stops, and recommendation
- DB-backed policy when an active parameter set exists, config fallback otherwise

### Review & Approval Workflow
- `qualification_workflows`
- `qualification_workflow_stages`
- `qualification_workflow_reviews`
- review records linked to leads and persisted qualification snapshots

### Qualification API Surface
- `POST /api/qualification/evaluate`
- `GET|POST|PUT|DELETE /api/qualification/parameter-sets`
- `POST /api/qualification/parameter-sets/{id}/activate`
- `GET|POST|PUT|DELETE /api/qualification/workflows`
- `GET|POST|PUT /api/qualification/reviews`

## Runtime Architecture

### Frontend
- dashboard and operational workspaces
- lead list and detail views
- qualification workspace for explainable evaluation
- admin/config surfaces

### Backend
- lead APIs
- qualification evaluation API
- scoring and qualification services
- audit logging
- integration adapters
- workflow orchestration endpoints

### Data Layer
- leads and related entities
- qualification outputs
- score breakdowns
- activities, audit, and workflow state
- tenant foundation for future workspace isolation
- legacy lineage tracking for imported records
- database-level integrity rules for contacts, sources, active policy, active workflow, and tenant-scoped integration settings

## Architectural Principles
- explainability before automation
- policy-driven decisions
- auditable mutations
- reusable domain services
- backward-compatible evolution of existing APIs where feasible

## Current Execution Decision
Although the enterprise directive prefers NestJS, this repository is already a functioning Laravel system with real modules, data, and integrations. The approved path is to implement the qualification layer on Laravel now, and defer any replatform decision to a future ADR-backed program.

## Module Interaction
- Lead source data enters `Lead` and related source/contact tables.
- Qualification workspace submits either manual payloads or existing lead snapshots.
- Qualification rule engine computes score, status, reasoning, and risks.
- Persisted lead qualification writes land in `lead_qualifications`.
- Dashboard and lead detail consume summarized qualification outputs.

## Non-Functional Requirements
- sub-second rule-based evaluation
- secure authenticated APIs
- RBAC for sensitive actions
- durable audit trail
- configuration traceability
- graceful fallback when AI assistance is unavailable

## Near-Term Implementation Scope
Implemented in this batch:
- enterprise qualification SSOT pack
- config-backed rule engine
- evaluation endpoint
- minimal frontend qualification workbench
- richer persisted qualification payload for explainability
- database-backed qualification parameter-set architecture
- database-backed review workflow architecture
- tenant-ready schema foundation and default-tenant backfill
- hardened database integrity rules and legacy lineage mapping table

Deferred:
- DB-backed parameter management UI
- workflow reviewer inbox
- tenant isolation layer
- full reporting suite
