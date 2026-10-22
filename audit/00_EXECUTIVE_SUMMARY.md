# 00 — Executive Summary: SaaS Product Discovery & Audit

**Target Application:** Leadsy Platform (`leadsy.tech`)  
**Audit Date:** October 21, 2026  
**Auditor:** Senior Product Architect, Software Engineering Lead & Security Auditor  
**Repository Branch Inspected:** `main` (commit `b221d48`)  
**Working Tree Status:** Clean, verified against remote `origin/main`  

---

## 1. Product Overview

**Leadsy** is a B2B revenue intelligence, lead discovery, and commercial execution SaaS platform. The product integrates:
1. **Map-Based Lead Radar & Territory Discovery:** Visual geospatial discovery of businesses across geographical radiuses leveraging Google Maps API and territory boundaries.
2. **AI-Powered Lead Enrichment, Qualification & BANT-C:** Automated intelligence pipeline that extracts company intelligence, predicts conversion probability, matches leads against Ideal Customer Profiles (ICPs) and Product Master data, and assists B2B qualification.
3. **Multi-Channel Engagement & WhatsApp CRM:** In-app conversation tracking and campaign dispatching powered by an isolated Node.js Baileys socket sidecar.
4. **Order-to-Cash (O2C) & Professional Services Automation (PSA):** Complex quote generation, product tier pricing, multi-currency conversion, sales order lifecycle, project estimation templates, change requests, and BAST (Berita Acara Serah Terima) delivery sign-offs.
5. **Bidirectional Enterprise Integrations:** Native 2-way sync with Lark Base (Bitable), Lark Meeting transcript ingestion, and digital signature workflows (Documenso).
6. **Multi-Tenant SaaS Control Plane:** Workspace tenant isolation, dynamic packaging tiers (`plans`), resource quota enforcement, and live MRR/ARR financial calculations.

---

## 2. Product Maturity Assessment

| Dimension | Assessment Level | Evidence & Observations |
|---|---|---|
| **Product Stage** | **Late MVP / Operational Alpha (Transitioning to Commercial SaaS)** | Database contains ~1,073 operational leads, active users, and real WhatsApp message histories. Core CRM and O2C modules are functional, but multi-tenancy was retrofitted onto an existing single-tenant schema. |
| **Architectural Cohesion** | **Hybrid / Dual-Tree Legacy** | Active runtime UI lives under `frontend/` (Next.js 15), while deprecated root-level UI directories (`app/`, `components/`, `lib/`, `store/`) remain in the repository as compatibility mirrors. |
| **Data Integrity & Persistence** | **Production-Guarded Persistent Storage** | Persistent volume (PV/PVC) contains real customer data. Non-destructive migration rules are strictly governed in `AGENTS.md`. |
| **Testing & QA Maturity** | **Backend Unit-Covered; Frontend Integration Thin** | 48 backend tests (Unit & Feature) pass using SQLite in-memory, but only 1 Playwright end-to-end test spec exists (`frontend/tests/intelligence-features.spec.ts`). |
| **Security & Isolation** | **Moderate / Mixed Enforcement** | Global tenant scoping is active on 8 primary models, but child resources (e.g. Quotations, Sales Orders) lack automated tenant scope traits and rely on controller-level checks. |

---

## 3. Main Strengths

1. **Rich Domain Modeling & Comprehensive Feature Breadth:**  
   With 152 Eloquent models, 88 API controllers, and over 110 business service classes, the platform covers the entire enterprise B2B sales lifecycle—from raw geospatial map discovery to proposal generation, quotation approval workflows, and post-sale onboarding.
2. **Deterministic AI Orchestration & Cost Accounting:**  
   The platform implements an `AiOrchestrationService` with failover routing, latency tracking, prompt versioning, and real-time token/cost accounting stored in `ai_requests`.
3. **Automated Background Telemetry & Jobs:**  
   28 dedicated Laravel queue jobs handle asynchronous transcript analysis, Lark synchronization, ICP matching, and lead scoring without blocking HTTP requests.
4. **Strict Token-Based UI Design System:**  
   `DESIGN_SYSTEM.md` establishes a modern, frozen OKLch token palette, avoiding arbitrary hardcoded colors and enforcing consistent typographic scales.
5. **Rigorous Deployment & Operational Governance:**  
   CI/CD runs in-cluster on K3s runners with automated PHP linting, container builds, and rolling updates. Direct `git push -f` and destructive migration commands are strictly forbidden by repository rules.

---

## 4. Main Weaknesses

1. **Inconsistent Multi-Tenant Global Scoping (IDOR Exposure Risk):**  
   While `TenantScope` and `BelongsToTenant` are implemented, only 8 models explicitly use the trait. Several high-value child resources (e.g., `LeadQuotation`, `LeadSalesOrder`, `LeadActivity`) rely on manual controller logic, leaving endpoints like `GET /api/quotations/{id}` vulnerable to cross-tenant data leakage if the quotation ID is known.
