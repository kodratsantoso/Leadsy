"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Loader2, ArrowLeft, HeartPulse, RefreshCw, CheckCircle2, Circle, Clock,
  AlertTriangle, MessageSquareText, Plus, TrendingUp, ArrowRightLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { fetchLead, Lead } from "@/lib/api/leads";
import {
  getLeadHealthScore, recalculateHealthScore,
  getOnboardingMilestones, generateOnboardingWorkflow, updateOnboardingMilestone,
  getLeadRenewalIntelligence, getLeadFeedbacks, recordFeedback,
  CustomerHealthScore, OnboardingMilestone, OnboardingMilestoneStatus,
  RenewalOpportunity, CustomerFeedback, FeedbackSurveyType, HealthStatus,
} from "@/lib/api/customer-success";

const HEALTH_STATUS_VARIANT: Record<HealthStatus, "success" | "brand" | "warning" | "danger"> = {
  thriving: "success", healthy: "brand", at_risk: "warning", critical: "danger",
};

const MILESTONE_STATUS_ICON: Record<OnboardingMilestoneStatus, typeof Circle> = {
  pending: Circle, in_progress: Clock, completed: CheckCircle2, delayed: AlertTriangle, blocked: AlertTriangle,
};

const SURVEY_TYPES: { value: FeedbackSurveyType; label: string; scaleHint: string }[] = [
  { value: "nps", label: "NPS", scaleHint: "0-10" },
  { value: "csat", label: "CSAT", scaleHint: "1-5" },
  { value: "onboarding_review", label: "Onboarding Review", scaleHint: "1-5" },
  { value: "qbr_feedback", label: "QBR Feedback", scaleHint: "1-5" },
];

