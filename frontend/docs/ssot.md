# Single Source of Truth (SSOT)

## Active Frontend Scope

- Runtime UI source of truth: `frontend/`
- Shared primitives source of truth: `frontend/components/ui`
- Theme token source of truth: `frontend/app/globals.css`
- Runtime shell source of truth: `frontend/components/layout/app-shell.tsx`

## Design System Lock

All admin UI must inherit the same platform language.

- Required primitives:
  - `Button`
  - `Input`
  - `Textarea`
  - `Select`
  - `Card`
  - `Badge`
  - `Modal`
  - `Tabs`
  - `FilterBar`
  - `Table`
- Required token sources:
  - `--brand`
  - `--status-success`
  - `--status-warning`
  - `--status-danger`
  - `--status-info`
  - surface and border tokens from `frontend/app/globals.css`
- Prohibited reintroductions:
  - page-local modal systems
  - page-local destructive confirm flows
  - hardcoded Tailwind palette colors for runtime admin UI
  - inline styling except approved dynamic-safe widths and marker stacking

## Validation Baseline Pages

These pages define the platform consistency benchmark after the UI standardization pass:

- `frontend/app/page.tsx`
- `frontend/app/leads/page.tsx`
- `frontend/app/map/page.tsx`
- `frontend/app/settings/page.tsx`
- `frontend/app/settings/lead-sources/page.tsx`
- `frontend/app/settings/lead-channels/page.tsx`
- `frontend/app/settings/currency/page.tsx`
- `frontend/app/settings/users/page.tsx`
- `frontend/app/settings/ai-defaults/page.tsx`
- `frontend/app/settings/integrations/page.tsx`
- `frontend/app/auth/lark/callback/page.tsx`
- `frontend/app/audit-logs/page.tsx`

## Post-Refactor Cleanup Applied

- `frontend/app/page.tsx` — Dashboard now includes database-backed lead geography, two horizontal conversion funnel blocks with drillable bars, product bars, Lead Sources & Channels aggregates, and sales achievement using user target revenue versus Closed Won realization.
- `frontend/app/leads/page.tsx` — New Lead creation includes an Add Location map modal that geocodes a selected address and persists `lat`/`lng` to the lead record.
- `frontend/app/settings/users/page.tsx` — Users now expose Direct Manager, target period, and target revenue fields for hierarchy-based visibility and sales achievement reporting.
- `frontend/app/settings/integrations/page.tsx` — Integrations now owns Lark App credentials, module toggles, redirect URL guidance, and test connection feedback.
- `frontend/app/settings/integrations/page.tsx` — Lark tab now includes Base app token, table loading, selected-table record preview, manual Leadsy Leads ↔ Lark Base field mapping, and manual push/pull controls for saved mappings.
- `frontend/app/login/page.tsx` — Login includes tenant-aware Lark SSO entrypoint.
- `frontend/app/auth/lark/callback/page.tsx` — Lark callback stores the returned Sanctum token and user before redirecting to the dashboard.
- `frontend/app/template.tsx` — `/auth/*` routes are public auth routes so SSO callbacks can complete without being bounced to `/login`.
- `frontend/app/industries/page.tsx` — moved create/edit/delete flows onto shared `Card`, `Button`, `Input`, `Badge`, and `Modal` primitives.
- `frontend/app/products/page.tsx` — replaced page-local form and destructive controls with shared `FilterBar`, `Card`, `Badge`, `Button`, `Input`, `Textarea`, `Select`, and `Modal`.
- `frontend/app/settings/webhooks/page.tsx` — aligned settings actions to shared cards, inputs, buttons, badges, and governed delete confirmation modal.
- `frontend/app/settings/lead-sources/page.tsx` — added DB-backed lead source taxonomy management using shared settings primitives.
- `frontend/app/settings/lead-channels/page.tsx` — added DB-backed channel type management scoped to lead sources.
- `frontend/app/leads/page.tsx` — now consumes lead source and channel type master data for create/edit classification, table display, and filters.
- `frontend/app/leads/page.tsx` — displays estimated and realized closing amounts and lets admins maintain both values from lead create/edit modals.
- `frontend/app/leads/page.tsx` — exposes Initial Product in lead create/edit and table display.
- `frontend/app/leads/[id]/page.tsx` — Revenue tab records product-specific deal outcomes with separate `new_sales`/`upsales` sale type and amount history per customer.
- `frontend/app/settings/currency/page.tsx` — added DB-backed currency and number separator settings with live preview.
- `frontend/lib/hooks/use-number-format.ts` — added the shared number/currency display contract used by operational pages.
- `frontend/AGENTS.md` — strengthened the runtime UI governance lock with post-refactor enforcement rules.
- `AGENTS.md` — added repository-root guidance pointing contributors to the active frontend governance files.

