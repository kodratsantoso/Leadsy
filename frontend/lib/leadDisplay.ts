/**
 * Shared presentation helpers for lead status, grade and ICP fit.
 *
 * These were defined separately in the lead detail page and the leads list,
 * and the two copies had drifted: the list's qualificationVariant did not
 * handle 'disqualified', so the same lead showed a neutral badge in the table
 * and a danger badge on its own page. This module is the single definition.
 */

export type BadgeTone = "success" | "warning" | "danger" | "neutral" | "outline";

export function gradeVariant(grade?: string | null): BadgeTone {
  const normalized = grade?.toLowerCase();
  if (normalized === "hot") return "success";
  if (normalized === "warm") return "warning";
  return "neutral";
}

export function scoreVariant(score?: number | null): BadgeTone {
  if ((score ?? 0) >= 80) return "success";
  if ((score ?? 0) >= 60) return "warning";
  return "neutral";
}

export function qualificationVariant(status?: string | null): BadgeTone {
  if (status === "eligible") return "success";
  if (status === "potential") return "warning";
  if (status === "not_eligible" || status === "disqualified") return "danger";
  return "outline";
}

export function formatQualificationStatus(status?: string | null): string {
  if (!status || status === "pending" || status === "unassessed") return "Unassessed";
  if (status === "eligible") return "Eligible";
  if (status === "potential") return "Potential";
  if (status === "not_eligible") return "Not Eligible";
  if (status === "disqualified") return "Disqualified";
  return status.replace(/_/g, " ");
}

export function icpVariant(status?: string | null): BadgeTone {
  if (status === "strong_match") return "success";
  if (status === "partial_match") return "warning";
  if (status === "weak_match") return "neutral";
  return "outline";
}

export function icpLabel(status?: string | null): string {
  if (status === "strong_match") return "Strong match";
  if (status === "partial_match") return "Partial match";
  if (status === "weak_match") return "Weak match";
  return "Not evaluated";
}

export function clampPercent(value?: number | null): number {
  return Math.max(0, Math.min(100, value ?? 0));
}
