"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Sparkles,
  Bot,
  CheckCircle2,
  TrendingUp,
  MapPin,
  ShieldCheck,
  Zap,
  Users,
  Building2,
  ChevronRight,
  Layers,
  CircleDollarSign,
  Activity,
  FileCheck,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";

export function LandingHero() {
  const [activeStep, setActiveStep] = useState(7); // BANTC active by default

  const pipelineStages = [
    { num: 1, name: "Eligibility", status: "passed", score: "100%" },
    { num: 2, name: "Market Fit", status: "passed", score: "94%" },
    { num: 3, name: "Tech Stack", status: "passed", score: "High" },
    { num: 4, name: "Solvency", status: "passed", score: "Solid" },
    { num: 5, name: "Authority", status: "passed", score: "C-Level" },
    { num: 6, name: "Timeline", status: "active", score: "Q4 2026" },
    { num: 7, name: "Threats", status: "passed", score: "Low" },
    { num: 8, name: "BANTC Final", status: "verified", score: "Grade A (88)" },
  ];

  return (
    <section className="relative pt-28 pb-20 md:pt-36 md:pb-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Top Copy */}
        <div className="text-center max-w-4xl mx-auto space-y-6">
          {/* Release Chip */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs sm:text-sm font-medium text-primary hover:bg-primary/15 transition-colors cursor-default shadow-sm shadow-primary/5">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-ping" />
            <span className="font-semibold tracking-wide">LEADSY V2.4 ENTERPRISE</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-foreground/80">Autonomous AI Revenue & Deal Discovery</span>
            <ChevronRight className="w-3.5 h-3.5 text-primary" />
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.12]">
            Dari Radar Wilayah, AI Screening 8-Tahap, Hingga{" "}
            <span className="bg-gradient-to-r from-primary via-indigo-500 to-violet-600 bg-clip-text text-transparent">
              Deal Closing B2B
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto font-normal leading-relaxed">
            Platform All-in-One Sales Intelligence & Order-to-Cash untuk tim B2B Enterprise. Mengotomasi kualifikasi lead dengan multi-LLM orchestration, kalkulator estimasi presales, dan sinkronisasi real-time ke WhatsApp & Lark Base.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2">
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto gap-2 text-base px-7 h-12 shadow-lg shadow-primary/25 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                Eksplorasi Platform
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <a href="#pipeline" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2 text-base px-6 h-12 border-border/80 hover:bg-muted/60 font-medium">
                <Bot className="w-4 h-4 text-primary" />
                Lihat Cara Kerja AI Pipeline
              </Button>
            </a>
          </div>

          {/* Stat Pillars */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 max-w-3xl mx-auto border-t border-border/40">
            <div className="text-center p-2">
              <div className="text-2xl sm:text-3xl font-extrabold text-foreground">1.000+</div>
              <div className="text-xs text-muted-foreground mt-0.5">Lead Terverifikasi</div>
            </div>
            <div className="text-center p-2">
              <div className="text-2xl sm:text-3xl font-extrabold text-primary">8-Tahap</div>
              <div className="text-xs text-muted-foreground mt-0.5">Deep AI Screening</div>
            </div>
            <div className="text-center p-2">
              <div className="text-2xl sm:text-3xl font-extrabold text-foreground">92%</div>
              <div className="text-xs text-muted-foreground mt-0.5">BANTC Accuracy</div>
            </div>
            <div className="text-center p-2">
              <div className="text-2xl sm:text-3xl font-extrabold text-indigo-500">&lt; 90 dtk</div>
              <div className="text-xs text-muted-foreground mt-0.5">Otomasi Per Akun</div>
            </div>
          </div>
        </div>

        {/* Hero macOS App Window Mockup */}
        <div className="relative mt-12 md:mt-16 max-w-5xl mx-auto">
          {/* Subtle Outer Border Glow */}
          <div className="absolute -inset-1.5 bg-gradient-to-r from-primary/30 via-indigo-500/20 to-violet-600/30 rounded-2xl blur-lg opacity-70 group-hover:opacity-100 transition duration-1000 -z-10" />

          {/* Floating Pill Top Left */}
          <div className="hidden lg:flex items-center gap-2.5 absolute -top-6 -left-8 z-20 bg-background/90 backdrop-blur-md px-4 py-2 rounded-xl border border-primary/30 shadow-xl shadow-primary/10 animate-bounce duration-1000">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Zap className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <div className="font-semibold text-foreground">AI Screening Selesai (84 detik)</div>
              <div className="text-[10px] text-muted-foreground">0 Menit Manual Research</div>
            </div>
          </div>

          {/* Floating Pill Top Right */}
          <div className="hidden lg:flex items-center gap-2.5 absolute -top-8 -right-6 z-20 bg-background/90 backdrop-blur-md px-4 py-2 rounded-xl border border-border shadow-xl shadow-black/10">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <div className="font-semibold text-foreground">Geo-Radar Mega Kuningan</div>
              <div className="text-[10px] text-muted-foreground">34 Calon Enterprise Ditemukan</div>
            </div>
          </div>

          {/* Window Container */}
          <div className="rounded-2xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-2xl overflow-hidden transition-all duration-300">
            {/* Window Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-3 text-xs font-mono text-muted-foreground/80 hidden sm:inline-block">
                  https://app.leadsy.space/leads/558-pt-holycow-dan-kawan
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Operational SSOT
                </span>
              </div>
            </div>

            {/* Window Content: Authentic Leadsy UI */}
            <div className="p-4 sm:p-6 space-y-5">
              {/* Lead Header Overview */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/60">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                    HC
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg sm:text-xl font-bold text-foreground">PT Holycow Dan Kawan</h3>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/25">
                        Grade A • Score 88/100
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                        F&amp;B / Hospitality
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <span>Radius: 2.4 km (Mega Kuningan, Jakarta Selatan)</span>
                      <span>•</span>
                      <span>45 Outlets</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Deal Won • Rp 450.000.000/thn</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-[11px] text-muted-foreground">Presales Scope</div>
                    <div className="text-xs font-semibold text-foreground">Multi-Branch Cloud POS &amp; Sync</div>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div className="text-right">
                    <div className="text-[11px] text-muted-foreground">Commercial Owner</div>
                    <div className="text-xs font-semibold text-foreground">Fani Purnomo (Sales)</div>
                  </div>
                </div>
              </div>

              {/* 8-Stage Interactive AI Pipeline Stepper */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                    <span>8-Stage Autonomous AI Screening Pipeline</span>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">Multi-LLM: GPT-4o + Claude + DeepSeek R1</span>
                </div>

                {/* Horizontal Stepper Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 sm:gap-2">
                  {pipelineStages.map((stage, idx) => (
                    <button
                      key={stage.num}
                      type="button"
                      onClick={() => setActiveStep(idx)}
                      className={cn(
                        "text-left p-2 rounded-lg border transition-all duration-200 text-xs",
                        activeStep === idx
                          ? "bg-primary/15 border-primary shadow-sm shadow-primary/10"
                          : "bg-muted/30 border-border/60 hover:bg-muted/60"
                      )}
                    >
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                        <span>#{stage.num}</span>
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      </div>
                      <div className="font-semibold text-foreground truncate text-[11px]">{stage.name}</div>
                      <div className="text-[10px] text-primary font-medium mt-0.5">{stage.score}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Two-Column Detail Panels */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2">
                {/* Left: BANTC Radar & Executive Summary */}
                <div className="md:col-span-7 bg-muted/20 border border-border/60 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      BANTC AI Deep Qualification &amp; Evidence
                    </span>
                    <span className="text-[11px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-semibold">
                      Readiness: 92%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-card/60 border border-border/40">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Budget</div>
                      <div className="font-medium text-foreground mt-0.5">Rp 400M - Rp 550M (Approved Capex)</div>
                    </div>
                    <div className="p-2 rounded-lg bg-card/60 border border-border/40">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Authority</div>
                      <div className="font-medium text-foreground mt-0.5">VP Operations &amp; Head of IT</div>
                    </div>
                    <div className="p-2 rounded-lg bg-card/60 border border-border/40">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Need</div>
                      <div className="font-medium text-foreground mt-0.5">Sub-second POS &amp; Centralized Inventory</div>
                    </div>
                    <div className="p-2 rounded-lg bg-card/60 border border-border/40">
                      <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Timeline</div>
                      <div className="font-medium text-foreground mt-0.5">Go-live Target Nov 2026 (Urgent)</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/15 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">AI Synthesis: </span>
                    PT Holycow Dan Kawan sedang melakukan transformasi digital untuk 45 gerai restoran. Sistem incumbent lambat saat peak hours. Solusi Cloud POS dengan offline-first engine memiliki probabilitas closing 88%.
                  </div>
                </div>

                {/* Right: Commercial Order-to-Cash Split & Presales Scoping */}
                <div className="md:col-span-5 bg-muted/20 border border-border/60 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-500" />
                      Order-to-Cash Team Split
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">O2C #LEAD-558</span>
                  </div>

                  {/* Team Members List */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-card/60 border border-border/40">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                          FP
                        </div>
                        <div>
                          <div className="font-medium text-foreground">Fani Purnomo</div>
                          <div className="text-[10px] text-muted-foreground">Sales Owner</div>
                        </div>
                      </div>
                      <span className="font-bold text-primary">40% Split</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-card/60 border border-border/40">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-500 flex items-center justify-center font-bold text-[10px]">
                          KS
                        </div>
                        <div>
                          <div className="font-medium text-foreground">Kodrat Santoso</div>
                          <div className="text-[10px] text-muted-foreground">Presales Architect</div>
                        </div>
                      </div>
                      <span className="font-bold text-indigo-500">30% Split</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-card/60 border border-border/40">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-[10px]">
                          AM
                        </div>
                        <div>
                          <div className="font-medium text-foreground">Account &amp; CSM Team</div>
                          <div className="text-[10px] text-muted-foreground">Delivery &amp; Retention</div>
                        </div>
                      </div>
                      <span className="font-bold text-foreground">30% Split</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                    <span className="text-muted-foreground">Total Contract Value</span>
                    <span className="font-extrabold text-foreground text-sm">Rp 450.000.000</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
