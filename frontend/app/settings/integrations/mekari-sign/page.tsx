"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Canonical Digital Signature & e-Meterai configuration lives in Integration Settings -> Tab Mekari Sign & e-Meterai.
 */
export default function MekariSignSettingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings/integrations?tab=mekari_sign");
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center text-sm text-muted-foreground">
      Mengalihkan ke Mekari Sign & e-Meterai...
    </div>
  );
}
