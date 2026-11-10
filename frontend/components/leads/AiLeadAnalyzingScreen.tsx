"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Terminal,
  ArrowRight,
  BrainCircuit,
  Layers,
  MapPin,
  Target,
  Zap,
  RotateCw,
  ChevronUp,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface AiLeadAnalyzingScreenProps {
  companyName?: string;
  leadId: number | string;
  onSkip?: () => void;
  status?: string;
  estimatedSeconds?: number;
  embedded?: boolean;
  onRerun?: () => void;
  isRerunning?: boolean;
}

interface StepItem {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  logs: string[];
}

const PIPELINE_STEPS: StepItem[] = [
  {
    id: 1,
    title: "Geospatial & Entity Verification",
    description: "Memverifikasi koordinat lokasi, Google Place ID, dan legal footprint",
    icon: MapPin,
    logs: [
      "[WORKER:GEO] Ingesting geospatial boundary & place details...",
      "[GEO_RESOLVER] Coordinate confirmed: validating administrative boundary",
      "[ENTITY_CHECK] Legal business name matched with corporate database",
    ],
  },
  {
    id: 2,
    title: "Deep Firmographic & Sector Taxonomy (#LOB)",
    description: "Mengidentifikasi model bisnis, klasifikasi industri, dan segmentasi #LOB",
    icon: Layers,
    logs: [
      "[TAXONOMY_ENGINE] Parsing industry segment and project classification...",
      "[AI_PROFILER] Querying deep web graph for company size & active branches",
      "[SECTOR_MATCH] Segment confirmed: applying vertical taxonomy rules",
    ],
  },
  {
    id: 3,
    title: "Product-Fit & ICP Matching Engine",
    description: "Mencocokkan profil prospek dengan katalog solusi produk dan kriteria ICP",
    icon: Target,
    logs: [
      "[ICP_ANALYZER] Comparing buyer pain points with target revenue ICP criteria...",
      "[PRODUCT_FIT] Calculating product fit score against enterprise catalog",
      "[PRESCRIPTION] Synthesizing high-probability solution angles",
    ],
  },
  {
    id: 4,
    title: "Qualification Scoring & Presales Playbook",
    description: "Menghitung skor BANTC, deal win probability, dan presales brief",
    icon: Zap,
    logs: [
      "[SCORING_CORE] Computing BANTC qualification matrix and health score...",
      "[WIN_PROBABILITY] Projecting deal velocity & conversion grade",
      "[PLAYBOOK_GEN] Assembling discovery questions & stakeholder approach guide",
    ],
  },
];

