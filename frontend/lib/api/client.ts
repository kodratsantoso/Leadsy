/**
 * Centralised API client for the Leads Generator Platform.
 * Points at NEXT_PUBLIC_API_URL (backend on :3001) when set,
 * otherwise uses same-origin Next.js route handlers.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

function url(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return BASE ? `${BASE}${p}` : p;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url(path), {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init?.headers,
    },
    credentials: "include",
  });

  if (res.status === 204) return undefined as unknown as T;

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `API ${res.status}`);
  }

  return (await res.json()) as T;
}

/* ── Helpers ── */

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  del: <T,>(path: string) => request<T>(path, { method: "DELETE" }),
};

/* ── Typed wrappers ── */

// Dashboard
export const fetchDashboard = () => api.get<{ data: DashboardData }>("/api/dashboard");
export const fetchHeatmapPoints = (params?: string) =>
  api.get<{ data: HeatmapPoint[] }>(`/api/dashboard/heatmap${params ? `?${params}` : ""}`);

// Leads
export const fetchLeads = (params?: string) =>
  api.get<PaginatedResponse<Lead>>(`/api/leads${params ? `?${params}` : ""}`);
export const fetchLead = (id: string) => api.get<{ data: Lead }>(`/api/leads/${id}`);
export const createLead = (data: Partial<Lead>) => api.post<{ data: Lead }>("/api/leads", data);
export const updateLead = (id: number, data: Partial<Lead>) =>
  api.put<{ data: Lead }>(`/api/leads/${id}`, data);
export const deleteLead = (id: number) => api.del(`/api/leads/${id}`);
export const pushLeadToFunnel = (id: number, stageId: number) =>
  api.post<{ data: Lead }>(`/api/leads/${id}/push-to-funnel`, { funnel_stage_id: stageId });

// Contacts
export const addLeadContact = (leadId: number, data: Partial<LeadContact>) =>
  api.post<{ data: LeadContact }>(`/api/leads/${leadId}/contacts`, data);
export const updateLeadContact = (leadId: number, contactId: number, data: Partial<LeadContact>) =>
  api.put<{ data: LeadContact }>(`/api/leads/${leadId}/contacts/${contactId}`, data);
export const deleteLeadContact = (leadId: number, contactId: number) =>
  api.del(`/api/leads/${leadId}/contacts/${contactId}`);
export const setLeadContactPrimary = (leadId: number, contactId: number) =>
  api.post<{ data: LeadContact }>(`/api/leads/${leadId}/contacts/${contactId}/set-primary`);
export const triggerContactEnrichment = (leadId: number) =>
  api.post<{ message: string }>(`/api/leads/${leadId}/enrich-contacts`);

// Territories
export const fetchTerritories = () => api.get<{ data: Territory[] }>("/api/territories");
export const createTerritory = (data: Partial<Territory>) =>
  api.post<{ data: Territory }>("/api/territories", data);

// Products
export const fetchProducts = () => api.get<{ data: Product[] }>("/api/products");
export const createProduct = (data: Partial<Product>) =>
  api.post<{ data: Product }>("/api/products", data);
export const updateProduct = (id: number, data: Partial<Product>) =>
  api.put<{ data: Product }>(`/api/products/${id}`, data);
export const deleteProduct = (id: number) => api.del(`/api/products/${id}`);

// Industries
export const fetchIndustries = () => api.get<{ data: Industry[] }>("/api/industries");
export const createIndustry = (data: Partial<Industry>) =>
  api.post<{ data: Industry }>("/api/industries", data);

// Funnel
export const fetchFunnelStages = () => api.get<{ data: FunnelStage[] }>("/api/funnel/stages");
export const fetchFunnelDashboard = () =>
  api.get<{ data: FunnelDashboardItem[] }>("/api/funnel/dashboard");

// AI Providers
export const fetchAiProviders = () => api.get<{ data: AiProvider[] }>("/api/ai-providers");
export const createAiProvider = (data: Record<string, unknown>) =>
  api.post<{ data: AiProvider }>("/api/ai-providers", data);
export const testAiProvider = (id: number) =>
  api.post<{ success: boolean; status: number }>(`/api/ai-providers/${id}/test`);

// Users
export const fetchUsers = () => api.get<{ data: AppUser[] }>("/api/users");
export const fetchRoles = () => api.get<{ data: Role[] }>("/api/roles");

// Audit Logs
export const fetchAuditLogs = (params?: string) =>
  api.get<PaginatedResponse<AuditLogEntry>>(`/api/audit-logs${params ? `?${params}` : ""}`);

