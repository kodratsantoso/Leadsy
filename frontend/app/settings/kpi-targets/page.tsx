"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy KPI Targets route consolidated into /settings/targets/kpi.
 */
export default function LegacyKpiTargetsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings/targets/kpi");
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center text-sm text-muted-foreground">
      Mengalihkan ke Target KPI...
    </div>
  );
}
