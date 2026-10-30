"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Building2,
  Bot,
  MessageSquare,
  Briefcase,
  CheckCircle2,
  Search,
  Sparkles,
  ArrowRight,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  Send,
  Sliders,
  ExternalLink,
  ChevronRight,
  Eye,
  Check,
  Copy,
  Clock,
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FeatureScreen {
  id: string;
  name: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  headline: string;
  description: string;
  url: string;
  statusBadge: string;
}

export function LandingProductScreenshots() {
  const [activeTab, setActiveTab] = useState<string>("map");

  const tabs: FeatureScreen[] = [
    {
      id: "map",
      name: "Peta Teritorial",
      badge: "Google Maps API",
      icon: MapPin,
      headline: "Geo-Radar Teritorial & Pemetaan Prospek Lapangan",
      description: "Petakan dan temukan calon prospek enterprise dalam radius geofencing hingga 25 km dengan deteksi klaster bisnis dan navigasi kunjungan rute sales.",
      url: "https://app.leadsy.tech/map",
      statusBadge: "Live Geocoding",
    },
    {
      id: "idx",
      name: "900+ Emiten BEI",
      badge: "IDX Database",
      icon: Building2,
      headline: "Screener 900+ Emiten Saham Publik Bursa Efek Indonesia",
      description: "Akses lengkap ke ratusan perusahaan publik terdaftar di BEI dengan data kapitalisasi pasar, sektor industri, dan direct company screening bernilai jumbo.",
      url: "https://app.leadsy.tech/emiten",
      statusBadge: "IDX Market SSOT",
    },
    {
      id: "ai",
      name: "8-Stage AI Screening",
      badge: "Multi-LLM Pipeline",
      icon: Bot,
      headline: "Evaluasi BANTC Otonom Tanpa Asumsi Subjektif",
      description: "Pipeline multi-model (GPT-4o, Claude 3.5, DeepSeek R1) memverifikasi profil bisnis, kelayakan capex, dan C-Level authority dalam waktu < 90 detik.",
      url: "https://app.leadsy.tech/leads/842/ai-screening",
      statusBadge: "8-Stage Verified",
    },
    {
      id: "inbox",
      name: "WhatsApp Omnichannel",
      badge: "Dual-Engine BSP",
      icon: MessageSquare,
      headline: "Sentralisasi Percakapan WhatsApp & Lark Base Sync",
      description: "Dukungan dual-engine WhatsApp (Mekari Qontak Official BSP + Local Baileys Engine) tersinkronisasi 2 arah ke Lark Base dan audit log percakapan tim.",
      url: "https://app.leadsy.tech/inbox",
      statusBadge: "Dual Engine Active",
    },
    {
      id: "presales",
      name: "Presales & O2C Sizing",
      badge: "Order-to-Cash",
      icon: Briefcase,
      headline: "Standardisasi Kalkulator Manday & Split Komisi Tim",
      description: "Perumusan ruang lingkup proyek berdasarkan rate card terstandar, perhitungan margin keuntungan, e-sign BAST, dan transparansi komisi lintas divisi.",
      url: "https://app.leadsy.tech/solutions/sizing",
      statusBadge: "Rate Card Standard",
    },
  ];

  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <section id="screens" className="py-20 md:py-28 relative scroll-mt-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            <Eye className="w-3.5 h-3.5" />
            <span>TAMPILAN INTERFACE PRODUK NYATA</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
            Eksplorasi Antarmuka Operasional Leadsy
          </h2>
          <p className="text-base text-muted-foreground">
            Bukan sekadar mockup konsep. Lihat langsung bagaimana tim sales, presales, dan delivery mengeksekusi pipeline penjualan nyata di dalam platform Leadsy.
          </p>
        </div>

        {/* Feature Navigation Tabs */}
        <div className="flex items-center justify-start lg:justify-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-muted/50 border border-border/60 shadow-xs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap active:scale-[0.98]",
                    isActive
                      ? "bg-background text-primary font-bold shadow-xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                  <span>{tab.name}</span>
                  <span
                    className={cn(
                      "hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded-md font-mono",
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Browser Window Frame with Real Screen UI */}
        <div className="relative max-w-6xl mx-auto">
          {/* Subtle Outer Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-indigo-500/15 to-violet-600/20 rounded-3xl blur-xl opacity-70 pointer-events-none -z-10" />

          {/* Browser Container */}
          <div className="rounded-2xl sm:rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-2xl overflow-hidden transition-all duration-300">
            {/* macOS Browser Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <div className="ml-3 hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-md bg-background/70 border border-border/50 text-xs font-mono text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{currentTab.url}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20 text-[11px] font-mono">
                  {currentTab.statusBadge}
                </span>
              </div>
            </div>

            {/* Screen Context Banner */}
            <div className="px-5 py-3 border-b border-border/50 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <currentTab.icon className="w-4 h-4 text-primary" />
                  {currentTab.headline}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{currentTab.description}</p>
              </div>
              <Link href="/login" className="shrink-0">
                <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs gap-1.5 border-border/80 hover:bg-background active:scale-[0.98]">
                  <span>Coba di Live App</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </Button>
              </Link>
            </div>

            {/* SCREEN 1: REAL UI OF TERRITORY MAP (/map) */}
            {activeTab === "map" && (
              <div className="p-4 sm:p-6 animate-in fade-in duration-200 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Left Sidebar: Lead Discovery List & Radius Filter */}
                  <div className="md:col-span-4 space-y-3">
                    <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">Filter Teritorial</span>
                        <span className="text-[10px] font-mono bg-primary/15 text-primary px-1.5 py-0.5 rounded font-semibold">
                          Google Maps API
                        </span>
                      </div>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                        <input
                          type="text"
                          readOnly
                          value="Mega Kuningan, Jakarta Selatan"
                          className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg bg-background border border-border text-foreground font-medium"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-muted-foreground text-[11px]">Radius: 5.0 km</span>
                        <span className="font-mono text-primary font-bold">34 Enterprise</span>
                      </div>
                    </div>

                    {/* Prospek Items in Territory */}
                    <div className="space-y-2">
                      {[
                        { name: "PT Nusantara Mega Solusindo", score: 88, cat: "Retail Logistics", dist: "2.8 km", won: true },
                        { name: "PT Samudra Prima Logistik", score: 82, cat: "Supply Chain", dist: "3.4 km", won: false },
                        { name: "PT Graha Surya Mandiri", score: 79, cat: "Manufacturing", dist: "4.1 km", won: false },
                        { name: "PT Cipta Sarana Telekom", score: 76, cat: "Telecommunication", dist: "4.8 km", won: false },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "p-2.5 rounded-xl border text-xs transition-all",
                            idx === 0
                              ? "bg-primary/10 border-primary/40 shadow-xs"
                              : "bg-card border-border/60 hover:bg-muted/40"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground truncate max-w-[170px]">{item.name}</span>
                            <span className="font-mono font-bold text-primary text-[11px]">{item.score}/100</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                            <span>{item.cat}</span>
                            <span className="font-mono">{item.dist}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Map Canvas Mockup */}
                  <div className="md:col-span-8 rounded-xl border border-border/70 overflow-hidden relative min-h-[360px] bg-slate-900 flex flex-col justify-between p-4">
                    {/* Simulated Radar Grid lines */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] opacity-35" />

                    {/* Radar Circles */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-primary/30 rounded-full pointer-events-none" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-primary/15 rounded-full pointer-events-none" />

                    {/* Center HQ Marker */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                      <div className="w-5 h-5 rounded-full bg-primary ring-4 ring-primary/40 flex items-center justify-center text-[9px] text-white font-bold">
                        HQ
                      </div>
                      <span className="text-[10px] font-mono text-white/90 mt-1 bg-black/75 px-2 py-0.5 rounded-md">
                        Teritori Pusat
                      </span>
                    </div>

                    {/* Active Lead Floating Card (Nusantara Mega) */}
                    <div className="absolute top-1/4 left-1/4 z-20 bg-card/95 backdrop-blur-md border border-primary/50 p-3 rounded-xl shadow-xl max-w-[260px]">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-xs font-bold text-foreground truncate">PT Nusantara Mega Solusindo</span>
                        <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-500 font-bold px-1.5 py-0.5 rounded">
                          Grade A
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground space-y-0.5 mb-2 font-mono">
                        <div>Kawasan: Mega Kuningan (2.8 km)</div>
                        <div>Solvensi: Capex Approved (Rp 480M)</div>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1 border-t border-border/60">
                        <button className="flex-1 text-[10px] font-semibold py-1 px-2 rounded-lg bg-primary text-primary-foreground text-center">
                          Arahkan Navigasi
                        </button>
                        <button className="text-[10px] font-medium py-1 px-2 rounded-lg bg-muted text-foreground border border-border">
                          Buka CRM
                        </button>
                      </div>
                    </div>

                    {/* Other Pins */}
                    <div className="absolute bottom-1/4 right-1/3 z-10 flex items-center gap-1 bg-card/90 backdrop-blur-sm border border-border px-2 py-1 rounded-lg text-[10px]">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span className="text-foreground font-medium">PT Samudra Prima (3.4 km)</span>
                    </div>
                    <div className="absolute top-1/3 right-1/4 z-10 flex items-center gap-1 bg-card/90 backdrop-blur-sm border border-border px-2 py-1 rounded-lg text-[10px]">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-foreground font-medium">PT Graha Surya (4.1 km)</span>
                    </div>

                    {/* Bottom Status bar */}
                    <div className="relative z-10 flex items-center justify-between text-xs text-white/80 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 mt-auto">
                      <span>Google Maps Geofencing Engine • 34 Accounts Ready for Route Planning</span>
                      <span className="font-mono text-emerald-400 font-semibold">Cluster Active</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 2: REAL UI OF 900+ IDX EQUITIES (/emiten) */}
            {activeTab === "idx" && (
              <div className="p-4 sm:p-6 animate-in fade-in duration-200 space-y-4">
                {/* Search & Sector Filter Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-muted/30 border border-border/60">
                  <div className="flex items-center gap-2 flex-1 max-w-md">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      readOnly
                      value="Filter Emiten BEI (900+ Perusahaan Tercatat)"
                      className="w-full text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 text-foreground"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-muted-foreground text-[11px]">Sektor:</span>
                    <span className="px-2 py-1 rounded-md bg-primary/10 text-primary font-bold border border-primary/20">Semua Sektor</span>
                    <span className="px-2 py-1 rounded-md bg-card border border-border text-muted-foreground">Consumer</span>
                    <span className="px-2 py-1 rounded-md bg-card border border-border text-muted-foreground">Tech &amp; Telco</span>
                    <span className="px-2 py-1 rounded-md bg-card border border-border text-muted-foreground">Logistik</span>
                  </div>
                </div>

                {/* Data Table */}
                <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b border-border/60 text-[11px] font-semibold text-muted-foreground font-mono">
                      <tr>
                        <th className="p-3">TICKER &amp; PERUSAHAAN</th>
                        <th className="p-3">SEKTOR BEI</th>
                        <th className="p-3">MARKET CAP</th>
                        <th className="p-3">STATUS SOLVENSI</th>
                        <th className="p-3">AI QUALIFICATION</th>
                        <th className="p-3 text-right">AKSI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {[
                        { ticker: "ICBP", name: "Indofood CBP Sukses Makmur Tbk", sector: "Consumer Goods", cap: "Rp 128.2 Triliun", sol: "Solid Capex", grade: "Grade A (88)", fit: "Enterprise POS & ERP Sync" },
                        { ticker: "MTDL", name: "Metrodata Electronics Tbk", sector: "Information Technology", cap: "Rp 7.8 Triliun", sol: "High Liquidity", grade: "Grade A (91)", fit: "Cloud Infrastructure Integration" },
                        { ticker: "ASSA", name: "Adi Sarana Armada Tbk", sector: "Transportation & Logistics", cap: "Rp 3.1 Triliun", sol: "Approved Expansion", grade: "Grade B (84)", fit: "Fleet Geo-Radar & IoT" },
                        { ticker: "MYOR", name: "Mayora Indah Tbk", sector: "Consumer Staples", cap: "Rp 54.1 Triliun", sol: "Solid Reserves", grade: "Grade A (86)", fit: "Multi-Hub Inventory Sync" },
                        { ticker: "WIFI", name: "Solusi Sinergi Digital Tbk", sector: "Telecommunication", cap: "Rp 3.2 Triliun", sol: "Active Capex", grade: "Grade B (82)", fit: "Network Integration Sizing" },
                      ].map((row, i) => (
                        <tr key={i} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            <div className="font-mono font-bold text-indigo-500">{row.ticker}</div>
                            <div className="text-foreground font-medium text-[11px]">{row.name}</div>
                          </td>
                          <td className="p-3 text-muted-foreground">{row.sector}</td>
                          <td className="p-3 font-mono font-semibold text-foreground">{row.cap}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                              {row.sol}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="font-mono font-bold text-primary">{row.grade}</div>
                            <div className="text-[10px] text-muted-foreground">{row.fit}</div>
                          </td>
                          <td className="p-3 text-right">
                            <button className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 text-[11px] font-semibold hover:bg-primary hover:text-primary-foreground transition-all">
                              Lihat Profil AI
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SCREEN 3: REAL UI OF 8-STAGE AI SCREENING & BANTC */}
            {activeTab === "ai" && (
              <div className="p-4 sm:p-6 animate-in fade-in duration-200 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-muted/20 border border-border/60">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-base">
                      NM
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-foreground">PT Nusantara Mega Solusindo</h4>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-primary/15 text-primary font-bold">
                          Overall Fit: 88/100 (Grade A)
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                        Multi-LLM Synthesis: GPT-4o • Claude 3.5 Sonnet • DeepSeek R1 Reasoning
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-muted-foreground">Kualifikasi Selesai</div>
                    <div className="text-sm font-bold text-emerald-500 font-mono">84 Detik (Otonom)</div>
                  </div>
                </div>

                {/* 8-Stage Pipeline Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  {[
                    { num: "01", name: "Company Legitimacy", status: "Terdaftar Kemenkumham & NIB", score: "100%" },
                    { num: "02", name: "Market & Solution Fit", status: "Kebutuhan Cloud Multi-Cabang", score: "94%" },
                    { num: "03", name: "Technology Stack", status: "Legacy POS Menuju Cloud Modern", score: "High" },
                    { num: "04", name: "Financial Solvency", status: "Capex Approved (Rp 450M-600M)", score: "Solid" },
                    { num: "05", name: "Authority Verification", status: "VP Technology & Operations Head", score: "Validated" },
                    { num: "06", name: "Implementation Window", status: "Go-live Ditargetkan Q4 2026", score: "Urgent" },
                    { num: "07", name: "Competitive Threat", status: "Incumbent Vendor Lambat", score: "Low Threat" },
                    { num: "08", name: "BANTC Final Scoring", status: "Rekomendasi Closing Positif", score: "Grade A" },
                  ].map((s, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-card border border-border/50 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                        <span>STAGE #{s.num}</span>
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      </div>
                      <div className="font-semibold text-foreground text-[11px] truncate">{s.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{s.status}</div>
                      <div className="text-[11px] font-mono font-bold text-primary pt-0.5">{s.score}</div>
                    </div>
                  ))}
                </div>

                {/* Executive AI Recommendation Box */}
                <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-foreground">Rekomendasi AI Strategis: </span>
                    <span className="text-muted-foreground">
                      Prospek memiliki urgensi tinggi untuk menggantikan sistem legacy sebelum libur akhir tahun. Tawarkan arsitektur offline-first POS terintegrasi WhatsApp CRM dengan estimasi kontrak Rp 480.000.000/thn. Probabilitas deal closing: <strong>92%</strong>.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 4: REAL UI OF OMNICHANNEL INBOX & WHATSAPP (/inbox) */}
            {activeTab === "inbox" && (
              <div className="p-4 sm:p-6 animate-in fade-in duration-200 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 min-h-[380px]">
                  {/* Left Contacts List */}
                  <div className="md:col-span-4 rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-border/60">
                      <span className="text-xs font-bold text-foreground">Percakapan WhatsApp</span>
                      <span className="text-[10px] font-mono text-emerald-500 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Dual Engine Connected
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {[
                        { name: "VP Technology Nusantara", time: "10:14", text: "Terima kasih, draft BAST sudah kami...", active: true, unread: 0 },
                        { name: "Head of IT Samudra Prima", time: "09:48", text: "Bisa jadwalkan demo teknis besok?", active: false, unread: 2 },
                        { name: "Procurement Graha Surya", time: "Kemarin", text: "Tolong kirimkan form rate-card.", active: false, unread: 0 },
                      ].map((c, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "p-2.5 rounded-lg border text-xs cursor-pointer transition-all",
                            c.active ? "bg-primary/10 border-primary/30" : "bg-card border-border/40 hover:bg-muted/40"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground truncate">{c.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{c.time}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{c.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Middle Chat Pane */}
                  <div className="md:col-span-5 rounded-xl border border-border/60 bg-card p-3 flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-2 border-b border-border/60 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                          NM
                        </div>
                        <div>
                          <div className="font-bold text-foreground">VP Technology Nusantara</div>
                          <div className="text-[10px] text-emerald-500 font-mono">+62 811-9281-XXXX • Verified WhatsApp</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                        Mekari Official BSP
                      </span>
                    </div>

                    {/* Chat Bubble History */}
                    <div className="space-y-2 py-3 text-xs flex-1">
                      <div className="p-2.5 rounded-xl bg-muted/40 max-w-[85%] space-y-0.5">
                        <div className="font-semibold text-[11px] text-foreground">Andi Pratama (Sales):</div>
                        <p className="text-muted-foreground leading-relaxed">
                          "Selamat pagi Pak Hendra. Berikut kami lampirkan dokumen estimasi manday dan scope arsitektur cloud untuk 50 cabang."
                        </p>
                        <span className="text-[9px] text-muted-foreground font-mono block text-right">10:12 • Centang Dua</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-primary/15 border border-primary/20 max-w-[85%] ml-auto space-y-0.5">
                        <div className="font-semibold text-[11px] text-primary">VP Technology Nusantara:</div>
                        <p className="text-foreground leading-relaxed">
                          "Terima kasih Pak Andi. Tim arsitek kami sudah review, sizing-nya sesuai target capex Q4. Kita lanjutkan ke tahap draft kontrak."
                        </p>
                        <span className="text-[9px] text-primary font-mono block text-right">10:14</span>
                      </div>
                    </div>

                    {/* Input Reply Box */}
                    <div className="pt-2 border-t border-border/60 flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value="Ketik pesan WhatsApp atau pilih template proposal..."
                        className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-muted/30 border border-border text-muted-foreground"
                      />
                      <button className="p-2 rounded-lg bg-primary text-primary-foreground">
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Right CRM Context Pane */}
                  <div className="md:col-span-3 rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3 text-xs">
                    <div className="font-bold text-foreground pb-1.5 border-b border-border/60">
                      CRM Lead Context
                    </div>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Deal Stage:</span>
                        <span className="font-bold text-emerald-500 font-mono">Contract Signed</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Contract Value:</span>
                        <span className="font-mono font-bold text-foreground">Rp 480.000.000</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lark Base Sync:</span>
                        <span className="font-mono text-primary font-semibold">Live Synced</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sales Owner:</span>
                        <span className="text-foreground font-medium">Andi Pratama</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Presales Architect:</span>
                        <span className="text-foreground font-medium">Dimas Setiawan</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/60">
                      <div className="text-[10px] text-muted-foreground mb-1">Status Delivery &amp; SLA:</div>
                      <div className="p-1.5 rounded bg-card border border-border/40 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                        ✓ Kickoff Meeting Confirmed
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 5: REAL UI OF PRESALES SIZING & O2C WORKSPACE (/solutions) */}
            {activeTab === "presales" && (
              <div className="p-4 sm:p-6 animate-in fade-in duration-200 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Scope of Work Table */}
                  <div className="md:col-span-7 space-y-3">
                    <div className="p-3 rounded-xl bg-card border border-border/60 space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-border/50 text-xs">
                        <span className="font-bold text-foreground">Kalkulator Sizing Manday Solusi</span>
                        <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded font-semibold">
                          Standard Rate Card
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        {[
                          { role: "Solution Architect", days: "20 Mandays", rate: "Rp 3.750.000 / day", total: "Rp 75.000.000" },
                          { role: "Lead Backend & Cloud Engineer", days: "30 Mandays", rate: "Rp 3.160.000 / day", total: "Rp 95.000.000" },
                          { role: "Field QA & Regional Integration", days: "25 Mandays", rate: "Rp 2.000.000 / day", total: "Rp 50.000.000" },
                          { role: "Core Cloud Engine License", days: "Annual Sub", rate: "50 Hubs Cluster", total: "Rp 260.000.000" },
                        ].map((r, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/40 text-[11px]">
                            <div>
                              <div className="font-semibold text-foreground">{r.role}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{r.days} • {r.rate}</div>
                            </div>
                            <span className="font-mono font-bold text-foreground">{r.total}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-bold">
                        <span>Total Kontrak Solusi:</span>
                        <span className="font-mono text-primary text-sm">Rp 480.000.000</span>
                      </div>
                    </div>
                  </div>

                  {/* Order-to-Cash Team Split & Signoff */}
                  <div className="md:col-span-5 space-y-3">
                    <div className="p-3 rounded-xl bg-card border border-border/60 space-y-2.5">
                      <div className="font-bold text-foreground text-xs pb-1.5 border-b border-border/50">
                        Order-to-Cash (O2C) Deal Commission Split
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="p-2 rounded-lg bg-muted/20 border border-border/40 flex items-center justify-between">
                          <div>
                            <div className="font-medium text-foreground">Andi Pratama</div>
                            <div className="text-[10px] text-muted-foreground">Commercial Lead (Sales)</div>
                          </div>
                          <span className="font-mono font-bold text-primary">40% • Rp 192M</span>
                        </div>

                        <div className="p-2 rounded-lg bg-muted/20 border border-border/40 flex items-center justify-between">
                          <div>
                            <div className="font-medium text-foreground">Dimas Setiawan</div>
                            <div className="text-[10px] text-muted-foreground">Presales Architect</div>
                          </div>
                          <span className="font-mono font-bold text-indigo-500">30% • Rp 144M</span>
                        </div>

                        <div className="p-2 rounded-lg bg-muted/20 border border-border/40 flex items-center justify-between">
                          <div>
                            <div className="font-medium text-foreground">Customer Success &amp; Delivery</div>
                            <div className="text-[10px] text-muted-foreground">Onboarding &amp; SLA Retensi</div>
                          </div>
                          <span className="font-mono font-bold text-foreground">30% • Rp 144M</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">E-Sign BAST Status:</span>
                        <span className="font-mono text-emerald-500 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Legally Signed &amp; Stamped
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