// Revenue Intelligence — Analytics
export const fetchPipelineQuality = (territoryId?: number) =>
  api.get<{ data: PipelineQuality }>(
    `/api/analytics/pipeline-quality${territoryId ? `?territory_id=${territoryId}` : ""}`
  );
export const fetchSourceQuality = () =>
  api.get<{ data: SourceQualityItem[] }>("/api/analytics/source-quality");

// Revenue Intelligence — ICP Profiles
export const fetchIcpProfiles = () => api.get<{ data: IcpProfile[] }>("/api/icp-profiles");
export const createIcpProfile = (data: Partial<IcpProfile>) =>
  api.post<{ data: IcpProfile }>("/api/icp-profiles", data);
export const updateIcpProfile = (id: number, data: Partial<IcpProfile>) =>
  api.put<{ data: IcpProfile }>(`/api/icp-profiles/${id}`, data);
export const deleteIcpProfile = (id: number) => api.del(`/api/icp-profiles/${id}`);
export const batchMatchIcpProfile = (id: number) =>
  api.post<{ message: string }>(`/api/icp-profiles/${id}/batch-match`);

// Revenue Intelligence — Revenue Rules
export const fetchRevenueRules = () => api.get<{ data: RevenueRule[] }>("/api/revenue-rules");
export const createRevenueRule = (data: Partial<RevenueRule>) =>
  api.post<{ data: RevenueRule }>("/api/revenue-rules", data);
export const updateRevenueRule = (id: number, data: Partial<RevenueRule>) =>
  api.put<{ data: RevenueRule }>(`/api/revenue-rules/${id}`, data);
export const deleteRevenueRule = (id: number) => api.del(`/api/revenue-rules/${id}`);

// Revenue Intelligence — Lead Actions
export const icpMatchLead = (leadId: number) =>
  api.post<{ data: IcpMatchResult }>(`/api/leads/${leadId}/icp-match`);
export const predictConversion = (leadId: number) =>
  api.post<{ data: ConversionPrediction }>(`/api/leads/${leadId}/predict-conversion`);
export const prescribeLead = (leadId: number) =>
  api.post<{ data: LeadPrescription }>(`/api/leads/${leadId}/prescribe`);
export const checkLeadRevenue = (leadId: number) =>
  api.get<{ data: RevenueCheck }>(`/api/leads/${leadId}/revenue-check`);
export const recordLeadOutcome = (leadId: number, data: Partial<LeadOutcome>) =>
  api.post<{ data: LeadOutcome }>(`/api/leads/${leadId}/outcome`, data);
export const fetchRevenueIntelligence = (leadId: number) =>
  api.get<{ data: RevenueIntelligence }>(`/api/leads/${leadId}/revenue-intelligence`);
export const runRevenueAnalysis = (leadId: number) =>
  api.post<{ data: RevenueAnalysis }>(`/api/leads/${leadId}/revenue-analysis`);
export const fetchRevenueAnalysis = (leadId: number) =>
  api.get<{ data: RevenueAnalysis | null }>(`/api/leads/${leadId}/revenue-analysis`);
export const fetchVerificationQueue = (params?: string) =>
  api.get<{ data: QualificationWorkflowReview[] }>(`/api/qualification/reviews${params ? `?${params}` : ""}`);
export const decideVerificationReview = (
  reviewId: number,
  data: {
    decision: "approve" | "reject" | "hold" | "override_score";
    reason: string;
    final_status?: "pending" | "eligible" | "potential" | "not_eligible";
    score_override?: number;
  }
) => api.post<{ data: QualificationWorkflowReview }>(`/api/qualification/reviews/${reviewId}/decision`, data);
export const requestLeadVerification = (
  leadId: number,
  data?: { justification?: string; recommended_status?: "pending" | "eligible" | "potential" | "not_eligible" }
) => api.post<{ data: QualificationWorkflowReview }>(`/api/leads/${leadId}/verification/request`, data);
export const fetchLeadVerification = (leadId: number) =>
  api.get<{ data: LeadVerificationSnapshot }>(`/api/leads/${leadId}/verification`);

/* ── Types ── */

export type Lead = {
  id: number;
  company_name: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  website?: string | null;
  website_domain?: string | null;
  phone?: string | null;
  email?: string | null;
  industry_id?: number | null;
  sub_industry_id?: number | null;
  business_category?: string | null;
  company_size_estimate?: string | null;
  lead_score?: number | null;
  qualification_status?: string | null;
  ai_explanation?: string | null;
  duplicate_status?: string | null;
  ai_mode?: string | null;
  funnel_stage_id?: number | null;
  owner_id?: number | null;
  territory_id?: number | null;
  product_id?: number | null;
  created_by?: number | null;
  created_at?: string | null;
  industry?: Industry | null;
  sub_industry?: { id: number; name: string } | null;
  funnel_stage?: FunnelStage | null;
  owner?: { id: number; name: string } | null;
  territory?: Territory | null;
  product?: Product | null;
  contacts?: LeadContact[];
  sources?: LeadSource[];
  funnel_history?: FunnelHistoryEntry[];
};

