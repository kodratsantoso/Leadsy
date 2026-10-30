"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Sparkles,
  Bot,
  CheckCircle2,
  MapPin,
  Zap,
  Users,
  ChevronRight,
  Layers,
  BookOpen,
  Briefcase,
  FileCheck2,
  DollarSign,
  ShieldCheck,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";

export function LandingHero() {
  const [activeStep, setActiveStep] = useState(7); // BANTC Final active by default
  const [activeMockupTab, setActiveMockupTab] = useState<"ai" | "presales" | "o2c">("ai");

  const pipelineStages = [
    { num: 1, name: "Eligibility", score: "100%" },
    { num: 2, name: "Market Fit", score: "94%" },
    { num: 3, name: "Tech Stack", score: "High" },
    { num: 4, name: "Solvency", score: "Solid" },
    { num: 5, name: "Authority", score: "C-Level" },
    { num: 6, name: "Timeline", score: "Q4 2026" },
    { num: 7, name: "Threats", score: "Low" },
    { num: 8, name: "BANTC Final", score: "Grade A (88)" },
  ];

  return (
    <section className="relative pt-28 pb-20 md:pt-36 md:pb-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Top Copy */}
        <div className="text-center max-w-4xl mx-auto space-y-6">
          {/* Release Chip */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-xs sm:text-sm font-medium text-primary hover:bg-primary/15 transition-all duration-200 cursor-default shadow-xs shadow-primary/5">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-ping" />
            <span className="font-semibold tracking-wide font-mono text-[11px] sm:text-xs">LEADSY V2.4 ENTERPRISE</span>
            <span className="text-muted-foreground/60">•</span>
            <span className="text-foreground/90 font-medium">RevOps-to-Cash-to-Value OS</span>
            <ChevronRight className="w-3.5 h-3.5 text-primary" />
          </div>

          {/* Main Title - Clean, Sharp, Bold */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.12]">
            Autonomous AI Revenue Intelligence &amp;{" "}
            <span className="bg-gradient-to-r from-primary via-indigo-500 to-violet-600 bg-clip-text text-transparent">
              Deal Execution B2B
            </span>
          </h1>

          {/* Subtitle - Value-Driven, Clear Hierarchy */}
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto font-normal leading-relaxed">
            Platform All-in-One Revenue Lifecycle. Akselerasi siklus penjualan dari radar wilayah geospasial Google Maps, evaluasi kelayakan BANTC otonom 8-tahap, hingga perumusan solusi presales dan sinkronisasi WhatsApp resmi.
          </p>

          {/* CTAs - Strict 2-Tier Hierarchy */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2">
            <Link href="/login" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-12 px-7 rounded-xl font-semibold text-base gap-2 shadow-lg shadow-primary/25 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-150 active:scale-[0.98]"
              >
                Eksplorasi Platform
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>

            <Link href="/help" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-12 px-6 rounded-xl font-medium text-base gap-2 border-border/80 bg-background/60 hover:bg-muted/80 backdrop-blur-sm text-foreground transition-all duration-150 active:scale-[0.98]"
              >
                <BookOpen className="w-4 h-4 text-primary" />
                Pusat Bantuan &amp; LMS
              </Button>
            </Link>
          </div>

          {/* Stat Pillars with Tabular Numerics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-6 max-w-3xl mx-auto border-t border-border/50">
            <div className="text-center p-2 rounded-xl bg-card/40 border border-border/40">
              <div className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono tracking-tight">1.000+</div>
              <div className="text-xs text-muted-foreground mt-0.5 font-medium">Lead Terverifikasi</div>
            </div>
            <div className="text-center p-2 rounded-xl bg-card/40 border border-border/40">
              <div className="text-2xl sm:text-3xl font-extrabold text-primary font-mono tracking-tight">8-Tahap</div>
              <div className="text-xs text-muted-foreground mt-0.5 font-medium">Deep AI Screening</div>
            </div>
            <div className="text-center p-2 rounded-xl bg-card/40 border border-border/40">
              <div className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono tracking-tight">92%</div>
              <div className="text-xs text-muted-foreground mt-0.5 font-medium">BANTC Accuracy</div>
            </div>
            <div className="text-center p-2 rounded-xl bg-card/40 border border-border/40">
              <div className="text-2xl sm:text-3xl font-extrabold text-indigo-500 font-mono tracking-tight">&lt; 90 dtk</div>
              <div className="text-xs text-muted-foreground mt-0.5 font-medium">Otomasi Per Akun</div>
            </div>
          </div>
        </div>

        {/* Hero macOS App Window Mockup */}
        <div className="relative mt-12 md:mt-16 max-w-5xl mx-auto">
          {/* Subtle Outer Specular Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/25 via-indigo-500/20 to-violet-600/25 rounded-3xl blur-xl opacity-75 pointer-events-none -z-10" />

          {/* Floating Pill Top Left */}
          <div className="hidden lg:flex items-center gap-2.5 absolute -top-5 -left-6 z-20 bg-background/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-primary/30 shadow-lg shadow-primary/10">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Zap className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <div className="font-semibold text-foreground">AI Screening Selesai (84 dtk)</div>
              <div className="text-[10px] text-muted-foreground font-mono">0 Menit Riset Manual</div>
            </div>
          </div>

          {/* Floating Pill Top Right */}
          <div className="hidden lg:flex items-center gap-2.5 absolute -top-5 -right-6 z-20 bg-background/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-border shadow-lg shadow-black/5">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <div className="font-semibold text-foreground">Geo-Radar Mega Kuningan</div>
              <div className="text-[10px] text-muted-foreground font-mono">34 Enterprise Ditemukan</div>
            </div>
          </div>

          {/* Window Container */}
          <div className="rounded-2xl sm:rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-2xl overflow-hidden transition-all duration-300">
            {/* Window Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-3 text-xs font-mono text-muted-foreground/80 hidden sm:inline-block">
                  https://app.leadsy.tech/leads/558-pt-holycow-dan-kawan
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20 text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Operational SSOT
                </span>
              </div>
            </div>

            {/* Window Content */}
            <div className="p-4 sm:p-6 space-y-5">
              {/* Lead Header Overview */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/60">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-base sm:text-lg shrink-0">
                    HC
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-bold text-foreground">PT Holycow Dan Kawan</h3>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-primary/15 text-primary border border-primary/25">
                        Grade A • Score 88/100
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-muted text-muted-foreground">
                        F&amp;B Enterprise
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                      <span>Radius: 2.4 km (Mega Kuningan)</span>
                      <span>•</span>
                      <span>45 Outlets</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">Deal Won • Rp 450.000.000/thn</span>
                    </p>
                  </div>
                </div>

                {/* Interactive Segmented Tabs */}
                <div className="flex items-center p-1 rounded-xl bg-muted/60 border border-border/60 self-start md:self-auto">
                  <button
                    type="button"
                    onClick={() => setActiveMockupTab("ai")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-[0.98]",
                      activeMockupTab === "ai"
                        ? "bg-background text-primary shadow-xs border border-border/50"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>AI Screening</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMockupTab("presales")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-[0.98]",
                      activeMockupTab === "presales"
                        ? "bg-background text-primary shadow-xs border border-border/50"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Presales Scope</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMockupTab("o2c")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-[0.98]",
                      activeMockupTab === "o2c"
                        ? "bg-background text-primary shadow-xs border border-border/50"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>O2C Closing</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Tab View 1: AI Screening & BANTC */}
              {activeMockupTab === "ai" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* 8-Stage Interactive Stepper */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <Bot className="w-3.5 h-3.5 text-primary" />
                        <span>8-Stage Autonomous AI Pipeline</span>
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground">GPT-4o + Claude 3.5 + DeepSeek R1</span>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 sm:gap-2">
                      {pipelineStages.map((stage, idx) => (
                        <button
                          key={stage.num}
                          type="button"
                          onClick={() => setActiveStep(idx)}
                          className={cn(
                            "text-left p-2 rounded-xl border transition-all duration-150 text-xs active:scale-[0.98]",
                            activeStep === idx
                              ? "bg-primary/15 border-primary shadow-xs shadow-primary/10"
                              : "bg-muted/30 border-border/60 hover:bg-muted/60"
                          )}
                        >
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1 font-mono">
                            <span>#{stage.num}</span>
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          </div>
                          <div className="font-semibold text-foreground truncate text-[11px]">{stage.name}</div>
                          <div className="text-[10px] text-primary font-mono font-medium mt-0.5">{stage.score}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* BANTC Qualification Grid & Synthesis */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                    <div className="md:col-span-8 bg-muted/20 border border-border/60 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-primary" />
                          BANTC Deep AI Qualification
                        </span>
                        <span className="text-[11px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md font-semibold">
                          Readiness: 92%
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-lg bg-card/60 border border-border/40">
                          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider font-mono">Budget</div>
                          <div className="font-medium text-foreground mt-0.5">Rp 400M - Rp 550M (Approved Capex)</div>
                        </div>
                        <div className="p-2 rounded-lg bg-card/60 border border-border/40">
                          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider font-mono">Authority</div>
                          <div className="font-medium text-foreground mt-0.5">VP Operations &amp; Head of IT</div>
                        </div>
                        <div className="p-2 rounded-lg bg-card/60 border border-border/40">
                          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider font-mono">Need</div>
                          <div className="font-medium text-foreground mt-0.5">Sub-second POS &amp; Real-time Stock Sync</div>
                        </div>
                        <div className="p-2 rounded-lg bg-card/60 border border-border/40">
                          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider font-mono">Timeline</div>
                          <div className="font-medium text-foreground mt-0.5">Go-live Target Nov 2026 (Priority)</div>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-4 bg-primary/5 border border-primary/20 rounded-xl p-3.5 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="text-xs font-bold text-primary flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-primary" />
                          AI Closing Recommendation
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Sistem legacy lambat saat jam makan siang. Tawarkan arsitektur offline-first POS dengan auto-sync cloud untuk memangkas resiko downtime gerai.
                        </p>
                      </div>
                      <div className="pt-2 border-t border-primary/15 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Closing Probability:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">88%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Tab View 2: Presales & Scope Sizing */}
              {activeMockupTab === "presales" && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 animate-in fade-in duration-200">
                  <div className="md:col-span-7 bg-muted/20 border border-border/60 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-primary" />
                        Scope of Work &amp; Solution Architecture
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">45 Outlets Centralized</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-card/60 border border-border/40 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-foreground">Core Cloud POS Engine &amp; Offline Cache</div>
                          <div className="text-[11px] text-muted-foreground">High-availability cluster &amp; sub-second transaction</div>
                        </div>
                        <span className="font-mono font-semibold text-foreground">Rp 210.000.000</span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-card/60 border border-border/40 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-foreground">Central Warehouse Multi-Branch Sync</div>
                          <div className="text-[11px] text-muted-foreground">Real-time inventory ledger &amp; ERP connector</div>
                        </div>
                        <span className="font-mono font-semibold text-foreground">Rp 140.000.000</span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-card/60 border border-border/40 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-foreground">Implementation, Training &amp; 24/7 SLA</div>
                          <div className="text-[11px] text-muted-foreground">Onsite rollout across 45 stores in Jabodetabek</div>
                        </div>
                        <span className="font-mono font-semibold text-foreground">Rp 100.000.000</span>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-5 bg-muted/20 border border-border/60 rounded-xl p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                        <FileCheck2 className="w-3.5 h-3.5 text-emerald-500" />
                        Standard Sizing Rate-Card
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between py-1 border-b border-border/40">
                          <span className="text-muted-foreground">Solution Architect (20 MD)</span>
                          <span className="font-mono font-medium">Rp 70.000.000</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/40">
                          <span className="text-muted-foreground">Lead Backend Engineer (30 MD)</span>
                          <span className="font-mono font-medium">Rp 90.000.000</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/40">
                          <span className="text-muted-foreground">QA &amp; Deployment Field Ops</span>
                          <span className="font-mono font-medium">Rp 50.000.000</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Total Project Valuation:</span>
                      <span className="text-sm font-extrabold text-foreground font-mono">Rp 450.000.000</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Tab View 3: O2C Closing & Team Split */}
              {activeMockupTab === "o2c" && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 animate-in fade-in duration-200">
                  <div className="md:col-span-7 bg-muted/20 border border-border/60 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        Cross-Department Commission Split
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">Policy #VN-O2C-2026</span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-card/60 border border-border/40">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                            FP
                          </div>
                          <div>
                            <div className="font-medium text-foreground">Fani Purnomo</div>
                            <div className="text-[10px] text-muted-foreground">Commercial Account Lead</div>
                          </div>
                        </div>
                        <span className="font-bold text-primary font-mono">40% Split</span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-lg bg-card/60 border border-border/40">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-500 flex items-center justify-center font-bold text-[10px]">
                            KS
                          </div>
                          <div>
                            <div className="font-medium text-foreground">Kodrat Santoso</div>
                            <div className="text-[10px] text-muted-foreground">Presales Solution Architect</div>
                          </div>
                        </div>
                        <span className="font-bold text-indigo-500 font-mono">30% Split</span>
                      </div>

                      <div className="flex items-center justify-between p-2 rounded-lg bg-card/60 border border-border/40">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-[10px]">
                            CS
                          </div>
                          <div>
                            <div className="font-medium text-foreground">Customer Success &amp; Delivery</div>
                            <div className="text-[10px] text-muted-foreground">Onboarding &amp; Retensi</div>
                          </div>
                        </div>
                        <span className="font-bold text-foreground font-mono">30% Split</span>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-5 bg-muted/20 border border-border/60 rounded-xl p-4 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                        Omnichannel Audit Trail
                      </div>
                      <div className="p-2 rounded-lg bg-card/60 border border-border/40 text-[11px] space-y-1">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>WhatsApp Business API</span>
                          <span className="text-emerald-500 font-mono">Terkirim</span>
                        </div>
                        <p className="text-foreground text-[10px] italic">
                          "Draft proposal &amp; estimasi BAST telah dikirimkan ke Head of IT Holycow."
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-card/60 border border-border/40 text-[11px] flex items-center justify-between">
                        <span>Lark Base Real-Time Sync</span>
                        <span className="text-primary font-mono font-semibold">Synced (Record #941)</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Total Invoiced Value:</span>
                      <span className="text-sm font-extrabold text-foreground font-mono">Rp 450.000.000</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
