"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle, 
  XCircle, 
  Building2, 
  Search, 
  ShieldCheck, 
  Target, 
  Activity,
  ArrowRight,
  TrendingUp
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/apiFetch";

interface PendingLeadItem {
  id: number;
  company_name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  lead_score?: number | null;
  qualification_status?: string | null;
}

interface ProcessedLeadResult {
  id: number;
  company_name: string;
  score?: number | null;
  grade?: string | null;
  status?: string | null;
  success: boolean;
  error?: string | null;
  elapsed_seconds?: number;
}

interface PreMeetingScreeningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetCount: number;
  mode: "unassessed" | "selected";
  selectedLeadIds?: number[];
  onSuccess: () => void;
}

export function PreMeetingScreeningModal({
  open,
  onOpenChange,
  targetCount,
  mode,
  selectedLeadIds = [],
  onSuccess,
}: PreMeetingScreeningModalProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);

  const [queue, setQueue] = useState<PendingLeadItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [currentLead, setCurrentLead] = useState<PendingLeadItem | null>(null);
  const [currentStage, setCurrentStage] = useState<string>("Initializing...");

  const [processedResults, setProcessedResults] = useState<ProcessedLeadResult[]>([]);
  const [stats, setStats] = useState({
    eligible: 0,
    potential: 0,
    notEligible: 0,
    errors: 0,
  });

  const [generalError, setGeneralError] = useState<string | null>(null);

  // Ref to cancel/pause loop
  const stopRequestedRef = useRef(false);
  const isRunningRef = useRef(false);

  // Reset or initialize queue when modal opens
  useEffect(() => {
    if (open) {
      fetchQueueAndStats();
    } else {
      handleStop();
    }
  }, [open, mode, selectedLeadIds]);

  const fetchQueueAndStats = async () => {
    setIsLoadingQueue(true);
    setGeneralError(null);
    try {
      if (mode === "unassessed") {
        const res = await apiFetch("/leads/ai-screening/pending-leads?limit=500");
        const json = await res.json();
        if (res.ok && json.data) {
          setQueue(json.data);
        } else {
          setGeneralError(json.message || "Failed to load unassessed leads queue.");
        }
      } else {
        // Selected leads: fetch their info or map from IDs
        if (selectedLeadIds.length > 0) {
          const items: PendingLeadItem[] = selectedLeadIds.map((id) => ({
            id,
            company_name: `Lead #${id}`,
          }));
          setQueue(items);
        }
      }
    } catch (err: any) {
      setGeneralError(err?.message || "Error loading leads for screening.");
    } finally {
      setIsLoadingQueue(false);
    }
  };

  const handleStart = async () => {
    if (queue.length === 0) {
      await fetchQueueAndStats();
    }
    stopRequestedRef.current = false;
    isRunningRef.current = true;
    setIsRunning(true);
    setIsPaused(false);
    setIsDone(false);

    runSequentialAssessment(currentIndex);
  };

  const handlePause = () => {
    stopRequestedRef.current = true;
    isRunningRef.current = false;
    setIsRunning(false);
    setIsPaused(true);
  };

  const handleStop = () => {
    stopRequestedRef.current = true;
    isRunningRef.current = false;
    setIsRunning(false);
    setIsPaused(false);
    setCurrentLead(null);
  };

  const handleReset = () => {
    handleStop();
    setCurrentIndex(0);
    setProcessedResults([]);
    setStats({ eligible: 0, potential: 0, notEligible: 0, errors: 0 });
    setIsDone(false);
    fetchQueueAndStats();
  };

  const runSequentialAssessment = async (startIndex: number) => {
    const total = queue.length;
    let localEligible = stats.eligible;
    let localPotential = stats.potential;
    let localNotEligible = stats.notEligible;
    let localErrors = stats.errors;

    const stagesList = [
      "1. Deep Profiling & Discovery...",
      "2. Legal & Company Verification...",
      "3. AI Strategy & Pain Points...",
      "4. ICP Matching & Scoring...",
      "5. BANTC Qualification Decision...",
    ];

    for (let i = startIndex; i < total; i++) {
      if (stopRequestedRef.current) {
        break;
      }

      const lead = queue[i];
      setCurrentIndex(i);
      setCurrentLead(lead);

      // Visual stage progression while waiting for the sequential AI stages to execute
      let stageIdx = 0;
      setCurrentStage(stagesList[0]);
      const stageInterval = setInterval(() => {
        stageIdx = (stageIdx + 1) % stagesList.length;
        setCurrentStage(stagesList[stageIdx]);
      }, 1200);

      const startTime = performance.now();
      let resultItem: ProcessedLeadResult;

      try {
        // Dispatch background job (near-instant response, no Cloudflare 100s timeout)
        const dispatchRes = await apiFetch(`/leads/${lead.id}/ai-screening/dispatch`, {
          method: "POST",
        });
        const dispatchJson = await dispatchRes.json();

        if (!dispatchRes.ok || !dispatchJson.success) {
          throw new Error(dispatchJson?.error || dispatchJson?.message || `Failed to start screening (${dispatchRes.status})`);
        }

        // Poll status every 2 seconds until completed or max timeout (180 seconds)
        let isDone = false;
        let pollAttempts = 0;
        const maxAttempts = 90; // 90 * 2000ms = 180s
        let completedData: any = null;

        while (!isDone && pollAttempts < maxAttempts) {
          if (stopRequestedRef.current) {
            break;
          }

          await new Promise((r) => setTimeout(r, 2000));
          pollAttempts++;

          try {
            const statusRes = await apiFetch(`/leads/${lead.id}/ai-screening/status`);
            if (statusRes.ok) {
              const statusJson = await statusRes.json();
              if (statusJson.status === "completed") {
                isDone = true;
                completedData = statusJson.data;
                break;
              } else if (statusJson.status === "failed") {
                throw new Error(statusJson.error || "AI Screening failed on server.");
              }
            }
          } catch (pollErr: any) {
            if (pollAttempts >= maxAttempts) throw pollErr;
          }
        }

        clearInterval(stageInterval);
        const duration = Math.round((performance.now() - startTime) / 100) / 10;

        if (isDone && completedData) {
          const score = completedData.lead_score ?? null;
          const status = completedData.qualification_status ?? "potential";
          const grade = score !== null ? (score >= 80 ? "Grade A" : score >= 60 ? "Grade B" : "Grade C") : null;

          if (status === "eligible") localEligible++;
          else if (status === "potential") localPotential++;
          else localNotEligible++;

          resultItem = {
            id: lead.id,
            company_name: completedData.company_name || lead.company_name,
            score,
            grade,
            status,
            success: true,
            elapsed_seconds: duration,
          };
        } else if (stopRequestedRef.current) {
          break;
        } else {
          localErrors++;
          resultItem = {
            id: lead.id,
            company_name: lead.company_name,
            success: false,
            error: "Screening timed out after 180s.",
            elapsed_seconds: duration,
          };
        }
      } catch (err: any) {
        clearInterval(stageInterval);
        const duration = Math.round((performance.now() - startTime) / 100) / 10;
        localErrors++;
        resultItem = {
          id: lead.id,
          company_name: lead.company_name,
          success: false,
          error: err?.message || "Screening error",
          elapsed_seconds: duration,
        };
      }

      setStats({
        eligible: localEligible,
        potential: localPotential,
        notEligible: localNotEligible,
        errors: localErrors,
      });

      setProcessedResults((prev) => [resultItem, ...prev]);

      // Small delay between leads to allow UI to breathe and ensure previous lead is completely committed
      await new Promise((r) => setTimeout(r, 500));
    }

    if (!stopRequestedRef.current) {
      setCurrentIndex(total);
      setIsRunning(false);
      setIsPaused(false);
      setIsDone(true);
      setCurrentLead(null);
      setCurrentStage("All Leads Completed!");
      onSuccess();
    }
  };

  const totalLeads = queue.length;
  const processedCount = processedResults.length;
  const remainingCount = Math.max(0, totalLeads - processedCount);
  const progressPercent = totalLeads > 0 ? Math.min(100, Math.round((processedCount / totalLeads) * 100)) : 0;

  return (
    <Modal
      open={open}
      onOpenChange={(v) => {
        if (!isRunning) {
          onOpenChange(v);
        }
      }}
      title="⚡ Live AI Pre-Meeting Screening & Assessment"
      description="Live automated assessment pipeline: AI Profiling, Verification, Strategy, Scoring & Qualification."
      size="xl"
    >
      <div className="space-y-5 p-1">
        {/* Top Summary Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl border border-border bg-card/60 flex flex-col">
            <span className="text-xs text-muted-foreground font-medium">Total Queue</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-foreground">{totalLeads}</span>
              <span className="text-xs text-muted-foreground">leads</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Assessed (Success)
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.eligible + stats.potential + stats.notEligible}
              </span>
              <span className="text-xs text-muted-foreground">/ {totalLeads}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex flex-col">
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
              <Activity className="h-3.5 w-3.5" /> Remaining
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{remainingCount}</span>
              <span className="text-xs text-muted-foreground">leads</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border border-[var(--brand)]/20 bg-[color-mix(in_oklch,var(--brand)_6%,transparent)] flex flex-col">
            <span className="text-xs text-[var(--brand)] font-medium flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Progress
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-[var(--brand)]">{progressPercent}%</span>
              <span className="text-xs text-muted-foreground">completed</span>
            </div>
          </div>
        </div>

        {/* Breakdown Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-border bg-card/40 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-medium">Breakdown:</span>
            <Badge variant="success" className="gap-1">
              Eligible: {stats.eligible}
            </Badge>
            <Badge variant="warning" className="gap-1">
              Potential: {stats.potential}
            </Badge>
            <Badge variant="neutral" className="gap-1">
              Not Eligible: {stats.notEligible}
            </Badge>
            {stats.errors > 0 && (
              <Badge variant="danger" className="gap-1">
                Errors: {stats.errors}
              </Badge>
            )}
          </div>
          <div className="text-muted-foreground">
            {isRunning ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-500 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                Live Processing Active
              </span>
            ) : isPaused ? (
              <span className="text-amber-500 font-medium">⏸️ Assessment Paused</span>
            ) : isDone ? (
              <span className="text-emerald-500 font-medium">🎉 Assessment Completed</span>
            ) : (
              <span>Ready to start</span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress: {processedCount} of {totalLeads} processed</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-[var(--brand)] to-emerald-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Current Active Processing Lead HUD */}
        {isRunning && currentLead && (
          <div className="p-4 rounded-2xl border border-[var(--brand)]/30 bg-[color-mix(in_oklch,var(--brand)_8%,transparent)] space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Loader2 className="h-5 w-5 text-[var(--brand)] animate-spin shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[var(--brand)]" />
                    {currentLead.company_name}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Lead #{currentLead.id} {currentLead.email ? `• ${currentLead.email}` : ""} {currentLead.phone ? `• ${currentLead.phone}` : ""}
                  </p>
                </div>
              </div>
              <Badge variant="brand" className="animate-pulse">
                {currentStage}
              </Badge>
            </div>

            {/* Stage Steps Indicator */}
            <div className="grid grid-cols-5 gap-1.5 pt-1 text-[11px] text-center">
              <div className="p-1.5 rounded-lg bg-background/80 border border-border flex items-center justify-center gap-1 font-medium text-[var(--brand)]">
                <Search className="h-3 w-3" /> Profiling
              </div>
              <div className="p-1.5 rounded-lg bg-background/80 border border-border flex items-center justify-center gap-1 font-medium text-[var(--brand)]">
                <ShieldCheck className="h-3 w-3" /> Verification
              </div>
              <div className="p-1.5 rounded-lg bg-background/80 border border-border flex items-center justify-center gap-1 font-medium text-[var(--brand)]">
                <Target className="h-3 w-3" /> Strategy
              </div>
              <div className="p-1.5 rounded-lg bg-background/80 border border-border flex items-center justify-center gap-1 font-medium text-[var(--brand)]">
                <TrendingUp className="h-3 w-3" /> Scoring
              </div>
              <div className="p-1.5 rounded-lg bg-background/80 border border-border flex items-center justify-center gap-1 font-medium text-[var(--brand)]">
                <CheckCircle className="h-3 w-3" /> BANTC
              </div>
            </div>
          </div>
        )}

        {/* Live Activity Feed */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
            <span>Live Activity Feed ({processedResults.length})</span>
            {processedResults.length > 0 && (
              <span className="text-[11px] text-muted-foreground font-normal">Most recent first</span>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto space-y-2 rounded-xl border border-border p-2 bg-card/30">
            {processedResults.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground space-y-1">
                <Sparkles className="h-6 w-6 mx-auto text-muted-foreground/50 mb-1" />
                <p>No leads assessed in this session yet.</p>
                <p className="text-[11px]">Click &quot;Start AI Assessment&quot; below to begin real-time screening.</p>
              </div>
            ) : (
              processedResults.map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors ${
                    item.success
                      ? "border-border bg-card/60 hover:bg-card"
                      : "border-destructive/30 bg-destructive/5"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.success ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{item.company_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.success
                          ? `Assessed in ${item.elapsed_seconds}s`
                          : `Error: ${item.error}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.score !== undefined && item.score !== null && (
                      <Badge variant="brand" className="text-[11px]">
                        Score: {item.score}
                      </Badge>
                    )}
                    {item.status && (
                      <Badge
                        variant={
                          item.status === "eligible"
                            ? "success"
                            : item.status === "potential"
                            ? "warning"
                            : "neutral"
                        }
                        className="text-[11px] uppercase"
                      >
                        {item.status.replace("_", " ")}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {generalError && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={isRunning || isLoadingQueue || processedResults.length === 0}
            className="text-xs text-muted-foreground gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset Session
          </Button>

          <div className="flex items-center gap-2">
            {!isRunning && !isDone && (
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isRunning}
              >
                Close
              </Button>
            )}

            {isRunning ? (
              <Button
                variant="secondary"
                onClick={handlePause}
                className="gap-2 border-amber-500/30 text-amber-600 bg-amber-500/10 hover:bg-amber-500/20"
              >
                <Pause className="h-4 w-4" /> Pause Assessment
              </Button>
            ) : isPaused ? (
              <Button
                onClick={handleStart}
                className="gap-2 bg-[var(--brand)] text-white hover:opacity-90"
              >
                <Play className="h-4 w-4" /> Resume Assessment ({remainingCount} Remaining)
              </Button>
            ) : isDone ? (
              <Button
                onClick={() => {
                  onSuccess();
                  onOpenChange(false);
                }}
                className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" /> Finished & Refresh Leads
              </Button>
            ) : (
              <Button
                onClick={handleStart}
                disabled={isLoadingQueue || totalLeads === 0}
                className="gap-2 bg-[var(--brand)] text-white hover:opacity-90"
              >
                {isLoadingQueue ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading Queue...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Start AI Assessment ({totalLeads} Leads)
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