export type LeadContact = {
  id: number;
  name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  confidence?: "high" | "medium" | "low" | null;
  confidence_score?: number | null;
  is_primary?: boolean;
  source?: string | null;
  do_not_contact?: boolean;
  created_at?: string | null;
};

export type LeadSource = {
  id: number;
  source_type: string;
  source_ref?: string | null;
  confidence?: string | null;
};

export type FunnelHistoryEntry = {
  id: number;
  from_stage?: FunnelStage | null;
  to_stage?: FunnelStage | null;
  moved_by?: { id: number; name: string } | null;
  created_at?: string;
};

export type Territory = {
  id: number;
  name: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  metadata?: Record<string, unknown>;
  created_at?: string;
};

export type Product = {
  id: number;
  name: string;
  category?: string | null;
  description?: string | null;
  target_industry?: string | null;
  target_pain_points?: string | null;
  target_buyer_persona?: string | null;
  ideal_company_profile?: string | null;
  ai_reference_material?: string | null;
  status?: string;
};

export type Industry = {
  id: number;
  name: string;
  synonyms?: string[];
  is_active?: boolean;
  sub_industries?: { id: number; name: string }[];
};

export type FunnelStage = {
  id: number;
  name: string;
  sequence: number;
  color: string;
  probability: number;
};

export type FunnelDashboardItem = FunnelStage & { count: number };

export type AiProvider = {
  id: number;
  name: string;
  slug: string;
  base_url?: string | null;
  api_key_masked?: string;
  status?: string;
  models?: AiModel[];
};

export type AiModel = {
  id: number;
  name: string;
  context_window?: number;
  capabilities?: string[];
  cost_tier?: string;
  status?: string;
};

export type AppUser = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  is_active: boolean;
  role?: Role | null;
};

export type Role = {
  id: number;
  name: string;
  display_name: string;
  permissions?: { id: number; name: string; display_name: string }[];
};

export type AuditLogEntry = {
  id: number;
  user_id?: number;
  action: string;
  module: string;
  record_type?: string;
  record_id?: number;
  before_value?: Record<string, unknown>;
  after_value?: Record<string, unknown>;
  ip_address?: string;
  created_at?: string;
  user?: { id: number; name: string };
};

export type DashboardData = {
  total_leads: number;
  qualified_leads: number;
  pipeline_leads?: number;
  duplicate_rate?: string;
  duplicate_count: number;
  duplicate_ratio: number;
  by_industry: { industry_id: number; total: number; industry?: { name: string } }[];
  by_status: Record<string, number>;
  by_territory: { territory_id: number; total: number; territory?: { name: string } }[];
  recent_leads: Pick<Lead, "id" | "company_name" | "lead_score" | "qualification_status" | "created_at">[];
  leads_change?: string | null;
  qualified_change?: string | null;
};

