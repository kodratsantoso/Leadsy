"use client";

import { useState } from "react";
import {
  MapPin,
  Bot,
  Briefcase,
  Users,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  Layers,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sliders,
  DollarSign,
  HeartPulse,
  Database,
  Building2,
  Calendar,
  Activity,
  LineChart,
  ArrowUpRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export function LandingBentoFeatures() {
  const [activeRadius, setActiveRadius] = useState("5.0 km");
  const [activeIdxSector, setActiveIdxSector] = useState("consumer");

  const idxCompanies = {
    consumer: [
      { ticker: "ICBP", name: "Indofood CBP Sukses Makmur", cap: "Rp 128T", fit: "High Enterprise Fit" },
      { ticker: "MYOR", name: "Mayora Indah Tbk", cap: "Rp 54T", fit: "Cloud POS Fit" },
    ],
    tech: [
      { ticker: "MTDL", name: "Metrodata Electronics Tbk", cap: "Rp 7.8T", fit: "ERP & Cloud Scope" },
      { ticker: "WIFI", name: "Solusi Sinergi Digital Tbk", cap: "Rp 3.2T", fit: "Network Hub Scope" },
    ],
    logistics: [
      { ticker: "ASSA", name: "Adi Sarana Armada Tbk", cap: "Rp 3.1T", fit: "Fleet Geo-Sync Fit" },
      { ticker: "SMDR", name: "Samudera Indonesia Tbk", cap: "Rp 5.9T", fit: "Supply Ledger Fit" },
    ]
  };

  return (
    <section id="features" className="py-20 md:py-28 relative scroll-mt-20">
      <div id="capabilities" className="scroll-mt-20" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            <Layers className="w-3.5 h-3.5" />
            <span>ARSITEKTUR PLATFORM &amp; FITUR UNGGULAN</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
            Kapabilitas Lengkap untuk Mengakselerasi Siklus Revenue B2B
          </h2>
          <p className="text-base text-muted-foreground">
            Satu ekosistem terpadu yang menghubungkan intelijen teritorial geospasial Google Maps, database 900+ emiten IDX, model kualifikasi AI otonom, dan operasional closing deal.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Card 1: Geo-Radar Map & Territory Scanner (Col 7) */}
          <div className="md:col-span-12 lg:col-span-7 rounded-2xl border border-border/70 bg-card p-6 sm:p-8 flex flex-col justify-between overflow-hidden relative shadow-sm group hover:border-primary/40 transition-colors">
            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Radius Teritorial:</span>
                  <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50 text-xs font-mono">
                    {["2.5 km", "5.0 km", "10.0 km"].map((r) => (
                      <button
                        key={r}
                        onClick={() => setActiveRadius(r)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all active:scale-[0.98]",
                          activeRadius === r
                            ? "bg-primary text-primary-foreground font-bold shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                Geo-Radar Map &amp; Territory Intelligence
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
                Petakan calon prospek enterprise langsung di Google Maps berdasarkan radius wilayah operasional, tipe industri, serta klaster bisnis untuk merencanakan kunjungan lapangan yang terarah dan hemat waktu.
              </p>
            </div>

            {/* Authentic Map UI Frame Mockup (Dummy Data) */}
            <div className="rounded-xl border border-border/80 bg-muted/30 overflow-hidden">
              <div className="relative h-56 sm:h-64 bg-slate-900/90 dark:bg-slate-950 overflow-hidden p-4 flex flex-col justify-between">
                {/* Simulated Radar Grid lines */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40" />

                {/* Radar Sweep Circle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-primary/40 rounded-full animate-ping duration-1000 opacity-20 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 border border-primary/20 rounded-full pointer-events-none" />

                {/* Center Pulse (HQ) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-primary ring-4 ring-primary/30 flex items-center justify-center text-[8px] text-white font-bold">
                    HQ
                  </div>
                  <span className="text-[10px] font-mono text-white/80 mt-1 bg-black/60 px-1.5 py-0.5 rounded">Mega Kuningan Hub</span>
                </div>

                {/* Pin 1: Dummy Enterprise 1 */}
                <div className="absolute top-1/4 left-1/3 flex items-center gap-1.5 bg-card/90 backdrop-blur-sm border border-primary/40 px-2 py-1 rounded-lg shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-bold text-foreground">PT Nusantara Mega Solusindo</span>
                  <span className="text-[10px] text-primary font-mono font-semibold">Score: 88</span>
                </div>

                {/* Pin 2: Dummy Enterprise 2 */}
                <div className="absolute bottom-1/4 right-1/4 flex items-center gap-1.5 bg-card/90 backdrop-blur-sm border border-border px-2 py-1 rounded-lg shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-[11px] font-bold text-foreground">PT Samudra Prima Logistik</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Supply Chain</span>
                </div>

                {/* Pin 3: Dummy Enterprise 3 */}
                <div className="absolute top-1/3 right-1/5 flex items-center gap-1.5 bg-card/90 backdrop-blur-sm border border-border px-2 py-1 rounded-lg shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-[11px] font-bold text-foreground">PT Graha Surya Mandiri</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Manufacturing</span>
                </div>

                {/* Top Overlay Stats */}
                <div className="relative z-10 flex items-center justify-between text-xs text-white">
                  <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>34 Prospek Terdeteksi di Radius {activeRadius}</span>
                  </div>
                  <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 font-mono text-[11px] text-emerald-400">
                    Live Geocoding Active
                  </div>
                </div>

                <div className="relative z-10 text-[10px] text-white/60">
                  Google Maps API Integration • Latitude: -6.2297, Longitude: 106.8295 (Jakarta Selatan)
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: 900+ Emiten Publik IDX BEI Intelligence (Col 5) */}
          <div className="md:col-span-12 lg:col-span-5 rounded-2xl border border-border/70 bg-card p-6 sm:p-8 flex flex-col justify-between shadow-sm group hover:border-indigo-500/40 transition-colors">
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-semibold">
                  900+ Emiten BEI Terindeks
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                IDX Public Equities Intelligence
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Akses instan ke ratusan emiten publik terdaftar di Bursa Efek Indonesia (IDX). Filter berdasarkan kapitalisasi pasar, sektor industri, dan data direksi untuk akun B2B bernilai jumbo.
              </p>
            </div>

            {/* IDX Mockup UI */}
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
              {/* Sector Tabs */}
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg text-xs">
                {[
                  { id: "consumer", label: "Konsumer" },
                  { id: "tech", label: "Teknologi" },
                  { id: "logistics", label: "Logistik" },
                ].map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => setActiveIdxSector(sec.id)}
                    className={cn(
                      "flex-1 py-1 rounded text-center transition-all text-[11px] font-medium",
                      activeIdxSector === sec.id
                        ? "bg-background text-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {sec.label}
                  </button>
                ))}
              </div>

              {/* Company List */}
              <div className="space-y-1.5">
                {(idxCompanies[activeIdxSector as keyof typeof idxCompanies] || []).map((item) => (
                  <div key={item.ticker} className="flex items-center justify-between p-2 rounded-lg bg-card border border-border/40 text-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-indigo-500">{item.ticker}</span>
                        <span className="text-foreground font-medium truncate max-w-[150px]">{item.name}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">Market Cap: {item.cap}</div>
                    </div>
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      {item.fit}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Direct Financial &amp; C-Level Screening</span>
                <span className="text-indigo-500 font-semibold flex items-center gap-0.5">
                  Explore IDX Data <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Deep 8-Stage Autonomous AI Screening (Col 4) */}
          <div className="md:col-span-12 lg:col-span-4 rounded-2xl border border-border/70 bg-card p-6 sm:p-8 flex flex-col justify-between shadow-sm group hover:border-primary/40 transition-colors">
            <div className="space-y-2 mb-4">
              <div className="p-2.5 rounded-xl bg-violet-600/10 text-violet-600 dark:text-violet-400 border border-violet-600/20 w-fit">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-foreground">
                8-Stage AI Screening Engine
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Evaluasi otomatis multi-LLM (GPT-4o, Claude 3.5, DeepSeek) memverifikasi profil bisnis hingga skor kelayakan BANTC dalam &lt; 90 detik tanpa riset manual.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
              {[
                { stage: "Market & ICP Alignment", score: "94% Match" },
                { stage: "Tech Stack & API Readiness", score: "Modern Cloud" },
                { stage: "Solvency & Budget Capacity", score: "Capex Approved" },
                { stage: "Decision Authority Verification", score: "C-Level Validated" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-card border border-border/40">
                  <span className="text-muted-foreground text-[11px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    {item.stage}
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-primary">{item.score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Presales Estimator & Rate Cards (Col 4) */}
          <div className="md:col-span-12 lg:col-span-4 rounded-2xl border border-border/70 bg-card p-6 sm:p-8 flex flex-col justify-between shadow-sm group hover:border-primary/40 transition-colors">
            <div className="space-y-2 mb-4">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 w-fit">
                <Briefcase className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-foreground">
                Presales Sizing &amp; Rate-Cards
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Standardisasi kalkulasi manday, role rate-card, dan matriks kompleksitas arsitektur solusi sebelum proposal dirilis ke calon klien.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-border/60">
                <span className="font-semibold text-foreground">Kalkulasi Manday Proyek</span>
                <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded font-semibold">Standardized</span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between items-center bg-card p-1.5 rounded border border-border/40">
                  <span className="text-muted-foreground">Solutions Architect (20d)</span>
                  <span className="font-mono font-medium text-foreground">Rp 75.000.000</span>
                </div>
                <div className="flex justify-between items-center bg-card p-1.5 rounded border border-border/40">
                  <span className="text-muted-foreground">Lead Cloud Engineer (30d)</span>
                  <span className="font-mono font-medium text-foreground">Rp 95.000.000</span>
                </div>
                <div className="flex justify-between items-center bg-card p-1.5 rounded border border-border/40">
                  <span className="text-muted-foreground">Integration &amp; QA Deployment</span>
                  <span className="font-mono font-medium text-foreground">Rp 50.000.000</span>
                </div>
              </div>

              <div className="pt-1.5 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">Total Estimasi Layanan</span>
                <span className="font-extrabold text-primary text-sm font-mono">Rp 220.000.000</span>
              </div>
            </div>
          </div>

          {/* Card 5: Order-to-Cash & Deal Split (Col 4) */}
          <div className="md:col-span-12 lg:col-span-4 rounded-2xl border border-border/70 bg-card p-6 sm:p-8 flex flex-col justify-between shadow-sm group hover:border-primary/40 transition-colors">
            <div className="space-y-2 mb-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 w-fit">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-foreground">
                Order-to-Cash &amp; Deal Split
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Transparansi pembagian komisi lintas fungsi antara Sales Rep, Presales Architect, dan Customer Success dengan data yang terstandarisasi.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-border/60">
                <span className="text-muted-foreground">Deal #LEAD-842 Total:</span>
                <span className="font-mono font-bold text-foreground">Rp 480.000.000</span>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center p-1.5 rounded bg-card border border-border/40">
                  <span className="text-[11px]">Commercial Lead (Andi Pratama)</span>
                  <span className="font-mono font-semibold text-primary">40% • Rp 192M</span>
                </div>
                <div className="flex justify-between items-center p-1.5 rounded bg-card border border-border/40">
                  <span className="text-[11px]">Presales Architect (Dimas Setiawan)</span>
                  <span className="font-mono font-semibold text-indigo-500">30% • Rp 144M</span>
                </div>
                <div className="flex justify-between items-center p-1.5 rounded bg-card border border-border/40">
                  <span className="text-[11px]">Customer Success &amp; Delivery</span>
                  <span className="font-mono font-semibold text-foreground">30% • Rp 144M</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
