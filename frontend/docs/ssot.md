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
- `frontend/app/settings/users/page.tsx`
- `frontend/app/settings/ai-defaults/page.tsx`
- `frontend/app/audit-logs/page.tsx`

## Post-Refactor Cleanup Applied

- `frontend/app/industries/page.tsx` — moved create/edit/delete flows onto shared `Card`, `Button`, `Input`, `Badge`, and `Modal` primitives.
- `frontend/app/products/page.tsx` — replaced page-local form and destructive controls with shared `FilterBar`, `Card`, `Badge`, `Button`, `Input`, `Textarea`, `Select`, and `Modal`.
- `frontend/app/settings/webhooks/page.tsx` — aligned settings actions to shared cards, inputs, buttons, badges, and governed delete confirmation modal.
- `frontend/AGENTS.md` — strengthened the runtime UI governance lock with post-refactor enforcement rules.
- `AGENTS.md` — added repository-root guidance pointing contributors to the active frontend governance files.

## Notes

- Update this document when the shared UI contract changes.
- Treat any drift on the baseline pages as a regression requiring correction or explicit design-system expansion first.
