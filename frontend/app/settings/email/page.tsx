"use client";

import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { EmailIntegrationSubTab } from "@/components/settings/EmailIntegrationSubTab";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmailSettingsPage() {
  return (
    <div className="space-y-6 p-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BackToSettings />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Email & SMTP Setup</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Konfigurasi server email outbound dan inbound untuk percakapan Omnichannel.
            </p>
          </div>
        </div>

        <Link href="/settings/integrations?tab=email">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs text-brand border-brand/30 hover:bg-brand/10">
            <Sparkles className="h-3.5 w-3.5" />
            Buka di Integration Settings
            <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border border-brand/20 bg-brand/5 p-3.5 text-xs text-foreground flex items-center justify-between gap-4">
        <p className="text-muted-foreground">
          <strong>Catatan:</strong> Fitur Email & SMTP sekarang juga dapat diakses langsung dari menu{" "}
          <Link href="/settings/integrations?tab=email" className="font-semibold text-brand underline underline-offset-2">
            Integration Settings → Tab Email & SMTP
          </Link>
          .
        </p>
      </div>

      {/* Embedded Sub-Tab View */}
      <EmailIntegrationSubTab />
    </div>
  );
}
