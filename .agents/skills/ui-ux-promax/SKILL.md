---
name: ui-ux-promax
description: >-
  Advanced, tier-1 SaaS UI/UX craftsmanship & interaction design engine. Enforces high-density enterprise layouts, Linear/Raycast/Stripe aesthetic fidelity, micro-interactions, tactile feedback, keyboard-driven navigation, zero-layout-shift states, and strict design token governance. Use when designing, polishing, or refactoring high-impact frontend views, consoles, dashboards, complex data tables, and modal workflows.
---

# UI/UX Promax — Tier-1 SaaS Experience & Aesthetic Engine

This skill elevates Leadsy's frontend experience to **tier-1 enterprise SaaS standards** (inspired by Linear, Stripe, Vercel, and Raycast) while enforcing strict compliance with `DESIGN_SYSTEM.md` and `frontend/AGENTS.md`.

---

## 1. Aesthetic Fidelity & Visual Craftsmanship

Every view crafted with **UI/UX Promax** must achieve immediate visual impact and feel refined, modern, and trustworthy.

### 1.1 Layered Elevation & Surface Depth
- **Surface Hierarchy**:
  - Base Background: `--background` (clean, untextured).
  - Main Cards / Containers: `--card` with `border border-border/60 bg-card shadow-sm`.
  - Floating Panels / Drawers: `bg-card/80 backdrop-blur-xl border border-border/80 shadow-2xl`.
  - Nested Sub-Panels: `bg-muted/30 border border-border/40 rounded-2xl`.
- **Specular Highlights (Light Injection)**:
  - Add subtle top-edge specular highlights to cards and modals for depth:
    ```tsx
    className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-b from-card via-card to-card/95 shadow-lg shadow-black/5"
    ```
- **Ambient Accent Glow**:
  - Use blurred, low-opacity ambient backdrops (`pointer-events-none`) for hero panels and headers:
    ```tsx
    <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
    ```

### 1.2 Modern Typography & Numeric Precision
- **Font Stack**: Inter (`font-sans`), with strict hierarchy:
  - Page Title: `text-2xl font-bold tracking-tight text-foreground sm:text-3xl`
  - Section Heading: `text-base font-bold text-foreground`
  - Card/Modal Sub-heading: `text-sm font-semibold text-foreground`
  - Body Text: `text-xs sm:text-sm text-muted-foreground leading-relaxed`
  - Micro Captions: `text-[11px] text-muted-foreground`
  - Badge / Label Tags: `text-[10px] uppercase font-bold tracking-wider font-mono`
- **Tabular Numerics**:
  - Always apply `font-mono` on IDs (`#104`), currency (`$49.00/mo`), percentages (`94.2%`), timestamps, and IP addresses to prevent tabular jittering.

---

## 2. Micro-Interactions & Tactile Feedback

Static, lifeless interfaces are strictly prohibited. Interfaces must feel responsive, snappy, and alive.

### 2.1 Interactive States
- **Buttons**:
  - Smooth transitions: `transition-all duration-150 ease-out`
  - Subtle click compression: `active:scale-[0.98]`
  - Accessible focus rings: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background`
- **Table Rows & Action Cards**:
  - Interactive row hover: `hover:bg-muted/30 transition-colors`
  - Action card hover: `hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer`
- **Pills & Status Badges**:
  - Active pulse indicator for live services:
    ```tsx
    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
    ```

### 2.2 Asynchronous Feedback & Optimistic Transitions
- **Button Loading States**:
  - Always render a rotating spinner (`RefreshCw className="h-4 w-4 animate-spin"`) and disable clicking when submitting or fetching.
- **Copy-to-Clipboard**:
  - Provide instant visual confirmation: Switch icon from `<Copy />` to `<Check className="text-emerald-400" />` with "Copied!" text for 2.5 seconds.
- **Inline Toasts / Banners**:
  - Animate entry smoothly: `animate-in fade-in slide-in-from-top-2 duration-200`.

---

## 3. High-Density Enterprise Ergonomics

Leadsy is an operational B2B CRM and SaaS platform. Layouts must maximize utility and scanability without visual clutter.

### 3.1 Data Density & Table Mastery
- **Sticky Column Headers**:
  - Use `sticky top-0 bg-muted/80 backdrop-blur-md z-10 border-b border-border/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground`.
- **Progressive Disclosure**:
  - Use tabbed navigation (`overview`, `users`, `subscription`, `modules`, `integrations`, `audit`, `danger`) for deep objects rather than infinite vertical scrolling.
- **Visual Gauge Progress Bars**:
  - For resource quotas (seats, storage, leads, AI spend):
    ```tsx
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          percent > 90 ? "bg-destructive" : percent > 75 ? "bg-amber-500" : "bg-primary"
        }`}
        style={{ width: `${percent}%` }}
      />
    </div>
    ```

