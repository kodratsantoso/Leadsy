'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AILoader } from '@/components/ui/ai-loader';
import { AlertCircle, Printer, Sparkles } from 'lucide-react';
import { safeJsonArray } from '@/lib/utils';

interface CustomerJourneyTabProps {
  customerJourney: any;
  journeyFeedback?: string | null;
  generateCustomerStoryMutation: {
    mutate: () => void;
    isPending: boolean;
  };
  formatCurrency: (val: number) => string;
}

export function CustomerJourneyTab({
  customerJourney,
  journeyFeedback,
  generateCustomerStoryMutation,
  formatCurrency,
}: CustomerJourneyTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <div>
          <h2 className="text-lg font-bold">End-to-End Customer Journey</h2>
          <p className="text-sm text-muted-foreground">Aggregated view of the entire relationship lifecycle.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> Export to PDF
        </Button>
      </div>

      {journeyFeedback && (
        <div className="rounded-lg bg-[color-mix(in_oklch,var(--status-danger)_15%,transparent)] p-4 text-sm text-[var(--status-danger)]">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="h-4 w-4" />
            Generation Failed
          </div>
          <p className="mt-1">{journeyFeedback}</p>
        </div>
      )}

      {!customerJourney?.data ? (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          Loading journey data...
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-12 print:block print:space-y-8">
          {/* LEFT COLUMN: Timeline */}
          <div className="md:col-span-3 print:col-span-12">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 font-semibold">Journey Timeline</h3>
              <div className="relative border-l border-border pl-4 space-y-6">
                {safeJsonArray(customerJourney.data.timeline).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events recorded.</p>
                ) : (
                  safeJsonArray(customerJourney.data.timeline).map((event: any, i: number) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[var(--brand)] outline outline-2 outline-card"></div>
                      <div className="text-xs font-semibold text-[var(--brand)]">
                        {new Date(event.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="mt-1 font-medium text-sm">{event.title}</div>
                      {event.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {event.description}
                        </p>
                      )}
                      {event.outcome && (
                        <div className="mt-1">
                          <Badge variant="outline" className="text-[10px]">
                            {event.outcome}
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* CENTER COLUMN: Narrative & Intelligence */}
          <div className="md:col-span-6 space-y-6 print:col-span-12">
            {/* Final Story block */}
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between no-print">
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[var(--brand)]" />
                  Final Customer Story
                </h3>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => generateCustomerStoryMutation.mutate()}
                  disabled={generateCustomerStoryMutation.isPending}
                >
                  {generateCustomerStoryMutation.isPending
                    ? 'Generating...'
                    : customerJourney.data.final_customer_story
                      ? 'Regenerate Story'
                      : 'Generate Story'}
                </Button>
              </div>
              {/* Print Title */}
              <h3 className="hidden font-semibold flex items-center gap-2 mb-4 print:flex">
                Final Customer Story
              </h3>

              <div className="prose prose-sm dark:prose-invert max-w-none">
                {!customerJourney.data.final_customer_story &&
                !generateCustomerStoryMutation.isPending ? (
                  <p className="text-muted-foreground italic text-center py-8">
                    No customer story generated yet. Click generate to analyze the timeline and build a narrative.
                  </p>
                ) : generateCustomerStoryMutation.isPending ? (
                  <div className="py-8">
                    <AILoader text="Analyzing journey timeline and writing narrative" />
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {customerJourney.data.final_customer_story}
                  </div>
                )}
              </div>
            </div>

            {/* Meeting Intelligence */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 font-semibold">Meeting Intelligence</h3>
              {safeJsonArray(customerJourney.data.meeting_intelligence).length === 0 ? (
                <p className="text-sm text-muted-foreground">No meetings evaluated.</p>
              ) : (
                <div className="space-y-4">
                  {safeJsonArray(customerJourney.data.meeting_intelligence).map(
                    (mtg: any, i: number) => (
                      <div key={i} className="border border-border/50 bg-muted/20 p-4 rounded-md">
                        <h4 className="font-medium text-sm mb-2">{mtg.title}</h4>
                        {safeJsonArray(mtg.evaluations).map((ev: any, j: number) => (
                          <div key={j} className="space-y-2 mt-2">
                            <p className="text-xs text-muted-foreground">{ev.summary}</p>
                            {ev.next_best_action && (
                              <div className="text-xs bg-background p-2 rounded border border-border/50">
                                <strong>Next Action:</strong> {ev.next_best_action}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Insights */}
          <div className="md:col-span-3 space-y-6 print:col-span-12">
            {/* Profile Snapshot */}
            <div className="rounded-lg border border-border bg-[var(--brand-soft)]/20 p-6">
              <h3 className="mb-4 font-semibold">Customer Snapshot</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Company:</span>{' '}
                  <strong className="block">{customerJourney.data.profile_snapshot?.company_name}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Industry:</span>{' '}
                  <strong className="block">{customerJourney.data.profile_snapshot?.industry || '—'}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Size:</span>{' '}
                  <strong className="block">{customerJourney.data.profile_snapshot?.size || '—'}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Owner:</span>{' '}
                  <strong className="block">{customerJourney.data.profile_snapshot?.owner || '—'}</strong>
                </div>
              </div>
            </div>

            {/* Pre Meeting Insights */}
            {customerJourney.data.pre_meeting_insights && (
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="mb-4 font-semibold">Pre-Meeting Insights</h3>
                <div className="space-y-3 text-sm">
                  {customerJourney.data.pre_meeting_insights.objective_hypothesis?.inferred_goals && (
                    <div>
                      <strong className="block">Inferred Goals:</strong>{' '}
                      <span className="text-muted-foreground">
                        {customerJourney.data.pre_meeting_insights.objective_hypothesis.inferred_goals}
                      </span>
                    </div>
                  )}
                  {customerJourney.data.pre_meeting_insights.pain_points?.operational_pain && (
                    <div>
                      <strong className="block">Operational Pain:</strong>{' '}
                      <span className="text-muted-foreground">
                        {customerJourney.data.pre_meeting_insights.pain_points.operational_pain}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Product Fit */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 font-semibold">Product Fit</h3>
              {safeJsonArray(customerJourney.data.product_fit_analysis).length === 0 ? (
                <p className="text-sm text-muted-foreground">No product matches calculated.</p>
              ) : (
                <div className="space-y-4">
                  {safeJsonArray(customerJourney.data.product_fit_analysis).map((fit: any, i: number) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <strong className="text-sm">{fit.product}</strong>
                        <Badge variant={fit.match_score > 70 ? 'success' : 'warning'}>
                          {fit.match_score}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ICP Match: {fit.icp_match ? 'Yes' : 'No'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Post Meeting Status */}
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 font-semibold">Post-Meeting Status</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-1">Qualification Status:</span>
                  <Badge
                    variant={
                      customerJourney.data.post_meeting_analysis?.qualification_status === 'Eligible'
                        ? 'success'
                        : 'outline'
                    }
                  >
                    {customerJourney.data.post_meeting_analysis?.qualification_status || 'Unknown'}
                  </Badge>
                </div>
                {customerJourney.data.post_meeting_analysis?.risk_analysis && (
                  <div className="pt-2 border-t border-border/50">
                    <span className="text-muted-foreground block mb-1">Risk Summary:</span>
                    <div className="text-xs space-y-1">
                      <div>
                        <strong>Deal Risk:</strong>{' '}
                        {customerJourney.data.post_meeting_analysis.risk_analysis.deal_risk_score}
                      </div>
                      <div>
                        <strong>Persona Risk:</strong>{' '}
                        {customerJourney.data.post_meeting_analysis.risk_analysis.persona_risk}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Revenue Journey */}
            <div className="rounded-lg border border-[var(--status-success)]/30 bg-[var(--status-success)]/5 p-6">
              <h3 className="mb-4 font-semibold">Revenue Journey</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Expected Value:</span>{' '}
                  <strong className="block text-lg">
                    {formatCurrency(Number(customerJourney.data.revenue_journey?.estimated_value || 0))}
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Realized Value:</span>{' '}
                  <strong className="block text-lg">
                    {formatCurrency(Number(customerJourney.data.revenue_journey?.realized_value || 0))}
                  </strong>
                </div>
                <div className="pt-2 border-t border-border/50">
                  <span className="text-muted-foreground">Next Action:</span>{' '}
                  <span className="block text-xs font-medium">
                    {customerJourney.data.revenue_journey?.next_step || 'None identified'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