export function AiLeadAnalyzingScreen({
  companyName = "Prospek Bisnis",
  leadId,
  onSkip,
  status = "running",
  estimatedSeconds = 12,
  embedded = false,
  onRerun,
  isRerunning = false,
}: AiLeadAnalyzingScreenProps) {
  const isCompleted = (status === "completed" || status === "done" || status === "success") && !isRerunning;
  const isRunning = status === "running" || status === "pending" || isRerunning;

  const [currentStep, setCurrentStep] = useState<number>(isCompleted ? 4 : 1);
  const [progress, setProgress] = useState<number>(isCompleted ? 100 : 15);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>(
    isCompleted
      ? [
          `[SYSTEM] AI Intelligence Pipeline completed for Lead #${leadId} (${companyName}).`,
          "[WORKER:GEO] Geospatial coordinates and corporate footprint confirmed.",
          "[TAXONOMY_ENGINE] Firmographic sector taxonomy & #LOB classification applied.",
          "[ICP_ANALYZER] Enterprise solution product-fit matching completed.",
          "[WORKER:SCORER] Deal win velocity & BANTC qualification matrix finalized.",
        ]
      : [
          `[SYSTEM] Initializing AI Intelligence Worker for Lead #${leadId} (${companyName})...`,
          "[WORKER:SCHEDULER] Job dispatched to queue: worker.ai_enrichment",
        ]
  );

  useEffect(() => {
    if (isCompleted) {
      setCurrentStep(4);
      setProgress(100);
      setTerminalLogs([
        `[SYSTEM] AI Intelligence Pipeline verified for Lead #${leadId} (${companyName}).`,
        "[WORKER:GEO] Geospatial coordinates and corporate footprint confirmed.",
        "[TAXONOMY_ENGINE] Firmographic sector taxonomy & #LOB classification applied.",
        "[ICP_ANALYZER] Enterprise solution product-fit matching completed.",
        "[WORKER:SCORER] Deal win velocity & BANTC qualification matrix finalized.",
      ]);
      return;
    }

    // Reset for running state
    setCurrentStep(1);
    setProgress(15);
    setTerminalLogs([
      `[SYSTEM] Initializing AI Intelligence Worker for Lead #${leadId} (${companyName})...`,
      "[WORKER:SCHEDULER] Job dispatched to queue: worker.ai_enrichment",
    ]);

    const stepInterval = (estimatedSeconds * 1000) / 4;

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) return 92;
        return prev + 1;
      });
    }, (estimatedSeconds * 1000) / 80);

    const stepTimer1 = setTimeout(() => {
      setCurrentStep(2);
      setTerminalLogs((prev) => [
        ...prev,
        ...PIPELINE_STEPS[0].logs,
        `[WORKER:PROFILER] Step 1 finished. Starting Step 2...`,
      ]);
    }, stepInterval * 0.9);

    const stepTimer2 = setTimeout(() => {
      setCurrentStep(3);
      setTerminalLogs((prev) => [
        ...prev,
        ...PIPELINE_STEPS[1].logs,
        `[WORKER:ICP] Step 2 finished. Starting Step 3...`,
      ]);
    }, stepInterval * 1.8);

    const stepTimer3 = setTimeout(() => {
      setCurrentStep(4);
      setTerminalLogs((prev) => [
        ...prev,
        ...PIPELINE_STEPS[2].logs,
        `[WORKER:SCORER] Step 3 finished. Finalizing qualification scoring...`,
      ]);
    }, stepInterval * 2.7);

    return () => {
      clearInterval(progressTimer);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
    };
  }, [estimatedSeconds, leadId, companyName, isCompleted, isRunning]);

  const content = (
    <Card
      className={cn(
        "border-border bg-card overflow-hidden relative shadow-md transition-all",
        embedded ? "w-full rounded-2xl" : "w-full max-w-3xl shadow-2xl rounded-3xl"
      )}
    >
      {/* Top ambient glow bar */}
      <div
        className={cn(
          "h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400",
          isRunning && "animate-pulse"
        )}
      />

      <CardContent className={cn("space-y-6", embedded ? "p-5 sm:p-6" : "p-6 sm:p-8")}>
        {/* Header & Centerpiece AI Orb */}
        <div className="flex flex-col items-center text-center space-y-4 relative">
          {embedded && (
            <div className="absolute right-0 top-0">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-muted-foreground hover:text-foreground"
                title={isCollapsed ? "Tampilkan Detail Pipeline" : "Sembunyikan Detail"}
                aria-label={isCollapsed ? "Tampilkan Detail Pipeline" : "Sembunyikan Detail"}
              >
                {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </div>
          )}

          <div className="relative flex items-center justify-center">
            {isRunning && (
              <>
                <div className="absolute h-24 w-24 rounded-full bg-[color:var(--brand)]/20 animate-ping opacity-60" />
                <div className="absolute h-20 w-20 rounded-full bg-[color:var(--brand)]/30 blur-md" />
              </>
            )}
            <div
              className={cn(
                "relative flex items-center justify-center rounded-2xl text-white shadow-xl ring-4 ring-background transition-all",
                embedded ? "h-14 w-14" : "h-16 w-16",
                isCompleted
                  ? "bg-gradient-to-br from-emerald-500 to-teal-700 shadow-emerald-500/20"
                  : "bg-gradient-to-br from-[color:var(--brand)] to-purple-600 shadow-[color:var(--brand)]/30"
              )}
            >
              <BrainCircuit className={cn(embedded ? "h-7 w-7" : "h-8 w-8", isRunning && "animate-pulse")} />
            </div>
          </div>

          <div className="space-y-1.5 max-w-lg">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {isCompleted ? (
                <Badge variant="outline" className="text-xs px-2.5 py-0.5 gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  AI Pipeline Completed
                </Badge>
              ) : (
                <Badge variant="brand" className="text-xs px-2.5 py-0.5 gap-1.5">
                  <Sparkles className="h-3 w-3 animate-spin" />
                  AI Worker Engine Active
                </Badge>
              )}
              <Badge variant="outline" className="text-xs font-mono text-muted-foreground">
                {isCompleted ? "Queue: idle" : "Queue: enrichment"}
              </Badge>
            </div>
            <h2 className={cn("font-bold tracking-tight text-foreground", embedded ? "text-lg sm:text-xl" : "text-xl sm:text-2xl")}>
              {isCompleted ? `Pipeline Analisis: ${companyName}` : `Menganalisis ${companyName}`}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {isCompleted
                ? "Seluruh jejak digital, taksonomi industri (#LOB), product-fit ICP, dan skor probabilitas deal telah terverifikasi."
                : "Leadsy AI Pipeline sedang memverifikasi jejak digital, mengelompokkan taksonomi industri, dan menghitung skor probabilitas deal."}
            </p>
          </div>
        </div>

        {/* Progress Bar & Percentage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  isCompleted ? "bg-emerald-500" : "bg-emerald-500 animate-pulse"
                )}
              />
              {isCompleted
                ? "Tahap 4 dari 4: Semua Tahapan Terverifikasi & Tersimpan"
                : `Tahap ${currentStep} dari 4: ${PIPELINE_STEPS[currentStep - 1]?.title}`}
            </span>
            <span
              className={cn(
                "font-mono tabular-nums font-bold",
                isCompleted ? "text-emerald-400" : "text-[color:var(--brand)]"
              )}
            >
              {progress}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60 border border-border/50">
            <div
              className={cn(
                "h-full transition-all duration-300 ease-out",
                isCompleted
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                  : "bg-gradient-to-r from-[color:var(--brand)] to-purple-500"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Collapsible content (Stepper list + Telemetry) */}
        {!isCollapsed && (
          <>
            {/* Stepper Pipeline List */}
            <div className="space-y-2.5 rounded-2xl border border-border bg-muted/20 p-3 sm:p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 pb-1">
                Tahapan Analisis AI & Verifikasi Data
              </div>

              <div className="space-y-2">
                {PIPELINE_STEPS.map((step) => {
                  const Icon = step.icon;
                  const isFinished = isCompleted || currentStep > step.id;
                  const isActive = !isCompleted && currentStep === step.id;

                  return (
                    <div
                      key={step.id}
                      className={cn(
                        "flex items-start gap-3 rounded-xl p-2.5 sm:p-3 transition-all",
                        isActive
                          ? "bg-card border border-[color:var(--brand)]/40 shadow-xs ring-1 ring-[color:var(--brand)]/20"
                          : isFinished
                          ? "bg-card/50 border border-border/40 opacity-90"
                          : "opacity-40"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold text-xs",
                          isFinished
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : isActive
                            ? "bg-[color:var(--brand)]/15 text-[color:var(--brand)] border border-[color:var(--brand)]/30"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {isFinished ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : isActive ? (
                          <Icon className="h-4 w-4 animate-bounce text-[color:var(--brand)]" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={cn(
                              "text-xs sm:text-sm font-semibold truncate",
                              isActive ? "text-foreground font-bold" : "text-muted-foreground"
                            )}
                          >
                            {step.title}
                          </p>
                          <span
                            className={cn(
                              "text-[10px] font-medium shrink-0 px-1.5 py-0.5 rounded",
                              isFinished
                                ? "text-emerald-400 bg-emerald-500/10 font-semibold"
                                : isActive
                                ? "text-[color:var(--brand)] bg-[color:var(--brand)]/10 animate-pulse font-semibold"
                                : "text-muted-foreground"
                            )}
                          >
                            {isFinished ? "Selesai" : isActive ? "Memproses..." : "Menunggu"}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Telemetry Console Output (Dark Terminal Style) */}
            <div className="rounded-xl border border-border bg-neutral-950 p-3 text-neutral-300 font-mono text-[11px] space-y-1.5 shadow-inner">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5 text-[10px] text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Terminal className="h-3 w-3 text-[color:var(--brand-light)]" />
                  Live Worker Telemetry
                </span>
                <span className="text-neutral-500">Node #leadsy-worker</span>
              </div>
              <div className="max-h-24 overflow-y-auto space-y-1 no-scrollbar pt-1">
                {terminalLogs.slice(-5).map((log, index) => (
                  <div key={index} className="flex items-start gap-1.5 leading-relaxed">
                    <span className="text-[color:var(--brand)] select-none">&gt;</span>
                    <span className="truncate text-neutral-300">{log}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Action Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border/80">
          <p className="text-[11px] text-muted-foreground text-center sm:text-left">
            {isCompleted
              ? "Status: 4/4 Tahapan selesai. Data intelijen siap dianalisis di bawah."
              : "Halaman akan otomatis dialihkan begitu kalkulasi intelijen selesai."}
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {embedded && onRerun && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRerun}
                disabled={isRerunning}
                className="w-full sm:w-auto text-xs gap-1.5 hover:bg-accent"
              >
                {isRerunning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCw className="h-3.5 w-3.5" />
                )}
                <span>{isRerunning ? "Memproses Pipeline..." : "Jalankan Ulang Pipeline AI"}</span>
              </Button>
            )}

            {!embedded && onSkip && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSkip}
                className="w-full sm:w-auto text-xs gap-1.5 hover:bg-muted"
              >
                <span>Lihat Data Mentah</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="flex min-h-[calc(100vh-120px)] w-full flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      {content}
    </div>
  );
}
