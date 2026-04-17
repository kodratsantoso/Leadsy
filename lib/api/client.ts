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
  confidence?: string | null;
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
  duplicate_count: number;
  duplicate_ratio: number;
  by_industry: { industry_id: number; total: number; industry?: { name: string } }[];
  by_status: Record<string, number>;
  by_territory: { territory_id: number; total: number; territory?: { name: string } }[];
  recent_leads: Pick<Lead, "id" | "company_name" | "lead_score" | "qualification_status" | "created_at">[];
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
