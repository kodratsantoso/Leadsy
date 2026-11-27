"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy Digital Signature route consolidated into Integration Settings -> Tab Mekari Sign & e-Meterai.
 */
export default function DigitalSignatureSettingsRedirectPage() {
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
