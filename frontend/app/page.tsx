"use client";

import { Building2, TrendingUp, AlertTriangle, Target, ArrowUpRight, BarChart3, Loader2, ShieldCheck, Zap, Activity, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import Link from "next/link";
import { resolveStageColor } from "@/lib/stage-colors";
import { useNumberFormat } from "@/lib/hooks/use-number-format";

function PipelineHealthBadge({ health }: { health?: string }) {
  const cfg = {
    healthy: "bg-[color-mix(in_oklch,var(--status-success)_15%,transparent)] text-[var(--status-success)] border-[var(--status-success)]/40",
    warning: "bg-[color-mix(in_oklch,var(--status-warning)_15%,transparent)] text-[var(--status-warning)] border-[var(--status-warning)]/40",
    critical: "bg-[color-mix(in_oklch,var(--status-danger)_15%,transparent)] text-[var(--status-danger)] border-[var(--status-danger)]/40",
  }[health ?? "critical"] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase ${cfg}`}>
      <ShieldCheck className="h-3 w-3" />{health ?? "—"}
    </span>
  );
}

function ScoreMeter({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

export default function DashboardPage() {
  const { formatNumber } = useNumberFormat();
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
    {
      label: "Total Leads",
      value: dashboard.total_leads ?? "—",
      icon: Building2,
      change: dashboard.leads_change ?? null,
      color: "from-[var(--brand)] to-[oklch(0.558_0.288_302.321)]",
      href: "/leads",
    },
    {
      label: "Qualified",
      value: dashboard.qualified_leads ?? "—",
      icon: Target,
      change: dashboard.qualified_change ?? null,
      color: "from-[var(--status-success)] to-[oklch(0.627_0.194_149)]",
      href: "/leads?qualification_status=eligible",
    },
    {
      label: "In Pipeline",
      value: dashboard.pipeline_leads ?? dashboard.total_leads ?? "—",
      icon: TrendingUp,
      change: null,
      color: "from-[var(--status-info)] to-[oklch(0.527_0.183_249)]",
      href: "/leads",
    },
    {
      label: "Duplicate Rate",
      value: dashboard.duplicate_rate ?? (dashboard.duplicate_ratio != null ? `${dashboard.duplicate_ratio}%` : "—"),
      icon: AlertTriangle,
      change: null,
      color: "from-[var(--status-warning)] to-[oklch(0.65_0.22_50)]",
      href: "/leads?duplicate_status=probable_duplicate",
    },
  ];

  const recentLeads = dashboard.recent_leads || [];
  const scoreDistribution = pq?.score_distribution ?? [];
  const qualityInsights: string[] = pq?.insights ?? [];

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
          {/* Stat cards — each is a drilldown link */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <Link key={s.label} href={s.href} className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-[var(--brand)]/40 block">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
                    <p className="mt-1 text-2xl font-bold">{typeof s.value === "number" ? formatNumber(s.value, { decimals: 0 }) : s.value}</p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${s.color} shadow-lg`}>
                    <s.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
                {s.change && (
                  <div className="mt-3 flex items-center gap-1 text-xs">
                    <ArrowUpRight className="h-3 w-3 text-[var(--status-success)]" />
                    <span className="font-medium text-[var(--status-success)]">{s.change}</span>
                  </div>
                )}
                <div className="mt-2 text-xs text-muted-foreground group-hover:text-[var(--brand)] transition-colors">View all →</div>
                <div className={`absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r ${s.color} opacity-0 transition-opacity group-hover:opacity-100`} />
              </Link>
            ))}
          </div>

          {/* Pipeline Quality Dashboard */}
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
                <ScoreMeter
                  value={pq.pipeline_quality_score}
                  color={pq.health === "healthy" ? "var(--status-success)" : pq.health === "warning" ? "var(--status-warning)" : "var(--status-danger)"}
                />
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <Link href="/leads?qualification_status=eligible" className="rounded-lg bg-muted/40 p-2 hover:bg-muted/70 transition-colors block">
                    <p className="text-lg font-bold text-[var(--status-success)]">{formatNumber(pq.qualified_ratio, { decimals: 0 })}%</p>
                    <p className="text-xs text-muted-foreground">Qualified ↗</p>
                  </Link>
                  <Link href="/leads?filter=ghost" className="rounded-lg bg-muted/40 p-2 hover:bg-muted/70 transition-colors block">
                    <p className="text-lg font-bold text-[var(--status-danger)]">{formatNumber(pq.ghost_lead_ratio, { decimals: 0 })}%</p>
                    <p className="text-xs text-muted-foreground">Ghost Leads ↗</p>
                  </Link>
                  <div className="rounded-lg bg-muted/40 p-2">
                    <p className="text-lg font-bold">{formatNumber(pq.average_score, { decimals: 0 })}</p>
                    <p className="text-xs text-muted-foreground">Avg Score</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <Link href="/leads?min_score=70" className="hover:text-[var(--status-danger)] transition-colors">
                    <span className="font-semibold text-[var(--status-danger)]">{pq.by_score_band?.hot ?? 0}</span>
                    <span className="text-muted-foreground ml-1">Hot ↗</span>
                  </Link>
                  <Link href="/leads?min_score=60&max_score=79" className="hover:text-[var(--status-warning)] transition-colors">
                    <span className="font-semibold text-[var(--status-warning)]">{pq.by_score_band?.warm ?? 0}</span>
                    <span className="text-muted-foreground ml-1">Warm ↗</span>
                  </Link>
                  <Link href="/leads?max_score=59" className="hover:text-[var(--status-info)] transition-colors">
                    <span className="font-semibold text-[var(--status-info)]">{pq.by_score_band?.cold ?? 0}</span>
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
                          <span className="text-muted-foreground">{formatNumber(s.conversion_rate, { decimals: 0 })}% conv · {formatNumber(s.total_leads, { decimals: 0 })} leads · avg {formatNumber(s.avg_score, { decimals: 0 })}</span>
                        </div>
                        <ScoreMeter value={s.conversion_rate} color="var(--brand)" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-6 text-center">No source data yet — leads with sources will appear here.</p>
                )}
              </div>
            </div>
          )}

          {pq && (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-[var(--status-success)]" />
                  <p className="text-sm font-semibold">Average Score</p>
                </div>
                <p className="text-4xl font-bold tabular-nums">{formatNumber(pq.average_score, { decimals: 0 })}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Average lead quality across the current database.
                </p>
                <div className="mt-4">
                  <ScoreMeter
                    value={pq.average_score}
                    color={pq.average_score >= 80 ? "var(--status-success)" : pq.average_score >= 60 ? "var(--status-warning)" : "var(--status-danger)"}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-4 w-4 text-[var(--status-info)]" />
                  <p className="text-sm font-semibold">Score Distribution</p>
                </div>
                <div className="space-y-3">
                  {scoreDistribution.map((item: { band: "hot" | "warm" | "cold"; count: number; percentage: number }) => (
                    <div key={item.band}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium uppercase">{item.band}</span>
                        <span className="text-muted-foreground">{item.count} leads · {item.percentage}%</span>
                      </div>
                      <ScoreMeter
                        value={item.percentage}
                        color={item.band === "hot" ? "var(--status-success)" : item.band === "warm" ? "var(--status-warning)" : "var(--status-info)"}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-4 w-4 text-[var(--brand)]" />
                  <p className="text-sm font-semibold">Quality Insights</p>
                </div>
                {qualityInsights.length > 0 ? (
                  <div className="space-y-3">
                    {qualityInsights.map((insight) => (
                      <div key={insight} className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
                        {insight}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Insights will appear as lead quality data accumulates.</p>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Funnel chart — each bar is clickable */}
            <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Pipeline Funnel</h2>
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
                    <Link
                      key={stage.id || stage.name}
                      href={`/leads?funnel_stage_id=${stage.id}`}
                      className="group block"
                    >
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium group-hover:text-[var(--brand)] transition-colors">{stage.name}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-6 w-full rounded-md bg-muted/50 overflow-hidden">
                        <div className="h-full rounded-md transition-all duration-700 group-hover:opacity-90" style={{ width: `${pct}%`, backgroundColor: resolveStageColor(stage.color) }} />
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
                <h2 className="text-2xl font-semibold">Recent Leads</h2>
                <Link href="/leads" className="text-xs text-[var(--brand)] hover:text-[var(--brand-light)]">View all →</Link>
              </div>
              <div className="space-y-3">
                {recentLeads.length > 0 ? recentLeads.map((lead: any) => (
                  <Link href={`/leads/${lead.id}`} key={lead.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5 transition-colors hover:bg-accent/30">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{lead.company_name}</p>
                      <p className="text-sm text-muted-foreground">{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                        lead.qualification_status === "eligible" ? "bg-[color-mix(in_oklch,var(--status-success)_10%,transparent)] text-[var(--status-success)]"
                        : lead.qualification_status === "potential" ? "bg-[color-mix(in_oklch,var(--status-warning)_10%,transparent)] text-[var(--status-warning)]"
                        : "bg-[color-mix(in_oklch,var(--status-danger)_10%,transparent)] text-[var(--status-danger)]"
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