2. **Absence of Rate Limiting on Authentication & Public Endpoints:**  
   `backend/routes/api.php` contains no rate limiting (`throttle` middleware) on sensitive endpoints including `POST /api/auth/login`, `POST /api/auth/send-otp`, or registration.
3. **Codebase Duplication & Root Mirror Confusion:**  
   The repository contains two full UI trees: the active runtime in `frontend/` and legacy mirrors in root (`app/`, `components/`, `lib/`, `store/`). This creates cognitive friction for developers and risk of unintended edits.
4. **Interactive UI Governance Violations (`alert` / `confirm`):**  
   Despite explicit guidelines in `AGENTS.md` and `DESIGN_SYSTEM.md` forbidding native browser dialogs, 10 occurrences of `confirm(...)` and 4 occurrences of `alert(...)` were identified across production settings and admin pages.
5. **Worker Daemon Reliability Bottleneck:**  
   Evidence in `backend/routes/console.php` explicitly notes that the Redis queue worker has "repeatedly gone silent for hours at a time", necessitating fallback cron jobs (`leadsy:screen-unassessed`) to chip away at background tasks.

---

## 5. Top 8 Critical Findings

| ID | Category | Severity | Summary | Location |
|---|---|---|---|---|
| **SEC-001** | Security / Auth | **P1 (High)** | Insecure Direct Object Reference (IDOR) on Quotations and Sales Orders due to missing tenant boundary validation in direct `{id}` route handlers. | `LeadOrderToCashController.php:292, 903` |
| **SEC-002** | Security / Abuse | **P1 (High)** | Zero rate-limiting (`throttle`) on authentication, OTP generation, and public webhook routes. | `backend/routes/api.php:86-104` |
| **ARCH-001** | Architecture | **P2 (Med)** | Legacy root UI tree (`app/`, `components/`) persists as an unmounted duplicate of `frontend/`, inducing maintenance overhead. | Root directory vs `frontend/` |
| **ARCH-002** | Architecture | **P2 (Med)** | Partial Multi-Tenancy Trait Adoption: Only 8 of 152 models utilize `BelongsToTenant`. | `backend/app/Models/` |
| **OPS-001** | Operations | **P2 (Med)** | Redis queue worker stall vulnerability requiring workaround scheduled cron jobs. | `backend/routes/console.php:21-28` |
| **UX-001** | UI/UX Quality | **P2 (Med)** | Native `window.confirm()` dialogs used in core admin and settings pages instead of accessible modal primitives. | 8 settings pages (e.g. `settings/company/page.tsx:404`) |
| **UX-002** | UI/UX Quality | **P2 (Med)** | Raw `window.alert()` calls in AI accounting for error feedback. | `admin/ai-accounting/page.tsx:272, 363` |
| **UX-003** | UI/UX Quality | **P3 (Low)** | Static raw Tailwind color classes (`bg-blue-600`, `text-blue-900`) bypass OKLch design system tokens. | `settings/o2c/*`, `leads/[id]/page.tsx:1913` |

---

## 6. Critical Unknowns & Audit Limitations

1. **Production Database Volume Details:**  
   Because this audit is strictly non-destructive and static within the workspace, active production database records and persistent volume storage were not directly dumped or queried outside local in-memory SQLite test suites.
2. **External Gateway Availability:**  
   Live connectivity to external third-party APIs (Google Maps API Key, Lark Open Platform credentials, Mekari Qontak, and Baileys WhatsApp sockets) was not tested with live credentials to prevent unexpected service charges or external mutations.
3. **Actual Client Concurrency & Traffic:**  
   No production access logs (Nginx/Cloudflare analytics) were available in the workspace to evaluate real-world requests per second or active tenant distribution.

---

## 7. Recommended Next Steps

1. **Sprint 1 (Security & Data Isolation Hardening):**
   - Apply `BelongsToTenant` and `TenantScope` systematically to all remaining tenant-owned models (`LeadQuotation`, `LeadSalesOrder`, `LeadActivity`, `LeadContact`, `CustomerHealthScore`).
   - Wrap `POST /api/auth/login`, `POST /api/auth/send-otp`, and public API endpoints with Laravel `throttle:10,1` rate limiters.
2. **Sprint 2 (UI/UX Dialogue Governance & Cleanup):**
   - Refactor all 14 `confirm()` and `alert()` calls in `frontend/app/settings/` and `frontend/app/admin/` to use the shared `@/components/ui/modal` component.
   - Replace static Tailwind colors (`bg-blue-600`) with semantic token `bg-primary`.
3. **Sprint 3 (Worker & Infrastructure Resilience):**
   - Implement health-check / liveness probes for `leadsy-worker` deployment in `k8s/leadsy-prod-workers.yaml` to eliminate queue worker stalls.
4. **Sprint 4 (Repository Hygiene & Deprecation Pruning):**
   - Safely prune or archive the deprecated root `app/`, `components/`, and `lib/` mirrors after verifying that no build script or pipeline references them.
