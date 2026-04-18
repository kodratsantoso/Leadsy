"use client";

import { Building2, TrendingUp, AlertTriangle, Target, ArrowUpRight, BarChart3, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import Link from "next/link";

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => { const r = await apiFetch("/dashboard"); return r.json(); },
  });

  const { data: funnelData } = useQuery({
    queryKey: ["funnel-dashboard"],
    queryFn: async () => { const r = await apiFetch("/funnel/dashboard"); return r.json(); },
  });

  const dashboard = data?.data || data || {};
  const funnelStages = funnelData?.data?.stages || funnelData?.stages || [];

  const stats = [
    {
      label: "Total Leads",
      value: dashboard.total_leads ?? "—",
      icon: Building2,
      change: dashboard.leads_change ?? null,
      color: "from-indigo-500 to-purple-600",
    },
    {
      label: "Qualified",
      value: dashboard.qualified_leads ?? "—",
      icon: Target,
      change: dashboard.qualified_change ?? null,
      color: "from-emerald-500 to-green-600",
    },
    {
      label: "In Pipeline",
      // backend returns pipeline_leads; fall back to total if not yet present
      value: dashboard.pipeline_leads ?? dashboard.total_leads ?? "—",
      icon: TrendingUp,
      change: null,
      color: "from-blue-500 to-cyan-600",
    },
    {
      label: "Duplicate Rate",
      // backend returns duplicate_rate (e.g. "4.2%"); fall back to ratio + "%"
      value: dashboard.duplicate_rate ?? (dashboard.duplicate_ratio != null ? `${dashboard.duplicate_ratio}%` : "—"),
      icon: AlertTriangle,
      change: null,
      color: "from-amber-500 to-orange-600",
    },
  ];

  const recentLeads = dashboard.recent_leads || [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your lead intelligence pipeline</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
                    <p className="mt-1 text-2xl font-bold">{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${s.color} shadow-lg`}>
                    <s.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
                {s.change && (
                  <div className="mt-3 flex items-center gap-1 text-xs">
                    <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                    <span className="font-medium text-emerald-500">{s.change}</span>
                  </div>
                )}
                <div className={`absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r ${s.color} opacity-0 transition-opacity group-hover:opacity-100`} />
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Funnel chart */}
            <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Pipeline Funnel</h2>
                  <p className="text-sm text-muted-foreground">Lead progression through stages</p>
                </div>
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-3">
                {funnelStages.length > 0 ? funnelStages.map((stage: any) => {
                  const maxCount = Math.max(...funnelStages.map((s: any) => s.leads_count || s.count || 0), 1);
                  const count = stage.leads_count || stage.count || 0;
                  const pct = Math.max(4, (count / maxCount) * 100);
                  return (
                    <div key={stage.id || stage.name} className="group">
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium">{stage.name}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-6 w-full rounded-md bg-muted/50 overflow-hidden">
                        <div className="h-full rounded-md transition-all duration-700 group-hover:opacity-90" style={{ width: `${pct}%`, backgroundColor: stage.color || "#6366f1" }} />
                      </div>
                    </div>
                  );
                }) : (
                  <p className="py-8 text-center text-xs text-muted-foreground">No funnel data. Start the backend and seed the database to load pipeline stages.</p>
                )}
              </div>
            </div>

            {/* Recent leads */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-2xl font-semibold">Recent Leads</h2>
              <div className="space-y-3">
                {recentLeads.length > 0 ? recentLeads.map((lead: any) => (
                  <Link href={`/leads/${lead.id}`} key={lead.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5 transition-colors hover:bg-accent/30">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{lead.company_name}</p>
                      <p className="text-sm text-muted-foreground">{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                        lead.qualification_status === "eligible" ? "bg-emerald-500/10 text-emerald-500"
                        : lead.qualification_status === "potential" ? "bg-amber-500/10 text-amber-500"
                        : "bg-red-500/10 text-red-500"
                      }`}>
                        {(lead.qualification_status || "pending").replace("_", " ")}
                      </span>
                      <span className="text-sm font-bold tabular-nums">{lead.lead_score ?? "—"}</span>
                    </div>
                  </Link>
                )) : (
                  <p className="py-8 text-center text-xs text-muted-foreground">No recent leads.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
