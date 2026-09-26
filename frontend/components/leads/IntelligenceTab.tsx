"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  BrainCircuit,
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  DollarSign,
  Info,
  Loader2,
  Pencil,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  XCircle,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressiveFluxLoader } from "@/components/ui/progressive-flux-loader";
import { LeadBantcQuestionGuide } from "@/components/leads/LeadBantcQuestionGuide";
import { apiFetch } from "@/lib/apiFetch";
import { runAiScreening } from "@/lib/aiScreeningPipeline";
import { safeJsonArray, safeRender } from "@/lib/utils";
import { useNumberFormat } from "@/lib/hooks/use-number-format";
import {
  clampPercent,
  formatQualificationStatus,
  gradeVariant,
  icpLabel,
  icpVariant,
  qualificationVariant,
} from "@/lib/leadDisplay";

/**
 * The Intelligence tab of the lead detail page.
 *
 * Split out of app/leads/[id]/page.tsx, which had grown past 5,200 lines. The
 * queries stay with the page because other tabs and the conflict-resolution
 * mutation read the same results; what moves here is what only this tab used:
 * its feedback state, the six AI re-run mutations, and the two full-pipeline
 * runners.
 */
type IntelligenceTabProps = {
  leadId: string;
  leadData: any;
  isSuperAdmin: boolean;
  intelligence: any;
  revenueIntel: any;
  verificationData: any;
  financialsData: any;
  confidentiality: any;
  products: any[];
  onLeadChanged: () => void;
  /** Opens the page's conflict-resolution modal, seeded with this value. */
  onResolveConflict: (suggestedName: string) => void;
};

