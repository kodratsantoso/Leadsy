"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { throwIfApiError } from "@/lib/apiError";
import dynamic from "next/dynamic";
import Highcharts from "highcharts";
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  Plus,
  CheckCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Globe,
  Phone,
  Mail,
  MapPin,
  FileText,
  ShieldCheck,
  Briefcase,
  Calendar,
  Layers,
  Sparkles,
  Users,
  Search,
  Copy,
  Check,
  BarChart2,
  Coins
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

const HighchartsReact = dynamic(() => import("highcharts-react-official"), { ssr: false });

export default function IdxCompanyDetailPage() {
  const routerParams = useParams();
  const rawCode = (routerParams?.code as string | string[] | undefined) || "";
  const code = (Array.isArray(rawCode) ? rawCode[0] : rawCode).toUpperCase();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [chartMode, setChartMode] = useState<"highcharts" | "tradingview">("highcharts");
  const [chartRange, setChartRange] = useState<"1M" | "3M" | "ALL">("3M");
  const [copied, setCopied] = useState(false);

  // Fetch company details from backend
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["idx-company-detail", code],
    queryFn: async () => {
      const res = await apiFetch(`/lead-generator/idx-companies/${code}`);
      await throwIfApiError(res, "Gagal memuat detail emiten IDX");
      return res.json();
    },
    enabled: Boolean(code),
  });

  const company = data?.data;

  // Mutation to import this company to Leads
  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/lead-generator/idx-companies/import`, {
        method: "POST",
        body: JSON.stringify({
          companies: [
            {
              idx_code: company.idx_code,
              company_name: company.company_name,
              industry: company.industry,
              sub_industry: company.sub_industry,
              sector: company.sector,
              listing_board: company.listing_board,
              website: company.website,
              address: company.address,
              phone: company.phone,
              email: company.email,
              raw_source_payload: company.raw_payload,
            },
          ],
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal mengimpor emiten ke Leads");
      }
      return res.json();
    },
    onSuccess: (resData) => {
      queryClient.invalidateQueries({ queryKey: ["idx-company-detail", code] });
      queryClient.invalidateQueries({ queryKey: ["idx-companies"] });
      queryClient.invalidateQueries({ queryKey: ["idx-filters"] });
      toast.success(`${company.company_name} berhasil ditambahkan ke daftar Leads!`);
    },
    onError: (err: any) => {
      toast.fromError(err, "Gagal mengimpor ke Leads");
    },
  });

  const handleCopySummary = () => {
    if (!company) return;
    const text = `Emiten: ${company.company_name} (${company.idx_code})
