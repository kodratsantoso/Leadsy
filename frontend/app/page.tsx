"use client";

import { useEffect, useState } from "react";
import { APIProvider, AdvancedMarker, InfoWindow, Map } from "@vis.gl/react-google-maps";
import { Building2, TrendingUp, AlertTriangle, Target, ArrowUpRight, BarChart3, Loader2, ShieldCheck, Zap, Activity, Sparkles, MapPin, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import Link from "next/link";
import { resolveStageColor } from "@/lib/stage-colors";
import { useNumberFormat } from "@/lib/hooks/use-number-format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeaderCell, TableRow, TableShell } from "@/components/ui/table";

const DEFAULT_CENTER = { lat: -6.2088, lng: 106.8456 };

type DashboardMapPoint = {
  id: number;
  company_name: string;
  address?: string | null;
  lat: number;
  lng: number;
  lead_score?: number | null;
  qualification_status?: string | null;
  funnel_stage?: { id: number; name: string; color?: string | null } | null;
};

type TrackingFunnelStep = {
  id?: number | string;
  label: string;
  value: number;
  percentage?: number;
  estimated_amount?: number;
  estimated_percentage?: number;
  color: string;
  href: string;
};

type DrilldownState = {
  title: string;
  description: string;
  href: string;
} | null;

type DrilldownLead = {
  id: number;
  company_name: string;
  address?: string | null;
  lead_score?: number | null;
  qualification_status?: string | null;
  estimated_closing_amount?: number | string | null;
  realized_closing_amount?: number | string | null;
  funnel_stage?: { name?: string | null } | null;
  funnelStage?: { name?: string | null } | null;
  owner?: { name?: string | null } | null;
};

type PaginatedLeads = {
  data: DrilldownLead[];
  current_page: number;
  last_page: number;
  total: number;
};

type ProductAggregate = {
  label: string;
  value: number;
  count?: number;
  estimated_volume?: number;
  href: string;
};

type SourceChannelAggregate = {
  label: string;
  value: number;
  href: string;
  source_label?: string | null;
  source_type?: string | null;
  channel_type_id?: number | null;
};

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

function leadsApiPathFromHref(href: string, page: number, search: string): string {
  const url = new URL(href, "https://leadsy.local");
  const params = new URLSearchParams(url.search);
  params.set("per_page", "10");
  params.set("page", String(page));
  params.set("sort", "created_at");
  params.set("dir", "desc");

  if (search.trim()) {
    params.set("search", search.trim());
  } else {
    params.delete("search");
  }

  return `/leads?${params.toString()}`;
}

function hrefWithParam(href: string, key: string, value: string): string {
  const url = new URL(href, "https://leadsy.local");
  url.searchParams.set(key, value);

  return `${url.pathname}${url.search}`;
}

export default function DashboardPage() {
  const { formatNumber, formatCurrency } = useNumberFormat();
  const [mapsApiKey, setMapsApiKey] = useState("");
  const [mapsEnabled, setMapsEnabled] = useState(true);
  const [selectedMapPoint, setSelectedMapPoint] = useState<DashboardMapPoint | null>(null);
  const [drilldown, setDrilldown] = useState<DrilldownState>(null);
  const [drilldownSearch, setDrilldownSearch] = useState("");
  const [drilldownPage, setDrilldownPage] = useState(1);

  useEffect(() => {
    apiFetch("/settings/public")
      .then((res) => res.json())
      .then((json) => {
        const settings = json?.data ?? {};
        setMapsApiKey(settings.GOOGLE_MAPS_BROWSER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "");
        setMapsEnabled(settings.GOOGLE_MAPS_ENABLED === undefined || settings.GOOGLE_MAPS_ENABLED === true || settings.GOOGLE_MAPS_ENABLED === "true");
      })
      .catch(() => {
        setMapsApiKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "");
        setMapsEnabled(true);
      });
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => { const r = await apiFetch("/dashboard"); return r.json(); },
  });

  const { data: pqData } = useQuery({
    queryKey: ["pipeline-quality"],
    queryFn: async () => { const r = await apiFetch("/analytics/pipeline-quality"); return r.json(); },
  });

  const drilldownApiPath = drilldown ? leadsApiPathFromHref(drilldown.href, drilldownPage, drilldownSearch) : null;
  const { data: drilldownData, isFetching: isDrilldownLoading } = useQuery({
    queryKey: ["dashboard-lead-drilldown", drilldownApiPath],
    enabled: Boolean(drilldownApiPath),
    queryFn: async () => {
      const response = await apiFetch(drilldownApiPath as string);
      return response.json();
    },
  });

  const pq = pqData?.data;
  const dashboard = data?.data || data || {};
  const mapPoints: DashboardMapPoint[] = dashboard.map_points ?? [];
  const mapCenter = mapPoints[0] ? { lat: Number(mapPoints[0].lat), lng: Number(mapPoints[0].lng) } : DEFAULT_CENTER;
  const salesAchievement = dashboard.sales_achievement ?? {};
  const salesFunnelTracking = dashboard.sales_funnel_tracking ?? {};
  const sourceChannelBreakdown = dashboard.source_channel_breakdown ?? {};
  const wonTrackingFunnel: TrackingFunnelStep[] = salesFunnelTracking.funnels?.won ?? salesFunnelTracking.funnel ?? [];
  const lostTrackingFunnel: TrackingFunnelStep[] = salesFunnelTracking.funnels?.lost ?? [];
  const salesVolume: ProductAggregate[] = salesFunnelTracking.sales_volume ?? [];
  const totalMarket: ProductAggregate[] = salesFunnelTracking.total_market ?? [];
  const salesVolumeRows = [...salesVolume].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
  const leadSources: SourceChannelAggregate[] = sourceChannelBreakdown.sources ?? [];
  const leadChannels: SourceChannelAggregate[] = sourceChannelBreakdown.channels ?? [];

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
      href: "/leads?pipeline_status=active",
    },
    {
      label: "Duplicate Rate",
      value: dashboard.duplicate_rate ?? (dashboard.duplicate_ratio != null ? `${dashboard.duplicate_ratio}%` : "—"),
      icon: AlertTriangle,
      change: null,
      color: "from-[var(--status-warning)] to-[oklch(0.65_0.22_50)]",
      href: "/leads?duplicate_status=duplicates",
    },
  ];

  const recentLeads = dashboard.recent_leads || [];
  const scoreDistribution = pq?.score_distribution ?? [];
  const qualityInsights: string[] = pq?.insights ?? [];
  const drilldownLeads: PaginatedLeads = drilldownData?.data?.data
    ? drilldownData.data
    : (drilldownData?.data ? drilldownData : { data: [], current_page: 1, last_page: 1, total: 0 });

  function openDrilldown(next: NonNullable<DrilldownState>) {
    setDrilldown(next);
    setDrilldownSearch("");
    setDrilldownPage(1);
  }

  const renderFunnelCard = (
    funnelKey: "won" | "lost",
    title: string,
    steps: TrackingFunnelStep[]
  ) => (
    <Card className="h-full bg-background">
      <div className="flex items-center justify-between p-5 pb-3">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">Conversion starts from Belum Di Klasifikasi. Click any bar to drill down.</p>
        </div>
        <Badge variant={funnelKey === "won" ? "success" : "danger"}>
          {funnelKey === "won" ? "Won" : "Lost"}
        </Badge>
      </div>
      <div className="space-y-4 px-5 pb-5 pt-2">
        {steps.map((step: TrackingFunnelStep, index: number) => {
          const firstValue = Math.max(Number(steps[0]?.value ?? 0), 1);
          const count = Number(step.value) || 0;
          const percentage = Number(step.percentage ?? ((count / firstValue) * 100));
          const barPct = index === 0
            ? 100
            : count <= 0
              ? 0
              : Math.max(3, Math.min(100, percentage));
          const tooltip = `${step.label}: ${formatNumber(step.value, { decimals: 0 })} leads, ${formatNumber(percentage, { decimals: 1 })}% conversion. Click to open filtered data.`;
          return (
            <button
              type="button"
              key={`${funnelKey}-${step.id ?? step.label}`}
              onClick={() => openDrilldown({
                title: `${title} · ${step.label}`,
                description: tooltip,
                href: step.href,
              })}
              className="group grid w-full grid-cols-[112px_minmax(0,1fr)_116px] items-center gap-3 text-left text-sm sm:grid-cols-[150px_minmax(0,1fr)_144px]"
              aria-label={tooltip}
              title={tooltip}
            >
              <span className="truncate text-right text-xs font-medium text-muted-foreground sm:text-sm">
                {step.label}
              </span>
              <span className="relative h-12 min-w-0">
                <span
                  className="absolute top-1/2 h-px -translate-y-1/2 bg-border"
                  style={{ left: `${barPct}%`, right: 0 }}
                />
                <span
                  className="absolute left-0 top-0 h-full rounded-sm bg-[color-mix(in_oklch,var(--status-info)_58%,var(--status-success))] transition-all duration-500 group-hover:bg-[color-mix(in_oklch,var(--status-info)_70%,var(--status-success))]"
                  style={{ width: `${barPct}%` }}
                />
              </span>
              <span className="border-l border-border pl-2">
                <span className="block text-sm font-bold tabular-nums text-foreground">
                  {formatNumber(step.value, { decimals: 0 })}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {formatNumber(percentage, { decimals: 1 })}%
                </span>
                <span className="mt-1 block text-xs font-medium tabular-nums text-foreground">
                  {formatCurrency(step.estimated_amount ?? 0)}
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  Est. {formatNumber(step.estimated_percentage ?? 0, { decimals: 1 })}%
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );

  const renderSourceChannelList = (
    items: SourceChannelAggregate[],
    maxValue: number,
    options?: { showSource?: boolean }
  ) => (
    <div className="space-y-3">
      {items.length > 0 ? items.map((item, index) => {
        const value = Number(item.value) || 0;
        const pct = value <= 0 ? 0 : Math.max(4, Math.min(100, (value / maxValue) * 100));
        const tooltip = `${item.label}: ${formatNumber(value, { decimals: 0 })} leads. Click to open filtered data.`;

        return (
          <button
            type="button"
            key={`${item.source_type ?? "source"}-${item.channel_type_id ?? "all"}-${item.href}-${item.label}-${index}`}
            onClick={() => openDrilldown({
              title: options?.showSource ? `Lead Channel · ${item.label}` : `Lead Source · ${item.label}`,
              description: tooltip,
              href: item.href,
            })}
            className="group block w-full rounded-lg border border-transparent p-2 text-left transition-colors hover:border-border hover:bg-muted/30"
            aria-label={tooltip}
            title={tooltip}
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.label}</p>
                {options?.showSource ? (
                  <p className="truncate text-xs text-muted-foreground">{item.source_label ?? "Unassigned Source"}</p>
                ) : null}
              </div>
              <span className="shrink-0 text-sm font-bold tabular-nums">{formatNumber(value, { decimals: 0 })}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted/50">
              <div
                className="h-full rounded-full bg-[color:var(--status-info)] transition-all duration-500 group-hover:bg-[color:var(--brand)]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </button>
        );
      }) : (
        <p className="rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">No lead origin data yet.</p>
      )}
    </div>
  );

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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* Stat cards — each opens an in-dashboard filtered drilldown */}
          <div className="md:col-span-12" data-tour="dashboard-kpis">
            <Card className="h-full">
              <CardHeader>
                <div>
                  <CardTitle>Key Metrics</CardTitle>
                  <CardDescription>Core lead indicators with drilldown shortcuts.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {stats.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => openDrilldown({
                        title: s.label,
                        description: `${s.label} leads filtered from the dashboard metric.`,
                        href: s.href,
                      })}
                      className="group relative block overflow-hidden rounded-xl border border-border bg-background p-4 text-left transition-all hover:border-[var(--brand)]/40"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
                          <p className="mt-1 text-2xl font-bold">{typeof s.value === "number" ? formatNumber(s.value, { decimals: 0 }) : s.value}</p>
                        </div>
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${s.color} shadow-lg`}>
                          <s.icon className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-6" data-tour="dashboard-funnel">
            {renderFunnelCard("won", "Leads → Closed Won", wonTrackingFunnel)}
          </div>

          <div className="md:col-span-6">
            {renderFunnelCard("lost", "Leads → Closed Lost", lostTrackingFunnel)}
          </div>

          <div className="md:col-span-6">
            <Card className="h-full">
              <CardHeader>
                <div>
                  <CardTitle>Sales Volume</CardTitle>
                  <CardDescription>Closed Won value grouped by product.</CardDescription>
                </div>
                <Badge variant="info">Won value</Badge>
              </CardHeader>
              <CardContent>
                  <div className="mb-4 flex items-center justify-between">
                  </div>
                  <div className="space-y-3">
                    {salesVolumeRows.length > 0 ? salesVolumeRows.map((item) => {
                      const maxValue = Math.max(...salesVolumeRows.map((row) => Number(row.value) || 0), 1);
                      const pct = Number(item.value) <= 0 ? 0 : Math.max(3, (Number(item.value) / maxValue) * 100);
                      return (
                        <button
                          key={item.href}
                          type="button"
                          onClick={() => openDrilldown({
                            title: `Sales Volume · ${item.label}`,
                            description: `Closed Won leads for ${item.label}.`,
                            href: hrefWithParam(item.href, "outcome", "won"),
                          })}
                          className="group block w-full rounded-lg border border-transparent p-2 text-left transition-colors hover:border-border hover:bg-muted/30"
                        >
                          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                            <span className="min-w-0 truncate text-muted-foreground">{item.label}</span>
                            <span className="shrink-0 whitespace-nowrap text-xs font-semibold">{formatCurrency(item.value)}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted/50">
                            <div className="h-full rounded-full bg-[color:var(--status-info)] transition-all duration-500 group-hover:bg-[color:var(--brand)]" style={{ width: `${pct}%` }} />
                          </div>
                        </button>
                      );
                    }) : (
                      <p className="py-6 text-center text-sm text-muted-foreground">No Closed Won sales volume yet.</p>
                    )}
                  </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-6">
            <Card className="h-full">
              <CardHeader>
                <div>
                  <CardTitle>Total Market</CardTitle>
                  <CardDescription>Lead count grouped by product.</CardDescription>
                </div>
                <Badge variant="neutral">Lead count</Badge>
              </CardHeader>
              <CardContent>
                  <div className="space-y-3">
                    {totalMarket.length > 0 ? totalMarket.map((item) => {
                      const maxValue = Math.max(...totalMarket.map((row) => Number(row.value) || 0), 1);
                      const pct = Number(item.value) <= 0 ? 0 : Math.max(4, (Number(item.value) / maxValue) * 100);
                      return (
                        <button
                          key={item.href}
                          type="button"
                          onClick={() => openDrilldown({
                            title: `Total Market · ${item.label}`,
                            description: `Leads grouped under ${item.label}.`,
                            href: item.href,
                          })}
                          className="group block w-full rounded-lg border border-transparent p-2 text-left transition-colors hover:border-border hover:bg-muted/30"
                        >
                          <div className="mb-2 flex items-start justify-between gap-3 text-sm">
                            <div className="min-w-0">
                              <p className="truncate text-muted-foreground">{item.label}</p>
                              <p className="text-xs text-muted-foreground">{formatCurrency(item.estimated_volume ?? 0)} est.</p>
                            </div>
                            <span className="shrink-0 text-sm font-bold tabular-nums">{formatNumber(item.value, { decimals: 0 })}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted/50">
                            <div className="h-full rounded-full bg-[color:var(--brand)] transition-all duration-500 group-hover:bg-[color:var(--status-info)]" style={{ width: `${pct}%` }} />
                          </div>
                        </button>
                      );
                    }) : (
                      <p className="py-6 text-center text-sm text-muted-foreground">No product market aggregate yet.</p>
                    )}
                  </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-12" data-tour="dashboard-source-channel">
            <Card className="h-full">
              <CardHeader>
                <div>
                  <CardTitle>Lead Sources & Channels</CardTitle>
                  <CardDescription>Total leads grouped by source and channel, with drilldown to filtered Leads.</CardDescription>
                </div>
                <Badge variant="info">Lead origin</Badge>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Lead Sources</p>
                        <p className="text-xs text-muted-foreground">Origin taxonomy from lead source records.</p>
                      </div>
                      <BarChart3 className="h-4 w-4 text-[color:var(--status-info)]" />
                    </div>
                    {renderSourceChannelList(leadSources, Math.max(...leadSources.map((item) => Number(item.value) || 0), 1))}
                  </div>
                  <div>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Lead Channels</p>
                        <p className="text-xs text-muted-foreground">Channel detail under each lead source.</p>
                      </div>
                      <Activity className="h-4 w-4 text-[color:var(--brand)]" />
                    </div>
                    {renderSourceChannelList(
                      leadChannels,
                      Math.max(...leadChannels.map((item) => Number(item.value) || 0), 1),
                      { showSource: true }
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-12">
            <Card className="h-full">
              <CardHeader>
                <div>
                  <CardTitle>Pipeline Quality</CardTitle>
                  <CardDescription>Score health, distribution, and actionable quality notes.</CardDescription>
                </div>
                {pq ? <PipelineHealthBadge health={pq.pipeline_health} /> : null}
              </CardHeader>
              <CardContent>
                {pq ? (
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-xl border border-border bg-background p-5">
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

                    <div className="rounded-xl border border-border bg-background p-5">
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

                    <div className="rounded-xl border border-border bg-background p-5">
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
                ) : (
                  <p className="rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">Pipeline quality data is still loading.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-8" data-tour="dashboard-map">
            <Card className="flex h-full flex-col">
              <CardHeader>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <CardTitle>Lead Geography</CardTitle>
                    <CardDescription>Database-backed leads with stage-colored POI markers.</CardDescription>
                  </div>
                  <Badge variant="info">{formatNumber(mapPoints.length, { decimals: 0 })} mapped</Badge>
                </div>
              </CardHeader>
              <CardContent className="min-h-0 flex-1">
                <div className="h-full min-h-[260px] overflow-hidden rounded-xl border border-border bg-[color:var(--surface-subtle)]">
                {mapsEnabled && mapsApiKey ? (
                  <APIProvider apiKey={mapsApiKey}>
                    <Map
                      mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID"}
                      defaultCenter={mapCenter}
                      defaultZoom={mapPoints.length > 0 ? 11 : 6}
                      gestureHandling="greedy"
                      disableDefaultUI={false}
                    >
                      {mapPoints.map((point) => (
                        <AdvancedMarker
                          key={point.id}
                          position={{ lat: Number(point.lat), lng: Number(point.lng) }}
                          onClick={() => setSelectedMapPoint(point)}
                        >
                          <div className="flex flex-col items-center">
                            <div
                              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background text-white shadow-lg"
                              style={{ backgroundColor: resolveStageColor(point.funnel_stage?.color) }}
                            >
                              <MapPin className="h-4 w-4" />
                            </div>
                          </div>
                        </AdvancedMarker>
                      ))}
                      {selectedMapPoint ? (
                        <InfoWindow
                          position={{ lat: Number(selectedMapPoint.lat), lng: Number(selectedMapPoint.lng) }}
                          onCloseClick={() => setSelectedMapPoint(null)}
                        >
                          <div className="min-w-48 space-y-2 text-sm text-foreground">
                            <p className="font-semibold">{selectedMapPoint.company_name}</p>
                            <p className="text-xs text-muted-foreground">{selectedMapPoint.address || "No address"}</p>
                            <div className="flex items-center gap-2">
                              <span>{selectedMapPoint.funnel_stage?.name ?? "Unassigned"}</span>
                              <span>Score {selectedMapPoint.lead_score ?? "—"}</span>
                            </div>
                          </div>
                        </InfoWindow>
                      ) : null}
                    </Map>
                  </APIProvider>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Maps are unavailable. Configure the public Google Maps browser key to enable this block.
                  </div>
                )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-4">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-[color:var(--brand)]" />
                  <div>
                    <CardTitle>Achievement Sales</CardTitle>
                    <CardDescription className="capitalize">{salesAchievement.period ?? "monthly"} target</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Realisasi Revenue</p>
                        <p className="text-2xl font-bold">{formatCurrency(salesAchievement.realized_revenue)}</p>
                      </div>
                      <p className="text-sm font-semibold text-[color:var(--brand)]">
                        {Number(salesAchievement.target_revenue ?? 0) > 0
                          ? `${formatNumber(salesAchievement.achievement_percentage ?? 0, { decimals: 1 })}%`
                          : "No target"}
                      </p>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/50">
                      <div
                        className="h-full rounded-full bg-[color:var(--brand)]"
                        style={{ width: `${Number(salesAchievement.target_revenue ?? 0) > 0 ? Math.min(100, Number(salesAchievement.achievement_percentage ?? 0)) : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">Target Revenue</p>
                      <p className="font-semibold">{formatCurrency(salesAchievement.target_revenue)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const params = new URLSearchParams({ outcome: "won" });
                        if (salesAchievement.period_start) params.set("closed_from", salesAchievement.period_start);
                        if (salesAchievement.period_end) params.set("closed_to", salesAchievement.period_end);
                        openDrilldown({
                          title: "Achievement Sales · Closed Won",
                          description: "Closed Won leads inside the active target period.",
                          href: `/leads?${params.toString()}`,
                        });
                      }}
                      className="rounded-lg bg-muted/40 p-3 text-left transition-colors hover:bg-muted/70"
                    >
                      <p className="text-xs text-muted-foreground">Closed Won</p>
                      <p className="font-semibold">{formatNumber(salesAchievement.closed_won_count ?? 0, { decimals: 0 })} leads</p>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(salesAchievement.trend ?? []).slice(-6).map((item: { date: string; total: number }) => (
                      <div key={item.date} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                        <span className="text-muted-foreground">{item.date}</span>
                        <span className="font-medium">{formatCurrency(item.total)}</span>
                      </div>
                    ))}
                    {(salesAchievement.trend ?? []).length === 0 ? (
                      <p className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">Closed Won realization will appear here.</p>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-12">
            <Card className="h-full">
              <CardHeader>
                <div>
                  <CardTitle>Recent Leads</CardTitle>
                  <CardDescription>Latest leads in your accessible workspace.</CardDescription>
                </div>
                <Link href="/leads" className="text-xs text-[var(--brand)] hover:text-[var(--brand-light)]">View all →</Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
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
              </CardContent>
            </Card>
          </div>
          </div>
        </>
      )}
      <Modal
        open={Boolean(drilldown)}
        onOpenChange={(open) => {
          if (!open) setDrilldown(null);
        }}
        title={drilldown?.title ?? "Lead Drilldown"}
        description={drilldown?.description}
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">{formatNumber(drilldownLeads.total ?? 0, { decimals: 0 })} filtered leads</p>
              <p className="text-xs text-muted-foreground">Data is filtered directly from the dashboard condition you selected.</p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                hasIcon
                value={drilldownSearch}
                onChange={(event) => {
                  setDrilldownSearch(event.target.value);
                  setDrilldownPage(1);
                }}
                placeholder="Search filtered leads"
              />
            </div>
          </div>

          <TableShell>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Lead</TableHeaderCell>
                  <TableHeaderCell>Stage</TableHeaderCell>
                  <TableHeaderCell>Qualification</TableHeaderCell>
                  <TableHeaderCell>Score</TableHeaderCell>
                  <TableHeaderCell>Estimated</TableHeaderCell>
                  <TableHeaderCell>Owner</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isDrilldownLoading ? (
                  <TableEmpty colSpan={6}>
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading filtered leads...
                    </span>
                  </TableEmpty>
                ) : drilldownLeads.data.length > 0 ? (
                  drilldownLeads.data.map((lead) => {
                    const stage = lead.funnel_stage ?? lead.funnelStage;
                    return (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <Link href={`/leads/${lead.id}`} className="font-medium text-[color:var(--brand)] hover:underline">
                            {lead.company_name}
                          </Link>
                          <p className="mt-1 max-w-xs truncate text-xs text-muted-foreground">{lead.address ?? "No address"}</p>
                        </TableCell>
                        <TableCell>{stage?.name ?? "Unassigned"}</TableCell>
                        <TableCell>
                          <Badge variant={lead.qualification_status === "eligible" ? "success" : lead.qualification_status === "potential" ? "warning" : "neutral"}>
                            {(lead.qualification_status ?? "pending").replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold tabular-nums">{lead.lead_score ?? "—"}</TableCell>
                        <TableCell className="font-medium tabular-nums">{formatCurrency(lead.estimated_closing_amount ?? 0)}</TableCell>
                        <TableCell>{lead.owner?.name ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableEmpty colSpan={6}>No leads match this dashboard condition.</TableEmpty>
                )}
              </TableBody>
            </Table>
          </TableShell>

          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              disabled={drilldownPage <= 1 || isDrilldownLoading}
              onClick={() => setDrilldownPage((page) => Math.max(1, page - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {formatNumber(drilldownLeads.current_page ?? 1, { decimals: 0 })} of {formatNumber(drilldownLeads.last_page ?? 1, { decimals: 0 })}
            </span>
            <Button
              variant="outline"
              disabled={drilldownPage >= (drilldownLeads.last_page ?? 1) || isDrilldownLoading}
              onClick={() => setDrilldownPage((page) => page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
