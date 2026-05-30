"use client";

import { useEffect, useState } from "react";
import { APIProvider, AdvancedMarker, InfoWindow, Map, useApiIsLoaded } from "@vis.gl/react-google-maps";
import { Building2, TrendingUp, AlertTriangle, Target, ArrowUpRight, BarChart3, Loader2, ShieldCheck, Zap, Activity, Sparkles, MapPin, Search, BrainCircuit, RefreshCw, CheckCircle2 } from "lucide-react";
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
import dynamic from "next/dynamic";
import Highcharts from "highcharts";

// Dynamically import chart libraries to bypass Next.js SSR document reference errors
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
const HighchartsReact = dynamic(() => import("highcharts-react-official"), { ssr: false });

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

  const [colors, setColors] = useState({
    brand: "#8b5cf6",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    info: "#3b82f6",
    mutedForeground: "#6b7280"
  });

  const getCSSVar = (name: string, fallback: string) => {
    if (typeof window === "undefined") return fallback;
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  };

  useEffect(() => {
    const updateColors = () => {
      setColors({
        brand: getCSSVar("--brand", "#8b5cf6"),
        success: getCSSVar("--success", "#10b981"),
        warning: getCSSVar("--warning", "#f59e0b"),
        danger: getCSSVar("--danger", "#ef4444"),
        info: getCSSVar("--info", "#3b82f6"),
        mutedForeground: getCSSVar("--muted-foreground", "#6b7280"),
      });
    };
    updateColors();
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const apiIsLoaded = useApiIsLoaded();
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState<{
    explanation?: string;
    strategic_suggestions?: string[];
    critical_points?: string[];
  } | null>(null);
  const [aiError, setAiError] = useState("");

  const fetchAiInsight = async (refresh = false) => {
    setAiLoading(true);
    setAiError("");
    try {
      const res = await apiFetch(`/dashboard/ai-insight${refresh ? "?refresh=true" : ""}`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Gagal memuat insight");
      const json = await res.json();
      setAiData(json.data);
    } catch (err: any) {
      setAiError(err.message || "Gagal menghubungi server");
    } finally {
      setAiLoading(false);
    }
  };

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
  ) => {
    const hasData = steps.length > 0;
    const chartOptions: ApexCharts.ApexOptions = {
      chart: {
        type: "bar",
        height: 380,
        toolbar: { show: false },
        events: {
          dataPointSelection: (event: any, chartContext: any, config: any) => {
            const stepIndex = config.dataPointIndex;
            const step = steps[stepIndex];
            if (step) {
              const tooltip = `${step.label}: ${formatNumber(step.value, { decimals: 0 })} leads, ${formatNumber(step.percentage ?? 0, { decimals: 1 })}% conversion.`;
              openDrilldown({
                title: `${title} · ${step.label}`,
                description: tooltip,
                href: step.href,
              });
            }
          }
        }
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: "55%",
          distributed: true,
          borderRadius: 4,
        }
      },
      colors: funnelKey === "won"
        ? [colors.brand, "oklch(0.67 0.13 276)", "oklch(0.72 0.16 281)", "oklch(0.78 0.13 281)", "oklch(0.84 0.08 281)"]
        : [colors.danger, "oklch(0.75 0.14 24)", "oklch(0.8 0.12 24)", "oklch(0.85 0.1 24)", "oklch(0.9 0.08 24)"],
      dataLabels: {
        enabled: false,
      },
      grid: {
        borderColor: "var(--border)",
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: false } }
      },
      xaxis: {
        categories: steps.map(s => s.label),
        labels: {
          show: true,
          style: {
            colors: colors.mutedForeground,
          }
        },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          show: true,
          style: {
            colors: colors.mutedForeground,
            fontSize: "12px",
          }
        }
      },
      tooltip: {
        theme: "dark",
        custom: function({ series, seriesIndex, dataPointIndex, w }) {
          const step = steps[dataPointIndex];
          if (!step) return '';
          const totalLeads = formatNumber(step.value, { decimals: 0 });
          const conversionPct = formatNumber(step.percentage ?? 0, { decimals: 1 });
          const estAmount = formatCurrency(step.estimated_amount ?? 0);
          const estPct = formatNumber(step.estimated_percentage ?? 0, { decimals: 1 });
          
          return `
            <div class="p-3 bg-slate-950 border border-slate-800 rounded-lg shadow-xl text-white font-sans min-w-[220px]">
              <div class="font-semibold text-sm mb-2 pb-1 border-b border-slate-800 text-white">${step.label}</div>
              <div class="space-y-1 text-xs">
                <div class="flex justify-between gap-4">
                  <span class="text-slate-400">Total Leads:</span>
                  <span class="font-medium text-white">${totalLeads}</span>
                </div>
                <div class="flex justify-between gap-4">
                  <span class="text-slate-400">Presentase Konversi:</span>
                  <span class="font-medium text-white">${conversionPct}%</span>
                </div>
                <div class="flex justify-between gap-4">
                  <span class="text-slate-400">Amount Estimated:</span>
                  <span class="font-medium text-white">${estAmount} (${estPct}%)</span>
                </div>
              </div>
            </div>
          `;
        }
      },
      legend: { show: false }
    };

    const series = [{
      name: "Leads",
      data: steps.map(s => Number(s.value) || 0)
    }];

    return (
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
        <div className="px-5 pb-5 pt-2">
          {hasData ? (
            <div className="w-full min-h-[380px]">
              <Chart type="bar" options={chartOptions} series={series} height={380} />
            </div>
          ) : (
            <p className="rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">No tracking funnel data yet.</p>
          )}
        </div>
      </Card>
    );
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your lead intelligence pipeline</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setAiModalOpen(true);
              fetchAiInsight(false);
            }}
            className="flex items-center gap-2 bg-[color:var(--brand)] text-white hover:bg-[color:var(--brand)]/90 cursor-pointer shadow-lg shadow-[color:var(--brand)]/20 transition-all hover:scale-105"
          >
            <BrainCircuit className="h-4 w-4" />
            <span>AI Insight</span>
          </Button>
        </div>
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
                  <CardDescription>Closed Won value grouped by product. Click columns to drill down.</CardDescription>
                </div>
                <Badge variant="info">Won value</Badge>
              </CardHeader>
              <CardContent>
                {salesVolumeRows.length > 0 ? (
                  <div className="w-full">
                    <HighchartsReact
                      highcharts={Highcharts}
                      options={{
                        chart: {
                          type: 'column',
                          backgroundColor: 'transparent',
                          height: 300,
                          style: {
                            fontFamily: 'var(--font-sans)'
                          }
                        },
                        title: { text: null },
                        credits: { enabled: false },
                        xAxis: {
                          categories: salesVolumeRows.map(row => row.label),
                          labels: {
                            style: { color: colors.mutedForeground }
                          },
                          lineColor: 'var(--border)',
                          tickColor: 'var(--border)'
                        },
                        yAxis: {
                          title: {
                            text: 'Value (Rp)',
                            style: { color: colors.mutedForeground }
                          },
                          labels: {
                            style: { color: colors.mutedForeground },
                            formatter: function(this: Highcharts.AxisLabelsFormatterContextObject) {
                              return formatNumber(Number(this.value) / 1e6, { decimals: 0 }) + 'M';
                            }
                          },
                          gridLineColor: 'var(--border)'
                        },
                        legend: { enabled: false },
                        plotOptions: {
                          column: {
                            borderRadius: 5,
                            color: colors.info,
                            cursor: 'pointer',
                            point: {
                              events: {
                                click: function(this: Highcharts.Point) {
                                  const idx = this.index;
                                  const item = salesVolumeRows[idx];
                                  if (item) {
                                    openDrilldown({
                                      title: `Sales Volume · ${item.label}`,
                                      description: `Closed Won leads for ${item.label}.`,
                                      href: hrefWithParam(item.href, "outcome", "won"),
                                    });
                                  }
                                }
                              }
                            }
                          }
                        },
                        tooltip: {
                          formatter: function(this: any) {
                            return `<b>${this.key}</b><br/>Value: ${formatCurrency(this.y ?? 0)}`;
                          }
                        },
                        series: [{
                          name: 'Sales Volume',
                          data: salesVolumeRows.map(row => Number(row.value) || 0)
                        }]
                      }}
                    />
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">No Closed Won sales volume yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-6">
            <Card className="h-full">
              <CardHeader>
                <div>
                  <CardTitle>Total Market</CardTitle>
                  <CardDescription>Lead count grouped by product. Click columns to drill down.</CardDescription>
                </div>
                <Badge variant="neutral">Lead count</Badge>
              </CardHeader>
              <CardContent>
                {totalMarket.length > 0 ? (
                  <div className="w-full">
                    <HighchartsReact
                      highcharts={Highcharts}
                      options={{
                        chart: {
                          type: 'column',
                          backgroundColor: 'transparent',
                          height: 300,
                          style: {
                            fontFamily: 'var(--font-sans)'
                          }
                        },
                        title: { text: null },
                        credits: { enabled: false },
                        xAxis: {
                          categories: totalMarket.map(row => row.label),
                          labels: {
                            style: { color: colors.mutedForeground }
                          },
                          lineColor: 'var(--border)',
                          tickColor: 'var(--border)'
                        },
                        yAxis: {
                          title: {
                            text: 'Lead Count',
                            style: { color: colors.mutedForeground }
                          },
                          labels: {
                            style: { color: colors.mutedForeground }
                          },
                          gridLineColor: 'var(--border)'
                        },
                        legend: { enabled: false },
                        plotOptions: {
                          column: {
                            borderRadius: 5,
                            color: colors.brand,
                            cursor: 'pointer',
                            point: {
                              events: {
                                click: function(this: Highcharts.Point) {
                                  const idx = this.index;
                                  const item = totalMarket[idx];
                                  if (item) {
                                    openDrilldown({
                                      title: `Total Market · ${item.label}`,
                                      description: `Leads grouped under ${item.label} (${formatCurrency(item.estimated_volume ?? 0)} est. volume)`,
                                      href: item.href,
                                    });
                                  }
                                }
                              }
                            }
                          }
                        },
                        tooltip: {
                          formatter: function(this: any) {
                            const idx = this.point.index;
                            const item = totalMarket[idx];
                            return `<b>${this.key}</b><br/>Leads: ${formatNumber(this.y ?? 0, { decimals: 0 })}<br/>Est. Volume: ${formatCurrency(item?.estimated_volume ?? 0)}`;
                          }
                        },
                        series: [{
                          name: 'Total Market',
                          data: totalMarket.map(row => Number(row.value) || 0)
                        }]
                      }}
                    />
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">No product market aggregate yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-12" data-tour="dashboard-source-channel">
            <Card className="h-full">
              <CardHeader>
                <div>
                  <CardTitle>Lead Sources & Channels</CardTitle>
                  <CardDescription>Total leads grouped by source and channel, with drilldown. Click pie slices to filter.</CardDescription>
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
                    {leadSources.length > 0 ? (
                      <div className="w-full">
                        <HighchartsReact
                          highcharts={Highcharts}
                          options={{
                            chart: {
                              type: 'pie',
                              backgroundColor: 'transparent',
                              height: 300,
                              style: {
                                fontFamily: 'var(--font-sans)'
                              }
                            },
                            title: { text: null },
                            credits: { enabled: false },
                            plotOptions: {
                              pie: {
                                innerSize: '60%',
                                cursor: 'pointer',
                                dataLabels: {
                                  enabled: true,
                                  format: '<b>{point.name}</b>: {point.y}',
                                  style: {
                                    color: colors.mutedForeground,
                                    textOutline: 'none',
                                    fontSize: '11px'
                                  }
                                },
                                point: {
                                  events: {
                                    click: function(this: Highcharts.Point) {
                                      const idx = this.index;
                                      const item = leadSources[idx];
                                      if (item) {
                                        openDrilldown({
                                          title: `Lead Source · ${item.label}`,
                                          description: `${item.label}: ${formatNumber(item.value, { decimals: 0 })} leads.`,
                                          href: item.href,
                                        });
                                      }
                                    }
                                  }
                                }
                              }
                            },
                            series: [{
                              name: 'Lead Sources',
                              colorByPoint: true,
                              data: leadSources.map(item => ({
                                name: item.label,
                                y: Number(item.value) || 0
                              }))
                            }]
                          }}
                        />
                      </div>
                    ) : (
                      <p className="rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">No lead source data yet.</p>
                    )}
                  </div>
                  <div>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Lead Channels</p>
                        <p className="text-xs text-muted-foreground">Channel detail under each lead source.</p>
                      </div>
                      <Activity className="h-4 w-4 text-[color:var(--brand)]" />
                    </div>
                    {leadChannels.length > 0 ? (
                      <div className="w-full">
                        <HighchartsReact
                          highcharts={Highcharts}
                          options={{
                            chart: {
                              type: 'pie',
                              backgroundColor: 'transparent',
                              height: 300,
                              style: {
                                fontFamily: 'var(--font-sans)'
                              }
                            },
                            title: { text: null },
                            credits: { enabled: false },
                            plotOptions: {
                              pie: {
                                innerSize: '60%',
                                cursor: 'pointer',
                                dataLabels: {
                                  enabled: true,
                                  format: '<b>{point.name}</b>: {point.y}',
                                  style: {
                                    color: colors.mutedForeground,
                                    textOutline: 'none',
                                    fontSize: '11px'
                                  }
                                },
                                point: {
                                  events: {
                                    click: function(this: Highcharts.Point) {
                                      const idx = this.index;
                                      const item = leadChannels[idx];
                                      if (item) {
                                        openDrilldown({
                                          title: `Lead Channel · ${item.label}`,
                                          description: `${item.label}: ${formatNumber(item.value, { decimals: 0 })} leads (Source: ${item.source_label ?? "Unassigned"}).`,
                                          href: item.href,
                                        });
                                      }
                                    }
                                  }
                                }
                              }
                            },
                            series: [{
                              name: 'Lead Channels',
                              colorByPoint: true,
                              data: leadChannels.map(item => ({
                                name: item.label,
                                y: Number(item.value) || 0
                              }))
                            }]
                          }}
                        />
                      </div>
                    ) : (
                      <p className="rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">No lead channel data yet.</p>
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
                    <div className="rounded-xl border border-border bg-background p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-[var(--status-success)]" />
                          <p className="text-sm font-semibold">Average Score</p>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">
                          Average lead quality across the current database.
                        </p>
                      </div>
                      <div className="flex items-center justify-center py-2">
                        <Chart
                          type="radialBar"
                          options={{
                            chart: {
                              type: "radialBar",
                              height: 180,
                              sparkline: { enabled: true }
                            },
                            plotOptions: {
                              radialBar: {
                                startAngle: -90,
                                endAngle: 90,
                                hollow: { size: "65%" },
                                track: {
                                  background: 'var(--muted)',
                                  strokeWidth: '97%',
                                },
                                dataLabels: {
                                  name: { show: false },
                                  value: {
                                    offsetY: -5,
                                    fontSize: "24px",
                                    fontWeight: "bold",
                                    color: getCSSVar("--foreground", "#000")
                                  }
                                }
                              }
                            },
                            colors: [
                              pq.average_score >= 80 ? colors.success : pq.average_score >= 60 ? colors.warning : colors.danger
                            ],
                            labels: ["Avg Score"]
                          }}
                          series={[pq.average_score ?? 0]}
                          height={180}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-background p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="h-4 w-4 text-[var(--status-info)]" />
                        <p className="text-sm font-semibold">Score Distribution</p>
                      </div>
                      <div className="w-full flex items-center justify-center">
                        <HighchartsReact
                          highcharts={Highcharts}
                          options={{
                            chart: {
                              type: 'pie',
                              backgroundColor: 'transparent',
                              height: 180,
                              style: {
                                fontFamily: 'var(--font-sans)'
                              }
                            },
                            title: { text: null },
                            credits: { enabled: false },
                            plotOptions: {
                              pie: {
                                innerSize: '60%',
                                cursor: 'pointer',
                                dataLabels: {
                                  enabled: true,
                                  format: '<b>{point.name}</b>: {point.percentage:.0f}%',
                                  style: {
                                    color: colors.mutedForeground,
                                    textOutline: 'none',
                                    fontSize: '10px'
                                  }
                                }
                              }
                            },
                            series: [{
                              name: 'Distribution',
                              data: scoreDistribution.map((item: any) => {
                                let color = colors.info;
                                if (item.band === "hot") color = colors.success;
                                if (item.band === "warm") color = colors.warning;
                                return {
                                  name: item.band.toUpperCase(),
                                  y: Number(item.count) || 0,
                                  color: color
                                };
                              })
                            }]
                          }}
                        />
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
                      {apiIsLoaded && mapPoints.map((point) => (
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
                      {apiIsLoaded && selectedMapPoint ? (
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
                <div className="space-y-4 flex flex-col justify-between h-full">
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
                      <p className="font-semibold text-xs sm:text-sm truncate">{formatCurrency(salesAchievement.target_revenue)}</p>
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
                      className="rounded-lg bg-muted/40 p-3 text-left transition-colors hover:bg-muted/70 cursor-pointer"
                    >
                      <p className="text-xs text-muted-foreground">Closed Won</p>
                      <p className="font-semibold text-xs sm:text-sm">{formatNumber(salesAchievement.closed_won_count ?? 0, { decimals: 0 })} leads</p>
                    </button>
                  </div>
                  <div className="pt-2">
                    {(salesAchievement.trend ?? []).length > 0 ? (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Revenue Realization Trend</p>
                        <Chart
                          type="area"
                          options={{
                            chart: {
                              type: "area",
                              height: 160,
                              toolbar: { show: false },
                              zoom: { enabled: false }
                            },
                            colors: [colors.brand],
                            fill: {
                              type: "gradient",
                              gradient: {
                                shadeIntensity: 1,
                                opacityFrom: 0.45,
                                opacityTo: 0.05,
                                stops: [0, 100]
                              }
                            },
                            stroke: {
                              curve: "smooth",
                              width: 3
                            },
                            dataLabels: { enabled: false },
                            grid: {
                              borderColor: "var(--border)",
                              xaxis: { lines: { show: false } },
                              yaxis: { lines: { show: true } }
                            },
                            xaxis: {
                              categories: (salesAchievement.trend ?? []).slice(-6).map((item: any) => item.date),
                              labels: {
                                style: { colors: colors.mutedForeground, fontSize: '10px' }
                              },
                              axisBorder: { show: false },
                              axisTicks: { show: false }
                            },
                            yaxis: {
                              labels: {
                                style: { colors: colors.mutedForeground, fontSize: '10px' },
                                formatter: (val) => formatNumber(val / 1e6, { decimals: 0 }) + 'M'
                              }
                            },
                            tooltip: {
                              theme: "dark",
                              y: {
                                formatter: (val) => formatCurrency(val)
                              }
                            }
                          }}
                          series={[{
                            name: "Revenue",
                            data: (salesAchievement.trend ?? []).slice(-6).map((item: any) => Number(item.total) || 0)
                          }]}
                          height={160}
                        />
                      </div>
                    ) : (
                      <p className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">Closed Won realization will appear here.</p>
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

      {/* Floating Action Button for AI Insights */}
      <button
        onClick={() => {
          setAiModalOpen(true);
          fetchAiInsight(false);
        }}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--brand)] text-white shadow-lg shadow-[color:var(--brand)]/30 hover:scale-110 active:scale-95 transition-all duration-300 group cursor-pointer"
        aria-label="AI Executive Insights"
        title="AI Executive Insights"
      >
        <span className="absolute inset-0 rounded-full bg-[color:var(--brand)]/20 animate-ping group-hover:animate-none" />
        <BrainCircuit className="h-6 w-6 relative z-10" />
      </button>

      {/* AI Executive Insights Modal */}
      <Modal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        title="AI Executive Insights"
        description={aiLoading ? "Generating real-time intelligence..." : "Automated pipeline analytics, strategic recommendations, and critical alerts"}
        size="xl"
      >
        {aiLoading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--brand)_15%,transparent)] text-[var(--brand)]">
              <span className="absolute inset-0 rounded-full bg-[color:var(--brand)]/10 animate-ping" />
              <BrainCircuit className="h-10 w-10 animate-pulse text-[var(--brand)]" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">AI is analyzing your sales funnel...</p>
              <p className="text-xs text-muted-foreground max-w-md">
                We are processing your latest lead statuses, estimated values, and conversion ratios to build strategic insights.
              </p>
            </div>
          </div>
        ) : aiError ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-sm">
            <AlertTriangle className="h-12 w-12 text-[var(--status-danger)] mb-3" />
            <p className="font-semibold text-foreground text-base">Gagal memuat AI Insight</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">{aiError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAiInsight(false)}
              className="mt-4 h-9 px-4 text-xs cursor-pointer"
            >
              Coba Lagi
            </Button>
          </div>
        ) : aiData ? (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-12">
              {/* Explanation / Maksud Angka */}
              <div className="md:col-span-5 space-y-2 md:border-r border-border/50 md:pr-6 last:border-0 last:pr-0">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-[var(--status-info)]" />
                  What the Numbers Mean
                </h4>
                <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                  {aiData.explanation || "No narrative explanation generated yet."}
                </p>
              </div>

              {/* Critical Points */}
              <div className="md:col-span-3 space-y-3 md:border-r border-border/50 md:pr-6 last:border-0 last:pr-0">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-[var(--status-danger)]" />
                  Critical Risks & Points
                </h4>
                {aiData.critical_points && aiData.critical_points.length > 0 ? (
                  <ul className="space-y-2">
                    {aiData.critical_points.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground/90">
                        <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--status-danger)]" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">No critical alerts detected in the current pipeline.</p>
                )}
              </div>

              {/* Strategic Suggestions */}
              <div className="md:col-span-4 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[var(--brand)]" />
                  Strategic Recommendations
                </h4>
                {aiData.strategic_suggestions && aiData.strategic_suggestions.length > 0 ? (
                  <ul className="space-y-2">
                    {aiData.strategic_suggestions.map((sug, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground/90">
                        <span className="mt-1.5 flex h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]" />
                        <span>{sug}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">No recommendations generated.</p>
                )}
              </div>
            </div>

            <div className="flex justify-between border-t border-border pt-4 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchAiInsight(true)}
                disabled={aiLoading}
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${aiLoading ? "animate-spin" : ""}`} />
                Refresh Analytics
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAiModalOpen(false)}
                className="h-8 text-xs cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center text-sm">
            <BrainCircuit className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="font-semibold text-foreground">No AI Insight loaded</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAiInsight(false)}
              className="mt-3 h-8 text-xs cursor-pointer"
            >
              Generate Insight
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
