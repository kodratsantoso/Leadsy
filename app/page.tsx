"use client";

import { Building2, TrendingUp, AlertTriangle, Target, ArrowUpRight, BarChart3, Loader2, ShieldCheck, Zap, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import Link from "next/link";
import {
  HEALTH_BADGE,
  QUALIFICATION_BADGE,
  SCORE_BAND,
  scoreMeterColor,
} from "@/lib/design";
import { resolveStageColor } from "@/lib/stage-colors";

function PipelineHealthBadge({ health }: { health?: string }) {
  const cls = HEALTH_BADGE[health ?? "critical"] ?? HEALTH_BADGE.critical;
  return (
    <span className={cls}>
      <ShieldCheck className="h-3 w-3" />{health ?? "—"}
    </span>
  );
}

function ScoreMeter({ value, cssColor }: { value: number; cssColor: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="score-bar-track">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: cssColor }} />
    </div>
  );
}

/* Icon wrapper uses semantic CSS var colors instead of hardcoded gradients */
const STAT_ICONS = [
  { icon: Building2, style: { background: "linear-gradient(135deg, var(--brand), oklch(0.558 0.288 302.321))" } },
  { icon: Target,    style: { background: "linear-gradient(135deg, var(--status-success), oklch(0.627 0.194 149))" } },
  { icon: TrendingUp,style: { background: "linear-gradient(135deg, var(--status-info), oklch(0.527 0.183 249))" } },
  { icon: AlertTriangle, style: { background: "linear-gradient(135deg, var(--status-warning), oklch(0.669 0.195 56))" } },
];

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => { const r = await apiFetch("/dashboard"); return r.json(); },
  });

  const { data: funnelData } = useQuery({
    queryKey: ["funnel-dashboard"],
    queryFn: async () => { const r = await apiFetch("/funnel/dashboard"); return r.json(); },
  });

  const { data: pqData } = useQuery({
    queryKey: ["pipeline-quality"],
    queryFn: async () => { const r = await apiFetch("/analytics/pipeline-quality"); return r.json(); },
  });

  const { data: sqData } = useQuery({
    queryKey: ["source-quality"],
    queryFn: async () => { const r = await apiFetch("/analytics/source-quality"); return r.json(); },
  });

  const pq = pqData?.data;
  const sources: { source_type: string; total_leads: number; avg_score: number; conversion_rate: number }[] =
    sqData?.data ?? [];

  const dashboard = data?.data || data || {};
  const funnelStages = funnelData?.data || funnelData || [];

  const stats = [
    { label: "Total Leads",    value: dashboard.total_leads ?? "—",   change: dashboard.leads_change ?? null,     href: "/leads",                                  iconIdx: 0 },
    { label: "Qualified",      value: dashboard.qualified_leads ?? "—", change: dashboard.qualified_change ?? null, href: "/leads?qualification_status=eligible",     iconIdx: 1 },
    { label: "In Pipeline",    value: dashboard.pipeline_leads ?? dashboard.total_leads ?? "—", change: null,      href: "/leads",                                  iconIdx: 2 },
    { label: "Duplicate Rate", value: dashboard.duplicate_rate ?? (dashboard.duplicate_ratio != null ? `${dashboard.duplicate_ratio}%` : "—"), change: null, href: "/leads?duplicate_status=probable_duplicate", iconIdx: 3 },
  ];

  const recentLeads = dashboard.recent_leads || [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your lead intelligence pipeline</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => {
              const { icon: Icon, style: iconStyle } = STAT_ICONS[s.iconIdx];
              return (
                <Link
                  key={s.label}
                  href={s.href}
                  className="card-interactive group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md block"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
                      <p className="mt-1 text-2xl font-bold">{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg shadow-lg" style={iconStyle}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  {s.change && (
                    <div className="mt-3 flex items-center gap-1 text-xs">
                      <ArrowUpRight className="h-3 w-3 text-[var(--status-success)]" />
                      <span className="font-medium text-[var(--status-success)]">{s.change}</span>
                    </div>
                  )}
                  <div className="mt-2 text-xs text-muted-foreground group-hover:text-[var(--brand)] transition-colors">View all →</div>
                </Link>
              );
            })}
          </div>

          {/* Pipeline Quality */}
          {pq && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="col-span-full lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-[var(--brand)]" />
                      <p className="text-sm font-semibold">Pipeline Quality Score</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Revenue Intelligence — Pipeline Health</p>
                  </div>
                  <PipelineHealthBadge health={pq.health} />
                </div>
                <div className="flex items-end gap-3 mb-3">
                  <span className="text-4xl font-bold tabular-nums">{pq.pipeline_quality_score}</span>
                  <span className="text-muted-foreground text-sm mb-1">/ 100</span>
                </div>
                <ScoreMeter value={pq.pipeline_quality_score} cssColor={scoreMeterColor(pq.health)} />
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <Link href="/leads?qualification_status=eligible" className="rounded-lg bg-muted/40 p-2 hover:bg-muted/70 transition-colors block">
                    <p className="text-lg font-bold text-[var(--status-success)]">{pq.qualified_ratio}%</p>
                    <p className="text-xs text-muted-foreground">Qualified ↗</p>
                  </Link>
                  <Link href="/leads?filter=ghost" className="rounded-lg bg-muted/40 p-2 hover:bg-muted/70 transition-colors block">
                    <p className="text-lg font-bold text-[var(--status-danger)]">{pq.ghost_lead_ratio}%</p>
                    <p className="text-xs text-muted-foreground">Ghost Leads ↗</p>
                  </Link>
                  <div className="rounded-lg bg-muted/40 p-2">
                    <p className="text-lg font-bold">{pq.average_score}</p>
                    <p className="text-xs text-muted-foreground">Avg Score</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <Link href="/leads?min_score=70" className={`${SCORE_BAND.hot} hover:opacity-80 transition-opacity`}>
                    <span className="font-semibold">{pq.by_score_band?.hot ?? 0}</span>
                    <span className="text-muted-foreground ml-1">Hot ↗</span>
                  </Link>
                  <Link href="/leads?min_score=40&max_score=69" className={`${SCORE_BAND.warm} hover:opacity-80 transition-opacity`}>
                    <span className="font-semibold">{pq.by_score_band?.warm ?? 0}</span>
                    <span className="text-muted-foreground ml-1">Warm ↗</span>
                  </Link>
                  <Link href="/leads?max_score=39" className={`${SCORE_BAND.cold} hover:opacity-80 transition-opacity`}>
                    <span className="font-semibold">{pq.by_score_band?.cold ?? 0}</span>
                    <span className="text-muted-foreground ml-1">Cold ↗</span>
                  </Link>
                </div>
              </div>

              {/* Source Quality */}
              <div className="col-span-full lg:col-span-2 rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="h-4 w-4 text-[var(--status-warning)]" />
                  <p className="text-sm font-semibold">Source Quality</p>
                </div>
                {sources.length > 0 ? (
                  <div className="space-y-3">
                    {sources.slice(0, 5).map((s) => (
                      <div key={s.source_type}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium capitalize">{s.source_type.replace(/_/g, " ")}</span>
                          <span className="text-muted-foreground">{s.conversion_rate}% conv · {s.total_leads} leads · avg {s.avg_score}</span>
                        </div>
                        <div className="score-bar-track">
                          <div className="h-full rounded-full transition-all duration-700 score-bar-fill" style={{ width: `${Math.max(0, Math.min(100, s.conversion_rate ?? 0))}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-6 text-center">No source data yet — leads with sources will appear here.</p>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Funnel chart */}
            <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Pipeline Funnel</h2>
                  <p className="text-sm text-muted-foreground">Click a stage to view leads · real database counts</p>
                </div>
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-3">
                {funnelStages.length > 0 ? funnelStages.map((stage: any) => {
                  const maxCount = Math.max(...funnelStages.map((s: any) => s.leads_count || s.count || 0), 1);
                  const count = stage.leads_count || stage.count || 0;
                  const pct = Math.max(4, (count / maxCount) * 100);
                  return (
                    <Link key={stage.id || stage.name} href={`/leads?funnel_stage_id=${stage.id}`} className="group block">
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium group-hover:text-[var(--brand)] transition-colors">{stage.name}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-6 w-full rounded-md bg-muted/50 overflow-hidden">
                        <div
                          className="h-full rounded-md transition-all duration-700 group-hover:opacity-90"
                          style={{ width: `${pct}%`, backgroundColor: resolveStageColor(stage.color) }}
                        />
                      </div>
                    </Link>
                  );
                }) : (
                  <p className="py-8 text-center text-xs text-muted-foreground">No funnel data. Start the backend and seed the database to load pipeline stages.</p>
                )}
              </div>
            </div>

            {/* Recent leads */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Recent Leads</h2>
                <Link href="/leads" className="text-xs text-[var(--brand)] hover:text-[var(--brand-hover)] transition-colors">View all →</Link>
              </div>
              <div className="space-y-3">
                {recentLeads.length > 0 ? recentLeads.map((lead: any) => (
                  <Link
                    href={`/leads/${lead.id}`}
                    key={lead.id}
                    className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5 transition-colors hover:bg-accent/30"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{lead.company_name}</p>
                      <p className="text-xs text-muted-foreground">{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={QUALIFICATION_BADGE[lead.qualification_status] ?? QUALIFICATION_BADGE.pending}>
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
