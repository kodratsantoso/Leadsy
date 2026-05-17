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
- `frontend/app/audit-logs/page.tsx`

## Post-Refactor Cleanup Applied

- `frontend/app/industries/page.tsx` — moved create/edit/delete flows onto shared `Card`, `Button`, `Input`, `Badge`, and `Modal` primitives.
- `frontend/app/products/page.tsx` — replaced page-local form and destructive controls with shared `FilterBar`, `Card`, `Badge`, `Button`, `Input`, `Textarea`, `Select`, and `Modal`.
- `frontend/app/settings/webhooks/page.tsx` — aligned settings actions to shared cards, inputs, buttons, badges, and governed delete confirmation modal.
- `frontend/app/settings/lead-sources/page.tsx` — added DB-backed lead source taxonomy management using shared settings primitives.
- `frontend/app/settings/lead-channels/page.tsx` — added DB-backed channel type management scoped to lead sources.
- `frontend/app/leads/page.tsx` — now consumes lead source and channel type master data for create/edit classification, table display, and filters.
- `frontend/app/leads/page.tsx` — displays estimated and realized closing amounts and lets admins maintain both values from lead create/edit modals.
- `frontend/app/settings/currency/page.tsx` — added DB-backed currency and number separator settings with live preview.
- `frontend/lib/hooks/use-number-format.ts` — added the shared number/currency display contract used by operational pages.
- `frontend/AGENTS.md` — strengthened the runtime UI governance lock with post-refactor enforcement rules.
- `AGENTS.md` — added repository-root guidance pointing contributors to the active frontend governance files.

## Notes

- Update this document when the shared UI contract changes.
- Treat any drift on the baseline pages as a regression requiring correction or explicit design-system expansion first.
