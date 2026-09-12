"use client";
import { Shield } from "lucide-react";

import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { TwoFactorAuthSettings } from "@/app/settings/_components/TwoFactorAuthSettings";
import { ChangePasswordSettings } from "@/app/settings/_components/ChangePasswordSettings";
import { SessionSecuritySettings } from "@/app/settings/_components/SessionSecuritySettings";
import { useAuthStore } from "@/store/useAuthStore";
import { getUserPermissionNames } from "@/lib/permissions";

export default function SecurityPage() {
  const user = useAuthStore(s => s.user);
  const isSuperAdmin = user?.role?.name === "super_admin";
  const canManageSecurityPolicy = isSuperAdmin || getUserPermissionNames(user).includes("integrations.manage");

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <BackToSettings />
        <div><h1 className="text-2xl font-bold tracking-tight">Security</h1><p className="text-sm text-muted-foreground">Authentication and session policies — BRD §6.1</p></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ChangePasswordSettings />
        <TwoFactorAuthSettings />

        {canManageSecurityPolicy && <SessionSecuritySettings />}

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3"><Shield className="h-4 w-4 text-emerald-500" /><h3 className="text-sm font-semibold">Data Encryption</h3></div>
          <p className="text-xs text-muted-foreground">TLS/HTTPS enforced for all API traffic. Sensitive keys stored encrypted in integration_configs table.</p>
        </div>
      </div>
    </div>
  );
}