export function IntelligenceTab({
  leadId,
  leadData,
  isSuperAdmin,
  intelligence,
  revenueIntel,
  verificationData,
  financialsData,
  confidentiality,
  products,
  onLeadChanged,
  onResolveConflict,
}: IntelligenceTabProps) {
  const { formatNumber } = useNumberFormat();

  const [aiActionsOpen, setAiActionsOpen] = useState(false);
  const [aiActionsFeedback, setAiActionsFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [aiPipelineRunning, setAiPipelineRunning] = useState(false);
  const [aiSyncPipelineRunning, setAiSyncPipelineRunning] = useState(false);

  const useAiActionMutation = (endpoint: string, successLabel: string) =>
    useMutation({
      mutationFn: async () => {
        const res = await apiFetch(`/leads/${leadId}${endpoint}`, { method: 'POST' });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.message || body?.error || `Failed: ${endpoint}`);
        return body;
      },
      onSuccess: () => {
        setAiActionsFeedback({ type: 'success', msg: `${successLabel} dispatched.` });
        onLeadChanged();
      },
      onError: (err: any) => setAiActionsFeedback({ type: 'error', msg: err.message }),
    });

  const aiEnrichMutation = useAiActionMutation('/enrich/retry', 'Firmographic Enrichment');
  const aiVerificationMutation = useAiActionMutation('/verification/run', 'Company Verification');
  const aiRescoreMutation = useAiActionMutation('/rescore', 'Scoring + ICP + Qualification');
  const aiAnalysisMutation = useAiActionMutation('/analyze', 'Lead Analysis');
  const aiProductMatchingMutation = useAiActionMutation('/match-products', 'Product Matching');
  const aiBantcMutation = useAiActionMutation('/bantc-questions/generate', 'BANTC Questions');


  const runAiFullPipeline = async () => {
    setAiPipelineRunning(true);
    setAiActionsFeedback({ type: 'success', msg: 'Starting full pipeline...' });
    try {
      const outcome = await runAiScreening(leadId, {
        onProgress: (elapsedSeconds) =>
          setAiActionsFeedback({ type: 'success', msg: `Running full pipeline... (${elapsedSeconds}s elapsed)` }),
      });

      if (outcome.status === 'completed') {
        setAiActionsFeedback({
          type: 'success',
          msg: `Full pipeline completed. Score: ${outcome.data?.lead_score ?? '—'} (${outcome.data?.qualification_status ?? '—'}).`,
        });
      } else if (outcome.status === 'failed') {
        throw new Error(outcome.error);
      } else {
        setAiActionsFeedback({ type: 'error', msg: 'Pipeline timed out after 10 minutes; it may still complete in the background.' });
      }
      onLeadChanged();
    } catch (err: any) {
      setAiActionsFeedback({ type: 'error', msg: err.message });
    } finally {
      setAiPipelineRunning(false);
    }
  };

  /* Runs the same stages inline in one request instead of via the queue —
     use this when the queue worker is stuck/down (jobs dispatched via
     runAiFullPipeline sit at "processing" forever with no error, since the
     dispatch endpoint always returns success immediately regardless of
     whether anything is actually consuming the queue). No polling needed:
     the response already carries the final result. Takes longer to return
     since the request stays open for every stage, but doesn't depend on
     any background worker being alive. */
  const runAiFullPipelineSync = async () => {
    setAiSyncPipelineRunning(true);
    setAiActionsFeedback({ type: 'success', msg: 'Running full pipeline synchronously (no queue) — this can take several minutes, please keep this tab open...' });
    try {
      const res = await apiFetch(`/leads/${leadId}/ai-screening`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json?.data?.error || json?.error || json?.message || 'Pipeline failed on server.');
      }
      const data = json.data ?? {};
      setAiActionsFeedback({
        type: 'success',
        msg: `Full pipeline completed (synchronous). Score: ${data.lead_score ?? '—'} (${data.qualification_status ?? '—'}). Stages: ${(data.stages_executed || []).join(', ') || '—'}.`,
      });
      onLeadChanged();
    } catch (err: any) {
      setAiActionsFeedback({ type: 'error', msg: err.message });
    } finally {
      setAiSyncPipelineRunning(false);
    }
  };

  const latestScore = intelligence?.latest_score;
  const latestQual = intelligence?.latest_qualification;
  const latestAnalysis = intelligence?.latest_analysis;
  const topProducts = Array.isArray(intelligence?.recommended_products) ? intelligence.recommended_products : [];
  const scoreBreakdown = Array.isArray(latestScore?.score_breakdown) ? latestScore.score_breakdown : [];
  const icpMatch = revenueIntel?.data?.icp_match;
  const icpReasoning = icpMatch?.reasoning ?? icpMatch?.reason ?? icpMatch?.score_breakdown?.reasoning;

  return (
        <div className="space-y-6">

          {/* ── AI ACTIONS BAR (superadmin-only) ── */}
          {isSuperAdmin && (
            <div className="rounded-lg border border-[var(--brand)]/30 bg-[color-mix(in_oklch,var(--brand)_5%,transparent)] overflow-hidden">
              <button
                type="button"
                onClick={() => setAiActionsOpen((v: boolean) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-[var(--brand)]">
                  <Zap className="h-4 w-4" />
                  AI Actions
                  <Badge variant="outline" className="text-[10px]">Superadmin</Badge>
                </span>
                {aiActionsOpen ? <ChevronUp className="h-4 w-4 text-[var(--brand)]" /> : <ChevronDown className="h-4 w-4 text-[var(--brand)]" />}
              </button>

              {aiActionsOpen && (
                <div className="border-t border-[var(--brand)]/20 p-4 space-y-4">
                  <Button
                    onClick={runAiFullPipeline}
                    disabled={aiPipelineRunning || aiSyncPipelineRunning}
                    className="w-full gap-2 bg-[var(--brand)] text-white hover:opacity-90"
                  >
                    {aiPipelineRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    {aiPipelineRunning ? 'Running Full Pipeline...' : 'Run Full Pipeline'}
                  </Button>

                  {aiActionsFeedback && (
                    <p className={`text-xs ${aiActionsFeedback.type === 'success' ? 'text-[var(--status-success)]' : 'text-[var(--status-danger)]'}`}>
                      {aiActionsFeedback.msg}
                    </p>
                  )}

                  <div className="space-y-1.5 rounded-md border border-[var(--status-warning)]/30 bg-[color-mix(in_oklch,var(--status-warning)_6%,transparent)] p-3">
                    <p className="text-xs text-muted-foreground">
                      Stuck on "Processing" with no result? The background queue worker may be down. This runs the same stages directly, without the queue — but holds this page's connection open for the whole run (several sequential AI calls, sometimes 60-100s+ each), which can hit a ~100s network gateway limit and fail with a connection error on data-heavy leads. Prefer fixing the queue worker when possible; use this as a one-off recovery for a single stuck lead, not routinely.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={runAiFullPipelineSync}
                      disabled={aiPipelineRunning || aiSyncPipelineRunning}
                      className="w-full gap-2"
                    >
                      {aiSyncPipelineRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                      {aiSyncPipelineRunning ? 'Running without queue... (do not close this tab)' : 'Force Run Full Pipeline (No Queue)'}
                    </Button>
                  </div>

                  <div className="space-y-2 border-t border-[var(--brand)]/10 pt-3">
                    <p className="text-xs font-medium text-muted-foreground">Advanced: re-run a single stage of the screening pipeline</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button variant="outline" size="sm" onClick={() => aiEnrichMutation.mutate()} disabled={aiEnrichMutation.isPending} className="justify-start">
                        {aiEnrichMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        Re-run Firmographic Enrichment (queued)
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => aiVerificationMutation.mutate()} disabled={aiVerificationMutation.isPending} className="justify-start">
                        {aiVerificationMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Building2 className="h-3.5 w-3.5" />}
                        Re-run Company Verification
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => aiRescoreMutation.mutate()} disabled={aiRescoreMutation.isPending} className="justify-start">
                        {aiRescoreMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                        Re-run Scoring + ICP + Qualification
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => aiAnalysisMutation.mutate()} disabled={aiAnalysisMutation.isPending} className="justify-start">
                        {aiAnalysisMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                        Re-run Lead Analysis
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => aiProductMatchingMutation.mutate()} disabled={aiProductMatchingMutation.isPending} className="justify-start">
                        {aiProductMatchingMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BrainCircuit className="h-3.5 w-3.5" />}
                        Re-run Product Matching
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => aiBantcMutation.mutate()} disabled={aiBantcMutation.isPending} className="justify-start">
                        {aiBantcMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardList className="h-3.5 w-3.5" />}
                        Generate BANTC Questions
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── BANTC QUALIFICATION & ELIGIBILITY STATUS HERO CARD ── */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[var(--brand)]" />
                  AI BANTC Qualification & Eligibility Status
                </h3>
                <p className="text-xs text-muted-foreground">
                  Evaluasi kelayakan lead berdasarkan Framework BANTC (Budget, Authority, Need, Timeline, Competitor Fit) & Rule Engine.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={qualificationVariant(leadData.qualification_status)}
                  className="text-xs px-3 py-1 font-bold uppercase tracking-wider shadow-xs"
                >
                  {formatQualificationStatus(leadData.qualification_status)}
                </Badge>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="bg-muted/20 p-3 rounded-lg border border-border/40">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Status Kelayakan</span>
                <span className="text-base font-bold text-foreground capitalize mt-0.5 block">
                  {formatQualificationStatus(leadData.qualification_status)}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {leadData.qualification_status === 'eligible'
                    ? 'Memenuhi syarat pipeline SQL'
                    : leadData.qualification_status === 'potential'
                      ? 'Perlu eksplorasi kebutuhan sales'
                      : leadData.qualification_status === 'not_eligible' || leadData.qualification_status === 'disqualified'
                        ? 'Tidak memenuhi kriteria'
                        : 'Belum dinilai AI'}
                </span>
              </div>

              <div className="bg-muted/20 p-3 rounded-lg border border-border/40">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Klasifikasi Bisnis</span>
                <span className="text-base font-bold text-foreground mt-0.5 block">
                  {latestQual?.business_type || leadData.business_category?.name || 'B2B Enterprise'}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Ukuran: {latestQual?.company_size_band || leadData.company_size || 'Enterprise / Mid-Market'}
                </span>
              </div>

              <div className="bg-muted/20 p-3 rounded-lg border border-border/40">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Rekomendasi Funnel</span>
                <span className="text-base font-bold text-[var(--brand)] mt-0.5 block">
                  {leadData.funnelStage?.name || leadData.current_funnel_stage?.name || 'Tahap SQL'}
                </span>
                <span className="text-[11px] text-muted-foreground">Otomatisasi AI Pipeline</span>
              </div>

              <div className="bg-muted/20 p-3 rounded-lg border border-border/40">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Skor AI & Grade</span>
                <span className="text-base font-bold text-foreground mt-0.5 flex items-center gap-1.5">
                  {latestScore?.score ?? '—'} <Badge variant={gradeVariant(latestScore?.grade)} className="text-[10px] px-1.5 py-0">{latestScore?.grade ?? 'N/A'}</Badge>
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {latestScore?.calculated_at ? new Date(latestScore.calculated_at).toLocaleDateString() : 'Belum dinilai'}
                </span>
              </div>
            </div>

            {/* AI Qualification Reason & Strategic Context */}
            {latestQual?.qualification_reason ? (
              <div className="bg-muted/30 p-3.5 rounded-lg border border-border/60 space-y-1">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-[var(--brand)]" />
                  Alasan & Justifikasi Kualifikasi AI:
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed pl-5 whitespace-pre-line">
                  {latestQual.qualification_reason}
                </p>
              </div>
            ) : null}

            {/* Hard stops — blocking conditions, shown before anything else they'd override */}
            {Array.isArray(latestQual?.hard_stops) && latestQual.hard_stops.length > 0 && (
              <div className="rounded-lg border border-[var(--status-danger)]/40 bg-[color-mix(in_oklch,var(--status-danger)_8%,transparent)] p-3.5 space-y-2">
                <span className="text-xs font-semibold text-[var(--status-danger)] flex items-center gap-1.5">
                  <XCircle className="h-3.5 w-3.5" />
                  Hard Stop — kondisi yang memblokir kelayakan
                </span>
                <ul className="space-y-1 pl-5">
                  {latestQual.hard_stops.map((stop: string, idx: number) => (
                    <li key={idx} className="text-xs leading-relaxed">{safeRender(stop)}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Per-dimension scoring. The rule engine has always computed this; it was
                simply never rendered, which made the final score look arbitrary. */}
            {latestQual?.dimension_breakdown && Object.keys(latestQual.dimension_breakdown).length > 0 && (
              <div className="space-y-2.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[var(--brand)]" />
                  Rincian Penilaian per Dimensi
                </span>
                <div className="grid gap-2.5 md:grid-cols-2">
                  {Object.entries(latestQual.dimension_breakdown).map(([key, raw]) => {
                    const dim = raw as any;
                    const max = Number(dim?.max_points) || 0;
                    const points = Number(dim?.points) || 0;
                    const pct = max > 0 ? Math.round((points / max) * 100) : 0;
                    const signals: string[] = Array.isArray(dim?.signals) ? dim.signals : [];
                    const dimRisks: string[] = Array.isArray(dim?.risk_flags) ? dim.risk_flags : [];

                    return (
                      <div key={key} className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2 md:odd:last:col-span-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-semibold capitalize">{key.replace(/_/g, ' ')}</span>
                          <span className="text-xs font-bold tabular-nums shrink-0">
                            {points}<span className="text-muted-foreground font-normal">/{max}</span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[var(--brand)]"
                            style={{ width: `${clampPercent(pct)}%` }}
                          />
                        </div>
                        {dim?.summary && (
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{safeRender(dim.summary)}</p>
                        )}
                        {signals.length > 0 && (
                          <ul className="space-y-0.5">
                            {signals.map((signal, idx) => (
                              <li key={idx} className="flex items-start gap-1 text-[11px] text-muted-foreground">
                                <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-[var(--brand)]" />
                                {safeRender(signal)}
                              </li>
                            ))}
                          </ul>
                        )}
                        {dimRisks.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {dimRisks.map((flag, idx) => (
                              <span
                                key={idx}
                                className="rounded border border-[var(--status-warning)]/30 bg-[color-mix(in_oklch,var(--status-warning)_10%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--status-warning)]"
                              >
                                {safeRender(flag)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Aggregate risk flags — union across dimensions, hard stops and missing critical fields */}
            {Array.isArray(latestQual?.risk_flags) && latestQual.risk_flags.length > 0 && (
              <div className="rounded-lg border border-[var(--status-warning)]/30 bg-[color-mix(in_oklch,var(--status-warning)_7%,transparent)] p-3.5 space-y-2">
                <span className="text-xs font-semibold text-[var(--status-warning)] flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" />
                  Catatan Risiko ({latestQual.risk_flags.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {latestQual.risk_flags.map((flag: string, idx: number) => (
                    <span key={idx} className="rounded-md border border-border/60 bg-background/60 px-2 py-0.5 text-[11px]">
                      {safeRender(flag)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Policy recommendation attached to the resulting status */}
            {latestQual?.recommendation && (
              <div className="rounded-lg border border-[var(--brand)]/25 bg-[color-mix(in_oklch,var(--brand)_7%,transparent)] p-3.5 space-y-1">
                <span className="text-xs font-semibold text-[var(--brand)] flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5" />
                  Rekomendasi Tindak Lanjut
                </span>
                <p className="text-xs leading-relaxed pl-5">{safeRender(latestQual.recommendation)}</p>
              </div>
            )}
          </div>

          {/* ── COMPANY INTELLIGENCE & VERIFICATION SECTION ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Company Verification Card */}
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-start justify-between border-b pb-3">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-1.5">
                    <Building2 className="h-5 w-5 text-[var(--brand)]" />
                    Company Identity Verification
                  </h3>
                  <p className="text-xs text-muted-foreground">Entity resolution, registration validation, and operational check.</p>
                </div>
                <Badge variant={
                  verificationData?.data?.verification?.legal_status === 'VERIFIED' ? 'success' :
                  verificationData?.data?.verification?.legal_status === 'PARTIALLY_VERIFIED' ? 'warning' : 'outline'
                }>
                  {verificationData?.data?.verification?.legal_status ?? 'UNVERIFIED'}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-border/40 pb-2">
                  <span className="text-muted-foreground">Resolved Legal Name</span>
                  <span className="font-semibold text-foreground">{verificationData?.data?.verification?.legal_name_resolved || '—'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                  <div className="bg-muted/30 p-2 rounded-lg">
                    <span className="text-[10px] text-muted-foreground block uppercase">Legal Reg</span>
                    <span className="font-bold text-sm">{verificationData?.data?.verification?.legal_confidence ?? 0}%</span>
                  </div>
                  <div className="bg-muted/30 p-2 rounded-lg">
                    <span className="text-[10px] text-muted-foreground block uppercase">Match fit</span>
                    <span className="font-bold text-sm">{verificationData?.data?.verification?.entity_match_confidence ?? 0}%</span>
                  </div>
                  <div className="bg-muted/30 p-2 rounded-lg">
                    <span className="text-[10px] text-muted-foreground block uppercase">Operational</span>
                    <span className="font-bold text-sm">{verificationData?.data?.verification?.operational_confidence ?? 0}%</span>
                  </div>
                </div>

                {/* Evidence logs */}
                <div className="pt-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Collected Evidence logs</span>
                  {verificationData?.data?.verification?.evidences?.length > 0 ? (
                    <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                      {verificationData.data.verification.evidences.map((ev: any) => (
                        <div key={ev.id} className="text-xs bg-muted/20 p-2 rounded border border-border/40 flex justify-between items-start gap-2">
                          <div>
                            <span className="font-semibold text-foreground block">{ev.source_name} ({ev.source_type})</span>
                            <span className="text-muted-foreground text-[10px]">{ev.normalized_value}</span>
                          </div>
                          <Badge variant="outline" className="text-[9px] shrink-0">{ev.confidence}% conf</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No verification evidence logs recorded yet. Run verification above.</p>
                  )}
                </div>

                {/* Conflict override trigger */}
                <div className="pt-2 flex justify-end">
                  <Button variant="ghost" size="sm" className="text-xs text-[var(--brand)] flex items-center gap-1" onClick={() =>
                    onResolveConflict(
                      verificationData?.data?.verification?.legal_name_resolved || leadData.company_name
                    )
                  }>
                    <Pencil className="h-3 w-3" /> Resolve Name Match Conflict
                  </Button>
                </div>
              </div>
            </div>

            {/* Public Company Profile Card */}
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-start justify-between border-b pb-3">
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-1.5">
                    <Sparkles className="h-5 w-5 text-yellow-500" />
                    Public Company Intelligence
                  </h3>
                  <p className="text-xs text-muted-foreground">Listing validation on Bursa Efek Indonesia (IDX) and KSEI.</p>
                </div>
                <Badge variant={verificationData?.data?.idx_profile ? 'brand' : 'outline'}>
                  {verificationData?.data?.idx_profile ? 'IDX TBK LISTED' : 'NOT LISTED'}
                </Badge>
              </div>

              {verificationData?.data?.idx_profile ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">Ticker Symbol</span>
                    <span className="font-bold text-foreground">{verificationData.data.idx_profile.ticker}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">ISIN Code</span>
                    <span className="font-medium text-foreground">{verificationData.data.idx_profile.isin || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">Listing Board</span>
                    <span className="font-medium text-foreground">{verificationData.data.idx_profile.listing_status || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/40 pb-2">
                    <span className="text-muted-foreground">Shares Outstanding</span>
                    <span className="font-medium text-foreground">{verificationData.data.idx_profile.shares_outstanding ? Number(verificationData.data.idx_profile.shares_outstanding).toLocaleString() : '—'}</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-muted-foreground">Controlling Shareholder</span>
                    <span className="font-medium text-foreground text-right max-w-[180px] truncate" title={verificationData.data.idx_profile.controlling_shareholder}>{verificationData.data.idx_profile.controlling_shareholder || '—'}</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground space-y-2">
                  <Building2 className="h-8 w-8 text-muted-foreground/30 animate-pulse" />
                  <p className="text-sm">No verified public emittent mapping found for this entity.</p>
                  <p className="text-xs max-w-[280px]">If this is a listed company under a different name, use the resolve button on the left to manually update its mapping.</p>
                </div>
              )}
            </div>
          </div>

          {/* Financial Snapshots & Signals Card */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-5">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-1.5">
                <DollarSign className="h-5 w-5 text-emerald-500" />
                Financial Capacity & Strategic Signals
              </h3>
              <p className="text-xs text-muted-foreground">Historical metrics mapped against inferred capacity levels and Why Now trigger opportunities.</p>
            </div>

            {/* Signals Indicators */}
            <div className="grid gap-4 sm:grid-cols-3">
              {financialsData?.data?.signals?.map((sig: any) => (
                <div key={sig.id} className="bg-muted/15 p-4 rounded-xl border border-border/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase text-muted-foreground">{sig.signal_type.replace('_', ' ')}</span>
                    <Badge variant={
                      sig.level === 'HIGH' || sig.level === 'VERY_HIGH' ? 'success' :
                      sig.level === 'MEDIUM' ? 'warning' : 'outline'
                    } className="text-[10px] px-1.5 py-0.5">{sig.level}</Badge>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-foreground">{sig.score}%</span>
                    <span className="text-[10px] text-muted-foreground">score / {sig.confidence}% conf</span>
                  </div>
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border/30 whitespace-pre-line leading-relaxed">{sig.evidence_summary}</p>
                </div>
              )) ?? (
                <p className="text-xs text-muted-foreground col-span-3 text-center">No strategic signals populated. Run company verification above.</p>
              )}
            </div>

            {/* Snapshots Table */}
            <div className="pt-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-3">Historical Financial Snapshots Timeline</span>
              {financialsData?.data?.snapshots?.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/40 text-muted-foreground font-medium text-xs border-b">
                        <th className="p-3">Fiscal Year</th>
                        <th className="p-3">Period</th>
                        <th className="p-3">Metric</th>
                        <th className="p-3 text-right">Value ({financialsData.data.snapshots[0]?.currency || 'IDR'})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs">
                      {financialsData.data.snapshots.map((snap: any) => (
                        <tr key={snap.id} className="hover:bg-muted/10">
                          <td className="p-3 font-semibold text-foreground">{snap.fiscal_year}</td>
                          <td className="p-3 text-muted-foreground">{snap.period_type}</td>
                          <td className="p-3 font-medium text-foreground uppercase">{snap.metric.replace('_', ' ')}</td>
                          <td className="p-3 text-right font-mono text-emerald-600 font-semibold">
                            Rp {Number(snap.raw_value).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No financial snapshot historical records populated. Run company verification above.</p>
              )}
            </div>
          </div>

          {/* Scoring, profiling & verification now run automatically via the Pre-Meeting AI pipeline. */}

          <LeadBantcQuestionGuide leadId={leadData.id} />

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">Lead Score</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Deterministic scoring from industry fit, size, location, completeness, contactability, source quality, and activity.
                  </p>
                </div>
                <Badge variant={gradeVariant(latestScore?.grade)}>{latestScore?.grade ?? 'N/A'}</Badge>
              </div>
              <div className="flex items-end gap-3">
                <p className="text-4xl font-bold">{latestScore?.score ?? '—'}</p>
                <p className="pb-1 text-sm text-muted-foreground">out of 100</p>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {leadData.ai_explanation || 'No scoring explanation has been generated yet.'}
              </p>
              {latestScore?.calculated_at ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Calculated {new Date(latestScore.calculated_at).toLocaleString()}
                </p>
              ) : null}
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">ICP Match</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Fit against the current Ideal Customer Profile configuration.
                  </p>
                </div>
                <Badge variant={icpVariant(icpMatch?.match_status ?? icpMatch?.match_level)}>
                  {icpLabel(icpMatch?.match_status ?? icpMatch?.match_level)}
                </Badge>
              </div>
              {icpMatch ? (
                <div className="space-y-3">
                  <div className="flex items-end gap-3">
                    <p className="text-4xl font-bold">
                      {Math.round(icpMatch.icp_score ?? icpMatch.match_score ?? 0)}
                    </p>
                    <p className="pb-1 text-sm text-muted-foreground">ICP score</p>
                  </div>
                  <ProgressiveFluxLoader layout="feature"
                    value={clampPercent(icpMatch.icp_score ?? icpMatch.match_score)}
                    showLabel={false}
                    barClassName="h-2"
                    gradient="var(--brand)"
                  />
                  <p className="text-sm text-muted-foreground">
                    {icpReasoning || 'Run Refresh Score, ICP & Qualification to evaluate this lead against your configured ICP.'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Profile: {icpMatch.icp_profile || 'Lead ICP Config'}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No ICP match yet. Click <strong>Refresh Score, ICP & Qualification</strong> above to evaluate this lead.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">Score Breakdown</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Every factor shows its raw score, configured weight, and weighted contribution.
                </p>
              </div>
              <Badge variant="outline">{scoreBreakdown.length} factors</Badge>
            </div>
            {scoreBreakdown.length > 0 ? (
              <div className="space-y-4">
                {scoreBreakdown.map((factor: any, idx: number) => (
                  <div key={factor.factor_key ?? factor.factor ?? idx} className="rounded-xl border border-border/70 bg-muted/10 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{safeRender(factor.factor)}</p>
                          <Badge variant="outline">{safeRender(factor.value)}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{factor.reason}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold">{factor.raw_score ?? 0}/100</p>
                        <p className="text-xs text-muted-foreground">
                          +{formatNumber(factor.score_contribution, { decimals: 2 })} from {formatNumber(factor.weight, { decimals: 0 })}% weight
                        </p>
                      </div>
                    </div>
                    <ProgressiveFluxLoader layout="feature"
                      value={clampPercent(factor.raw_score)}
                      showLabel={false}
                      barClassName="h-2 mt-3"
                      gradient="var(--brand)"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No score breakdown yet. Rescore this lead to generate one.</p>
            )}
          </div>

          {latestAnalysis && (
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">AI Insight</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    AI-generated commercial readout shown alongside the deterministic score.
                  </p>
                </div>
                {latestAnalysis.urgency_level ? (
                  <Badge variant="brand">{latestAnalysis.urgency_level}</Badge>
                ) : null}
              </div>
              <div className="space-y-3 text-sm">
                {latestAnalysis.company_summary && (
                  <div>
                    <span className="mb-1 block text-muted-foreground">AI Summary:</span>
                    <p>{safeRender(latestAnalysis.company_summary)}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Relevance:</span>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-2 w-24 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${clampPercent(latestAnalysis.relevance_score)}%` }} />
                    </div>
                    {latestAnalysis.relevance_score}%
                  </div>
                </div>
                {latestAnalysis.suggested_approach && (
                  <div>
                    <span className="mb-1 block text-muted-foreground">Recommendation:</span>
                    <p>{safeRender(latestAnalysis.suggested_approach)}</p>
                  </div>
                )}
                {latestAnalysis.potential_use_case && (
                  <div>
                    <span className="mb-1 block text-muted-foreground">Potential Use Case:</span>
                    <p>{safeRender(latestAnalysis.potential_use_case)}</p>
                  </div>
                )}
                {latestAnalysis.risk_insight && (
                  <div className="rounded-lg border border-[var(--warning)]/20 bg-[var(--warning-soft)]/60 p-3">
                    <span className="mb-1 block text-muted-foreground">Risk Insight:</span>
                    <p>{safeRender(latestAnalysis.risk_insight)}</p>
                  </div>
                )}
                {typeof latestAnalysis.confidence_score === 'number' && (
                  <div>
                    <span className="mb-1 block text-muted-foreground">Confidence:</span>
                    <p>{latestAnalysis.confidence_score}%</p>
                  </div>
                )}
                <div>
                  <span className="mb-2 block text-muted-foreground">Opportunity Summary:</span>
                  <p>{safeRender(latestAnalysis.business_opportunity_summary)}</p>
                </div>
                <div>
                  <span className="mb-1 block text-muted-foreground">Probable Needs:</span>
                  {Array.isArray(latestAnalysis.probable_needs) &&
                    latestAnalysis.probable_needs.map((need: string, idx: number) => (
                      <div key={idx} className="mr-2 mt-1 inline-block rounded bg-muted/20 px-2 py-1 text-xs">
                        {safeRender(need)}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {!latestAnalysis && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-semibold">AI Insight</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                No AI insight has been generated yet. The lead can still be evaluated from the deterministic score and ICP match above.
              </p>
            </div>
          )}

          {/* ── Confidentiality Assessment ── */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold">Confidentiality Assessment</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  AI-powered risk scoring to determine data confidentiality level.
                </p>
              </div>
              <Badge variant={confidentiality?.confidentiality_level === 'high' || confidentiality?.confidentiality_level === 'restricted' ? 'brand' : confidentiality?.confidentiality_level === 'medium' ? 'outline' : 'neutral'}>
                {confidentiality?.confidentiality_level ? String(confidentiality.confidentiality_level).toUpperCase() : 'UNASSESSED'}
              </Badge>
            </div>
            
            {!confidentiality ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/10 py-10 text-center">
                <Shield className="mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No confidentiality assessment yet.</p>
                <p className="mt-1 text-xs text-muted-foreground">Click <strong>Run Confidentiality</strong> above to score this lead.</p>
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="flex items-end gap-3">
                  <p className="text-4xl font-bold">{confidentiality.score}</p>
                  <p className="pb-1 text-sm text-muted-foreground">Risk Score (out of 100)</p>
                </div>
                
                <ProgressiveFluxLoader layout="feature"
                  value={confidentiality.score}
                  showLabel={false}
                  barClassName="h-2"
                  gradient={confidentiality.score > 60 ? 'var(--status-danger)' : confidentiality.score > 30 ? 'var(--status-warning)' : 'var(--status-success)'}
                />
                
                <div className="mt-4 space-y-3">
                  {safeJsonArray(confidentiality.score_breakdown).length > 0 && (
                    <div>
                      <h4 className="mb-2 font-medium text-xs uppercase tracking-wider text-muted-foreground">Score Breakdown</h4>
                      <ul className="space-y-2">
                        {safeJsonArray(confidentiality.score_breakdown).map((item: any, i: number) => (
                          <li key={i} className="flex flex-wrap justify-between items-center gap-2 rounded bg-muted/20 p-2">
                            <div>
                              <span className="font-medium text-xs block">{safeRender(item.parameter)}</span>
                              <span className="text-xs text-muted-foreground">Found: {safeRender(item.detected_value)}</span>
                            </div>
                            <Badge variant="outline">+{item.score_impact}</Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {safeJsonArray(confidentiality.recommended_handling).length > 0 && (
                    <div>
                      <h4 className="mb-2 font-medium text-xs uppercase tracking-wider text-muted-foreground">Recommendations</h4>
                      <ul className="space-y-1">
                        {safeJsonArray(confidentiality.recommended_handling).map((rec: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-muted-foreground">
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />
                            <span>{safeRender(rec)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {safeJsonArray(confidentiality.missing_data).length > 0 && (
                    <div className="rounded-lg border border-[var(--status-warning)]/20 bg-[var(--status-warning)]/10 p-3">
                      <h4 className="mb-2 font-medium text-xs uppercase tracking-wider text-[var(--status-warning)]">Missing Data For Assessment</h4>
                      <div className="flex flex-wrap gap-2">
                        {safeJsonArray(confidentiality.missing_data).map((item: string, i: number) => (
                          <Badge key={i} variant="outline" className="border-[var(--status-warning)]/30 text-[var(--status-warning)] bg-transparent">{safeRender(item)}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
                  Last assessed: {new Date(confidentiality.last_assessed || confidentiality.updated_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* ── Product Match Results ── */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Product Match</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  AI-powered BANT + Competitor analysis against all active products. Runs automatically as part of the Pre-Meeting AI pipeline.
                </p>
              </div>
            </div>

            {topProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/10 py-10 text-center">
                <ClipboardList className="mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No product matches yet.</p>
                <p className="mt-1 text-xs text-muted-foreground">This runs automatically shortly after the lead is created.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topProducts.map((match: any, idx: number) => {
                  const bant = match.bant_analysis || {};
                  const reasoning = safeJsonArray(match.reasoning);
                  const levelColor = match.match_level === 'strong'
                    ? 'text-[var(--status-success)] bg-[color-mix(in_oklch,var(--status-success)_10%,transparent)] border-[var(--status-success)]/30'
                    : match.match_level === 'moderate'
                      ? 'text-[var(--status-warning)] bg-[color-mix(in_oklch,var(--status-warning)_10%,transparent)] border-[var(--status-warning)]/30'
                      : 'text-muted-foreground bg-muted/30 border-border';

                  return (
                    <div key={match.id} className={`rounded-xl border p-4 ${idx === 0 ? 'border-[var(--brand)]/40 bg-[color-mix(in_oklch,var(--brand)_4%,transparent)]' : 'border-border bg-card'}`}>
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          {idx === 0 && <span className="rounded-full bg-[var(--brand)] px-2 py-0.5 text-[10px] font-bold text-white">TOP</span>}
                          <p className="font-semibold">{match.product?.name ?? `Product ${match.product_id}`}</p>
                          {match.product?.category && <Badge variant="neutral">{match.product.category}</Badge>}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${levelColor}`}>
                            {match.match_level ?? 'N/A'}
                          </span>
                          <span className="text-xl font-bold tabular-nums">{match.match_score}%</span>
                        </div>
                      </div>

                      {/* Score bar */}
                      <ProgressiveFluxLoader layout="feature"
                        value={match.match_score}
                        showLabel={false}
                        barClassName="h-1.5 mb-3"
                        gradient={match.match_level === 'strong' ? 'var(--status-success)' : match.match_level === 'moderate' ? 'var(--status-warning)' : 'currentColor'}
                      />

                      {/* BANT breakdown */}
                      {Object.keys(bant).length > 0 && (
                        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {[
                            { key: 'budget',    label: 'Budget' },
                            { key: 'authority', label: 'Authority' },
                            { key: 'need',      label: 'Need' },
                            { key: 'timeline',  label: 'Timeline' },
                            { key: 'competitor',label: 'Competitor' },
                          ].filter(f => bant[f.key]).map(({ key, label }) => (
                            <div key={key} className="rounded-lg bg-muted/20 p-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                              <p className="mt-0.5 text-xs">{safeRender(bant[key])}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reasoning */}
                      {reasoning.length > 0 && (
                        <div className="mb-3">
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Reasoning</p>
                          <ul className="space-y-0.5">
                            {reasoning.map((r: string, i: number) => (
                              <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-[var(--brand)]" />{safeRender(r)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommended approach */}
                      {match.recommended_approach && (
                        <div className="rounded-lg border border-[var(--brand)]/20 bg-[color-mix(in_oklch,var(--brand)_8%,transparent)] p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--brand)] mb-1">Recommended Approach</p>
                          <p className="text-xs">{safeRender(match.recommended_approach)}</p>
                        </div>
                      )}

                      {/* Footer: confidence + AI model */}
                      {(match.confidence_score != null || match.ai_model_used) && (
                        <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                          {match.confidence_score != null && <span>Confidence: {match.confidence_score}%</span>}
                          {match.ai_model_used && <span>Model: {match.ai_model_used}</span>}
                          {match.last_matched_at && <span>{new Date(match.last_matched_at).toLocaleString()}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
  );
}