Sektor: ${company.sector || "-"} | ${company.industry || "-"}
Papan: ${company.listing_board || "-"}
Website: ${company.website || "-"}
Telepon: ${company.phone || "-"}
Email: ${company.email || "-"}
Kegiatan Usaha: ${company.main_business || "-"}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Ringkasan emiten berhasil disalin ke clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  const stockTrend = company?.stock_trend;
  const seriesData = useMemo(() => {
    if (!stockTrend?.series) return [];
    const all = stockTrend.series;
    if (chartRange === "1M") {
      return all.slice(Math.max(0, all.length - 22)); // approx 22 trading days
    }
    if (chartRange === "3M") {
      return all.slice(Math.max(0, all.length - 65));
    }
    return all;
  }, [stockTrend, chartRange]);

  const highchartsOptions = useMemo<Highcharts.Options>(() => {
    if (!seriesData || seriesData.length === 0) return {};

    const pricePoints = seriesData.map((s: any) => [s.timestamp, s.price]);
    const isPositive = (stockTrend?.change_1d || 0) >= 0;
    const lineColor = isPositive ? "#10b981" : "#ef4444";
    const gradientStart = isPositive ? "rgba(16, 185, 129, 0.35)" : "rgba(239, 68, 68, 0.35)";

    return {
      chart: {
        type: "area",
        backgroundColor: "transparent",
        height: 320,
        style: {
          fontFamily: "inherit",
        },
        spacing: [15, 10, 15, 10],
      },
      title: {
        text: undefined,
      },
      credits: {
        enabled: false,
      },
      xAxis: {
        type: "datetime",
        labels: {
          style: { color: "var(--muted-foreground)", fontSize: "11px" },
          format: "{value:%d %b}",
        },
        lineColor: "rgba(150, 150, 150, 0.2)",
        tickColor: "rgba(150, 150, 150, 0.2)",
      },
      yAxis: {
        title: { text: undefined },
        labels: {
          style: { color: "var(--muted-foreground)", fontSize: "11px" },
          formatter: function () {
            return "Rp " + Number(this.value).toLocaleString("id-ID");
          },
        },
        gridLineColor: "rgba(150, 150, 150, 0.12)",
      },
      tooltip: {
        shared: true,
        useHTML: true,
        backgroundColor: "rgba(24, 24, 27, 0.95)",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderRadius: 8,
        style: { color: "#fff", fontSize: "12px" },
        formatter: function () {
          const point = this.points?.[0];
          const dateStr = Highcharts.dateFormat("%A, %d %B %Y", point?.x as number);
          const valStr = Number(point?.y).toLocaleString("id-ID");
          return `
            <div style="padding: 4px 6px;">
              <div style="font-size: 11px; opacity: 0.7; margin-bottom: 2px;">${dateStr}</div>
              <div style="font-weight: 700; font-size: 14px; color: ${lineColor};">Rp ${valStr}</div>
            </div>
          `;
        },
      },
      legend: {
        enabled: false,
      },
      plotOptions: {
        area: {
          fillColor: {
            linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
            stops: [
              [0, gradientStart],
              [1, "rgba(255, 255, 255, 0)"],
            ],
          },
          lineColor: lineColor,
          lineWidth: 2,
          marker: {
            radius: 2,
            fillColor: lineColor,
          },
          states: {
            hover: {
              lineWidth: 3,
            },
          },
          threshold: null,
        },
      },
      series: [
        {
          type: "area",
          name: "Harga Penutupan",
          data: pricePoints,
        },
      ],
    };
  }, [seriesData, stockTrend]);

  const renderBoardBadge = (board?: string | null) => {
    if (!board) return null;
    switch (board) {
      case "Utama":
        return <Badge variant="neutral" className="text-xs px-2 py-0.5">Papan Utama</Badge>;
      case "Pemantauan Khusus":
        return <Badge variant="outline" className="text-xs px-2 py-0.5 border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10">Pemantauan Khusus</Badge>;
      case "Pengembangan":
        return <Badge variant="outline" className="text-xs px-2 py-0.5 border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5">Pengembangan</Badge>;
      case "Akselerasi":
        return <Badge variant="outline" className="text-xs px-2 py-0.5 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5">Akselerasi</Badge>;
      case "Ekonomi Baru":
        return <Badge variant="outline" className="text-xs px-2 py-0.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">Ekonomi Baru</Badge>;
      default:
        return <Badge variant="outline" className="text-xs px-2 py-0.5">{board}</Badge>;
    }
  };

  if (isLoading || !code) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-[color:var(--brand)]" />
        <p className="text-sm text-muted-foreground">Memuat data lengkap emiten {code || "IDX"} dari IDX...</p>
      </div>
    );
  }

  if (isError || !company) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <Building2 className="h-12 w-12 mx-auto text-muted-foreground/40" />
        <h2 className="text-lg font-semibold">Emiten Tidak Ditemukan</h2>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : `Data untuk kode emiten ${code} tidak tersedia di basis data IDX.`}
        </p>
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Coba Muat Ulang
          </Button>
          <Link href="/lead-generator/idx">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Daftar Emiten
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isPriceUp = (stockTrend?.change_1d || 0) >= 0;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Navigation Breadcrumb & Back */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/lead-generator/idx">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="text-xs text-muted-foreground">
            <Link href="/lead-generator" className="hover:underline">Lead Generator</Link>
            <span className="mx-1.5">/</span>
            <Link href="/lead-generator/idx" className="hover:underline">IDX Public Companies</Link>
            <span className="mx-1.5">/</span>
            <span className="font-semibold text-foreground">{company.idx_code}</span>
          </div>
        </div>

        {/* Action Header Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopySummary} className="h-9 text-xs">
            {copied ? <Check className="mr-1.5 h-3.5 w-3.5 text-green-500" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
            {copied ? "Tersalin" : "Salin Profil"}
          </Button>

          <a href={company.idx_official_url} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm" className="h-9 text-xs">
              <FileText className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              Keterbukaan IDX
              <ExternalLink className="ml-1.5 h-3 w-3" />
            </Button>
          </a>

          {company.is_in_leads ? (
            <div className="flex items-center gap-2">
              <Badge variant="success" className="h-9 px-3 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 font-medium text-xs">
                <CheckCircle className="mr-1.5 h-4 w-4" />
                Sudah Ada di Leads
              </Badge>
              {company.lead_id && (
                <Link href={`/leads/${company.lead_id}`} target="_blank">
                  <Button size="sm" className="h-9 text-xs">
                    Buka Lead Profile <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <Button 
              size="sm" 
              onClick={() => importMutation.mutate()} 
              disabled={importMutation.isPending}
              className="h-9 text-xs font-semibold"
            >
              {importMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1.5 h-4 w-4" />
              )}
              Add to Leads
            </Button>
          )}
        </div>
      </div>

      {/* Main Company Overview Banner */}
      <Card className="border border-border/80 shadow-xs">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              {company.logo_url ? (
                <div className="h-16 w-16 shrink-0 rounded-xl border border-border bg-white dark:bg-muted/30 p-2 flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={company.logo_url} alt={company.idx_code} className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="h-16 w-16 shrink-0 rounded-xl border border-border bg-muted/40 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-muted-foreground/60" />
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs font-bold tracking-wider px-2 py-0.5 border-[var(--brand)] text-[var(--brand)] bg-[var(--brand)]/5">
                    {company.idx_code}
                  </Badge>
                  {renderBoardBadge(company.listing_board)}
                  <Badge variant="neutral" className="text-xs">
                    {company.sector || "Umum"}
                  </Badge>
                  {company.industry && (
                    <span className="text-xs text-muted-foreground">· {company.industry}</span>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {company.company_name}
                </h1>

                {company.website && (
                  <a
                    href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[color:var(--brand)] hover:underline font-medium"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    {company.website}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Quick Financial Stock Metric Highlight */}
            {stockTrend && (
              <div className="flex md:flex-col items-baseline md:items-end justify-between border-t md:border-t-0 md:border-l border-border/60 pt-4 md:pt-0 md:pl-6 shrink-0 gap-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Harga Saham Terakhir</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-foreground">
                    Rp {Number(stockTrend.current_price).toLocaleString("id-ID")}
                  </span>
                  <div className={`flex items-center text-xs font-semibold ${isPriceUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {isPriceUp ? <TrendingUp className="mr-1 h-3.5 w-3.5" /> : <TrendingDown className="mr-1 h-3.5 w-3.5" />}
                    {isPriceUp ? "+" : ""}{stockTrend.change_1d} ({stockTrend.change_1d_percent}%)
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Simbol: {company.tradingview_symbol} · Volume: {Number(stockTrend.volume_latest || 0).toLocaleString("id-ID")}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grid: Stock Visualization (Left 2 cols) & B2B Commercial Signals (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stock Movement Visualizer */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-border shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-muted/10">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-[color:var(--brand)]" />
                <h2 className="text-sm font-semibold">Visualisasi Pergerakan Saham ({company.idx_code})</h2>
              </div>

              {/* Mode Switcher: Highcharts vs TradingView Live Widget */}
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-lg border border-border p-0.5 bg-background text-xs">
                  <button
                    onClick={() => setChartMode("highcharts")}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      chartMode === "highcharts" ? "bg-[var(--brand)] text-white font-medium shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Interactive Chart
                  </button>
                  <button
                    onClick={() => setChartMode("tradingview")}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      chartMode === "tradingview" ? "bg-[var(--brand)] text-white font-medium shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Live TradingView
                  </button>
                </div>

                {chartMode === "highcharts" && (
                  <div className="inline-flex rounded-lg border border-border p-0.5 bg-background text-xs">
                    {(["1M", "3M", "ALL"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setChartRange(r)}
                        className={`px-2 py-0.5 rounded-md transition-colors ${
                          chartRange === r ? "bg-muted font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <CardContent className="p-4 sm:p-6">
              {chartMode === "highcharts" ? (
                <div>
                  <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                    <div className="p-2.5 rounded-lg border border-border/50 bg-muted/15">
                      <span className="text-[11px] text-muted-foreground block">Rentang 90 Hari</span>
                      <span className="text-xs sm:text-sm font-bold font-mono text-foreground">
                        Rp {Number(stockTrend?.low_period || 0).toLocaleString("id-ID")} - {Number(stockTrend?.high_period || 0).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-border/50 bg-muted/15">
                      <span className="text-[11px] text-muted-foreground block">Performa Periode</span>
                      <span className={`text-xs sm:text-sm font-bold font-mono ${
                        (stockTrend?.period_change_percent || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      }`}>
                        {(stockTrend?.period_change_percent || 0) >= 0 ? "+" : ""}{stockTrend?.period_change_percent}%
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg border border-border/50 bg-muted/15">
                      <span className="text-[11px] text-muted-foreground block">Harga Penutupan Lalu</span>
                      <span className="text-xs sm:text-sm font-bold font-mono text-foreground">
                        Rp {Number(stockTrend?.previous_close || 0).toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>

                  <div className="h-[320px] w-full">
                    <HighchartsReact highcharts={Highcharts} options={highchartsOptions} />
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center mt-2">
                    *Tren historis harian bursa efek (IDX) berdasarkan harga penutupan resmi.
                  </p>
                </div>
              ) : (
                /* TradingView Live Embedded Widget for IDX ticker */
                <div className="w-full h-[400px] rounded-lg overflow-hidden border border-border">
                  <iframe
                    title={`TradingView Chart ${company.idx_code}`}
                    src={`https://s.tradingview.com/widgetembed/?symbol=IDX%3A${company.idx_code}&interval=D&hidesidetoolbar=1&symboledit=1&saveimage=0&toolbarbg=f1f3f6&studies=[]&theme=dark&style=1&timezone=Asia%2FJakarta&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=id&utm_source=leadsy.tech`}
                    className="w-full h-full border-0"
                    loading="lazy"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Core Business & Operations Description */}
          <Card className="border border-border shadow-xs">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-[color:var(--brand)]" />
                <h3 className="text-sm font-semibold">Kegiatan Usaha Utama & Operasional</h3>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line bg-muted/10 p-4 rounded-xl border border-border/60">
                {company.main_business || "Informasi deskripsi kegiatan usaha utama belum tercatat di data IDX."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Commercial & B2B Action Intelligence */}
        <div className="space-y-6">
          {/* B2B Commercial Signals Card */}
          <Card className="border border-border shadow-xs">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold">B2B Commercial Intelligence</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Profil kesiapan korporat dan parameter kualifikasi penjualan B2B dari status emiten publik.
              </p>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Tingkat Tata Kelola (Governance)</span>
                    <Badge variant="brand" className="text-[10px]">Tinggi (Public Co)</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Perusahaan terbuka memiliki transparansi laporan keuangan kuartalan, audit publik, dan alokasi anggaran formal.
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Kapasitas Belanja Modal (Capex)</span>
                    <Badge variant="neutral" className="text-[10px]">
                      {company.listing_board === "Utama" ? "Sangat Kuat (Tier-1)" : "Berkembang"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Tercatat di {company.listing_board || "Bursa Efek Indonesia"} dengan struktur modal teruji.
                  </p>
                </div>
              </div>

              {/* Action: Discover PICs for this company */}
              <div className="pt-2 border-t border-border/60">
                <div className="flex flex-col gap-2">
                  <a
                    href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(company.company_name)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="outline" size="sm" className="w-full justify-between text-xs h-9">
                      <span className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-blue-500" />
                        Cari PIC di LinkedIn
                      </span>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>

                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(`${company.company_name} Direksi Komisaris Management`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="outline" size="sm" className="w-full justify-between text-xs h-9">
                      <span className="flex items-center gap-2">
                        <Search className="h-3.5 w-3.5 text-emerald-500" />
                        Susunan Direksi & Manajemen
                      </span>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emiten Securities & IPO Registry */}
          <Card className="border border-border shadow-xs">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-[color:var(--brand)]" />
                <h3 className="text-sm font-semibold">Efek Terbitan & Administrasi Saham</h3>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-muted-foreground block mb-1">Instrumen Efek Terdaftar:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {company.securities?.length > 0 ? (
                      company.securities.map((s: string) => (
                        <Badge key={s} variant="outline" className="text-[11px] font-normal">
                          {s}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground italic">Saham Biasa</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">Biro Administrasi Efek (BAE)</span>
                  <span className="font-medium text-foreground text-right">{company.bae || "Dikelola Sendiri / Tidak Ada"}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">Tanggal Pencatatan (IPO)</span>
                  <span className="font-medium text-foreground">
                    {company.listing_date ? new Date(company.listing_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground">NPWP Korporat</span>
                  <span className="font-mono font-medium text-foreground">{company.npwp || "-"}</span>
                </div>

                {company.npkp && (
                  <div className="flex justify-between py-1.5 border-b border-border/40">
                    <span className="text-muted-foreground">NPKP</span>
                    <span className="font-mono font-medium text-foreground">{company.npkp}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full Corporate Directory & Official Contacts */}
      <Card className="border border-border shadow-xs">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <MapPin className="h-4 w-4 text-[color:var(--brand)]" />
            <h3 className="text-sm font-semibold">Kontak Kantor Pusat & Sekretariat Perusahaan</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/10 space-y-1">
              <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                <MapPin className="h-3.5 w-3.5" /> Alamat Kantor Pusat
              </span>
              <p className="text-foreground whitespace-pre-line leading-relaxed pt-1">
                {company.address || "-"}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/10 space-y-1">
              <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                <Phone className="h-3.5 w-3.5" /> Telepon & Faksimili
              </span>
              <p className="text-foreground pt-1 font-mono">
                Tel: {company.phone || "-"}
              </p>
              {company.fax && (
                <p className="text-foreground font-mono">
                  Fax: {company.fax}
                </p>
              )}
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/10 space-y-1">
              <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                <Mail className="h-3.5 w-3.5" /> Email Resmi Korporat
              </span>
              <p className="pt-1">
                {company.email ? (
                  <a href={`mailto:${company.email}`} className="text-[color:var(--brand)] hover:underline break-all font-medium">
                    {company.email}
                  </a>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </p>
              <span className="text-[10px] text-muted-foreground block mt-1">Corporate Secretary / Investor Relations</span>
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/10 space-y-1">
              <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                <Globe className="h-3.5 w-3.5" /> Website Resmi
              </span>
              <p className="pt-1">
                {company.website ? (
                  <a
                    href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[color:var(--brand)] hover:underline break-all font-medium inline-flex items-center gap-1"
                  >
                    {company.website} <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </p>
              <span className="text-[10px] text-muted-foreground block mt-1">Portal Korporat Resmi</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
