# UI/UX Spec: Deleted Leads Table with Retention Countdown

## 1. Intent
- **User / role**: Sales Admin, Super Admin, Presales Lead.
- **Job to be done**: View and audit soft-deleted leads, track remaining retention days before permanent deletion, restore accidentally deleted records back into the active pipeline, or force delete/purge expired records.
- **Primary success outcome**: A dedicated, responsive table view of deleted leads with exact retention countdowns (days/hours remaining), status badges (In Retention, Expiring Soon, Expired), source provenance, individual/batch restore, and safe force delete mechanisms.
- **Out of scope**: Modifying lead properties (company info, contacts) while inside the trash view (leads must be restored before editing).

## 2. Route hierarchy
| Route | Page / layout | Auth / Permission | Notes |
|-------|---------------|-------------------|-------|
| `/leads` | `app/leads/page.tsx` | Authenticated (`leads.view`) | Active pipeline; header includes "Deleted Leads / Trash" badge button |
| `/leads/trash` | `app/leads/trash/page.tsx` | Authenticated (`leads.view`) | Dedicated Deleted Leads & Retention management table |

## 3. Component tree
- `AppShell`
  - `/leads/trash` (`DeletedLeadsPage`)
    - `BreadcrumbNavigation` (Link back to `/leads`)
    - `PageHeader` (Title, description, retention policy explanation)
    - `RetentionStatsOverview` (KPI Cards: Total Deleted, Active in Retention, Expiring Soon, Expired, Retention Period Selector [30d, 60d, 90d, 180d])
    - `FilterBar`
      - `FilterBarSearch` (Company name, phone, email)
      - `RetentionStatusSelect` (All, Active, Expiring Soon <= 14d, Expired)
      - `SourceTypeSelect` (All sources, Lark Base, Google Maps, Website, Manual, etc.)
      - `RetentionPeriodSelect` (30 days, 60 days, 90 days [default], 180 days)
      - `PurgeExpiredButton` (triggers confirmation dialog to purge expired leads)
    - `TableShell`
      - `TableHead` (Select All checkbox, Company Name, Original Source, Deleted Date, Retention Remaining, Purge Date, Actions)
      - `TableBody`
        - `LoadingSkeleton` (6 rows with animated pulse)
        - `EmptyState` (Clean trash illustration when 0 leads found)
        - `ErrorState` (Alert with retry button)
        - `HydratedRows` (Lead record rows with retention badges and action triggers)
    - `BulkActionBar` (Floating or sticky action bar when 1+ rows selected: Restore Selected, Force Delete Selected)
    - `PaginationControls` (Page size 25/50/100, previous/next, current range)
    - `ConfirmationModals`
      - `RestoreModal` (Confirm single / batch restore)
      - `ForceDeleteModal` (Destructive action confirmation, highlights that data cannot be recovered)
      - `PurgeExpiredModal` (Destructive purge of all expired records)

## 4. API integration contracts
| UI action | Method + path | Request | Response (success) | Error mapping |
|-----------|---------------|---------|--------------------|---------------|
| Fetch deleted leads | `GET /api/leads/trash` | Query: `search`, `retention_status`, `source_type`, `retention_days`, `page`, `per_page` | `{ data: Lead[], meta: PaginationMeta, summary: RetentionSummary }` | 401/403/500 → Display error alert with retry button |
| Restore single lead | `POST /api/leads/{id}/restore` | Empty body | `{ message: string, lead: Lead }` | 403 → "Forbidden", 404 → "Lead not found" |
| Batch restore leads | `POST /api/leads/batch-restore` | `{ ids: number[] }` | `{ message: string, restored_count: number }` | 422 → "Validation failed", 403 → "Superadmin required" |
| Force delete single lead | `DELETE /api/leads/{id}/force-delete` | Empty body | `{ message: string }` | 403 → "Forbidden", 404 → "Lead not found" |
| Batch force delete leads | `POST /api/leads/batch-force-delete` | `{ ids: number[] }` | `{ message: string, deleted_count: number }` | 403 → "Superadmin required" |
| Purge all expired leads | `POST /api/leads/purge-expired` | `{ retention_days: number }` | `{ message: string, purged_count: number }` | 403 → "Superadmin required" |

