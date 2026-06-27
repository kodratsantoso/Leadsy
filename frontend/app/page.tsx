"use client";

import { useEffect, useState } from "react";
import { APIProvider, AdvancedMarker, InfoWindow, Map, useApiIsLoaded } from "@vis.gl/react-google-maps";
import { Building2, TrendingUp, AlertTriangle, Target, ArrowUpRight, ArrowRight, BarChart3, Loader2, ShieldCheck, Zap, Activity, Sparkles, MapPin, Search, BrainCircuit, RefreshCw, CheckCircle2, Clock, Users, Trophy, Award, DollarSign, Percent } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { cn } from "@/lib/utils";
import { Tabs } from "@/components/ui/tabs";

import { AILoader } from "@/components/ui/ai-loader";
import { ProgressiveFluxLoader } from "@/components/ui/progressive-flux-loader";
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

function CountdownWidget() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth(); // 0-indexed
      let endMonth;

      if (month >= 0 && month <= 2) {
        endMonth = 2; // March
      } else if (month >= 3 && month <= 5) {
        endMonth = 5; // June
      } else if (month >= 6 && month <= 8) {
        endMonth = 8; // September
      } else {
        endMonth = 11; // December
      }

      const endOfQuarter = new Date(year, endMonth + 1, 0, 23, 59, 59, 999);
      const diff = endOfQuarter.getTime() - now.getTime();

      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatNum = (n: number) => String(n).padStart(2, "0");
  const quarterNum = Math.floor(new Date().getMonth() / 3) + 1;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--brand)]/20 bg-[color-mix(in_oklch,var(--brand)_5%,transparent)] px-3 py-1.5 backdrop-blur-sm shadow-sm">
      <Clock className="h-4 w-4 text-[color:var(--brand)] animate-pulse" />
      <span className="text-xs font-semibold text-muted-foreground mr-1">Q{quarterNum} Ends:</span>
      <div className="flex items-center gap-1 font-mono text-xs font-bold text-[color:var(--brand)]">
        <span>{formatNum(timeLeft.days)}</span>
        <span className="text-muted-foreground font-sans font-medium text-[10px]">d</span>
        <span className="text-muted-foreground/50">:</span>
        <span>{formatNum(timeLeft.hours)}</span>
        <span className="text-muted-foreground font-sans font-medium text-[10px]">h</span>
        <span className="text-muted-foreground/50">:</span>
        <span>{formatNum(timeLeft.minutes)}</span>
        <span className="text-muted-foreground font-sans font-medium text-[10px]">m</span>
        <span className="text-muted-foreground/50">:</span>
        <span className="text-rose-500">{formatNum(timeLeft.seconds)}</span>
        <span className="text-muted-foreground font-sans font-medium text-[10px]">s</span>
      </div>
    </div>
  );
}

