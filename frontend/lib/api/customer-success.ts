import { apiFetch } from "../apiFetch";

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await apiFetch(path, options);
  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }
  const json = await res.json();
  return (json && typeof json === "object" && "data" in json) ? (json as any).data : json;
}

export type HealthStatus = "thriving" | "healthy" | "at_risk" | "critical";
export type HealthTrend = "improving" | "stable" | "declining";

export type CustomerHealthScore = {
  id: number;
  lead_id: number;
  overall_score: number;
  health_status: HealthStatus;
  activity_score: number;
  onboarding_score: number;
  sentiment_score: number;
  relationship_score: number;
  factors_json?: {
    activity_factors?: Record<string, any>;
    onboarding_factors?: Record<string, any>;
    sentiment_factors?: Record<string, any>;
    relationship_factors?: Record<string, any>;
    penalties?: string[];
  };
  summary?: string | null;
  trend: HealthTrend;
  calculated_at: string;
  lead?: { id: number; company_name: string };
};

export async function getHealthScores(): Promise<CustomerHealthScore[]> {
  return fetchApi<CustomerHealthScore[]>("/customer-success/health-scores");
}

export async function getLeadHealthScore(leadId: number): Promise<CustomerHealthScore> {
  return fetchApi<CustomerHealthScore>(`/leads/${leadId}/health-score`);
}

export async function recalculateHealthScore(leadId: number): Promise<CustomerHealthScore> {
  return fetchApi<CustomerHealthScore>(`/leads/${leadId}/health-score/recalculate`, { method: "POST" });
}

export type ChurnRiskLevel = "low" | "medium" | "high" | "critical";

export type ChurnRisk = {
  lead_id: number;
  company_name: string;
  health_score: number;
  health_status: HealthStatus;
  risk_level: ChurnRiskLevel;
  primary_risk_factor: string;
  recommended_intervention: string;
  highlight_id?: number | null;
};

export async function getChurnRisks(): Promise<ChurnRisk[]> {
  return fetchApi<ChurnRisk[]>("/customer-success/churn-risks");
}

export type OnboardingMilestoneStatus = "pending" | "in_progress" | "completed" | "delayed" | "blocked";

export type OnboardingMilestone = {
  id: number;
  lead_id: number;
  sales_order_id?: number | null;
  title: string;
  description?: string | null;
  sequence: number;
  target_date?: string | null;
  completed_at?: string | null;
  status: OnboardingMilestoneStatus;
  owner_id?: number | null;
  deliverables?: string[] | null;
};

export async function getOnboardingMilestones(leadId: number): Promise<OnboardingMilestone[]> {
  return fetchApi<OnboardingMilestone[]>(`/leads/${leadId}/onboarding-milestones`);
}

export async function generateOnboardingWorkflow(leadId: number): Promise<OnboardingMilestone[]> {
  return fetchApi<OnboardingMilestone[]>(`/leads/${leadId}/onboarding/generate`, { method: "POST" });
}

export async function updateOnboardingMilestone(
  milestoneId: number,
  payload: { status?: OnboardingMilestoneStatus; target_date?: string; description?: string }
): Promise<OnboardingMilestone> {
  return fetchApi<OnboardingMilestone>(`/onboarding-milestones/${milestoneId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export type RenewalOpportunityType = "renewal" | "upsell" | "cross_sell";
export type RenewalUrgency = "normal" | "high" | "critical";
export type RenewalStatus = "identified" | "in_discussion" | "quoted" | "closed_won" | "closed_lost";

export type RenewalOpportunity = {
  id: number;
  lead_id: number;
  sales_order_id?: number | null;
  opportunity_type: RenewalOpportunityType;
  current_contract_end?: string | null;
  urgency: RenewalUrgency;
  days_until_expiration?: number | null;
  recommended_product_id?: number | null;
  estimated_value?: number | null;
  reasoning?: string | null;
  pitch_talking_points?: string[] | null;
  status: RenewalStatus;
  lead?: { id: number; company_name: string };
  recommended_product?: { id: number; name: string };
};

export async function getRenewalOpportunities(): Promise<RenewalOpportunity[]> {
  return fetchApi<RenewalOpportunity[]>("/customer-success/renewals");
}

export async function getLeadRenewalIntelligence(leadId: number): Promise<{
  renewals: RenewalOpportunity[];
  cross_sells: RenewalOpportunity[];
}> {
  return fetchApi(`/leads/${leadId}/renewal-intelligence`);
}

export type FeedbackSurveyType = "nps" | "csat" | "onboarding_review" | "qbr_feedback";
export type FeedbackSentiment = "positive" | "neutral" | "negative";

export type CustomerFeedback = {
  id: number;
  lead_id: number;
  contact_id?: number | null;
  sales_order_id?: number | null;
  survey_type: FeedbackSurveyType;
  score: number;
  category: string;
  feedback_text?: string | null;
  sentiment: FeedbackSentiment;
  action_required: boolean;
  resolved_at?: string | null;
  created_at: string;
};

export async function getLeadFeedbacks(leadId: number): Promise<CustomerFeedback[]> {
  return fetchApi<CustomerFeedback[]>(`/leads/${leadId}/feedbacks`);
}

export async function recordFeedback(leadId: number, payload: {
  survey_type: FeedbackSurveyType;
  score: number;
  feedback_text?: string;
  contact_id?: number;
  sales_order_id?: number;
}): Promise<CustomerFeedback> {
  return fetchApi<CustomerFeedback>(`/leads/${leadId}/feedbacks`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type ProactiveAlert =
  | { type: "renewal_alert"; lead_id: number; company_name: string; days_left: number; highlight_id?: number | null }
  | { type: "detractor_alert"; lead_id: number; company_name: string; survey_type: FeedbackSurveyType; score: number };

export async function getProactiveAlerts(): Promise<ProactiveAlert[]> {
  return fetchApi<ProactiveAlert[]>("/customer-success/proactive-alerts");
}