export type HeatmapPoint = {
  id: number;
  company_name: string;
  lat: number;
  lng: number;
  lead_score?: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

/* ── Revenue Intelligence Types ── */

export type PipelineQuality = {
  total_leads: number;
  qualified_leads: number;
  ghost_leads: number;
  qualified_ratio: number;
  ghost_lead_ratio: number;
  average_score: number;
  pipeline_quality_score: number;
  health: "healthy" | "warning" | "critical";
  by_status: Record<string, number>;
  by_score_band: { hot: number; warm: number; cold: number };
  score_distribution: Array<{ band: "hot" | "warm" | "cold"; count: number; percentage: number }>;
  insights: string[];
};

export type SourceQualityItem = {
  source_type: string;
  total_leads: number;
  avg_score: number;
  qualified_count: number;
  conversion_rate: number;
};

export type IcpProfile = {
  id: number;
  name: string;
  description?: string | null;
  target_industries?: number[] | null;
  target_company_sizes?: string[] | null;
  target_territories?: number[] | null;
  min_lead_score?: number;
  required_fields?: string[] | null;
  weight_lead_score?: number;
  weight_industry?: number;
  weight_company_size?: number;
  weight_territory?: number;
  weight_contact_info?: number;
  is_active?: boolean;
  created_at?: string;
};

export type IcpMatchResult = {
  matched: boolean;
  icp_profile?: string;
  icp_profile_id?: number;
  icp_score?: number;
  match_score?: number;
  match_status?: "strong_match" | "partial_match" | "weak_match";
  match_level?: "strong_match" | "partial_match" | "weak_match";
  score_breakdown?:
    | Array<{
        factor: string;
        input?: string;
        raw_score?: number;
        weight?: number;
        weighted_score?: number;
        reason?: string;
      }>
    | {
        reasoning?: string;
        source?: string;
        matched_config?: {
          id: number;
          industry?: string | null;
          size_range?: string | null;
          location?: string | null;
          priority_weight?: number | null;
        } | null;
        factors?: Array<{
          factor: string;
          input?: string;
          raw_score?: number;
          weight?: number;
          weighted_score?: number;
          reason?: string;
        }>;
      };
  reasoning?: string;
  reason?: string;
};

export type ConversionPrediction = {
  id: number;
  lead_id: number;
  probability_to_close: number;
  expected_deal_size?: number | null;
  estimated_sales_effort: "low" | "medium" | "high" | "very_high";
  confidence_score: number;
  prediction_factors?: Record<string, number>;
  model_version?: string;
  created_at?: string;
};

export type LeadPrescription = {
  id: number;
  lead_id: number;
  recommended_owner_id?: number | null;
  recommended_owner?: { id: number; name: string } | null;
  recommended_approach: string;
  next_best_action: string;
  follow_up_timing: string;
  priority_score: number;
  reasoning?: string | null;
  is_applied?: boolean;
  created_at?: string;
};

export type RevenueRule = {
  id: number;
  name: string;
  description?: string | null;
  condition_type: string;
  condition_value: Record<string, unknown>;
  action: "block" | "flag" | "prioritize" | "notify";
  severity: "critical" | "warning" | "info";
  is_active: boolean;
  priority: number;
  created_at?: string;
};

export type RevenueCheck = {
  blocked: boolean;
  flags: string[];
  rules_triggered: { rule: string; action: string; severity: string }[];
  can_enter_pipeline: boolean;
  summary: string;
};

export type LeadOutcome = {
  id: number;
  lead_id: number;
  outcome: "won" | "lost" | "churned" | "disqualified";
  deal_size?: number | null;
  loss_reason?: string | null;
  loss_category?: string | null;
  feedback_notes?: string | null;
  closed_at?: string | null;
  created_at?: string;
};

export type RevenueAnalysis = {
  id: number;
  lead_id: number;
  business_type?: string | null;
  use_case?: string | null;
  intent_level?: "high" | "medium" | "low" | null;
  urgency?: "high" | "medium" | "low" | null;
  probability_to_close?: number | null;
  buying_signals?: string[] | null;
  objections?: string[] | null;
  recommended_action?: string | null;
  recommended_approach?: string | null;
  confidence?: number | null;           // 0–1
  reasoning?: string[] | null;
  ai_model?: string | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  cost_usd?: number | null;
  status?: "success" | "failed" | "partial";
  created_at?: string;
};

export type RevenueIntelligence = {
  lead_id: number;
  icp_match?: (IcpMatchResult & { icp_profile?: IcpProfile }) | null;
  latest_prediction?: ConversionPrediction | null;
  latest_prescription?: LeadPrescription | null;
  revenue_check?: RevenueCheck | null;
  latest_outcome?: LeadOutcome | null;
  latest_analysis?: RevenueAnalysis | null;
};

export type QualificationWorkflowReview = {
  id: number;
  lead_id?: number | null;
  status: "pending" | "in_review" | "approved" | "rejected" | "overridden";
  decision?: "pending" | "approve" | "reject" | "hold" | "override_score" | null;
  current_stage_code?: string | null;
  recommended_status?: string | null;
  final_status?: string | null;
  justification?: string | null;
  decision_reason?: string | null;
  original_score?: number | null;
  score_override?: number | null;
  due_at?: string | null;
  reviewed_at?: string | null;
  decisioned_at?: string | null;
  created_at?: string | null;
  workflow?: {
    id: number;
    name: string;
    slug: string;
    stages?: Array<{
      id: number;
      code: string;
      label: string;
      sequence: number;
    }>;
  } | null;
  lead?: Pick<Lead, "id" | "company_name" | "lead_score" | "qualification_status"> | null;
  requester?: { id: number; name: string } | null;
  reviewer?: { id: number; name: string } | null;
};

export type LeadVerificationSnapshot = {
  requires_verification: boolean;
  verified_for_pipeline: boolean;
  blocked_from_pipeline: boolean;
  workflow?: {
    id: number;
    name: string;
    slug: string;
  } | null;
  latest_review?: QualificationWorkflowReview | null;
};
