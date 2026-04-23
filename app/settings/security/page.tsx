"use client";
import { Shield, ArrowLeft, Lock, Key, Clock } from "lucide-react";
import Link from "next/link";

export default function SecurityPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
        <div><h1 className="text-2xl font-bold tracking-tight">Security</h1><p className="text-sm text-muted-foreground">Authentication and session policies — BRD §6.1</p></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3"><Clock className="h-4 w-4 text-[var(--brand)]" /><h3 className="text-sm font-semibold">Session Timeout</h3></div>
          <p className="text-xs text-muted-foreground mb-3">Auto-logout after inactivity period</p>
          <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"><option>120 minutes</option><option>60 minutes</option><option>30 minutes</option><option>15 minutes</option></select>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3"><Key className="h-4 w-4 text-[var(--status-warning)]" /><h3 className="text-sm font-semibold">Password Policy</h3></div>
          <p className="text-xs text-muted-foreground mb-3">Minimum requirements for passwords</p>
          <div className="space-y-2 text-xs">
            <label className="flex items-center gap-2"><input type="checkbox" defaultChecked className="rounded" /> Minimum 8 characters</label>
            <label className="flex items-center gap-2"><input type="checkbox" defaultChecked className="rounded" /> Require uppercase letter</label>
            <label className="flex items-center gap-2"><input type="checkbox" defaultChecked className="rounded" /> Require special character</label>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3"><Lock className="h-4 w-4 text-[var(--status-danger)]" /><h3 className="text-sm font-semibold">MFA (Multi-Factor Authentication)</h3></div>
          <p className="text-xs text-muted-foreground mb-3">Optional MFA for admin users</p>
          <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">Not configured — Future phase</button>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3"><Shield className="h-4 w-4 text-[var(--status-success)]" /><h3 className="text-sm font-semibold">Data Encryption</h3></div>
          <p className="text-xs text-muted-foreground">TLS/HTTPS enforced for all API traffic. Sensitive keys stored encrypted in integration_configs table.</p>
        </div>
      </div>
    </div>
  );
}