export function CustomerSuccessDetail({ leadId }: { leadId: number }) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [health, setHealth] = useState<CustomerHealthScore | null>(null);
  const [milestones, setMilestones] = useState<OnboardingMilestone[]>([]);
  const [renewals, setRenewals] = useState<RenewalOpportunity[]>([]);
  const [crossSells, setCrossSells] = useState<RenewalOpportunity[]>([]);
  const [feedbacks, setFeedbacks] = useState<CustomerFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [generatingOnboarding, setGeneratingOnboarding] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [l, h, m, r, f] = await Promise.all([
        fetchLead(String(leadId)),
        getLeadHealthScore(leadId).catch(() => null),
        getOnboardingMilestones(leadId).catch(() => []),
        getLeadRenewalIntelligence(leadId).catch(() => ({ renewals: [], cross_sells: [] })),
        getLeadFeedbacks(leadId).catch(() => []),
      ]);
      setLead(l);
      setHealth(h);
      setMilestones(m);
      setRenewals(r.renewals);
      setCrossSells(r.cross_sells);
      setFeedbacks(f);
    } catch (e) {
      console.error(e);
      setError("Failed to load customer success data for this lead.");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleRecalculate = async () => {
    try {
      setRecalculating(true);
      const h = await recalculateHealthScore(leadId);
      setHealth(h);
    } catch (e) {
      console.error(e);
      setError("Failed to recalculate health score.");
    } finally {
      setRecalculating(false);
    }
  };

  const handleGenerateOnboarding = async () => {
    try {
      setGeneratingOnboarding(true);
      const m = await generateOnboardingWorkflow(leadId);
      setMilestones(m);
    } catch (e) {
      console.error(e);
      setError("Failed to generate onboarding workflow.");
    } finally {
      setGeneratingOnboarding(false);
    }
  };

  const handleCompleteMilestone = async (milestone: OnboardingMilestone) => {
    try {
      const updated = await updateOnboardingMilestone(milestone.id, { status: "completed" });
      await loadAll();
    } catch (e) {
      console.error(e);
      setError("Failed to update milestone.");
    }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/customer-success">
          <Button variant="ghost"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{lead?.company_name ?? `Lead #${leadId}`}</h1>
          <p className="text-sm text-muted-foreground">Customer Success Overview</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Health Score */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><HeartPulse className="h-4 w-4 text-[color:var(--brand)]" /> Health Score</CardTitle>
          <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={recalculating}>
            {recalculating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Recalculate
          </Button>
        </CardHeader>
        <CardContent>
          {!health ? (
            <p className="text-sm text-muted-foreground">No health score calculated yet. Click Recalculate to generate one.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-4xl font-bold">{health.overall_score}</span>
                <Badge variant={HEALTH_STATUS_VARIANT[health.health_status]}>{health.health_status.replace("_", " ")}</Badge>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" /> {health.trend}
                </span>
              </div>
              {health.summary && <p className="text-sm text-muted-foreground">{health.summary}</p>}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                {[
                  { label: "Activity", value: health.activity_score },
                  { label: "Onboarding", value: health.onboarding_score },
                  { label: "Sentiment", value: health.sentiment_score },
                  { label: "Relationship", value: health.relationship_score },
                ].map(d => (
                  <div key={d.label} className="border rounded-md p-3">
                    <p className="text-xs text-muted-foreground">{d.label}</p>
                    <p className="text-xl font-semibold">{d.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Onboarding milestones */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Onboarding Milestones</CardTitle>
          {milestones.length === 0 && (
            <Button size="sm" onClick={handleGenerateOnboarding} disabled={generatingOnboarding}>
              {generatingOnboarding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Generate Workflow
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground">No onboarding workflow generated yet.</p>
          ) : (
            <div className="space-y-2">
              {milestones.sort((a, b) => a.sequence - b.sequence).map(m => {
                const Icon = MILESTONE_STATUS_ICON[m.status];
                return (
                  <div key={m.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`h-4 w-4 shrink-0 ${m.status === "completed" ? "text-[var(--success)]" : m.status === "delayed" || m.status === "blocked" ? "text-[var(--danger)]" : "text-muted-foreground"}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{m.title}</p>
                        {m.description && <p className="text-xs text-muted-foreground truncate">{m.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground">{m.target_date ? new Date(m.target_date).toLocaleDateString() : ""}</span>
                      <Badge variant={m.status === "completed" ? "success" : m.status === "delayed" || m.status === "blocked" ? "danger" : "neutral"}>
                        {m.status.replace("_", " ")}
                      </Badge>
                      {m.status !== "completed" && (
                        <Button size="sm" variant="outline" onClick={() => handleCompleteMilestone(m)}>Mark Complete</Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Renewal & Cross-sell */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ArrowRightLeft className="h-4 w-4 text-[color:var(--brand)]" /> Renewal & Cross-Sell</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Renewals</h4>
            {renewals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No renewal opportunities identified.</p>
            ) : (
              <div className="space-y-2">
                {renewals.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <p className="text-sm font-medium">{r.reasoning ?? "Renewal opportunity"}</p>
                      <p className="text-xs text-muted-foreground">
                        Contract ends: {r.current_contract_end ? new Date(r.current_contract_end).toLocaleDateString() : "-"}
                        {r.days_until_expiration !== null && r.days_until_expiration !== undefined ? ` (${r.days_until_expiration} days)` : ""}
                      </p>
                    </div>
                    <Badge variant={r.urgency === "critical" ? "danger" : r.urgency === "high" ? "warning" : "neutral"}>{r.urgency}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Cross-Sell</h4>
            {crossSells.length === 0 ? (
              <p className="text-sm text-muted-foreground">No cross-sell opportunities identified.</p>
            ) : (
              <div className="space-y-2">
                {crossSells.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <p className="text-sm font-medium">{r.recommended_product?.name ?? "Recommended product"}</p>
                      {r.reasoning && <p className="text-xs text-muted-foreground">{r.reasoning}</p>}
                    </div>
                    {r.estimated_value != null && (
                      <span className="text-sm font-mono">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(r.estimated_value)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feedback */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><MessageSquareText className="h-4 w-4 text-[color:var(--brand)]" /> Feedback History</CardTitle>
          <Button size="sm" onClick={() => setFeedbackModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Record Feedback
          </Button>
        </CardHeader>
        <CardContent>
          {feedbacks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feedback recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {feedbacks.map(f => (
                <div key={f.id} className="p-3 border rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{f.survey_type.replace("_", " ")}</Badge>
                      <span className="text-sm font-semibold">Score: {f.score}</span>
                      <Badge variant={f.sentiment === "positive" ? "success" : f.sentiment === "negative" ? "danger" : "neutral"}>{f.category}</Badge>
                      {f.action_required && !f.resolved_at && <Badge variant="danger">Needs Attention</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</span>
                  </div>
                  {f.feedback_text && <p className="text-sm text-muted-foreground mt-2">{f.feedback_text}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <RecordFeedbackModal
        open={feedbackModalOpen}
        onOpenChange={setFeedbackModalOpen}
        leadId={leadId}
        onRecorded={async () => {
          setFeedbackModalOpen(false);
          await loadAll();
        }}
      />
    </div>
  );
}

function RecordFeedbackModal({ open, onOpenChange, leadId, onRecorded }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: number;
  onRecorded: () => void;
}) {
  const [surveyType, setSurveyType] = useState<FeedbackSurveyType>("nps");
  const [score, setScore] = useState<number>(9);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeSurvey = SURVEY_TYPES.find(s => s.value === surveyType)!;
  const maxScore = surveyType === "nps" ? 10 : 5;

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await recordFeedback(leadId, {
        survey_type: surveyType,
        score,
        feedback_text: feedbackText.trim() || undefined,
      });
      setFeedbackText("");
      setScore(surveyType === "nps" ? 9 : 4);
      onRecorded();
    } catch (e) {
      console.error(e);
      setError("Failed to record feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Record Customer Feedback"
      description="Log a survey response or ad-hoc feedback for this customer."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save Feedback
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
            <AlertTriangle className="w-4 h-4" /> {error}
          </div>
        )}
        <div className="space-y-2">
          <label className="text-sm font-medium">Survey Type</label>
          <Select
            value={surveyType}
            onChange={e => {
              const v = e.target.value as FeedbackSurveyType;
              setSurveyType(v);
              setScore(v === "nps" ? 9 : 4);
            }}
          >
            {SURVEY_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Score ({activeSurvey.scaleHint})</label>
          <input
            type="number"
            min={surveyType === "nps" ? 0 : 1}
            max={maxScore}
            value={score}
            onChange={e => setScore(parseInt(e.target.value) || 0)}
            className="w-full h-10 px-3 border rounded-md text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Feedback (optional)</label>
          <textarea
            className="w-full min-h-[100px] p-3 rounded-md border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--brand)]"
            placeholder="What did the customer say?"
            value={feedbackText}
            onChange={e => setFeedbackText(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
