---
name: ui-ux-designer
description: >-
  Design and refine UI/UX experiences, component aesthetics, responsive layouts, design tokens, micro-interactions, and accessibility. Use when creating new pages, styling components, improving aesthetics, or ensuring compliance with DESIGN_SYSTEM.md.
---

# UI/UX Designer Agent

This skill enforces high-end aesthetic standards, modern interaction design, and strict compliance with the **Leadsy Design System** (`DESIGN_SYSTEM.md`).

## Core Principles

1. **Premium & High Polish**:
   - Modern typography using Inter (`font-sans`).
   - OKLch semantic color tokens only (Never use raw static Tailwind colors like `text-emerald-500`).
   - Subtle borders (`border-border`), soft shadows, and clean backdrop blur/glassmorphism where appropriate.
2. **Micro-interactions & Motion**:
   - Smooth hover transitions (`transition-colors duration-150`, `transition-all duration-200`).
   - Active and focus rings using `--ring` (`ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`).
   - Tactile interactive states for buttons, cards, and list items.
3. **Responsive Hierarchy**:
   - Clear visual rhythm: Page title (`text-xl font-semibold`), section heading (`text-base font-semibold`), body text (`text-sm`).
   - Standard input/button heights: `h-9` (36px) standard, `h-8` (32px) compact.
   - Consistent container padding across mobile, tablet, and desktop breakpoints.
4. **Governance Compliance**:
   - Reference: `DESIGN_SYSTEM.md` and `frontend/AGENTS.md`.
   - Never use `alert()` or `window.confirm()`. Always use Dialog/Sheet/Toast primitives from `frontend/components/ui/`.
   - Never add inline styles or hardcoded hex colors unless dynamic progress values.

## Design Token Reference Checklist

| Purpose | Correct Token Class / Variable | Prohibited Pattern |
|---|---|---|
| Primary Brand | `bg-primary text-primary-foreground` | `bg-indigo-600` |
| Surface / Card | `bg-card text-card-foreground border-border` | `bg-white dark:bg-black` |
| Muted Details | `text-muted-foreground` | `text-gray-400` |
| Status Success | `text-[var(--status-success)] bg-[var(--status-success-bg)]` | `text-green-500` |
| Status Warning | `text-[var(--status-warning)] bg-[var(--status-warning-bg)]` | `text-yellow-500` |
| Status Danger | `text-[var(--status-danger)] bg-[var(--status-danger-bg)]` | `text-red-500` |

## UX Guidelines

- **Zero Layout Shifts**: Always render skeletons (`Skeleton` component) or spinners during asynchronous data fetching.
- **Empty States**: Every table, list, or grid must have an informative empty state illustration/icon, concise message, and primary call-to-action button.
- **Form UX**: Clear validation error states displayed inline below the input, accessible labels with `htmlFor`, and disabled button state with spinner when submitting.
