# Leadsy Design System — Frozen Reference

> **AUTHORITY:** This document is the single source of truth for all UI styling.
> No component may use colors, spacing, or patterns not defined here.
> Any new pattern must be added here **and** to `lib/design.ts` / `app/globals.css` before use.

---

## 1. Typography

**Font Family:** Inter (variable font via `next/font/google`)
- `--font-sans` / `--font-heading` → Inter, system-ui fallback stack
- Applied globally on `<html>` via `@apply font-sans`

| Role            | Class                        | Size  | Weight |
|-----------------|------------------------------|-------|--------|
| Page title      | `text-xl font-semibold`      | 20px  | 600    |
| Section heading | `text-base font-semibold`    | 16px  | 600    |
| Card heading    | `text-sm font-semibold`      | 14px  | 600    |
| Body / default  | `text-sm`                    | 14px  | 400    |
| Label / caption | `text-xs font-medium`        | 12px  | 500    |
| Micro / badge   | `text-xs font-semibold`      | 12px  | 600    |
| Muted text      | `text-sm text-muted-foreground` | 14px | 400  |

**Line heights:** `leading-tight` (1.25) for headings · `leading-normal` (1.5) for body  
**Letter spacing:** `tracking-wide` only for uppercase table headers (`uppercase tracking-wide`)

---

## 2. Color Tokens

All colors are CSS custom properties in OKLch color space. Never use Tailwind static color classes (e.g. `text-emerald-500`) — use semantic tokens only.

### 2.1 Brand

| Token             | Light                                  | Dark                                   | Hex equiv  |
|-------------------|----------------------------------------|----------------------------------------|------------|
| `--brand`         | `oklch(0.585 0.233 264.376)`           | `oklch(0.673 0.182 264.376)`           | #6366F1 / #818CF8 |
| `--brand-hover`   | `oklch(0.511 0.262 276.966)`           | `oklch(0.585 0.233 264.376)`           | #4F46E5    |
| `--brand-light`   | `oklch(0.673 0.182 264.376)`           | `oklch(0.752 0.128 264.376)`           | #818CF8    |
| `--brand-foreground` | `oklch(1 0 0)`                      | `oklch(1 0 0)`                         | white      |

### 2.2 Surface

| Token              | Light                    | Dark                     |
|--------------------|--------------------------|--------------------------|
| `--background`     | `oklch(1 0 0)`           | `oklch(0.145 0 0)`       |
| `--foreground`     | `oklch(0.145 0 0)`       | `oklch(0.985 0 0)`       |
| `--card`           | `oklch(1 0 0)`           | `oklch(0.205 0 0)`       |
| `--card-foreground`| `oklch(0.145 0 0)`       | `oklch(0.985 0 0)`       |
| `--popover`        | `oklch(1 0 0)`           | `oklch(0.205 0 0)`       |
| `--muted`          | `oklch(0.97 0 0)`        | `oklch(0.269 0 0)`       |
| `--muted-foreground`| `oklch(0.556 0 0)`      | `oklch(0.708 0 0)`       |
| `--accent`         | `oklch(0.97 0 0)`        | `oklch(0.269 0 0)`       |
| `--border`         | `oklch(0.922 0 0)`       | `oklch(1 0 0 / 10%)`     |
| `--input`          | `oklch(0.922 0 0)`       | `oklch(1 0 0 / 15%)`     |
| `--ring`           | `oklch(0.585 0.233 264.376 / 50%)` | `oklch(0.673 0.182 264.376 / 50%)` |

### 2.3 Semantic Status

| Name      | Token                 | BG Token                  | Border Token                  |
|-----------|-----------------------|---------------------------|-------------------------------|
| Success   | `--status-success`    | `--status-success-bg`     | `--status-success-border`     |
| Warning   | `--status-warning`    | `--status-warning-bg`     | `--status-warning-border`     |
| Danger    | `--status-danger`     | `--status-danger-bg`      | `--status-danger-border`      |
| Info      | `--status-info`       | `--status-info-bg`        | —                             |
| Neutral   | `--status-neutral`    | `--status-neutral-bg`     | —                             |

Usage in Tailwind: `text-[var(--status-success)]` · `bg-[var(--status-success-bg)]`

### 2.4 Sidebar

`--sidebar` · `--sidebar-foreground` · `--sidebar-primary` · `--sidebar-primary-foreground`  
`--sidebar-accent` · `--sidebar-accent-foreground` · `--sidebar-border` · `--sidebar-ring`

### 2.5 Charts (in order)

