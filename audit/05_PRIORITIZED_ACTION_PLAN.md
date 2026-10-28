# 05 — Prioritized Action Plan & Technical Roadmap

**Target Application:** Leadsy Platform (`leadsy.tech`)  
**Audit Date:** October 21, 2026  
**Auditor:** Senior Product Architect, Software Engineering Lead & SaaS Consultant  

---

## 1. Prioritization Backlog Matrix

Findings are prioritized based on verified risk, user impact, and security boundaries.

| ID | Title / Issue | Category | Priority | Effort | Dependencies | Rationale |
|---|---|---|---|---|---|---|
| **SEC-001** | Multi-Tenant IDOR on Quotations & Orders | Security | **P1 (High)** | **S** | None | Critical data privacy breach risk; allows cross-tenant visibility into financial proposals. |
| **SEC-002** | Missing Rate Limiting on Auth Endpoints | Security | **P1 (High)** | **S** | Redis cache | Vulnerable to automated brute-force attacks and OTP flooding on `/api/auth/*`. |
| **UX-001** | Native `confirm()` in Settings & Admin | UI/UX | **P2 (Med)** | **M** | UI Primitives | Blocks browser UI thread, fails dark mode, violates accessibility standards. |
| **UX-002** | Native `alert()` Popups in AI Accounting | UI/UX | **P2 (Med)** | **S** | Toast system | Jarring error presentation; should use standard toast/inline error components. |
| **ARCH-001** | Deprecated Root UI Mirror Cleanup | Architecture | **P2 (Med)** | **M** | Verify imports | Eliminates developer confusion between root `app/` and active `frontend/app/`. |
| **ARCH-002** | Expand `BelongsToTenant` Trait across Models | Architecture | **P2 (Med)** | **L** | Test coverage | Hardens multi-tenancy so child entities automatically inherit global tenant scope. |
| **OPS-001** | Redis Queue Worker Reliability & Probes | Operations | **P2 (Med)** | **M** | K3s manifests | Prevents worker daemon silence that stalls background AI screening and sync jobs. |
| **GOV-001** | Provision Isolated Staging Environment | Governance | **P2 (Med)** | **L** | K3s resources | Enables validation of complex multi-tenant workflows before pushing directly to production. |
| **UX-003** | Replace Static Tailwind Colors with Tokens | UI/UX | **P3 (Low)** | **S** | None | Enforces 100% compliance with OKLch design tokens (`bg-blue-600` → `bg-primary`). |
| **UX-004** | Modularize Monolithic `leads/[id]/page.tsx` | UI/UX / Perf | **P3 (Low)** | **L** | Frontend routing | 2,476 lines in one file; splitting into sub-tabs improves re-render performance. |

---

## 2. Quick Wins (< 1 Day Implementation Each)

These improvements carry high return on investment and can be implemented safely with minimal disruption:

1. **Quick Win 1 (SEC-002): Enable Throttle Middleware on Auth Routes**  
   - Add `->middleware('throttle:10,1')` to `Route::prefix('auth')` in `backend/routes/api.php`.  
   - Effort: **1 hour**. Risk: Very Low.
2. **Quick Win 2 (SEC-001): Enforce Tenant Ownership in `LeadOrderToCashController`**  
   - Add explicit tenant constraint in `showQuotation`, `updateQuotation`, and `showSalesOrder`:
     ```php
     $quotation = LeadQuotation::where('tenant_id', TenantContext::getTenantId())->findOrFail($id);
     ```
   - Effort: **2 hours**. Risk: Low.
3. **Quick Win 3 (UX-002): Replace `alert()` in AI Accounting**  
   - Replace the 4 `alert(...)` calls in `frontend/app/admin/ai-accounting/page.tsx` with inline error banners or toast alerts.  
   - Effort: **1 hour**. Risk: None.
4. **Quick Win 4 (UX-003): Tokenize O2C Form Buttons**  
   - Replace `bg-blue-600 hover:bg-blue-700 text-white` in `frontend/app/settings/o2c/*` with standard `Button` variants.  
   - Effort: **2 hours**. Risk: None.