## Product Tour System

Source of truth: `frontend/components/ProductTour/`

| File | Role |
|------|------|
| `ProductTour.jsx` | Orchestrator — routing, element detection, spotlight positioning |
| `TourTooltip.jsx` | Tooltip/popover rendered per step |
| `TourOverlay.jsx` | Four-piece semi-transparent overlay with transparent cutout |
| `TourSpotlight.jsx` | Brand-colored border box around the targeted element |
| `TourMinimized.jsx` | Floating pill badge shown when the tour is minimized |
| `useTour.js` | State hook — active, minimized, currentStep, totalSteps, actions |
| `tourSteps.js` | Step definitions with `target` CSS selector, `route`, `placement` |
| `ProductTour.css` | All tour styles scoped under `.leadsy-tour-*` |

**Integration points:**
- `<ProductTour />` is mounted inside `AppShell` — always present after login.
- The `HelpCircle` button in the top header fires `window.dispatchEvent(new Event("leadsy:start-tour"))` to re-trigger the tour manually.
- Tour auto-starts on first visit; subsequent visits respect `localStorage` completion flag.
- Minimized state and current step survive page navigation (persisted in `localStorage`).

**`data-tour` attribute contract:**

| Attribute | Page / Component | Step |
|-----------|-----------------|------|
| `sidebar-nav` | `app-shell.tsx` | Main Navigation |
| `global-search` | `app-shell.tsx` | Global Search |
| `tour-trigger` | `app-shell.tsx` | Restart Anytime |
| `dashboard-kpis` | `app/page.tsx` | Key Metrics |
| `dashboard-funnel` | `app/page.tsx` | Conversion Funnels |
| `dashboard-source-channel` | `app/page.tsx` | Lead Sources & Channels |
| `dashboard-map` | `app/page.tsx` | Lead Geography |
| `map-discovery` | `app/map/page.tsx` | Map & Territory Discovery |
| `review-queue` | `app/qualification/reviews/page.tsx` | Human Verification Queue |
| `leads-actions` | `app/leads/page.tsx` | Lead Actions |
| `leads-filters` | `app/leads/page.tsx` | Lead Filters |
| `leads-table` | `app/leads/page.tsx` | Lead Workspace |
| `products-add` | `app/products/page.tsx` | AI-Assisted Products |
| `settings-master-data` | `app/settings/page.tsx` | Master Data Settings |

**Rules:**
- Do not remove `data-tour` attributes from listed elements — the tour retries up to 20× per step.
- Add new `data-tour` attributes and matching steps in `tourSteps.js` when new core features are introduced.
- Tour step order follows the primary user flow: navigation → search → dashboard → map → review → leads → products → settings → restart.

## Notes

- Update this document when the shared UI contract changes.
- Treat any drift on the baseline pages as a regression requiring correction or explicit design-system expansion first.

## Product Question Guide Module

Source of truth: `frontend/components/products/QuestionGuide.tsx`

**Purpose:** Each product has a discoverable Question Guide — a structured list of requirement-gathering questions for sales/presales teams to use during customer qualification calls.

**Flow:**
1. User expands a product card on `/products`
2. `QuestionGuide` component mounts and fetches existing questions from `GET /api/products/{id}/questions`
3. User clicks **Generate with AI** → `POST /api/products/{id}/questions/generate` → AI builds 12–18 questions tailored to the product's metadata
4. Questions are displayed inline, fully editable (text, category, order, add, delete)
5. User clicks **Save** → `PUT /api/products/{id}/questions` → persisted to `product_questions` table
6. Subsequent visits show saved questions immediately; user can regenerate or edit at any time

