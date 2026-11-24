import { redirect } from "next/navigation";

/**
 * Legacy KPI Targets route consolidated into /settings/targets/kpi.
 */
export default function LegacyKpiTargetsRedirectPage() {
  redirect("/settings/targets/kpi");
}