---

## 3. Recommended Phased Sequencing

### Phase 1: Security & Multi-Tenancy Hardening (Target: Sprint 1)
- [x] Implement Quick Win 1 (Auth Rate Limiting).
- [x] Implement Quick Win 2 (Quotation & Sales Order Tenant Scoping).
- [x] Extend `BelongsToTenant` trait across secondary business entities (`LeadActivity`, `LeadScore`, `LeadQualification`, `LeadSource`).
- [x] Add integration test suite asserting cross-tenant IDOR rejection on all direct ID endpoints (`backend/tests/Feature/OrderToCashMultiTenantTest.php`).

### Phase 2: UI/UX Dialog Governance & Frontend Ergonomics (Target: Sprint 2)
- [x] Implement Quick Win 3 & 4 (Replace `alert()` in AI Accounting with toasts, Tokenize O2C Form Buttons).
- [x] Build a standardized, accessible `ConfirmDialog` modal primitive in `frontend/components/ui/confirm-dialog.tsx`.
- [x] Refactor the 8 settings pages currently using `window.confirm()` to use `ConfirmDialog`.
- [x] Refactor `frontend/app/leads/[id]/page.tsx` into modular sub-tab components (`ContactsTab.tsx`, `ActivitiesTab.tsx`, `MeetingsTab.tsx`, `TranscriptsTab.tsx`, `CustomerJourneyTab.tsx`).
- [x] Purge static Tailwind colors and enforce design token compliance across Lead Detail view.

### Phase 3: Infrastructure Resilience & Operations (Target: Sprint 3)
- [x] Configure Kubernetes liveness and readiness probes for `deployment/leadsy-worker` and `leadsy-scheduler` in `k8s/leadsy-prod-workers.yaml`.
- [x] Set up automated Redis connection reconnection logic in Laravel queue daemon supervisor (`backend/config/horizon.php` and `HorizonServiceProvider.php`).
- [x] Provision `leadsy-staging` namespace in K3s tied to branch `virtuenet` (`k8s/leadsy-staging.yaml` and `.github/workflows/ci.yml`).

### Phase 4: Repository Cleanup & De-duplication (Target: Sprint 4)
- [x] Verify that no internal build scripts reference root `app/`, `components/`, or `lib/`.
- [x] Establish root mirror deprecation documentation and governance boundaries.
- [x] Permanently remove deprecated root UI mirrors (`app/`, `components/`, `lib/`, `store/`, `types/`, configs) under `ARCH-001`.

---

## 4. Suggested First Pilot Improvement

**Pilot Project:** **Security Hardening of Order-to-Cash Endpoints (`SEC-001`)**
- **Why this pilot:**  
  Financial quotations and sales orders contain the most sensitive customer pricing, terms, and personal contact details in the CRM. Securing these endpoints protects tenant isolation without changing any frontend UI, visual layout, or database schema.
- **Verification Criteria:**  
  Automated Feature test in `backend/tests/Feature/OrderToCashMultiTenantTest.php` asserting that a user in Tenant B receives an HTTP 404 or 403 when requesting `/api/quotations/{id}` owned by Tenant A.

---

## 5. Items That Should NOT Be Changed Until More Evidence Is Available

1. **Do NOT migrate from PostgreSQL / Laravel Sanctum to an external auth provider (e.g. Auth0/Clerk):**  
   The existing Sanctum session and token architecture is tightly coupled with multi-tenant context resolution (`IdentifyTenant`) and database-driven RBAC permissions. Replacing it would destabilize working workflows without operational necessity.
2. **Do NOT delete the Baileys WhatsApp sidecar:**  
   While third-party official WhatsApp Business APIs exist (e.g. Mekari Qontak), the local Baileys sidecar supports personal/multi-device sales sessions that are central to the core product requirement.
3. **Do NOT refactor the Next.js 15 App Router architecture:**  
   The frontend build passes cleanly with modern React 19 server/client components. A framework overhaul is unjustified.
