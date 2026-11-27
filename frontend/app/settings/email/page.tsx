"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Canonical Email & SMTP configuration lives in Integration Settings -> Tab Email & SMTP.
 */
export default function EmailSettingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings/integrations?tab=email");
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center text-sm text-muted-foreground">
      Mengalihkan ke Email & SMTP...
    </div>
  );
}
