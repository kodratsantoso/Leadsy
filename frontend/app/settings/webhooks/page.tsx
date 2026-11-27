"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Canonical Webhook configuration lives in Integration Settings -> Tab Webhooks.
 */
export default function WebhooksSettingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings/integrations?tab=webhooks");
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center text-sm text-muted-foreground">
      Mengalihkan ke Webhooks...
    </div>
  );
}
