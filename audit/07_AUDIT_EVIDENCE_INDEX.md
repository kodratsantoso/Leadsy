# 07 — Audit Evidence Index

**Target Application:** Leadsy Platform (`leadsy.tech`)  
**Audit Date:** October 21, 2026  
**Auditor:** Senior Product Architect, Software Engineering Lead & Application Security Reviewer  

---

## 1. Structured Evidence Log

This index cross-references all findings with verifiable file paths, code snippets, commands executed, and verification confidence levels.

| Finding ID | Report Reference | Evidence Type | Specific File Path / Line Reference | Verification Status | Confidence | Additional Verification Required |
|---|---|---|---|---|---|---|
| **SEC-001** | `03_TECHNICAL_ARCHITECTURE_AND_SECURITY.md` | Source Code | `backend/app/Http/Controllers/Api/LeadOrderToCashController.php:292, 298, 903` | **Verified** | **High** | Write multi-tenant cross-tenant read/write integration test. |
| **SEC-002** | `03_TECHNICAL_ARCHITECTURE_AND_SECURITY.md` | Source Code | `backend/routes/api.php:86-94` | **Verified** | **High** | None; rate limiter presence is statically verifiable from route middleware. |
| **SEC-003** | `03_TECHNICAL_ARCHITECTURE_AND_SECURITY.md` | Source Code | `backend/app/Http/Middleware/EnforceSessionTimeout.php:37` | **Verified** | **High** | Review client use cases for long-lived integration tokens. |
| **ARCH-001**| `03_TECHNICAL_ARCHITECTURE_AND_SECURITY.md` | Repository Structure | `app/README.md`, Root `app/`, `components/`, `lib/` vs `frontend/` | **Verified** | **High** | Verify no build scripts in `scripts/` reference root `app/`. |
| **ARCH-002**| `03_TECHNICAL_ARCHITECTURE_AND_SECURITY.md` | Source Code | `backend/app/Models/Traits/BelongsToTenant.php` & 152 models | **Verified** | **High** | Audit all 152 models for missing `tenant_id` columns and traits. |
| **OPS-001** | `03_TECHNICAL_ARCHITECTURE_AND_SECURITY.md` | Configuration & Code | `backend/routes/console.php:21-28`, `k8s/leadsy-prod-workers.yaml` | **Verified** | **High** | Inspect production worker pod crash/restart logs via `kubectl`. |
| **UX-001**  | `02_UI_UX_AUDIT.md` | Source Code | `frontend/app/settings/company/page.tsx:404`, `frontend/app/settings/api/page.tsx:39`, `frontend/app/admin/ai-accounting/page.tsx:282, 373` | **Verified** | **High** | Interactive browser verification after modal refactor. |
| **UX-002**  | `02_UI_UX_AUDIT.md` | Source Code | `frontend/app/admin/ai-accounting/page.tsx:272, 275, 363, 366` | **Verified** | **High** | Interactive browser verification of toast system. |
| **UX-003**  | `02_UI_UX_AUDIT.md` | Source Code | `frontend/app/settings/integrations/digital-signature/page.tsx:145`, `frontend/app/leads/[id]/page.tsx:1913`, `frontend/app/settings/o2c/*` | **Verified** | **High** | Visual regression testing in dark mode. |
| **UX-004**  | `02_UI_UX_AUDIT.md` | Source Code | `frontend/app/leads/[id]/page.tsx` (2,476 lines) | **Verified** | **High** | Benchmark client-side component re-render performance. |
| **GOV-001** | `04_DEVELOPMENT_GOVERNANCE_GAP_ANALYSIS.md` | CI/CD Config & Docs | `AGENTS.md:120-135`, `.github/workflows/ci.yml:56-65` | **Verified** | **High** | Provision K3s staging namespace for `virtuenet` branch. |
| **GOV-002** | `04_DEVELOPMENT_GOVERNANCE_GAP_ANALYSIS.md` | Runtime History | Commit `5b2f620` vs `577cafe` (`Q.map is not a function`) | **Verified** | **High** | Implement contract testing in CI pipeline before deployment. |

---

## 2. Command Execution Evidence Log

The following non-destructive diagnostic commands were executed directly on the application during this audit:

### Command 1: Frontend Typecheck
```bash
cd frontend && npx tsc --noEmit
```
- **Result:** Exited with code `0`.
- **Finding:** All TypeScript files in `frontend/` compile cleanly with zero type errors.

### Command 2: Backend Unit Test Suite
```bash
php artisan test --testsuite=Unit
```
- **Result:** Exited with code `0`.
- **Finding:** 16 tests executed, 52 assertions passed (SQLite in-memory mode). Deprecation notices identified for `PDO::MYSQL_ATTR_SSL_CA` under PHP 8.5.

### Command 3: PHP Syntax Linting
```bash
php -l backend/app/Http/Controllers/Api/PlatformAdminController.php
php -l backend/app/Models/Plan.php
php -l backend/app/Models/Tenant.php
php -l backend/routes/api.php
```
- **Result:** Exited with code `0`.
- **Finding:** No PHP syntax errors detected.

### Command 4: Repository Working Tree State
```bash
git status
```
- **Result:** Exited with code `0`.
- **Finding:** Working tree clean on branch `main`, synchronized with upstream `origin/main`.