## 5. UI state matrix (mandatory)
| Surface / component | Empty | Loading (Skeleton) | Error (Toast/Alert) | Success (Hydrated) |
|---------------------|-------|--------------------|---------------------|--------------------|
| **Stats KPI Cards** | Value displays `0` | Card skeleton pulse | Grayed out with retry icon | Formatted counts with colored indicator dots |
| **Deleted Leads Table** | `TableEmpty` with trash icon & "Tidak ada lead di keranjang sampah" | 6-row `TableSkeleton` with shimmer on all columns | Red alert card with error details & "Coba Lagi" button | Data rows with company, source tag, formatted dates, countdown badge, and action buttons |
| **Retention Badge** | N/A | Gray pill skeleton | N/A | Green (Active > 14d), Yellow (Expiring Soon <= 14d), Red (Expired <= 0d) |
| **Bulk Actions** | Hidden when `selectedLeads.length === 0` | Disabled spinner on pending mutate | Toast notification with API error | Toast success + auto deselect + query cache invalidation |
| **Restore Action** | N/A | Spinner icon inside button | Toast error message | Lead disappears from trash table, toast: "Lead berhasil dipulihkan" |
| **Force Delete Action** | N/A | Spinner icon inside confirm button | Toast error message | Lead permanently deleted, toast: "Lead dihapus permanen" |

## 6. Accessibility (WCAG 2.1 AA)
- **Keyboard path**: Full Tab and Shift-Tab traversal across search, filter dropdowns, table checkboxes, row action buttons, and modal dialogs.
- **Focus order**: Navigation → Breadcrumbs → Filter controls → Table head select-all → Row items → Modals trap focus when open with `Esc` to close.
- **Labels / names**: Every checkbox has `aria-label` describing the specific lead (`Pilih lead ${company_name}`). Action buttons have clear text and accessible SVG titles.
- **Contrast notes**: High contrast status badges (emerald-700/amber-700/rose-700 on light, emerald-400/amber-400/rose-400 on dark).
- **Reduced motion**: Standard `transition-colors` without aggressive layout transforms; loaders use accessible SVG spins.

## 7. Responsive breakpoints
| Breakpoint | Width | Layout behavior |
|------------|-------|-----------------|
| Mobile | < 768px | Single column KPI cards; horizontal scroll on table with sticky action column; compact filter bar |
| Tablet | 768–1023px | 2-column KPI grid; table with scrollable data and full action buttons |
| Desktop | ≥ 1024px | 4-column KPI grid; full width table shell with complete timestamp, countdown badges, and dropdown actions |

## 8. Color mode
- **Light**: Background `bg-background`, borders `border-border`, cards `bg-card`, muted text `text-muted-foreground`.
- **Dark**: Fully dark mode compliant via Tailwind CSS variables and OKLCH color system.
- **System preference strategy**: Inherits from existing `useTheme()` / `ThemeToggle` context.
- **Token mapping**: Reuses existing shadcn/ui and Leadsy design tokens (`--brand`, `--destructive`, `--card`, `--border`).

## 9. Design-system stack
- Tailwind CSS + accessible primitives (Radix UI / shadcn/ui components already in `/components/ui/`).
- Existing components reused: `Card`, `TableShell`, `Button`, `Badge`, `Input`, `Select`, `Modal`, `FilterBar`.

## 10. Acceptance criteria
- [x] State matrix implemented for every interactive surface (Empty, Loading, Error, Success).
- [x] Retention countdown computed dynamically based on `deleted_at` and configured `retention_days`.
- [x] Single and batch restore capability tested and verified.
- [x] Single and batch force delete capability protected with confirmation modals.
- [x] Accessible navigation between `/leads` and `/leads/trash`.