---

## 4. Zero-Friction UX & Safety Engineering

### 4.1 Strict Modal & Dialogue Rules
- **Prohibited Native Dialogs**:
  - **NEVER** use `window.alert()`, `window.confirm()`, or `window.prompt()`.
  - Always use accessible modal primitives from `@/components/ui/modal` or custom Dialog components.
- **Two-Step Danger Zone**:
  - High-impact destructive actions (deleting plans, suspending workspaces, clearing databases) must feature:
    1. Warning callout with destructive color tokens (`border-destructive/30 bg-destructive/5 text-destructive`).
    2. Confirmation prompt explicitly explaining the consequence.
    3. Disabled primary button until confirmation condition is met.

### 4.2 Zero Layout Shift (CLS)
- **Skeleton Progressions**:
  - During initial data loading, always render skeleton cards and table rows with matching dimensions rather than blank containers.
- **Defensive Array Mapping**:
  - Never call `.map()` directly without array verification:
    ```tsx
    {(Array.isArray(items) ? items : []).map((item) => ( ... ))}
    ```
- **Contextual Empty States**:
  - When a table or list has 0 items, display:
    1. A relevant Lucide icon (e.g. `Inbox`, `Layers`, `Search`).
    2. Clear title (e.g. "No records found").
    3. Helpful subtitle explaining why it's empty or how to populate it.
    4. A direct Action button (e.g. "Create New", "Reset Filters").

---

## 5. Token Governance & Compliance Matrix

Always reference CSS custom properties in OKLch via Leadsy Tailwind semantic classes:

| Visual Element | Standard Class | Strictly Prohibited Pattern |
|---|---|---|
| Primary Background | `bg-background` | `bg-white dark:bg-black` |
| Card Surface | `bg-card text-card-foreground border-border/60` | `bg-neutral-900 border-zinc-700` |
| Primary Action | `bg-primary text-primary-foreground hover:bg-primary/90` | `bg-blue-600 hover:bg-blue-700` |
| Destructive Action | `bg-destructive text-destructive-foreground hover:bg-destructive/90` | `bg-red-600 hover:bg-red-700` |
| Success Badge | `border-emerald-500/30 bg-emerald-500/10 text-emerald-400` | `bg-green-100 text-green-800` |
| Warning Badge | `border-amber-500/30 bg-amber-500/10 text-amber-400` | `bg-yellow-100 text-yellow-800` |
| Subdued Text | `text-muted-foreground` | `text-gray-400 text-slate-500` |
| Code / Identifiers | `font-mono text-xs text-foreground` | default sans-serif font |

---

## 6. Pre-Flight Promax Verification Checklist

Before reporting completion or committing any UI component:
- [ ] **Typecheck Passed**: `cd frontend && npx tsc --noEmit` returns 0 errors.
- [ ] **Responsive Test**: Layout renders flawlessly on mobile (375px), tablet (768px), and desktop (1280px+).
- [ ] **Zero Hardcoded Colors**: Colors use semantically mapped tokens or design system variables.
- [ ] **Zero Native Alerts**: All confirmations use Dialogs, Modals, or inline banners.
- [ ] **Defensive Mapping**: All array `.map` calls are guarded with `Array.isArray()` fallbacks.
- [ ] **Interactive Polish**: Buttons and interactive links include hover, active compression, and focus states.
- [ ] **Loading & Empty States**: Loading skeletons and rich empty states are fully implemented.
