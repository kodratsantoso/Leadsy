# 02 — UI/UX & Interaction Design Audit

**Target Application:** Leadsy Platform (`leadsy.tech`)  
**Audit Date:** October 21, 2026  
**Auditor:** Senior UI/UX Auditor & Frontend Lead  

---

## 1. Design System & Aesthetic Architecture

Leadsy has an established design system documented in `DESIGN_SYSTEM.md` and governed by `frontend/AGENTS.md`.

### 1.1 Core Aesthetic Strengths
- **Design Tokens (OKLch Color Space):** The interface is built on consistent CSS custom properties (`--background`, `--foreground`, `--card`, `--border`, `--brand`, `--status-success`, `--status-warning`, `--status-danger`), enabling seamless dark and light modes.
- **Typographic Discipline:** Uses Inter (`font-sans`) globally with clean hierarchies: `text-2xl font-bold` for primary page headers, `text-base font-semibold` for section headers, `text-xs` for labels, and `font-mono` for IDs, status codes, and currency amounts.
- **Micro-Interaction Primitives:** Clean component primitives in `frontend/components/ui/` (e.g. `button.tsx`, `badge.tsx`, `modal.tsx`, `card.tsx`) provide accessible focus rings (`focus-visible:ring-2`), active button states, and smooth hover transitions.

---

## 2. Information Architecture & Navigation

The application uses Next.js App Router layout hierarchy with a persistent collapsible sidebar (`frontend/components/layout/Sidebar.tsx`) and header breadcrumbs.

### Navigation Grouping:
1. **Core Workspace:** Dashboard (`/dashboard`), Map Radar (`/map`), Leads Pipeline (`/leads`), WhatsApp CRM (`/whatsapp`).
2. **Intelligence & Qualification:** Lead Reviews (`/qualification/reviews`), Lead Generator (`/lead-generator`).
3. **Delivery & Customer Success:** Professional Services (`/professional-services`), Customer Success (`/customer-success`).
4. **Platform Administration:** SaaS Platform Admin Console (`/admin/*`) with dedicated tenant management and financial telemetry.
5. **Organization Settings:** Company Settings, Team Users, Security, O2C, Webhooks, Integrations (`/settings/*`).

---

## 3. Discovered UI/UX Findings & Usability Defects

Below are the evidence-based findings identified during static code inspection and component analysis.

### Finding UX-001: Native Browser Dialogs (`window.confirm`) in Production Settings Pages
- **Severity:** **P2 (Medium)**
- **Observed Issue:** Several critical settings pages trigger native browser `confirm(...)` alert boxes instead of using the accessible `@/components/ui/modal` component.
- **Evidence:**
  - `frontend/app/settings/company/page.tsx:404`: `if (confirm("Are you sure you want to remove or deactivate this bank account?"))`
  - `frontend/app/settings/api/page.tsx:39`: `if (!confirm("Are you sure you want to generate a new Integration Token? Any previous integration tokens will be revoked immediately."))`
  - `frontend/app/settings/_components/TwoFactorAuthSettings.tsx:67`: `if (!confirm("Are you sure you want to disable Two-Factor Authentication?"))`
  - `frontend/app/settings/workflows/page.tsx:168`: `if (confirm('Are you sure you want to delete this workflow?'))`
  - `frontend/app/settings/integrations/lark-base/page.tsx:771`: `if (confirm('Are you sure you want to remove this mapping?'))`
  - `frontend/app/admin/ai-accounting/page.tsx:282`: `if (!confirm("Are you sure you want to delete this AI provider?"))`
  - `frontend/app/admin/ai-accounting/page.tsx:373`: `if (!confirm("Are you sure you want to delete this model?"))`
  - `frontend/app/settings/targets/revenue/page.tsx:135`: `if (!confirm("Are you sure?"))`
- **User Impact:** Native browser dialogs freeze the browser UI thread, look unprofessional, cannot be styled or themed, and violate accessibility standards (screen readers cannot announce custom descriptions).
- **Business Impact:** High-stakes actions (such as revoking API keys, disabling 2FA, or deleting bank accounts) lack a distinct two-step confirmation pattern with explicit explanation.
- **Recommended Direction:** Replace all `confirm()` calls with a shared `ConfirmDialog` or `Modal` component featuring two-step verification.

---

### Finding UX-002: Native Browser Alerts (`window.alert`) Used for API Error Feedback
- **Severity:** **P2 (Medium)**
- **Observed Issue:** In the AI Accounting admin module, API errors are surfaced to the user via native browser `alert()` popups.
- **Evidence:**
  - `frontend/app/admin/ai-accounting/page.tsx:272`: `alert(err.message || "Failed to save AI provider.");`
  - `frontend/app/admin/ai-accounting/page.tsx:275`: `alert(err.message || "Network error saving provider.");`
  - `frontend/app/admin/ai-accounting/page.tsx:363`: `alert(err.message || "Failed to save model.");`
  - `frontend/app/admin/ai-accounting/page.tsx:366`: `alert(err.message || "Network error saving model.");`
