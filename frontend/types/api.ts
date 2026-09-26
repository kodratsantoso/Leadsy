/**
 * Shared shapes for what the Leadsy API returns.
 *
 * These lived inside `lib/api/client.ts` — a fetch client that, as of 2026-09-26, exactly
 * one file imported. The types were good; they were simply unreachable, because the rest
 * of the app fetches through `lib/apiFetch.ts` and would have had to adopt an unrelated
 * client to get at them. That is how 462 `: any` accumulated next to a 500-line type
 * library nobody used. They live here now so a component can type a response without
 * changing how it fetches.
 *
 * Two conventions worth knowing when extending these:
 *  - A Laravel `decimal:N` cast serialises as a STRING ("1500000.00"), not a number.
 *  - A relation is present only when the endpoint eager-loaded it, so every one is
 *    optional. `industry?: Industry | null` means "not loaded" and "loaded as null" both.
 */

export type Lead = {
  id: number;
  company_name: string;
  brand?: string | null;
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
  qualification_status?: QualificationStatus | null;
  ai_explanation?: string | null;
  duplicate_status?: string | null;
  ai_mode?: string | null;
  funnel_stage_id?: number | null;
  owner_id?: number | null;
  territory_id?: number | null;
  product_id?: number | null;
  created_by?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;

  // Present on the model and written by the edit form, but missing from this type until
  // 2026-09-26 — nothing type-checked against it, so the gaps went unnoticed.
  business_category_id?: number | null;
  branch_count?: number | null;
  operating_hours?: string | null;
  social_profiles?: Record<string, string> | null;
  customer_story?: string | null;
  meeting_link?: string | null;
  parent_lead_id?: number | null;
  external_id?: string | null;
  external_place_id?: string | null;
  duplicate_of_id?: number | null;

  /** Laravel `decimal:2` — serialised as a string such as "1500000.00", never a number. */
  estimated_closing_amount?: string | null;
  /** Laravel `decimal:2` — serialised as a string, see above. */
  realized_closing_amount?: string | null;

  presales_owner_id?: number | null;
  am_owner_id?: number | null;
  csm_owner_id?: number | null;

  // BANTC, stored per lead on the model itself.
  budget?: string | null;
  authority?: string | null;
  needs?: string | null;
  timeline?: string | null;
  competitor?: string | null;

  use_ai_reference?: boolean;
  ai_reference_source_type?: "document" | "url" | "master_product" | null;
  ai_reference_id?: number | null;
  ai_processing_status?: "pending" | "processing" | "completed" | "failed" | null;

  enrichment_status?: string | null;
  last_enriched_at?: string | null;

  lark_base_id?: string | null;
  lark_table_id?: string | null;

  industry?: Industry | null;
  sub_industry?: { id: number; name: string } | null;
  funnel_stage?: FunnelStage | null;
  owner?: UserRef | null;
  presales_owner?: UserRef | null;
  am_owner?: UserRef | null;
  csm_owner?: UserRef | null;
  parent_lead?: Pick<Lead, "id" | "company_name"> | null;
  subsidiaries?: Pick<Lead, "id" | "company_name">[] | null;
  territory?: Territory | null;
  product?: Product | null;
  contacts?: LeadContact[];
  sources?: LeadSource[];
  funnel_history?: FunnelHistoryEntry[];
};

/**
 * Every value the application actually writes to `qualification_status`.
 *
 * `disqualified` belongs here: the rule engine writes it and the badges render it. It was
 * missing from the backend's own update rule until 2f0737b, which rejected saving a lead
 * the engine had just disqualified — the same omission, one layer down.
 */
export type QualificationStatus =
  | "pending"
  | "eligible"
  | "potential"
  | "not_eligible"
  | "disqualified";

/** How a lead's owner relations come back. Endpoints that select columns send only id and name. */
export type UserRef = { id: number; name: string; email?: string | null };

export type LeadContact = {
  id: number;
  name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  email_verified?: boolean;
  email_source?: string | null;
  department?: string | null;
  seniority_level?: string | null;
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
  /** Written by LeadController::syncLeadSource; the channel lives on the source, not the lead. */
  channel_type_id?: number | null;
  channel_type?: LeadChannelType | null;
  source_ref?: string | null;
  confidence?: string | null;
  last_verified_at?: string | null;
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

/** Where a lead came from — the top level of the source/channel pair. */
export type LeadSourceType = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  sort_order?: number | null;
  is_active: boolean;
  /** Eager-loaded by the lead-source-types endpoint; absent elsewhere. */
  channels?: LeadChannelType[];
};

/** The specific channel under a source, e.g. "LinkedIn" under "Social". */
export type LeadChannelType = {
  id: number;
  lead_source_type_id: number;
  name: string;
  slug: string;
  description?: string | null;
  sort_order?: number | null;
  is_active: boolean;
  source_type?: LeadSourceType | null;
};

export type BusinessCategory = {
  id: number;
  code: string;
  name: string;
  synonyms?: string[] | null;
  scoring_hints?: Record<string, unknown> | null;
  is_active: boolean;
};

export type SubIndustry = { id: number; name: string };

export type FunnelStage = {
  id: number;
  name: string;
  sequence: number;
  color: string;
  probability: number;
};

export type FunnelDashboardItem = FunnelStage & { count: number };

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
