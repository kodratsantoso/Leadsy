/**
 * Centralised API client for the Leadsy Platform.
 * Points at NEXT_PUBLIC_API_URL (backend on :3001) when set,
 * otherwise uses same-origin Next.js route handlers.
 */

import type { AppUser, AuditLogEntry, ConversionPrediction, DashboardData, FunnelDashboardItem, FunnelStage, HeatmapPoint, IcpMatchResult, IcpProfile, Industry, Lead, LeadContact, LeadOutcome, LeadPrescription, LeadVerificationSnapshot, PaginatedResponse, PipelineQuality, Product, RevenueAnalysis, RevenueCheck, RevenueIntelligence, RevenueRule, Role, SourceQualityItem, Territory } from "@/types/api";

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
export const markLeadEligible = (leadId: number) =>
  api.post<{ data: unknown }>(`/api/leads/${leadId}/mark-eligible`, {});
export const fetchLeadVerification = (leadId: number) =>
  api.get<{ data: LeadVerificationSnapshot }>(`/api/leads/${leadId}/verification`);

/* ── Types ── */

// Moved to @/types/api so they can be used without adopting this client.
export * from "@/types/api";
