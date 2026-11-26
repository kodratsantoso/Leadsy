import { apiFetch } from "@/lib/apiFetch";

export interface IncentivePolicy {
  id: number;
  tenant_id: number | null;
  policy_name: string;
  is_active: boolean;
  saas_pool_rate: string | number;
  ps_pool_rate: string | number;
  direct_allocation_percentage: string | number;
  indirect_allocation_percentage: string | number;
  shared_allocation_percentage: string | number;
  revenue_trigger: "cash_collection" | "invoiced_dpp" | "sales_order_confirmed";
  exclude_vat: boolean;
  exclude_wht: boolean;
  exclude_discount: boolean;
  exclude_pass_through_cost: boolean;
  hours_per_manday: string | number;
  ps_effort_source: string;
  sa_csm_effort_source: "milestone_defaults" | "timesheet";
  allow_manager_effort_override: boolean;
  milestone_effort_weights_json: Record<string, number> | null;
  role_weights_json: Record<string, number> | null;
  performance_multipliers_json: Record<string, number> | null;
  exception_fallback_indirect: "redirect_to_direct" | "redirect_to_shared" | "halt_review";
  joiner_leaver_policy: "prorata_calendar_days" | "cutoff_date";
  exclude_probation: boolean;
  payout_cycle: "monthly" | "quarterly" | "milestone";
  privacy_mode: "individual_only" | "open_transparent";
  created_at?: string;
  updated_at?: string;
}

export interface RoleIncentiveSetting {
  id: number;
  policy_id: number;
  role_id: number;
  is_eligible: boolean;
  saas_rate: string | number;
  ps_rate: string | number;
  allocation_mode: "collaborative_pool" | "direct_individual";
  default_contributor_level: "lead" | "core" | "supporting" | "minor";
  role?: {
    id: number;
    name: string;
    display_name: string;
  };
}

export interface IncentiveContributor {
  id: number;
  pool_id: number;
  user_id: number;
  role_id: number | null;
  contribution_type: "direct" | "indirect" | "shared";
  contributor_level: "lead" | "core" | "supporting" | "minor";
  role_weight: string | number;
  effort_units: string | number;
  performance_rating: "below" | "meets" | "exceeds" | "outstanding";
  performance_multiplier: string | number;
  contribution_score: string | number;
  allocated_amount: string | number;
  evaluation_notes: string | null;
  user?: {
    id: number;
    name: string;
    email: string;
    role_id: number | null;
  };
  role?: {
    id: number;
    name: string;
    display_name: string;
  };
}

export interface IncentivePool {
  id: number;
  pool_code: string;
  period_type: string;
  period_key: string;
  revenue_stream: "saas" | "professional_service" | "hybrid";
  eligible_revenue: string | number;
  pool_rate_applied: string | number;
  total_pool_amount: string | number;
  direct_pool_amount: string | number;
  indirect_pool_amount: string | number;
  shared_pool_amount: string | number;
  status: "draft" | "in_review" | "approved_dept" | "approved_finance" | "paid" | "cancelled";
  lead?: {
    id: number;
    company_name: string;
    contact_name: string;
  };
  sales_order?: {
    id: number;
    sales_order_number?: string;
    order_number?: string;
    total_amount: string | number;
    order_status: string;
  };
  contributors?: IncentiveContributor[];
  dept_approver?: { id: number; name: string };
  finance_approver?: { id: number; name: string };
  created_at: string;
}

export async function getIncentiveSettings(): Promise<{
  policy: IncentivePolicy;
  role_settings: RoleIncentiveSetting[];
}> {
  const res = await apiFetch("/incentives/settings");
  if (!res.ok) throw new Error("Gagal mengambil pengaturan insentif");
  const json = await res.json();
  return json.data;
}

export async function updateIncentiveSettings(payload: any): Promise<any> {
  const res = await apiFetch("/incentives/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || "Gagal memperbarui pengaturan insentif");
  }
  return res.json();
}

export async function previewIncentiveCalculation(payload: any): Promise<any> {
  const res = await apiFetch("/incentives/calculate-preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Gagal menghitung simulasi");
  }
  const json = await res.json();
  return json.data;
}

export async function getIncentivePools(params?: Record<string, string>): Promise<any> {
  const query = new URLSearchParams(params).toString();
  const res = await apiFetch(`/incentives/pools${query ? `?${query}` : ""}`);
  if (!res.ok) throw new Error("Gagal mengambil daftar pool");
  return res.json();
}

export async function getIncentivePool(id: number | string): Promise<IncentivePool> {
  const res = await apiFetch(`/incentives/pools/${id}`);
  if (!res.ok) throw new Error("Gagal mengambil detail pool");
  const json = await res.json();
  return json.data;
}

export async function recalculateIncentivePool(id: number | string): Promise<any> {
  const res = await apiFetch(`/incentives/pools/${id}/recalculate`, { method: "POST" });
  if (!res.ok) throw new Error("Gagal mengkalkulasi ulang pool");
  return res.json();
}

export async function approvePoolDept(id: number | string): Promise<any> {
  const res = await apiFetch(`/incentives/pools/${id}/approve-dept`, { method: "POST" });
  if (!res.ok) throw new Error("Gagal menyetujui pool (Dept Head)");
  return res.json();
}

export async function approvePoolFinance(id: number | string): Promise<any> {
  const res = await apiFetch(`/incentives/pools/${id}/approve-finance`, { method: "POST" });
  if (!res.ok) throw new Error("Gagal mengesahkan pool (Finance)");
  return res.json();
}

export async function getMyIncentiveSummary(): Promise<any> {
  const res = await apiFetch("/incentives/my-summary");
  if (!res.ok) throw new Error("Gagal mengambil ringkasan insentif saya");
  const json = await res.json();
  return json.data;
}

export async function getIncentiveAnalytics(): Promise<any> {
  const res = await apiFetch("/incentives/analytics");
  if (!res.ok) throw new Error("Gagal mengambil analitik insentif");
  const json = await res.json();
  return json.data;
}
