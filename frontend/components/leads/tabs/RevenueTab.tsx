'use client';

import React from 'react';
import {
  TrendingUp,
  BrainCircuit,
  ThumbsUp,
  ThumbsDown,
  Target,
  ShieldCheck,
  Zap,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AILoader } from '@/components/ui/ai-loader';
import { InvoicesListCard } from '@/components/invoices/InvoicesListCard';
import { useNumberFormat } from '@/lib/hooks/use-number-format';
import { clampPercent, icpLabel, icpVariant } from '@/lib/leadDisplay';
import { safeJsonArray } from '@/lib/utils';

const INTENT_CFG = {
  high:   { cls: 'bg-[color-mix(in_oklch,var(--status-success)_15%,transparent)] text-[var(--status-success)] border-[var(--status-success)]/40', label: 'HIGH' },
  medium: { cls: 'bg-[color-mix(in_oklch,var(--status-warning)_15%,transparent)] text-[var(--status-warning)] border-[var(--status-warning)]/40', label: 'MEDIUM' },
  low:    { cls: 'bg-muted text-muted-foreground border-border', label: 'LOW' },
};

function IntentBadge({ level }: { level?: string | null }) {
  const cfg = INTENT_CFG[level as keyof typeof INTENT_CFG] ?? INTENT_CFG.low;
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${cfg.cls}`}>{cfg.label}</span>
  );
}

function ConfidenceBar({ value }: { value?: number | null }) {
  const pct = ((value ?? 0) * 100);
  const color = pct >= 70 ? 'var(--status-success)' : pct >= 40 ? 'var(--status-warning)' : 'var(--status-danger)';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-muted/50 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-10 text-right text-xs font-medium tabular-nums text-muted-foreground">{pct.toFixed(0)}%</span>
    </div>
  );
}

export function RevenueAnalysisPanel({ analysis }: { analysis: any }) {
  const { formatNumber, formatCurrency } = useNumberFormat();
  const date = analysis.created_at ? new Date(analysis.created_at).toLocaleString() : '';
  const model = analysis.ai_model ? analysis.ai_model.split('-').slice(0, 3).join('-') : 'AI';

  return (
    <div className="rounded-xl border border-[var(--brand)]/25 bg-gradient-to-br from-[color-mix(in_oklch,var(--brand)_8%,transparent)] to-card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[var(--brand)]" />
            <h3 className="font-semibold text-sm">Revenue Intelligence Analysis</h3>
            {analysis.status === 'failed' && (
              <span className="rounded-full bg-[color-mix(in_oklch,var(--status-danger)_15%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--status-danger)]">FAILED</span>
            )}
            {analysis.status === 'partial' && (
              <span className="rounded-full bg-[color-mix(in_oklch,var(--status-warning)_15%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--status-warning)]">PARTIAL</span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">{model} · {date}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums">{formatNumber(analysis.probability_to_close, { decimals: 0 })}<span className="text-xs font-normal text-muted-foreground">%</span></p>
          <p className="text-[10px] text-muted-foreground">prob. to close</p>
        </div>
      </div>

      {/* Intent + Urgency badges */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Intent</span>
          <IntentBadge level={analysis.intent_level} />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Urgency</span>
          <IntentBadge level={analysis.urgency} />
        </div>
        <div className="flex-1 min-w-[120px]">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">Confidence</p>
          <ConfidenceBar value={analysis.confidence} />
        </div>
      </div>

      {/* Business type + use case */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Business Type</p>
          <p className="text-sm font-medium">{analysis.business_type ?? '—'}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Use Case</p>
          <p className="text-sm">{analysis.use_case ?? '—'}</p>
        </div>
      </div>

      {/* Buying signals + Objections */}
      <div className="grid grid-cols-2 gap-4">
        {safeJsonArray(analysis.buying_signals).length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--status-success)] mb-2">Buying Signals</p>
            <ul className="space-y-1">
              {safeJsonArray(analysis.buying_signals).map((s: any, i: number) => (
                <li key={i} className="flex items-start gap-1.5 text-xs">
                  <CheckCircle className="h-3 w-3 flex-shrink-0 mt-0.5 text-[var(--status-success)]" />
                  {typeof s === 'object' ? JSON.stringify(s) : String(s)}
                </li>
              ))}
            </ul>
          </div>
        )}
        {safeJsonArray(analysis.objections).length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--status-danger)] mb-2">Objections</p>
            <ul className="space-y-1">
              {safeJsonArray(analysis.objections).map((o: any, i: number) => (
                <li key={i} className="flex items-start gap-1.5 text-xs">
                  <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5 text-[var(--status-danger)]" />
                  {typeof o === 'object' ? JSON.stringify(o) : String(o)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recommended action */}
      {analysis.recommended_action && (
        <div className="rounded-lg border border-[var(--brand)]/20 bg-[color-mix(in_oklch,var(--brand)_10%,transparent)] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--brand)] mb-1">Recommended Action</p>
          <p className="text-sm font-medium">{analysis.recommended_action}</p>
        </div>
      )}

      {/* Recommended approach */}
      {analysis.recommended_approach && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Recommended Approach</p>
          <p className="text-sm text-muted-foreground">{analysis.recommended_approach}</p>
        </div>
      )}

      {/* Reasoning */}
      {safeJsonArray(analysis.reasoning).length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Reasoning</p>
          <ol className="space-y-1 list-none">
            {safeJsonArray(analysis.reasoning).map((r: any, i: number) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-muted/50 flex items-center justify-center text-[9px] font-bold">{i + 1}</span>
                {typeof r === 'object' ? JSON.stringify(r) : String(r)}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Token usage footer */}
      {(analysis.prompt_tokens || analysis.cost_usd) && (
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground border-t border-border/50 pt-3">
          {analysis.prompt_tokens && <span>{formatNumber(analysis.prompt_tokens + (analysis.completion_tokens ?? 0), { decimals: 0 })} tokens</span>}
          {analysis.cost_usd && <span>{formatCurrency(analysis.cost_usd, { decimals: 4 })}</span>}
        </div>
      )}
    </div>
  );
}

export interface RevenueTabProps {
  revenueLoading: boolean;
  revenueIntel: any;
  leadData: any;
  leadOutcomes: any[];
  defaultOutcomeSaleType: string;
  predictMutation: any;
  prescribeMutation: any;
  formatCurrency: (amount?: number | null) => string;
  formatNumber: (value?: number | null, options?: any) => string;
  setOutcomeForm?: React.Dispatch<React.SetStateAction<any>>;
  setShowOutcomeModal: (show: boolean) => void;
  icpReasoning?: string | null;
  icpBreakdown?: any[];
}

export function RevenueTab({
  revenueLoading,
  revenueIntel,
  leadData,
  leadOutcomes,
  defaultOutcomeSaleType,
  predictMutation,
  prescribeMutation,
  formatCurrency,
  formatNumber,
  setOutcomeForm,
  setShowOutcomeModal,
  icpReasoning,
  icpBreakdown = [],
}: RevenueTabProps) {
  return (
    <div className="space-y-4">
      {revenueLoading ? (
        <div className="flex h-40 flex-col items-center justify-center py-20 text-muted-foreground select-none">
          <AILoader text="Loading" />
        </div>
      ) : (
        <>
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => predictMutation.mutate()}
              disabled={predictMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--status-success)]/40 bg-[color-mix(in_oklch,var(--status-success)_10%,transparent)] px-3 py-1.5 text-xs font-medium text-[var(--status-success)] hover:bg-[color-mix(in_oklch,var(--status-success)_20%,transparent)] disabled:opacity-50"
            >
              {predictMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <TrendingUp className="h-3 w-3" />}
              Predict Conversion
            </button>
            <button
              onClick={() => prescribeMutation.mutate()}
              disabled={prescribeMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--status-warning)]/40 bg-[color-mix(in_oklch,var(--status-warning)_10%,transparent)] px-3 py-1.5 text-xs font-medium text-[var(--status-warning)] hover:bg-[color-mix(in_oklch,var(--status-warning)_20%,transparent)] disabled:opacity-50"
            >
              {prescribeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <BrainCircuit className="h-3 w-3" />}
              Get Prescription
            </button>
            <button
              onClick={() => {
                setOutcomeForm?.((current: any) => ({
                  ...current,
                  product_id: current?.product_id || (leadData.product_id ? String(leadData.product_id) : ''),
                  sale_type: current?.sale_type || defaultOutcomeSaleType,
                }));
                setShowOutcomeModal(true);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50"
            >
              <ThumbsUp className="h-3 w-3" />
              Record Outcome
            </button>
          </div>

          {/* ── Revenue Intelligence Analyst AI Panel ── */}
          {revenueIntel?.data?.latest_analysis && (
            <RevenueAnalysisPanel analysis={revenueIntel.data.latest_analysis} />
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* ICP Match */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-[var(--brand)]" />
                <h3 className="font-semibold text-sm">ICP Match</h3>
              </div>
              {revenueIntel?.data?.icp_match ? (
                <div>
                  {revenueIntel.data.icp_match.matched === false ? (
                    <p className="text-xs text-muted-foreground">
                      {revenueIntel.data.icp_match.reasoning || revenueIntel.data.icp_match.reason}
                    </p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-bold">
                          {formatNumber(revenueIntel.data.icp_match.icp_score ?? revenueIntel.data.icp_match.match_score, { decimals: 0 })}
                        </span>
                        <Badge variant={icpVariant(revenueIntel.data.icp_match.match_status ?? revenueIntel.data.icp_match.match_level)}>
                          {icpLabel(revenueIntel.data.icp_match.match_status ?? revenueIntel.data.icp_match.match_level)}
                        </Badge>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden mb-2">
                        <div
                          className="h-full rounded-full bg-[var(--brand)] transition-all"
                          style={{ width: `${clampPercent(revenueIntel.data.icp_match.icp_score ?? revenueIntel.data.icp_match.match_score)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Profile: {revenueIntel.data.icp_match.icp_profile}</p>
                      {icpReasoning ? (
                        <p className="mt-2 text-xs text-muted-foreground">{icpReasoning}</p>
                      ) : null}
                      {icpBreakdown.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {icpBreakdown.map((factor: any, index: number) => (
                            <div key={`${factor.factor}-${index}`} className="rounded-lg bg-muted/20 px-3 py-2 text-xs">
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-medium capitalize">{factor.factor?.replace(/_/g, ' ')}</span>
                                <span>
                                  {formatNumber(factor.weighted_score, { decimals: 1 })} pts
                                </span>
                              </div>
                              {factor.reason ? (
                                <p className="mt-1 text-muted-foreground">{factor.reason}</p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No ICP match yet. Click "Refresh Score, ICP & Qualification" to evaluate.</p>
              )}
            </div>

            {/* Conversion Prediction */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-[var(--status-success)]" />
                <h3 className="font-semibold text-sm">Conversion Prediction</h3>
              </div>
              {revenueIntel?.data?.latest_prediction ? (
                <div>
                  <div className="flex items-end gap-2 mb-2">
                    <span className="text-3xl font-bold">{revenueIntel.data.latest_prediction.probability_to_close}%</span>
                    <span className="text-xs text-muted-foreground mb-1">probability to close</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden mb-3">
                    <div className="h-full rounded-full bg-[var(--status-success)] transition-all" style={{ width: `${Math.max(0, Math.min(100, revenueIntel.data.latest_prediction.probability_to_close ?? 0))}%` }} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-muted/30 p-2">
                      <p className="text-xs text-muted-foreground">Effort</p>
                      <p className="text-xs font-semibold capitalize">{revenueIntel.data.latest_prediction.estimated_sales_effort?.replace('_', ' ')}</p>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-2">
                      <p className="text-xs text-muted-foreground">Confidence</p>
                      <p className="text-xs font-semibold">{revenueIntel.data.latest_prediction.confidence_score}%</p>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-2">
                      <p className="text-xs text-muted-foreground">Est. Deal</p>
                      <p className="text-xs font-semibold">
                        {revenueIntel.data.latest_prediction.expected_deal_size
                          ? formatCurrency(revenueIntel.data.latest_prediction.expected_deal_size)
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No prediction yet. Click "Predict Conversion" to generate.</p>
              )}
            </div>

            {/* Prescriptive Recommendations */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <BrainCircuit className="h-4 w-4 text-[var(--status-warning)]" />
                <h3 className="font-semibold text-sm">AI Prescription</h3>
              </div>
              {revenueIntel?.data?.latest_prescription ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Recommended Approach</p>
                    <p className="text-sm">{revenueIntel.data.latest_prescription.recommended_approach}</p>
                  </div>
                  <div className="rounded-lg bg-[color-mix(in_oklch,var(--status-warning)_10%,transparent)] border border-[var(--status-warning)]/20 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--status-warning)] mb-1">Next Best Action</p>
                    <p className="text-sm font-medium">{revenueIntel.data.latest_prescription.next_best_action}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Follow-up timing</span>
                    <span className="font-medium">{revenueIntel.data.latest_prescription.follow_up_timing}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Priority</span>
                    <span className="font-bold text-[var(--brand)]">{revenueIntel.data.latest_prescription.priority_score}/10</span>
                  </div>
                  {revenueIntel.data.latest_prescription.recommended_owner && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Recommended Owner</span>
                      <span className="font-medium">{revenueIntel.data.latest_prescription.recommended_owner.name}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No prescription yet. Click "Get Prescription" to generate AI-guided recommendations.</p>
              )}
            </div>

            {/* Revenue Check / Rules */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-4 w-4 text-[var(--status-info)]" />
                <h3 className="font-semibold text-sm">Revenue Gate Check</h3>
              </div>
              {revenueIntel?.data?.revenue_check ? (
                <div className="space-y-3">
                  <div className={`rounded-lg border p-3 ${
                    revenueIntel.data.revenue_check.blocked
                      ? 'bg-[color-mix(in_oklch,var(--status-danger)_10%,transparent)] border-[var(--status-danger)]/30'
                      : 'bg-[color-mix(in_oklch,var(--status-success)_10%,transparent)] border-[var(--status-success)]/30'
                  }`}>
                    <p className={`text-sm font-semibold ${revenueIntel.data.revenue_check.blocked ? 'text-[var(--status-danger)]' : 'text-[var(--status-success)]'}`}>
                      {revenueIntel.data.revenue_check.summary}
                    </p>
                  </div>
                  {safeJsonArray(revenueIntel.data.revenue_check.rules_triggered).length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Triggered Rules</p>
                      <div className="space-y-1.5">
                        {safeJsonArray(revenueIntel.data.revenue_check.rules_triggered).map((r: any, i: number) => (
                          <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs ${
                            r.severity === 'critical' ? 'bg-[color-mix(in_oklch,var(--status-danger)_10%,transparent)] text-[var(--status-danger)]'
                            : r.severity === 'warning' ? 'bg-[color-mix(in_oklch,var(--status-warning)_10%,transparent)] text-[var(--status-warning)]'
                            : 'bg-[color-mix(in_oklch,var(--status-info)_10%,transparent)] text-[var(--status-info)]'
                          }`}>
                            <span>{r.rule}</span>
                            <span className="font-semibold uppercase">{r.action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {safeJsonArray(revenueIntel.data.revenue_check.flags).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {safeJsonArray(revenueIntel.data.revenue_check.flags).map((f: string) => (
                        <span key={f} className="rounded-full bg-[color-mix(in_oklch,var(--status-warning)_15%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--status-warning)]">{f}</span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Revenue rules evaluation will appear here.</p>
              )}
            </div>

            {/* Latest Outcome */}
            {revenueIntel?.data?.latest_outcome && (
              <div className="col-span-full rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  {revenueIntel.data.latest_outcome.outcome === 'won'
                    ? <ThumbsUp className="h-4 w-4 text-[var(--status-success)]" />
                    : <ThumbsDown className="h-4 w-4 text-[var(--status-danger)]" />}
                  <h3 className="font-semibold text-sm">Deal Outcome</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Result</p>
                    <p className="font-semibold capitalize">{revenueIntel.data.latest_outcome.outcome}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Product</p>
                    <p className="font-semibold">{revenueIntel.data.latest_outcome.product?.name ?? 'Unassigned'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sales Type</p>
                    <p className="font-semibold capitalize">{(revenueIntel.data.latest_outcome.sale_type ?? 'new_sales').replace('_', ' ')}</p>
                  </div>
                  {revenueIntel.data.latest_outcome.deal_size && (
                    <div>
                      <p className="text-xs text-muted-foreground">Deal Size</p>
                      <p className="font-semibold">{formatCurrency(revenueIntel.data.latest_outcome.deal_size)}</p>
                    </div>
                  )}
                  {revenueIntel.data.latest_outcome.feedback_notes && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm">{revenueIntel.data.latest_outcome.feedback_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {leadOutcomes.length > 0 && (
              <div className="col-span-full rounded-xl border border-border bg-card p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-sm">Product Revenue History</h3>
                  <Badge variant="neutral">{leadOutcomes.length} outcome{leadOutcomes.length === 1 ? '' : 's'}</Badge>
                </div>
                <div className="divide-y divide-border">
                  {leadOutcomes.map((outcome: any) => (
                    <div key={outcome.id} className="grid gap-2 py-3 text-sm md:grid-cols-[1.5fr_1fr_1fr_1fr]">
                      <div>
                        <p className="font-medium">{outcome.product?.name ?? 'Unassigned product'}</p>
                        <p className="text-xs text-muted-foreground">{outcome.feedback_notes || 'No notes'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Outcome</p>
                        <p className="font-semibold capitalize">{outcome.outcome}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Type</p>
                        <p className="font-semibold capitalize">{(outcome.sale_type ?? 'new_sales').replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Amount</p>
                        <p className="font-semibold">{formatCurrency(outcome.deal_size)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Commercial Invoices & Milestone Billing (FIN-001) */}
            <InvoicesListCard
              leadId={leadData.id}
              companyName={leadData.company_name || leadData.name || 'Pelanggan'}
              quotationAmount={Number(leadData.estimated_deal_size || 100000000)}
            />
          </div>
        </>
      )}
    </div>
  );
}
