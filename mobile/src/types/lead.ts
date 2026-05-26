export type User = {
  id: number;
  name: string;
  email: string;
};

export type FunnelStage = {
  id: number;
  name: string;
  sequence?: number;
};

export type Lead = {
  id: number;
  company_name: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  business_category?: string | null;
  lead_score?: number | null;
  qualification_status?: string | null;
  funnel_stage?: FunnelStage | null;
  funnelStage?: FunnelStage | null;
  owner?: User | null;
};

export type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
};

export type SalesVisit = {
  id: number;
  lead_id: number;
  user_id: number;
  status: "in_progress" | "completed" | "cancelled" | string;
  risk_status: "verified" | "warning" | "manual_review" | "blocked" | string;
  clock_in_at?: string | null;
  clock_out_at?: string | null;
  clock_in_distance_m?: number | null;
  clock_out_distance_m?: number | null;
  visit_result?: string | null;
  notes?: string | null;
};
