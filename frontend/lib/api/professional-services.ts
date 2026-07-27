import { apiFetch } from "../apiFetch";

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await apiFetch(path, options);
  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }
  const json = await res.json();
  return json.data;
}

export type PsServiceCategory = {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
};

export type PsComplexityLevel = {
  id: number;
  name: string;
  multiplier: string;
  description: string;
  is_active: boolean;
};

export type PsRole = {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  rateCards?: any[];
};

export type PsConfig = {
  categories: PsServiceCategory[];
  complexity_levels: PsComplexityLevel[];
  roles: PsRole[];
};

export type PsEstimationLine = {
  id?: number;
  estimation_id?: number;
  role_id: number;
  template_component_id?: number;
  task_name: string;
  description?: string;
  base_mandays: number;
  adjusted_mandays?: number;
  buffer_mandays?: number;
  manual_adjustment: number;
  final_mandays?: number;
  rate_snapshot?: number;
  estimated_fee?: number;
  sort_order: number;
  role?: PsRole;
};

export type PsEstimation = {
  id: number;
  estimation_number: string;
  lead_id?: number;
  lead?: any;
  service_category_id: number;
  template_id?: number;
  complexity_level_id?: number;
  title: string;
  complexity_multiplier: number;
  buffer_percentage: number;
  currency_code: string;
  total_base_mandays: number;
  total_adjusted_mandays: number;
  total_buffer_mandays: number;
  total_manual_adjustment_mandays: number;
  total_final_mandays: number;
  total_estimated_fee: number;
  assumptions?: string;
  out_of_scope?: string;
  dependencies?: string;
  risks?: string;
  internal_notes?: string;
  status: "draft" | "pm_reviewed" | "approved" | "converted_to_quotation" | "archived";
  created_at: string;
  updated_at: string;
  reviewed_at?: string;
  approved_at?: string;
  lines?: PsEstimationLine[];
};

export type PsEstimationTemplate = {
  id: number;
  name: string;
  description: string;
  serviceCategory?: PsServiceCategory;
  components?: any[];
};

export async function getPsConfig(): Promise<PsConfig> {
  const { data } = await fetchApi<{ data: PsConfig }>("/professional-services/config");
  return data;
}

export async function getEstimationsByLead(leadId: number): Promise<PsEstimation[]> {
  const { data } = await fetchApi<{ data: PsEstimation[] }>(`/professional-services/estimations?lead_id=${leadId}`);
  return data;
}

export async function getEstimation(id: number): Promise<PsEstimation> {
  const { data } = await fetchApi<{ data: PsEstimation }>(`/professional-services/estimations/${id}`);
  return data;
}

export async function createEstimation(payload: Partial<PsEstimation> & { lines: Partial<PsEstimationLine>[] }): Promise<PsEstimation> {
  const { data } = await fetchApi<{ data: PsEstimation }>("/professional-services/estimations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function updateEstimation(id: number, payload: Partial<PsEstimation> & { lines: Partial<PsEstimationLine>[] }): Promise<PsEstimation> {
  const { data } = await fetchApi<{ data: PsEstimation }>(`/professional-services/estimations/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function duplicateEstimation(id: number): Promise<PsEstimation> {
  const { data } = await fetchApi<{ data: PsEstimation }>(`/professional-services/estimations/${id}/duplicate`, {
    method: "POST",
  });
  return data;
}

export async function reviewEstimation(id: number): Promise<PsEstimation> {
  const { data } = await fetchApi<{ data: PsEstimation }>(`/professional-services/estimations/${id}/review`, {
    method: "POST",
  });
  return data;
}

export async function approveEstimation(id: number): Promise<PsEstimation> {
  const { data } = await fetchApi<{ data: PsEstimation }>(`/professional-services/estimations/${id}/approve`, {
    method: "POST",
  });
  return data;
}

export async function convertToQuotationLine(id: number): Promise<{
  added_to_existing: boolean;
  quotation_id: number | null;
  suggested_item: any;
}> {
  const { data } = await fetchApi<{ data: any }>(`/professional-services/estimations/${id}/convert-to-quotation-line`, {
    method: "POST",
  });
  return data;
}

export async function getTemplates(): Promise<PsEstimationTemplate[]> {
  const { data } = await fetchApi<{ data: PsEstimationTemplate[] }>("/professional-services/templates");
  return data;
}

export async function getTemplate(id: number): Promise<PsEstimationTemplate> {
  const { data } = await fetchApi<{ data: PsEstimationTemplate }>(`/professional-services/templates/${id}`);
  return data;
}
