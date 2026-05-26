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

## Release Checklist for Improvements

For every **major improvement**, always complete the release hygiene tasks before closing the work:

- Update all relevant documentation for specification, task tracking, implementation notes, README files, and affected modules.
- Refresh the deploy database migration/snapshot files so a fresh deploy carries the current database structure and records.
- Push to both GitHub repositories already configured for this project: Production and Backup.
- Summarize completed improvements in a `What's New` context in the README.
- Update application version metadata according to the improvement scope.

For every **small improvement**, always push the completed change to both GitHub repositories already configured for this project: Production and Backup.