`--chart-1` indigo · `--chart-2` emerald · `--chart-3` amber · `--chart-4` blue · `--chart-5` red

---

## 3. Spacing System

Base unit: **4px** (Tailwind default — `1` = 4px).

| Scale | px   | Common use                         |
|-------|------|------------------------------------|
| 0.5   | 2px  | Micro gaps, badge padding-y        |
| 1     | 4px  | Tight icon gaps                    |
| 1.5   | 6px  | Label margin-bottom                |
| 2     | 8px  | Badge padding-x, small gaps        |
| 3     | 12px | Button padding-x (compact)         |
| 4     | 16px | Card padding, input px             |
| 5     | 20px | Modal sm padding                   |
| 6     | 24px | Modal md/lg padding, section gaps  |
| 8     | 32px | Large section separation           |
| 10    | 40px | Page-level vertical rhythm         |
| 12    | 48px | Hero spacing                       |

**Input/button heights:** `h-9` (36px) for standard · `h-8` (32px) for compact

---

## 4. Border Radius

Base: `--radius: 0.625rem` (10px)

| Token        | Computed         | px   | Use                              |
|--------------|------------------|------|----------------------------------|
| `--radius-sm`| `× 0.6` = 0.375rem | 6px | Badges, chips, small tags      |
| `--radius-md`| `× 0.8` = 0.5rem   | 8px | Inputs, selects, buttons       |
| `--radius-lg`| `× 1.0` = 0.625rem |10px | Cards, dropdowns, popovers     |
| `--radius-xl`| `× 1.4` = 0.875rem |14px | Large cards, modals            |
| `--radius-2xl`| `× 1.8` = 1.125rem|18px | Sheet panels                   |
| `--radius-3xl`| `× 2.2` = 1.375rem|22px | Full-bleed containers          |
| `--radius-4xl`| `× 2.6` = 1.625rem|26px | Hero elements                  |
| `rounded-full` | 9999px          | —   | Avatars, pills, score bars     |

**In practice:** `rounded-lg` (cards) · `rounded-xl` (modals, section cards) · `rounded-full` (badges, avatars)

---

## 5. Component Standards

All component classes are defined in `app/globals.css` (`@layer components`) and exported as constants from `lib/design.ts`.

### 5.1 Button

```tsx
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/design";

// Primary — brand gradient, white text
<button className={BTN_PRIMARY}>Save</button>
// → "btn-brand flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium shadow-sm transition-all"

// Secondary — outlined, muted text
<button className={BTN_SECONDARY}>Cancel</button>
// → "flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
```

**Rules:**
- Primary: always `btn-brand` (gradient). No other background on a primary action.
- Secondary: always `border-border bg-card`. No ghost/link buttons in data tables.
- Icon-only buttons: add `p-2` instead of `px-3 py-2`, remove gap.
- Disabled state: `opacity-50 cursor-not-allowed pointer-events-none`.
- Loading state: replace icon with `<Loader2 className="animate-spin" />`.

### 5.2 Card

```tsx
import { CARD_INTERACTIVE, SECTION_CARD } from "@/lib/design";

// Static section card
<div className={SECTION_CARD}>...</div>
// → "rounded-xl border border-border bg-card shadow-sm"

// Clickable/interactive card
<div className={CARD_INTERACTIVE}>...</div>
// → "card-interactive rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md"
// hover adds brand-tinted border via .card-interactive:hover in globals.css
```

**Rules:**
- All cards use `bg-card`, never `bg-background` or raw white.
- Padding: `p-5` (compact) · `p-6` (standard). Always consistent per page.
- No box-shadow escalation beyond `shadow-md` on hover.
- No colored card backgrounds except for stat/KPI cards (use `style={{ background: "linear-gradient(...)" }}`).

### 5.3 Input

```tsx
import { INPUT_CLASS, SELECT_CLASS, TEXTAREA_CLASS, LABEL_CLASS, FIELD_CLASS } from "@/lib/design";

// Text input
<input className={INPUT_CLASS} />
// → "h-9 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"

// Select
<select className={SELECT_CLASS} />

// Textarea
<textarea className={TEXTAREA_CLASS} rows={3} />

// Label
<label className={LABEL_CLASS}>Field Name</label>

// Field wrapper
<div className={FIELD_CLASS}>
  <label className={LABEL_CLASS}>Email</label>
  <input className={INPUT_CLASS} />
</div>
```

**Rules:**
- Height: always `h-9` for single-line inputs and selects.
- Focus: `focus:ring-2 focus:ring-ring` — never custom focus colors.
- Error state: add `border-destructive focus:ring-destructive/50`.
- No `outline` on inputs — handled globally via `@apply outline-ring/50`.