- **User Impact:** Disruptive modal popup that forces the user to dismiss a browser notification, lacking inline context or actionable remediation guidance.
- **Recommended Direction:** Use inline error banners (`@/components/ui/error-notice`) or toast notifications (`@/components/ui/toast`) to present API error messages.

---

### Finding UX-003: Hardcoded Non-Token Tailwind Colors Bypassing Design System
- **Severity:** **P3 (Low)**
- **Observed Issue:** Several form buttons and table indicators use arbitrary static Tailwind color classes (`bg-blue-600`, `hover:bg-blue-700`, `text-blue-900`) instead of semantic tokens (`bg-primary`, `text-primary-foreground`).
- **Evidence:**
  - `frontend/app/settings/integrations/digital-signature/page.tsx:145`: `<Button className="bg-blue-600 hover:bg-blue-700">`
  - `frontend/app/leads/[id]/page.tsx:1913`: `<Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium">`
  - `frontend/app/settings/o2c/item-settings/page.tsx:179`: `<Button className="bg-blue-600 hover:bg-blue-700 text-white">`
  - `frontend/app/settings/o2c/tax-codes/page.tsx:197, 295`: `<Button className="bg-blue-600 hover:bg-blue-700 text-white">`
  - `frontend/app/settings/o2c/withholding-tax-codes/page.tsx:197, 295`: `<Button className="bg-blue-600 hover:bg-blue-700 text-white">`
- **User Impact:** In dark mode, hardcoded `bg-blue-600` buttons display glaring contrast mismatches against dark card surfaces and fail to inherit tenant custom theme variables.
- **Recommended Direction:** Refactor to standard `Button` variants (`variant="default"` which inherits `bg-primary text-primary-foreground`).

---

### Finding UX-004: Monolithic Lead Detail Page Component Complexity
- **Severity:** **P2 (Medium)**
- **Observed Issue:** `frontend/app/leads/[id]/page.tsx` has grown to **2,476 lines of code** in a single file, managing over 14 distinct tabs (Overview, Discovery, Activities, Transcripts, Quotations, Sales Orders, WhatsApp, Revenue Intelligence, Financials, etc.).
- **Evidence:** File `frontend/app/leads/[id]/page.tsx` contains 2,476 lines and defines dozens of internal sub-renderers.
- **User Impact:** Slower client-side re-renders during state changes; tabs share a massive re-render tree, occasionally causing micro-stutters during typing in notes or changing item quantities.
- **Recommended Direction:** Split the Lead Detail view into independent tab components (`LeadOverviewTab.tsx`, `LeadDiscoveryTab.tsx`, `LeadO2CTab.tsx`, `LeadTranscriptsTab.tsx`) loaded with dynamic imports or memoized boundaries.

---

### Finding UX-005: Dual Unpinned Root Layout Mirrors
- **Severity:** **P2 (Medium)**
- **Observed Issue:** Root `app/page.tsx` (14,383 bytes) and `frontend/app/page.tsx` (2,067 bytes) exist concurrently. Older layout files in `app/` contain outdated styling that conflicts with `frontend/app/globals.css`.
- **Evidence:** `app/README.md` explicitly warns: *"This root app/ directory is a legacy duplicate of the real frontend."*
- **User Impact:** Developers or consultants inspecting the root project may accidentally open root `app/` components and experience discrepancy between code and runtime behavior.
- **Recommended Direction:** Completely deprecate and archive root `app/`, `components/`, and `lib/` folders.

---

## 4. Accessibility (a11y) & Responsive Audit

1. **Semantic Structure:** Good usage of standard HTML5 elements (`<table`, `<thead`, `<tbody`, `<header`, `<nav`). Form inputs have corresponding `<label>` elements in most modules.
2. **Color Contrast:** OKLch foreground/background contrast complies with WCAG AA (4.5:1 ratio) in both light and dark mode for primary content, though muted text (`text-muted-foreground` / `oklch(0.556 0 0)`) reaches ~3.8:1 on light backgrounds, which is slightly below WCAG AAA.
3. **Keyboard Navigation:** Modals capture focus properly (`Radix UI` based dialogs), but custom dropdown selectors in O2C tax codes lack full keyboard arrow navigation.
4. **Mobile Adaptivity:** The core layout features a responsive drawer for mobile devices (`mobile/` also exists as an independent React Native client), but dense data tables (e.g. Lead Quotation Item Builders) require horizontal scrolling on screens under 768px.
