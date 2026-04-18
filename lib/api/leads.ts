/**
 * Lead API helpers — wraps the centralised client.
 * Kept for backward compat with existing components.
 */
import { api, type Lead } from "@/lib/api/client";

export type { Lead };

export async function fetchLeads(): Promise<Lead[]> {
  const json = await api.get<{ data: Lead[] }>("/api/leads");
  return json.data ?? [];
}

export async function fetchLead(id: string): Promise<Lead | null> {
  try {
    const json = await api.get<{ data: Lead }>(`/api/leads/${encodeURIComponent(id)}`);
    return json.data ?? null;
  } catch {
    return null;
  }
}
