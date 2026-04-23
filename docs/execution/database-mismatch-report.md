# Database Mismatch Report

## Date
2026-04-20

## Scope
- `backend/database/migrations`
- `backend/app/Models`
- `backend/app/Http/Controllers/Api`

## Summary
The database hardening work established a solid tenant-ready foundation, but two important schema mismatches remain between the intended tenant model and the current qualification architecture implementation.

## Findings

### 1. Qualification slugs are still globally unique
- Files:
  - `backend/database/migrations/2026_04_18_150000_create_qualification_architecture_tables.php`
  - `backend/database/migrations/2026_04_18_160000_add_multi_tenant_foundation.php`
- Detail:
  - `qualification_parameter_sets.slug` is defined as globally unique.
  - `qualification_workflows.slug` is defined as globally unique.
  - Later migrations add `tenant_id` to both tables and add tenant-scoped active-state indexes.
- Mismatch:
  - The schema is now tenant-ready, but the slug identity rules are still global.
  - Two tenants cannot create the same logical parameter-set slug or workflow slug even though the rest of the model is moving toward tenant isolation.
- Impact:
  - Cross-tenant collisions on governance artifacts.
  - Avoidable friction for imports, templates, and future workspace cloning.

### 2. Qualification activation logic is not tenant-scoped
- Files:
  - `backend/app/Http/Controllers/Api/QualificationParameterSetController.php`
  - `backend/database/migrations/2026_04_18_170000_harden_core_business_schema.php`
- Detail:
  - The hardening migration enforces one active parameter set per tenant.
  - `activate()` currently archives all active parameter sets globally before activating one record.
- Mismatch:
  - The runtime write path does not match the tenant-scoped database intent.
- Impact:
  - Activating a set for one tenant can archive active sets for other tenants.
  - This is the highest-risk integrity issue found in the qualification module.

### 3. Tenant foundation is broader than current enforcement
- Files:
  - `backend/database/migrations/2026_04_18_160000_add_multi_tenant_foundation.php`
  - `backend/database/migrations/2026_04_18_170000_harden_core_business_schema.php`
  - `backend/app/Models/QualificationParameterSet.php`
  - `backend/app/Models/QualificationWorkflow.php`
  - `backend/app/Models/IntegrationConfig.php`
- Detail:
  - `tenant_id` now exists on users, leads, audit logs, qualification policy/workflow tables, products, territories, ICP profiles, integration configs, and revenue rules.
  - Models are generally ready to accept `tenant_id`.
- Remaining gap:
  - Not every controller query is consistently tenant-filtered yet.
- Impact:
  - The schema is ahead of the application enforcement layer.
  - This is survivable in a single-tenant environment, but it is still a real backlog item before multi-tenant rollout.

## Verified Strengths
- `integration_configs` uniqueness was correctly moved from global `key` uniqueness to tenant-aware uniqueness.
- Postgres and SQLite compatibility handling in `2026_04_18_170000_harden_core_business_schema.php` is deliberate and consistent with the test fallback ADR.
- Operational indexes for lead filtering and latest intelligence lookups are in place.

## Recommended Backlog
1. Replace global unique slug constraints on qualification parameter sets and workflows with tenant-scoped uniqueness.
2. Scope qualification activation updates by `tenant_id`.
3. Audit remaining tenant-ready controllers and repositories for missing tenant filters before enabling multi-tenant behavior in production.
