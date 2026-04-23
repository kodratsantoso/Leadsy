/**
 * Leadsy Design System — Canonical semantic class utilities.
 *
 * FROZEN — this is the single source of truth for all UI styling.
 * Do NOT hardcode Tailwind color classes (e.g. text-emerald-500) anywhere.
 * Do NOT define component styles outside globals.css or this file.
 * Any new pattern must be added here and to DESIGN_SYSTEM.md first.
 */

const BASE_BADGE = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold";

/** Qualification / lead status badges */
export const QUALIFICATION_BADGE: Record<string, string> = {
  eligible:     `${BASE_BADGE} badge-success`,
  potential:    `${BASE_BADGE} badge-warning`,
  not_eligible: `${BASE_BADGE} badge-danger`,
  pending:      `${BASE_BADGE} badge-neutral`,
};

/** Audit-log action badges */
export const ACTION_BADGE: Record<string, string> = {
  created:       `${BASE_BADGE} badge-success`,
  updated:       `${BASE_BADGE} badge-info`,
  deleted:       `${BASE_BADGE} badge-danger`,
  login:         `${BASE_BADGE} badge-brand-soft`,
  login_failed:  `${BASE_BADGE} badge-danger`,
  logout:        `${BASE_BADGE} badge-neutral`,
  access_denied: `${BASE_BADGE} badge-warning`,
  export:        `${BASE_BADGE} badge-warning`,
};

/** Pipeline health badge classes */
export const HEALTH_BADGE: Record<string, string> = {
  healthy:  `${BASE_BADGE} badge-success border border-[var(--status-success-border)]`,
  warning:  `${BASE_BADGE} badge-warning border border-[var(--status-warning-border)]`,
  critical: `${BASE_BADGE} badge-danger border border-[var(--status-danger-border)]`,
};

/** Score meter fill colors (CSS var inline-style values) */
export function scoreMeterColor(health?: string): string {
  if (health === "healthy") return "var(--status-success)";
  if (health === "warning")  return "var(--status-warning)";
  return "var(--status-danger)";
}

/** Score band colors for hot/warm/cold */
export const SCORE_BAND = {
  hot:  "text-[var(--status-danger)]",
  warm: "text-[var(--status-warning)]",
  cold: "text-[var(--status-info)]",
};

/** Avatar gradient class (CSS component defined in globals.css) */
export const AVATAR_CLASS = "avatar-brand";

/** Primary action button class */
export const BTN_PRIMARY = "btn-brand flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium shadow-sm transition-all";
export const BTN_SECONDARY = "flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors";

/** Card with interactive hover */
export const CARD_INTERACTIVE = "card-interactive rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md";

/** Filter banner */
export const FILTER_BANNER = "filter-banner flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-medium";

/** Standard input class */
export const INPUT_CLASS = "h-9 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

/** Standard select class */
export const SELECT_CLASS = `${INPUT_CLASS} text-muted-foreground`;

/** Textarea class (multiline input) */
export const TEXTAREA_CLASS = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none";

/** Form label */
export const LABEL_CLASS = "block text-xs font-medium text-muted-foreground mb-1.5";

/** Form field wrapper */
export const FIELD_CLASS = "space-y-1.5";

// ── Table ────────────────────────────────────────────────────────
/** Full-width table wrapper (overflow container) */
export const TABLE_WRAPPER = "w-full overflow-x-auto rounded-xl border border-border bg-card shadow-sm";

// ── Modal ────────────────────────────────────────────────────────
/** Modal size variants — combine with modal-content */
export const MODAL = {
  overlay:     "modal-overlay",
  content:     "modal-content",
  sm:          "modal-content modal-sm",
  md:          "modal-content modal-md",
  lg:          "modal-content modal-lg",
  xl:          "modal-content modal-xl",
  header:      "modal-header",
  title:       "modal-title",
  description: "modal-description",
  body:        "modal-body",
  footer:      "modal-footer",
} as const;

// ── Page layout ──────────────────────────────────────────────────
export const PAGE_HEADER  = "page-header";
export const PAGE_TITLE   = "page-title";
export const SECTION_CARD = "section-card";