### 5.4 Table

```html
<!-- Structure -->
<div class="TABLE_WRAPPER">          <!-- overflow + border + bg -->
  <table class="table-root">
    <thead class="table-header">
      <tr>
        <th class="table-header-cell">Name</th>
        <th class="table-header-cell-right">Score</th>
      </tr>
    </thead>
    <tbody>
      <tr class="table-row">
        <td class="table-cell">Acme Corp</td>
        <td class="table-cell-muted table-cell-right">87</td>
      </tr>
    </tbody>
  </table>
</div>
```

```tsx
import { TABLE_WRAPPER } from "@/lib/design";
// CSS classes: table-root, table-header, table-header-cell, table-header-cell-right,
//              table-row, table-cell, table-cell-muted, table-cell-right
```

**Rules:**
- Always wrap in `TABLE_WRAPPER` for overflow scroll on mobile.
- Header cells always uppercase + `tracking-wide`.
- No `bg-gray-*` on rows — use only `hover:bg-muted/30` via `.table-row`.
- Empty state: full-width `<td colSpan={n}>` with `py-16 text-center text-muted-foreground`.
- Pagination lives outside the table wrapper, below it.

### 5.5 Modal

```tsx
import { MODAL } from "@/lib/design";

// Controlled by state + conditional render (no Dialog primitive required)
{open && (
  <div className={MODAL.overlay} onClick={onClose}>
    <div className={MODAL.md} onClick={e => e.stopPropagation()}>

      <div className={MODAL.header}>
        <div>
          <h2 className={MODAL.title}>Edit Lead</h2>
          <p className={MODAL.description}>Update the lead details below.</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>
      </div>

      <div className={MODAL.body}>
        {/* form fields */}
      </div>

      <div className={MODAL.footer}>
        <button className={BTN_SECONDARY} onClick={onClose}>Cancel</button>
        <button className={BTN_PRIMARY} onClick={onSave}>Save</button>
      </div>

    </div>
  </div>
)}
```

**Sizes:** `MODAL.sm` (max-w-sm) · `MODAL.md` (max-w-lg) · `MODAL.lg` (max-w-2xl) · `MODAL.xl` (max-w-4xl)

**Rules:**
- Overlay: always `bg-black/60 backdrop-blur-sm`. No other overlay.
- Click outside closes the modal (`onClick` on overlay, `stopPropagation` on content).
- Close button: top-right, `<X size={16} />`, muted → foreground on hover.
- Footer: right-aligned, Cancel (secondary) left of Save (primary).
- No scrolling content inside modal — use `modal-lg` or `modal-xl` for complex forms.

---

## 6. Badge / Status System

```tsx
import { QUALIFICATION_BADGE, ACTION_BADGE, HEALTH_BADGE } from "@/lib/design";

<span className={QUALIFICATION_BADGE["eligible"]}>Eligible</span>
<span className={ACTION_BADGE["created"]}>Created</span>
<span className={HEALTH_BADGE["healthy"]}>Healthy</span>
```

| Class            | Background              | Text color            |
|------------------|-------------------------|-----------------------|
| `badge-success`  | `--status-success-bg`   | `--status-success`    |
| `badge-warning`  | `--status-warning-bg`   | `--status-warning`    |
| `badge-danger`   | `--status-danger-bg`    | `--status-danger`     |
| `badge-info`     | `--status-info-bg`      | `--status-info`       |
| `badge-neutral`  | `--status-neutral-bg`   | `--status-neutral`    |
| `badge-brand`    | `--brand`               | `--brand-foreground`  |
| `badge-brand-soft`| 12% brand tint         | `--brand`             |

---

## 7. Rules Summary (Non-Negotiable)

1. **No hardcoded colors.** Never use `text-emerald-500`, `bg-blue-100`, `border-red-300`, etc.
2. **No inline hex/rgb.** Inline `style` may only reference CSS variables (`var(--brand)`) or computed gradients using CSS variables.
3. **No new CSS classes** outside `app/globals.css @layer components`.
4. **No new design constants** outside `lib/design.ts`.
5. **Token before utility.** If a semantic token covers the case, use the token. Only fall back to Tailwind utilities for layout/spacing.
6. **Both themes must work.** Every component must be tested in both light and dark mode — CSS variables handle this automatically if rules 1–2 are followed.
7. **`lib/design.ts` is the component API.** Import constants from there; do not re-derive class strings inline.
