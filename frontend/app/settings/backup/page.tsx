"use client";
import { Database, ArrowLeft, Clock, HardDrive, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function BackupPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
        <div><h1 className="text-2xl font-bold tracking-tight">Backup & Recovery</h1><p className="text-sm text-muted-foreground">Scheduled backups and restore policies — BRD §6.4</p></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3"><Clock className="h-4 w-4 text-indigo-500" /><h3 className="text-sm font-semibold">Backup Schedule</h3></div>
          <p className="text-xs text-muted-foreground mb-3">Configure automatic backup intervals</p>
          <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"><option>Daily at 02:00 UTC</option><option>Weekly (Sunday)</option><option>Manual Only</option></select>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3"><HardDrive className="h-4 w-4 text-emerald-500" /><h3 className="text-sm font-semibold">Retention Policy</h3></div>
          <p className="text-xs text-muted-foreground mb-3">How long to keep backup copies</p>
          <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"><option>30 days</option><option>60 days</option><option>90 days</option><option>1 year</option></select>
        </div>
        <div className="sm:col-span-2 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><RefreshCw className="h-4 w-4 text-amber-500" /><h3 className="text-sm font-semibold">Recovery</h3></div>
            <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">Run Manual Backup</button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">No recent backup operations. Configure the backend cron scheduler to enable automated backups.</p>
        </div>
      </div>
    </div>
  );
}
