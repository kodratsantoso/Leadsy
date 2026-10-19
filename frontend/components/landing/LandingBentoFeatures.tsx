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
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

export function LandingBentoFeatures() {
  const [activeRadius, setActiveRadius] = useState("5.0 km");

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
            Satu ekosistem terpadu yang menghubungkan intelijen geospasial, model evaluasi AI otonom, kolaborasi teknis presales, dan operasional closing deal.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Card 1: Geo-Radar Map & Territory Scanner (Col 8) */}
          <div className="md:col-span-12 lg:col-span-8 rounded-2xl border border-border/70 bg-card p-6 sm:p-8 flex flex-col justify-between overflow-hidden relative shadow-sm group hover:border-primary/40 transition-colors">
            <div className="space-y-2 mb-6">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Radius:</span>
                  <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg text-xs font-mono">
                    {["2.5 km", "5.0 km", "10.0 km"].map((r) => (
                      <button
                        key={r}
                        onClick={() => setActiveRadius(r)}
                        className={cn(
                          "px-2 py-0.5 rounded transition-all",
                          activeRadius === r ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"
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
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
                Cari dan filter calon prospek di Google Maps berdasarkan radius wilayah operasional, tipe industri, serta kepadatan klaster bisnis untuk merencanakan kunjungan lapangan yang efisien.
              </p>
            </div>

            {/* Authentic Map UI Frame Mockup */}
            <div className="rounded-xl border border-border/80 bg-muted/30 overflow-hidden">
              {/* Map Canvas Mockup */}
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
                  <span className="text-[10px] font-mono text-white/80 mt-1 bg-black/60 px-1.5 py-0.5 rounded">Mega Kuningan</span>
                </div>

                {/* Pin 1: Holycow */}
                <div className="absolute top-1/4 left-1/3 flex items-center gap-1.5 bg-card/90 backdrop-blur-sm border border-primary/40 px-2 py-1 rounded-lg shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-bold text-foreground">PT Holycow Dan Kawan</span>
                  <span className="text-[10px] text-primary font-mono font-semibold">Score: 88</span>
                </div>

                {/* Pin 2: Siloam */}
                <div className="absolute bottom-1/4 right-1/4 flex items-center gap-1.5 bg-card/90 backdrop-blur-sm border border-border px-2 py-1 rounded-lg shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-[11px] font-bold text-foreground">RS Siloam Semanggi</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Healthcare</span>
                </div>

                {/* Pin 3: Telkom Landmark */}
                <div className="absolute top-1/3 right-1/5 flex items-center gap-1.5 bg-card/90 backdrop-blur-sm border border-border px-2 py-1 rounded-lg shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-[11px] font-bold text-foreground">PT Telkom Landmark</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Telco • IDX</span>
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
                  Google Maps Platform • Lat: -6.2297, Lng: 106.8295 (Jakarta Selatan)
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Presales Estimator & Rate Cards (Col 4) */}
          <div className="md:col-span-12 lg:col-span-4 rounded-2xl border border-border/70 bg-card p-6 sm:p-8 flex flex-col justify-between shadow-sm group hover:border-primary/40 transition-colors">
            <div className="space-y-2 mb-4">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 w-fit">
                <Briefcase className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-foreground">
                Presales Estimator &amp; Solutions
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Standardisasi kalkulasi manday, role rate-card, dan matriks kompleksitas arsitektur solusi sebelum proposal dirilis ke klien.
              </p>
            </div>

            {/* Presales Mockup UI */}
            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-border/60">
                <span className="font-semibold text-foreground">Kalkulasi Manday Proyek</span>
                <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">High Complexity</span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between items-center bg-card p-1.5 rounded border border-border/40">
                  <span className="text-muted-foreground">Solutions Architect (15d)</span>
                  <span className="font-mono font-medium text-foreground">Rp 37.500.000</span>
                </div>
                <div className="flex justify-between items-center bg-card p-1.5 rounded border border-border/40">
                  <span className="text-muted-foreground">Lead Cloud Engineer (25d)</span>
                  <span className="font-mono font-medium text-foreground">Rp 50.000.000</span>
                </div>
                <div className="flex justify-between items-center bg-card p-1.5 rounded border border-border/40">
                  <span className="text-muted-foreground">Integration &amp; QA (20d)</span>
                  <span className="font-mono font-medium text-foreground">Rp 30.000.000</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">Total Estimasi Layanan</span>
                <span className="font-extrabold text-primary text-sm font-mono">Rp 117.500.000</span>
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
                Evaluasi otomatis multi-LLM (GPT-4o, Claude 3.5, DeepSeek) memverifikasi profil bisnis hingga skor kelayakan BANTC dalam &lt; 90 detik.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
              {[
                { stage: "Market & ICP Alignment", score: "94% Match", status: "success" },
                { stage: "Tech Stack & API Readiness", score: "Modern Cloud", status: "success" },
                { stage: "Solvency & Budget Approval", score: "Capex Approved", status: "success" },
                { stage: "Decision Authority Verification", score: "C-Level Validated", status: "success" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded bg-card border border-border/40">
                  <span className="text-muted-foreground text-[11px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    {item.stage}
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-primary">{item.score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Order-to-Cash & Commercial Split (Col 4) */}
          <div className="md:col-span-12 lg:col-span-4 rounded-2xl border border-border/70 bg-card p-6 sm:p-8 flex flex-col justify-between shadow-sm group hover:border-primary/40 transition-colors">
            <div className="space-y-2 mb-4">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 w-fit">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-foreground">
                Order-to-Cash &amp; Deal Split
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Transparansi pembagian komisi lintas fungsi antara Sales Rep, Presales Architect, dan Account Manager dengan pajak terstandarisasi.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-border/60">
                <span className="text-muted-foreground">Deal #LEAD-558 Total:</span>
                <span className="font-mono font-bold text-foreground">Rp 450.000.000</span>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center p-1.5 rounded bg-card border border-border/40">
                  <span className="text-[11px]">Sales Owner (Fani Purnomo)</span>
                  <span className="font-mono font-semibold text-primary">40% • Rp 180M</span>
                </div>
                <div className="flex justify-between items-center p-1.5 rounded bg-card border border-border/40">
                  <span className="text-[11px]">Presales Solution (Kodrat Santoso)</span>
                  <span className="font-mono font-semibold text-indigo-500">30% • Rp 135M</span>
                </div>
                <div className="flex justify-between items-center p-1.5 rounded bg-card border border-border/40">
                  <span className="text-[11px]">Account &amp; CS Retention</span>
                  <span className="font-mono font-semibold text-foreground">30% • Rp 135M</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: Omnichannel WhatsApp & Lark Sync (Col 4) */}
          <div className="md:col-span-12 lg:col-span-4 rounded-2xl border border-border/70 bg-card p-6 sm:p-8 flex flex-col justify-between shadow-sm group hover:border-primary/40 transition-colors">
            <div className="space-y-2 mb-4">
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 w-fit">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-foreground">
                WhatsApp &amp; Lark Base Sync
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Dukungan dual-engine WhatsApp (Mekari Qontak Official BSP + Local Baileys) tersinkronisasi 2 arah ke Lark Base database secara real-time.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-border/60">
                <span className="text-muted-foreground">Sinkronisasi Omnichannel:</span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">● Active Online</span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="p-1.5 rounded bg-card border border-border/40 flex items-center justify-between">
                  <span className="text-muted-foreground">Mekari Qontak WhatsApp API</span>
                  <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">Connected</span>
                </div>
                <div className="p-1.5 rounded bg-card border border-border/40 flex items-center justify-between">
                  <span className="text-muted-foreground">Local Baileys Node Engine</span>
                  <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">Ready</span>
                </div>
                <div className="p-1.5 rounded bg-card border border-border/40 flex items-center justify-between">
                  <span className="text-muted-foreground">Lark Base 2-Way Sync</span>
                  <span className="font-mono font-medium text-primary">Synced 2m ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
