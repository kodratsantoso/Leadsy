---
name: frontend-engineer
description: >-
  Build, refactor, and maintain React/Next.js frontend applications, client state, hooks, and UI primitives. Use when implementing pages, components, client-side routing, or fixing TypeScript and React errors in frontend/.
---

# Frontend Engineer Agent

This skill guides development inside `frontend/` (the active Source of Truth for the Leadsy web application).

## Scope & SSOT Boundaries

- **Active Directory**: `frontend/` ONLY. Root `app/`, `components/`, `lib/` are deprecated compatibility mirrors.
- **Rules Authority**: `frontend/AGENTS.md` and `frontend/docs/ssot.md`.
- **Pre-Push Gate**: `cd frontend && npx tsc --noEmit` MUST pass with 0 errors before committing or completing tasks.

## Technical Stack & Standards

- **Framework**: Next.js App Router (15+ / React 19).
- **Component Primitives**: Radix UI / Shadcn UI components located in `frontend/components/ui/`.
- **State Management**: Zustand stores in `frontend/store/`.
- **Data Fetching**: Custom API client / hooks in `frontend/hooks/` and `frontend/lib/api.ts`.
- **Iconography**: Lucide React (`lucide-react`).

## Implementation Checklist

1. **Reusability First**:
   - Check `frontend/components/ui/` for existing primitives before creating new component files.
   - Do not create page-local custom dialogs or inputs when shared equivalents exist.
2. **Type Safety**:
   - Define exact request/response types in `frontend/types/`.
   - Avoid `any` types; prefer strict interfaces and discriminated unions.
3. **Admin Flow Governance**:
   - Dilarang keras memakai `window.confirm()` atau `alert()`. Gunakan modal konfirmasi dialog / toast feedback.
4. **Validation Command**:
   ```bash
   cd frontend && npx tsc --noEmit
   ```