function MapMarkersAndInfo({
  mapPoints,
  selectedMapPoint,
  setSelectedMapPoint
}: {
  mapPoints: DashboardMapPoint[];
  selectedMapPoint: DashboardMapPoint | null;
  setSelectedMapPoint: (point: DashboardMapPoint | null) => void;
}) {
  const apiIsLoaded = useApiIsLoaded();
  if (!apiIsLoaded) return null;

  return (
    <>
      {mapPoints.map((point) => (
        <AdvancedMarker
          key={point.id}
          position={{ lat: Number(point.lat), lng: Number(point.lng) }}
          onClick={() => setSelectedMapPoint(point)}
        >
          <div className="flex flex-col items-center">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background text-white shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer animate-fade-in"
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
          <div className="min-w-48 space-y-2 text-sm text-foreground p-1">
            <p className="font-semibold">{selectedMapPoint.company_name}</p>
            <p className="text-xs text-muted-foreground">{selectedMapPoint.address || "No address"}</p>
            <div className="flex items-center justify-between gap-2 border-t border-border pt-1.5 mt-1 text-xs">
              <span className="font-medium flex items-center gap-1.5" style={{ color: resolveStageColor(selectedMapPoint.funnel_stage?.color) }}>
                <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: resolveStageColor(selectedMapPoint.funnel_stage?.color) }} />
                {selectedMapPoint.funnel_stage?.name ?? "Unassigned"}
              </span>
              <span className="text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                Score {selectedMapPoint.lead_score ?? "—"}
              </span>
            </div>
          </div>
        </InfoWindow>
      ) : null}
    </>
  );
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

  const [period, setPeriod] = useState("month");
  const [activeTab, setActiveTab] = useState<"pipeline" | "team" | "confidentiality">("pipeline");

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", period],
    queryFn: async () => { const r = await apiFetch(`/dashboard?period=${period}`); return r.json(); },
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
      trend: dashboard.metrics_trends?.total_leads ?? [],
    },
    {
      label: "Qualified",
      value: dashboard.qualified_leads ?? "—",
      icon: Target,
      change: dashboard.qualified_change ?? null,
      color: "from-[var(--status-success)] to-[oklch(0.627_0.194_149)]",
      href: "/leads?qualification_status=eligible",
      trend: dashboard.metrics_trends?.qualified_leads ?? [],
    },
    {
      label: "In Pipeline",
      value: dashboard.pipeline_leads ?? dashboard.total_leads ?? "—",
      icon: TrendingUp,
      change: dashboard.pipeline_change ?? null,
      color: "from-[var(--status-info)] to-[oklch(0.527_0.183_249)]",
      href: "/leads?pipeline_status=active",
      trend: dashboard.metrics_trends?.pipeline_leads ?? [],
    },
    {
      label: "Duplicate Rate",
      value: dashboard.duplicate_rate ?? (dashboard.duplicate_ratio != null ? `${dashboard.duplicate_ratio}%` : "—"),
      icon: AlertTriangle,
      change: dashboard.duplicate_change ?? null,
      color: "from-[var(--status-warning)] to-[oklch(0.65_0.22_50)]",
      href: "/leads?duplicate_status=duplicates",
      trend: dashboard.metrics_trends?.duplicate_rate ?? [],
    },
  ];

  const statusStats = [
    {
      label: "Pending",
      value: dashboard.by_status?.pending ?? 0,
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      icon: RefreshCw,
      href: "/leads?qualification_status=pending"
    },
    {
      label: "Potential",
      value: dashboard.by_status?.potential ?? 0,
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
      icon: Activity,
      href: "/leads?qualification_status=potential"
    },
    {
      label: "Eligible",
      value: dashboard.by_status?.eligible ?? 0,
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
      icon: CheckCircle2,
      href: "/leads?qualification_status=eligible"
    },
    {
      label: "Not Eligible",
      value: dashboard.by_status?.not_eligible ?? 0,
      color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
      icon: AlertTriangle,
      href: "/leads?qualification_status=not_eligible"
    }
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
        custom: function ({ series, seriesIndex, dataPointIndex, w }) {
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
            <ProgressiveFluxLoader layout="feature"
              value={pct}
              showLabel={false}
              barClassName="h-2"
              gradient="var(--status-info)"
            />
          </button>
        );
      }) : (
        <p className="rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">No lead origin data yet.</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Overview of your lead intelligence pipeline</p>
          </div>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            items={[
              { key: "pipeline", label: "My Pipeline", icon: Activity },
              { key: "team", label: "Team Performance", icon: Users },
              { key: "confidentiality", label: "Confidentiality Matrix", icon: ShieldCheck },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <CountdownWidget />

          <div className="flex items-center rounded-lg border border-border bg-background/50 p-1 backdrop-blur-sm shadow-sm">
            {["week", "biweekly", "month", "quarter", "year", "all"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer capitalize ${period === p
                    ? "bg-[color:var(--brand)] text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {p === "biweekly" ? "Biweekly" : p === "all" ? "All" : p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === "pipeline" ? (
        isLoading ? (
          <div className="flex h-96 flex-col items-center justify-center py-20 text-muted-foreground select-none">
            <AILoader text="Loading" />
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            {/* Key Metrics — each opens an in-dashboard filtered drilldown */}
            <div className="md:col-span-8" data-tour="dashboard-kpis">
              <Card className="h-full flex flex-col justify-between">
                <CardHeader>
                  <div>
                    <CardTitle>Key Metrics</CardTitle>
                    <CardDescription>Core lead indicators with historical trends.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-center">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {stats.map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => openDrilldown({
                          title: s.label,
                          description: `${s.label} leads filtered from the dashboard metric.`,
                          href: s.href,
                        })}
                        className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-background p-4 text-left transition-all hover:border-[var(--brand)]/40 shadow-sm"
                      >
                        <div className="flex w-full items-start justify-between">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
                            <p className="mt-1 text-2xl font-bold">{typeof s.value === "number" ? formatNumber(s.value, { decimals: 0 }) : s.value}</p>
                          </div>
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${s.color} shadow-lg`}>
                            <s.icon className="h-5 w-5 text-white" />
                          </div>
                        </div>

                        {/* Sparkline & Deltas */}
                        <div className="mt-4 flex w-full items-center justify-between gap-4">
                          <div className="text-xs font-semibold">
                            {s.change ? (
                              <span className={s.change.startsWith("+") ? "text-emerald-500" : s.change.startsWith("-") ? "text-rose-500" : "text-muted-foreground"}>
                                {s.change}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                          {s.trend && s.trend.length > 0 ? (
                            <div className="h-10 w-24">
                              <Chart
                                type="area"
                                options={{
                                  chart: {
                                    sparkline: { enabled: true },
                                    animations: { enabled: false }
                                  },
                                  stroke: { curve: "smooth", width: 1.5 },
                                  fill: {
                                    type: "gradient",
                                    gradient: {
                                      shadeIntensity: 1,
                                      opacityFrom: 0.35,
                                      opacityTo: 0.05
                                    }
                                  },
                                  colors: [s.change?.startsWith("-") ? "#ef4444" : "#10b981"],
                                  tooltip: { enabled: false }
                                }}
                                series={[{ data: s.trend }]}
                                height={40}
                                width={96}
                              />
                            </div>
                          ) : null}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Qualification Status */}
            <div className="md:col-span-4" data-tour="dashboard-qualification">
              <Card className="h-full">
                <CardHeader>
                  <div>
                    <CardTitle>Qualification Status</CardTitle>
                    <CardDescription>Pipeline distribution by validation status.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-3">
                    {statusStats.map((status) => (
                      <button
                        key={status.label}
                        type="button"
                        onClick={() => openDrilldown({
                          title: `${status.label} Leads`,
                          description: `Leads with qualification status: ${status.label.toLowerCase()}.`,
                          href: status.href,
                        })}
                        className="group relative flex items-center justify-between rounded-xl border border-border bg-background p-3 text-left transition-all hover:border-[var(--brand)]/40 hover:bg-muted/10"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${status.color}`}>
                            <status.icon className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{status.label}</p>
                            <p className="text-xs text-muted-foreground">Click to view leads</p>
                          </div>
                        </div>
                        <p className="text-xl font-bold">{formatNumber(status.value, { decimals: 0 })}</p>
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
                              formatter: function (this: Highcharts.AxisLabelsFormatterContextObject) {
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
                                  click: function (this: Highcharts.Point) {
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
                            formatter: function (this: any) {
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
                                  click: function (this: Highcharts.Point) {
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
                            formatter: function (this: any) {
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
                                      click: function (this: Highcharts.Point) {
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
                                      click: function (this: Highcharts.Point) {
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
                                height: 320,
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
                                    name: {
                                      show: true,
                                      fontSize: "14px",
                                      color: colors.mutedForeground,
                                      offsetY: 45
                                    },
                                    value: {
                                      offsetY: -10,
                                      fontSize: "36px",
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
                            height={320}
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
                                height: 320,
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
                                    format: '<b>{point.name}</b><br>{point.percentage:.0f}%',
                                    style: {
                                      color: colors.mutedForeground,
                                      textOutline: 'none',
                                      fontSize: '12px'
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
                          <MapMarkersAndInfo
                            mapPoints={mapPoints}
                            selectedMapPoint={selectedMapPoint}
                            setSelectedMapPoint={setSelectedMapPoint}
                          />
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
              {salesAchievement.tier_level === "PRESALES" ? (
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500 animate-pulse" />
                      <div>
                        <CardTitle>Technical Trust Validation</CardTitle>
                        <CardDescription>Presales Solution Architect KPIs</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 flex flex-col justify-between h-full">
                      {/* 2x2 KPI Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-muted/40 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Technical Win Rate</p>
                          <p className="text-lg font-bold text-[color:var(--brand)]">{salesAchievement.technical_win_rate}%</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">POC Success Rate</p>
                          <p className="text-lg font-bold text-emerald-500">{salesAchievement.poc_success_rate}%</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Integration Fit</p>
                          <p className="text-lg font-bold text-blue-500">{salesAchievement.integration_fit_score}%</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">SLA Response</p>
                          <p className="text-lg font-bold text-amber-500">{salesAchievement.sla_response_time} hrs</p>
                        </div>
                      </div>

                      {/* Quota Progress */}
                      <div>
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase text-muted-foreground">Opportunities Assigned</p>
                            <p className="text-xl font-bold">{formatNumber(salesAchievement.realized_revenue, { decimals: 0 })} Leads</p>
                          </div>
                          <p className="text-sm font-semibold text-[color:var(--brand)]">
                            {Number(salesAchievement.target_revenue ?? 0) > 0
                              ? `${formatNumber(salesAchievement.achievement_percentage ?? 0, { decimals: 1 })}%`
                              : "No target"}
                          </p>
                        </div>
                        <ProgressiveFluxLoader layout="feature"
                          value={Number(salesAchievement.target_revenue ?? 0) > 0 ? Math.min(100, Number(salesAchievement.achievement_percentage ?? 0)) : 0}
                          showLabel={false}
                          barClassName="h-2 mt-2"
                          gradient="var(--brand)"
                        />
                      </div>

                      <div className="rounded-lg bg-muted/40 p-3 flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Target Opportunities:</span>
                        <span className="font-semibold">{formatNumber(salesAchievement.target_revenue, { decimals: 0 })}</span>
                      </div>

                      {/* Opportunity Sourcing Trend */}
                      <div className="pt-2">
                        {(salesAchievement.trend ?? []).length > 0 ? (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">Assignment Intake Trend</p>
                            <Chart
                              type="area"
                              options={{
                                chart: {
                                  type: "area",
                                  height: 120,
                                  toolbar: { show: false },
                                  zoom: { enabled: false },
                                  animations: { enabled: false }
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
                                    formatter: (val) => formatNumber(val, { decimals: 0 })
                                  }
                                },
                                tooltip: {
                                  theme: "dark",
                                  y: {
                                    formatter: (val) => formatNumber(val, { decimals: 0 }) + ' leads'
                                  }
                                }
                              }}
                              series={[{
                                name: "Opportunities",
                                data: (salesAchievement.trend ?? []).slice(-6).map((item: any) => Number(item.total) || 0)
                              }]}
                              height={120}
                            />
                          </div>
                        ) : (
                          <p className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">Assignment trend will appear here.</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-[color:var(--brand)]" />
                      <div>
                        <CardTitle>
                          {salesAchievement.target_type === "pipeline_value" ? "Pipeline Sourcing" : "Achievement Sales"}
                        </CardTitle>
                        <CardDescription className="capitalize">{salesAchievement.period ?? "monthly"} target</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 flex flex-col justify-between h-full">
                      <div>
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase text-muted-foreground">
                              {salesAchievement.target_type === "pipeline_value" ? "Pipeline Sourced" : "Realisasi Revenue"}
                            </p>
                            <p className="text-2xl font-bold">{formatCurrency(salesAchievement.realized_revenue)}</p>
                          </div>
                          <p className="text-sm font-semibold text-[color:var(--brand)]">
                            {Number(salesAchievement.target_revenue ?? 0) > 0
                              ? `${formatNumber(salesAchievement.achievement_percentage ?? 0, { decimals: 1 })}%`
                              : "No target"}
                          </p>
                        </div>
                        <ProgressiveFluxLoader layout="feature"
                          value={Number(salesAchievement.target_revenue ?? 0) > 0 ? Math.min(100, Number(salesAchievement.achievement_percentage ?? 0)) : 0}
                          showLabel={false}
                          barClassName="h-2 mt-2"
                          gradient="var(--brand)"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-muted/40 p-3">
                          <p className="text-xs text-muted-foreground">
                            {salesAchievement.target_type === "pipeline_value" ? "Target Pipeline" : "Target Revenue"}
                          </p>
                          <p className="font-semibold text-xs sm:text-sm truncate">{formatCurrency(salesAchievement.target_revenue)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const params = new URLSearchParams();
                            if (salesAchievement.target_type === "pipeline_value") {
                              // SDR sourced leads list
                              params.set("created_by", String(dashboard.user?.id || ""));
                            } else {
                              params.set("outcome", "won");
                            }
                            if (salesAchievement.period_start) params.set("closed_from", salesAchievement.period_start);
                            if (salesAchievement.period_end) params.set("closed_to", salesAchievement.period_end);
                            openDrilldown({
                              title: salesAchievement.target_type === "pipeline_value" ? "SDR Sourced Leads" : "Achievement Sales · Closed Won",
                              description: salesAchievement.target_type === "pipeline_value" ? "Leads generated in the active target period." : "Closed Won leads inside the active target period.",
                              href: `/leads?${params.toString()}`,
                            });
                          }}
                          className="rounded-lg bg-muted/40 p-3 text-left transition-colors hover:bg-muted/70 cursor-pointer"
                        >
                          <p className="text-xs text-muted-foreground">
                            {salesAchievement.target_type === "pipeline_value" ? "Sourced Leads" : "Closed Won"}
                          </p>
                          <p className="font-semibold text-xs sm:text-sm">{formatNumber(salesAchievement.closed_won_count ?? 0, { decimals: 0 })} leads</p>
                        </button>
                      </div>
                      <div className="pt-2">
                        {(salesAchievement.trend ?? []).length > 0 ? (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              {salesAchievement.target_type === "pipeline_value" ? "Pipeline Sourced Trend" : "Revenue Realization Trend"}
                            </p>
                            <Chart
                              type="area"
                              options={{
                                chart: {
                                  type: "area",
                                  height: 160,
                                  toolbar: { show: false },
                                  zoom: { enabled: false },
                                  animations: { enabled: false }
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
              )}
            </div>

            {/* Quota Cascading & Team Breakdown for Manager/VP */}
            {(salesAchievement.tier_level === "VP" || salesAchievement.tier_level === "MANAGER") && (salesAchievement.team_breakdown ?? []).length > 0 ? (
              <div className="md:col-span-12">
                <Card className="h-full">
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>Sales Quota Cascading & Target Accumulation</CardTitle>
                      <CardDescription>
                        Bottom-up target accumulation with a {salesAchievement.buffer_rate}% buffer protection.
                      </CardDescription>
                    </div>
                    <Badge variant="success">
                      Net Target Secured: {formatCurrency(salesAchievement.net_target)}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid gap-4 sm:grid-cols-4">
                      <div className="rounded-xl border border-border bg-background p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Team Quota (Gross)</p>
                        <p className="mt-1 text-xl font-bold">{formatCurrency(salesAchievement.gross_target)}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-background p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expected Buffer Rate</p>
                        <p className="mt-1 text-xl font-bold text-amber-500">{salesAchievement.buffer_rate}%</p>
                      </div>
                      <div className="rounded-xl border border-border bg-background p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Company Target (Net)</p>
                        <p className="mt-1 text-xl font-bold text-emerald-500">{formatCurrency(salesAchievement.net_target)}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-background p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Realized Revenue</p>
                        <p className="mt-1 text-xl font-bold">{formatCurrency(salesAchievement.realized_revenue)}</p>
                      </div>
                    </div>

                    {/* Team Breakdown Table */}
                    <div className="rounded-lg border border-border overflow-hidden bg-background">
                      <TableShell>
                        <Table>
                          <TableHead>
                            <TableRow className="hover:bg-transparent">
                              <TableHeaderCell>Rep Name</TableHeaderCell>
                              <TableHeaderCell>Tier Level</TableHeaderCell>
                              <TableHeaderCell>Target Type</TableHeaderCell>
                              <TableHeaderCell>Quota Target</TableHeaderCell>
                              <TableHeaderCell>Realized Achievement</TableHeaderCell>
                              <TableHeaderCell className="text-right">Progress</TableHeaderCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {salesAchievement.team_breakdown.map((rep: any) => {
                              const isSdr = rep.tier_level === "SDR";
                              const isPresales = rep.tier_level === "PRESALES";
                              const barColor = isSdr
                                ? "bg-indigo-500"
                                : isPresales
                                  ? "bg-emerald-500"
                                  : "bg-[color:var(--brand)]";
                              return (
                                <TableRow key={rep.id} className="hover:bg-muted/30">
                                  <TableCell>
                                    <div className="font-semibold text-sm">{rep.name}</div>
                                    <div className="text-xs text-muted-foreground">{rep.email}</div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge className="capitalize" variant={
                                      rep.tier_level === "VP" ? "danger"
                                        : rep.tier_level === "MANAGER" ? "warning"
                                          : rep.tier_level === "SR_AE" ? "info"
                                            : rep.tier_level === "JR_AE" ? "success"
                                              : rep.tier_level === "PRESALES" ? "brand"
                                                : "neutral"
                                    }>
                                      {rep.tier_level.replace("_", " ")}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs font-medium uppercase">
                                    {rep.target_type === "pipeline_value" ? (
                                      <span className="text-indigo-400 font-semibold">Pipeline Sourced</span>
                                    ) : rep.target_type === "opportunities" ? (
                                      <span className="text-amber-400 font-semibold">Opportunities Assigned</span>
                                    ) : (
                                      <span className="text-emerald-400 font-semibold">Closed-Won</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">
                                    {rep.target_type === "opportunities"
                                      ? `${formatNumber(rep.target_revenue, { decimals: 0 })} Leads`
                                      : formatCurrency(rep.target_revenue)}
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">
                                    {rep.target_type === "opportunities"
                                      ? `${formatNumber(rep.realized_revenue, { decimals: 0 })} Leads`
                                      : formatCurrency(rep.realized_revenue)}
                                  </TableCell>
                                  <TableCell className="text-right min-w-[150px]">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const params = new URLSearchParams();
                                        if (isSdr) {
                                          params.set("created_by", rep.id);
                                        } else if (isPresales) {
                                          params.set("owner_id", rep.id);
                                        } else {
                                          params.set("outcome", "won");
                                          params.set("owner_id", rep.id);
                                        }
                                        if (salesAchievement.period_start) params.set("closed_from", salesAchievement.period_start);
                                        if (salesAchievement.period_end) params.set("closed_to", salesAchievement.period_end);

                                        openDrilldown({
                                          title: `${rep.name} · ${isSdr
                                              ? "Sourced Leads"
                                              : isPresales
                                                ? "Assigned Opportunities"
                                                : "Closed Won Leads"
                                            }`,
                                          description: `Leads contributed by ${rep.name} in the selected period.`,
                                          href: `/leads?${params.toString()}`,
                                        });
                                      }}
                                      className="block w-full text-left cursor-pointer group"
                                    >
                                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                                        <span className="group-hover:text-[var(--brand)] transition-colors">
                                          {formatNumber(rep.achievement_percentage, { decimals: 1 })}%
                                        </span>
                                        <span className="text-muted-foreground group-hover:underline text-[10px]">Detail →</span>
                                      </div>
                                      <ProgressiveFluxLoader layout="feature"
                                        value={Math.min(100, rep.achievement_percentage)}
                                        showLabel={false}
                                        barClassName="h-1.5"
                                        gradient={`var(${barColor.replace('bg-[color:', '').replace(']', '')})`}
                                      />
                                    </button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableShell>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}

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
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${lead.qualification_status === "eligible" ? "bg-[color-mix(in_oklch,var(--status-success)_10%,transparent)] text-[var(--status-success)]"
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
        )
      ) : activeTab === "team" ? (
        <TeamPerformancePanel period={period} onDrilldown={openDrilldown} />
      ) : (
        <ConfidentialityMatrixPanel />
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

function TeamPerformancePanel({ 
  period,
  onDrilldown
}: { 
  period: string;
  onDrilldown: (d: { href: string; title: string; description: string }) => void;
}) {
  const [roleFilter, setRoleFilter] = useState<string>("sales");

  const { data: teamDataResponse, isLoading } = useQuery({
    queryKey: ["team-performance", period],
    queryFn: async () => {
      const res = await apiFetch(`/dashboard/team-performance?period=${period}`);
      return res.json();
    },
  });

  const teams = teamDataResponse?.data?.teams ?? [];
  const activeTeam = teams.find((t: any) => t.role_category === roleFilter) || teams[0];

  const { formatCurrency, formatNumber } = useNumberFormat();

  if (isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center py-20 text-muted-foreground select-none">
        <AILoader text="Loading Team Performance" />
      </div>
    );
  }

  const availableRoles = teams.map((t: any) => t.role_category);

  return (
    <div className="space-y-6">
      <Card className="border-border/50 bg-card/40 backdrop-blur-md shadow-sm">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: "sales", label: "Sales" },
              { key: "presales", label: "Presales" },
              { key: "am", label: "Account Manager" },
              { key: "csm", label: "CSM" },
            ].filter(grp => availableRoles.includes(grp.key) || grp.key === roleFilter).map((grp) => (
              <button
                key={grp.key}
                type="button"
                onClick={() => setRoleFilter(grp.key)}
                className={cn(
                  "rounded-lg px-4 py-2 text-xs font-bold transition-all duration-300 cursor-pointer shadow-sm border border-border/20",
                  roleFilter === grp.key || (!availableRoles.includes(roleFilter) && grp.key === activeTeam?.role_category)
                    ? "bg-[color:var(--brand)] text-white scale-[1.02] shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                {grp.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {!activeTeam ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2">
          <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold">No team data found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            There are no users or KPIs configured for this role.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div>
              <h3 className="text-xl font-extrabold capitalize">{activeTeam.role_category} Team Performance</h3>
              <p className="text-sm text-muted-foreground">Aggregated KPIs across {activeTeam.user_count} team members</p>
            </div>
            {activeTeam.overall_achievement !== null && (
               <div className="text-right">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Overall Achievement</p>
                  <p className={cn(
                    "text-2xl font-black font-mono",
                    activeTeam.overall_achievement >= 100 ? "text-[color:var(--status-success)]" :
                    activeTeam.overall_achievement >= 50 ? "text-[color:var(--status-warning)]" :
                    "text-[color:var(--status-danger)]"
                  )}>
                    {activeTeam.overall_achievement.toFixed(1)}%
                  </p>
               </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {activeTeam.metrics.map((metric: any) => {
               const isPct = metric.format === 'percentage';
               const isCur = metric.format === 'currency';
               
               const actualStr = isCur ? formatCurrency(metric.actual) : isPct ? `${metric.actual}%` : formatNumber(metric.actual, { decimals: 0 });
               const targetStr = metric.target !== null ? (isCur ? formatCurrency(metric.target) : isPct ? `${metric.target}%` : formatNumber(metric.target, { decimals: 0 })) : null;

               const achievement = metric.achievement_percentage;

               return (
                 <Card 
                   key={metric.kpi_key} 
                   className="relative overflow-hidden group hover:shadow-md hover:-translate-y-1 border-border/40 bg-card transition-all duration-300 cursor-pointer"
                   onClick={() => {
                     if (metric.drilldown_href) {
                       onDrilldown({
                         href: metric.drilldown_href,
                         title: `Drilldown: ${metric.kpi_name}`,
                         description: `Filtered by ${activeTeam.role_category} team's condition for this metric.`
                       });
                     }
                   }}
                 >
                   <CardHeader className="p-4 pb-2">
                     <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground truncate" title={metric.kpi_name}>
                       {metric.kpi_name}
                     </CardTitle>
                   </CardHeader>
                   <CardContent className="p-4 pt-0 space-y-3">
                     <div className="flex items-baseline gap-2">
                       <span className="text-2xl font-black">{actualStr}</span>
                       {targetStr && (
                         <span className="text-sm font-semibold text-muted-foreground line-clamp-1">
                           / {targetStr}
                         </span>
                       )}
                     </div>

                     {achievement !== null && (
                       <div className="space-y-1.5">
                         <div className="flex justify-between items-center text-[10px] font-bold">
                           <span className={cn(
                             achievement >= 100 ? "text-[color:var(--status-success)]" :
                             achievement >= 50 ? "text-[color:var(--status-warning)]" :
                             "text-[color:var(--status-danger)]"
                           )}>
                             {achievement}% Achieved
                           </span>
                         </div>
                         <ProgressiveFluxLoader 
                           layout="feature" 
                           value={Math.min(achievement, 100)} 
                           showLabel={false}
                           barClassName="h-1.5 rounded-full"
                           gradient={
                             achievement >= 100 ? "var(--status-success)" :
                             achievement >= 50 ? "var(--status-warning)" :
                             "var(--status-danger)"
                           }
                         />
                       </div>
                     )}
                   </CardContent>
                   <div className="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100">
                     <div className="rounded-full bg-[color:var(--brand)]/10 text-[color:var(--brand)] p-1.5">
                        <ArrowRight className="w-4 h-4" />
                     </div>
                   </div>
                 </Card>
               );
            })}
          </div>

          {activeTeam.metrics.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="border-border/40 bg-card lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Overall Achievement</CardTitle>
                  <CardDescription>Average KPI fulfillment</CardDescription>
                </CardHeader>
                <CardContent className="relative flex justify-center pb-6">
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={{
                      chart: { type: 'pie', backgroundColor: 'transparent', height: 250, margin: [0, 0, 0, 0] },
                      title: { text: null },
                      tooltip: { enabled: false },
                      plotOptions: {
                        pie: {
                          innerSize: '80%',
                          borderWidth: 0,
                          dataLabels: { enabled: false },
                          enableMouseTracking: false
                        }
                      },
                      series: [{
                        data: [
                          { name: 'Achieved', y: activeTeam.overall_achievement || 0, color: 'var(--brand)' },
                          { name: 'Remaining', y: Math.max(0, 100 - (activeTeam.overall_achievement || 0)), color: 'rgba(255,255,255,0.05)' }
                        ]
                      }],
                      credits: { enabled: false }
                    }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-black mt-2">{activeTeam.overall_achievement ? activeTeam.overall_achievement.toFixed(1) : 0}%</span>
                    <span className="text-[10px] text-muted-foreground font-semibold tracking-wider">ACHIEVED</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/40 bg-card lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">KPI Performance Breakdown</CardTitle>
                  <CardDescription>Individual metric achievements</CardDescription>
                </CardHeader>
                <CardContent className="pb-6">
                  <Chart
                    type="bar"
                    height={250}
                    options={{
                      chart: { toolbar: { show: false }, background: 'transparent' },
                      plotOptions: {
                        bar: {
                          horizontal: false,
                          borderRadius: 4,
                          columnWidth: '40%',
                          dataLabels: { position: 'top' },
                        }
                      },
                      colors: ['var(--brand)'],
                      dataLabels: {
                        enabled: true,
                        formatter: (val) => `${val}%`,
                        style: { colors: ['#fff'], fontSize: '10px' },
                        offsetY: -20
                      },
                      xaxis: {
                        categories: activeTeam.metrics.map((m: any) => m.kpi_name),
                        labels: { 
                          style: { colors: 'var(--muted-foreground)', fontSize: '11px', fontWeight: 600 } 
                        },
                        axisBorder: { show: false },
                        axisTicks: { show: false }
                      },
                      yaxis: {
                        max: Math.max(100, Math.max(...activeTeam.metrics.map((m: any) => m.achievement_percentage || 0)) + 10),
                        labels: {
                          style: { colors: 'var(--muted-foreground)' },
                          formatter: (val) => `${val.toFixed(0)}%`
                        }
                      },
                      grid: { borderColor: 'rgba(255,255,255,0.05)', strokeDashArray: 4 },
                      theme: { mode: 'dark' },
                      tooltip: { theme: 'dark' }
                    }}
                    series={[{
                      name: 'Achievement',
                      data: activeTeam.metrics.map((m: any) => m.achievement_percentage || 0)
                    }]}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ConfidentialityMatrixPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-confidentiality-matrix"],
    queryFn: () => apiFetch("/api/dashboard/confidentiality-matrix").then((res) => res.json()).then((res) => res.data),
  });

  if (isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center py-20 text-muted-foreground select-none">
        <AILoader text="Analyzing Matrix" />
      </div>
    );
  }

  if (!data) return null;

  const levelColor =
    data.level === "restricted" ? "text-rose-500" :
    data.level === "high" ? "text-amber-500" :
    data.level === "medium" ? "text-blue-500" :
    "text-emerald-500";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Global Confidentiality Assessment</CardTitle>
            <CardDescription>Based on aggregate pipeline exposure.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className={cn("p-4 rounded-xl bg-muted/30 border border-border flex items-center justify-center flex-col min-w-32", levelColor)}>
                <ShieldCheck className="h-8 w-8 mb-2" />
                <span className="font-bold text-lg capitalize">{data.level}</span>
                <span className="text-xs font-semibold text-muted-foreground mt-1">Score: {data.score}</span>
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm font-semibold text-foreground">Recommendation</p>
                <p className="text-sm text-muted-foreground">{data.recommended_access_handling}</p>
                <p className="text-sm text-muted-foreground mt-2">{data.classification_reason}</p>
              </div>
            </div>

            {data.special_attention && data.special_attention.length > 0 && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-widest text-rose-500 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Special Attention Required
                </h4>
                <ul className="list-disc list-inside text-sm text-rose-500/80 space-y-1">
                  {data.special_attention.map((att: string, i: number) => (
                    <li key={i}>{att}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assessment Basis</CardTitle>
            <CardDescription>Factors contributing to the confidentiality score.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.basis?.map((b: any, i: number) => (
                <div key={i} className="flex justify-between items-start border-b border-border/50 pb-4 last:border-0 last:pb-0">
                  <div className="space-y-1 pr-4">
                    <p className="text-sm font-bold text-foreground">{b.parameter}</p>
                    <p className="text-xs text-muted-foreground">{b.reason}</p>
                  </div>
                  <div className="text-right whitespace-nowrap space-y-1">
                    <p className="text-sm font-semibold">{b.value}</p>
                    <Badge variant="neutral" className="text-[10px]">+{b.score_impact} pts</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