**Question categories:** Current State · Requirements · Budget & Timeline · Decision Process · Technical Fit · Competition

**Key component behaviors:**
- Draft state is local — nothing is saved until the user explicitly clicks Save
- "Unsaved changes" badge appears on any edit
- Move up/down buttons reorder questions; each question has an inline category picker
- "Add question manually" button appends a blank question row
- AI generation notice is dismissible and clears on save

## Dashboard Module

- Lead Geography: renders DB-backed lead coordinates with POI marker colors sourced from each lead's funnel stage color.
- Funnel Tracking: renders horizontal conversion bars starting from `Belum Di Klasifikasi`, including lead-count and estimated amount conversion, plus product-level Sales Volume and Total Market bars. Stage conversion is cumulative/aggregate: each stage counts leads whose current stage sequence is at that stage or beyond. Stage drilldown uses `funnel_min_sequence`; terminal rows use `outcome=won|lost`.
- Lead Sources & Channels: renders DB-backed lead origin aggregates with source and channel bars; all rows route to filtered Leads and respect hierarchy visibility.
- Achievement Sales: compares the signed-in user's target revenue against Closed Won realization for the configured target period.
- Sales metric contract: Achievement Sales uses realized `lead_outcomes.deal_size` inside the configured target period. Funnel Won uses pipeline/terminal membership and `leads.estimated_closing_amount`, so the two dashboard blocks can show different values by design.

## Mobile Field Sales Companion

- Runtime mobile source of truth: `mobile/`.
- Testing helper: `npm run mobile:expo-go` starts Expo in LAN mode and points the app to the local backend API.
- Scope: login, Lead Inbox, Lead Detail, Call/WhatsApp/Email/Maps actions, Sales Visit, GPS Clock In/Out, photo evidence, client signature, visit result, and notes.
- Backend contract: `sales_visits` and `sales_visit_media` plus `/api/sales-visits` and `/api/leads/{lead}/sales-visits/clock-in`.

## Leads & User Settings Module

- Leads: manual create flow supports Add Location through map search/geocode and saves `lat`/`lng`.
- Lead Detail Intelligence: `LeadBantcQuestionGuide` generates per-customer BANTC discovery questions from lead, contact, product, activity, AI analysis, and revenue context. Generated questions are local draft state until the user saves.
- Lead Detail Activities: `Meeting` activities capture Budget, Authority, Needs, Timeline, and Competitor fields; new Meeting logs prefill the latest saved BANTC values for iterative updates.
- Lead Detail Transcripts: multiple transcripts can be stored per lead, linked to a related activity, and created from pasted text, TXT/VTT/SRT files, or attached audio/video files. AI transcript analysis requires text content and stores a summary plus sentiment, intent, interest, objections, buying signals, confidence, and next action.
- User Settings: `direct_manager_id` defines hierarchy visibility; `target_period` and `target_revenue` define achievement tracking.

## Lark SSO Module

- Login uses `/api/auth/lark/tenants` and `/api/auth/lark/url` to start a tenant-aware Lark Custom App OAuth flow.
- Callback route `/auth/lark/callback` posts `code` and `state` to the backend with plain `fetch`, bypassing authenticated API redirect behavior.
- Successful callback calls `useAuthStore.setAuth(token, user)` before replacing the route with `/`.
- Lark role changes remain owned by Leadsy `Settings -> Users`; SSO login must not overwrite the stored local role.
- Integration configuration lives only in `Settings -> Integrations`; do not add a duplicate Lark settings page.

## Lark Base Module

- Base sync configuration is tenant-aware and starts from a Base `app_token`.
- Table discovery uses Lark Base table listing; preview uses the selected table's records endpoint with a bounded page size.
- Field mapping is edited through a manual mapping grid from Leadsy lead fields to Lark Base field names, then stored as JSON for the backend sync service.
- Saved mappings expose manual `Pull from Lark` and `Push to Lark` actions.
- Runtime two-way sync depends on backend record mappings; frontend must not infer record identity from table row order.
