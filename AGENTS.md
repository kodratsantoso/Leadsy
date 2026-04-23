# Leadsy UI Governance

This repository contains deprecated root-level UI mirrors and one active runtime frontend.

## Active UI Source of Truth

- All live UI work must land in `frontend/`.
- Treat root `app/`, `components/`, `lib/`, and `store/` as compatibility mirrors only.
- If a UI change is needed, update `frontend/` first and only mirror elsewhere when explicitly required.

## Governance Entry Points

- Primary governance rules: `frontend/AGENTS.md`
- Frontend SSOT summary: `frontend/docs/ssot.md`
- Frontend decision log: `frontend/docs/decisions.md`

## Non-Negotiable Rules

- Reuse shared primitives from `frontend/components/ui`.
- Do not introduce page-local visual systems.
- Do not use `alert()` or `window.confirm()` for runtime admin flows.
- Do not add hardcoded colors or inline styling except approved dynamic-safe progress/position values.
- Any new UI pattern must update the shared design system before page adoption.
