# UI Governance Rules

This file is the UI governance reference for the active runtime frontend in `frontend/`.

## Scope

These rules apply to all UI work under:

- `frontend/app`
- `frontend/components`
- `frontend/lib` when it affects UI rendering

## Mandatory Rules

1. No new UI without updating the design system
- If a new visual pattern is introduced, the shared UI system must be updated first.
- New patterns must be added to `frontend/components/ui` or to shared theme tokens in `frontend/app/globals.css`.
- Page-local styling is not an acceptable substitute for a missing shared primitive.

2. Must reuse existing components
- Always use existing shared primitives before creating anything new.
- Required shared foundation:
  - `frontend/components/ui/button.tsx`
  - `frontend/components/ui/input.tsx`
  - `frontend/components/ui/select.tsx`
  - `frontend/components/ui/badge.tsx`
  - `frontend/components/ui/card.tsx`
  - `frontend/components/ui/modal.tsx`
  - `frontend/components/ui/tabs.tsx`
  - `frontend/components/ui/filter-bar.tsx`
  - `frontend/components/ui/table.tsx`
- Admin pages must reuse the same table, filter, modal, badge, and action patterns.

3. No inline styling
- Do not use `style={{ ... }}` for UI styling.
- Do not use inline color, spacing, border, shadow, or typography declarations.
- If a dynamic visual state is needed, express it through shared classes, variants, or design tokens.
- Approved dynamic-safe exceptions are limited to values that cannot be represented statically:
  - progress widths
  - chart bar widths
  - positional stacking such as map marker `z-index`
- Even in those cases, colors must still come from tokens.

4. No hardcoded values
- Do not hardcode colors such as hex values, raw RGB, or one-off Tailwind color utilities for runtime UI.
- Do not hardcode new spacing systems, radius systems, or typography scales in page files.
- Do not hardcode repeated status colors or button treatments in page files.
- Use tokens from `frontend/app/globals.css` and shared component variants.

## Design Token Enforcement

- All runtime UI colors must come from theme tokens in `frontend/app/globals.css`.
- Shared semantic tokens are the source of truth for:
  - brand
  - success
  - warning
  - danger
  - info
  - surfaces
  - charts
- If a new token is needed, add it in `frontend/app/globals.css` first.

## Component Standards

- Buttons must use `Button`.
- Text inputs must use `Input`.
- Textareas must use `Textarea`.
- Selects must use `Select`.
- Status indicators must use `Badge`.
- Containers and admin sections must use `Card`.
- Dialogs and confirmations must use `Modal`.
- Section switching must use `Tabs`.
- Admin filtering rows must use `FilterBar`.
- Admin tabular layouts must use `Table` primitives.

## Prohibited Patterns

- `alert()`
- `window.confirm()`
- page-local button style constants as a substitute for shared components
- page-local modal systems
- page-local table systems
- hardcoded gradient identity for runtime admin UI unless first added to the design system
- light-only or dark-only hardcoded backgrounds in runtime UI
- page-local destructive confirmation flows outside `Modal`
- page-local search/filter shells when `FilterBar` already fits

## Change Process

Before merging any UI change:

1. Check whether an existing shared primitive already solves it.
2. If not, update the shared design system first.
3. Refactor the consuming page to use the shared primitive.
4. Verify both light and dark themes.
5. **MANDATORY**: Run a TypeScript check and fix ANY errors before pushing:
- `cd frontend && npx tsc --noEmit`

## Enforcement Standard

- A UI change is incomplete if it introduces a new visual pattern without updating the design system.
- A UI change is incomplete if it bypasses shared primitives.
- A UI change is incomplete if it adds inline styling or hardcoded runtime values.
- A UI change is incomplete if it reintroduces page-specific buttons, modals, or destructive confirms where shared primitives already exist.

## Post-Refactor Lock

- Dashboard, Leads, Map, Settings, Users, AI Default, and Audit Logs are the benchmark pages for UI consistency.
- Maps and AI settings must use the same card, badge, button, and feedback language as the rest of the platform.
- Any future deviation found on those pages must be treated as a regression, not a stylistic preference.

## Source of Truth

For runtime UI, this file and the shared primitives in `frontend/components/ui` are the only allowed reference point for styling decisions.
