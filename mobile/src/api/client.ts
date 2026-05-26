import Constants from "expo-constants";
import { getToken, saveToken } from "../storage/session";
import type { Lead, Paginated, SalesVisit, User } from "../types/lead";

const configuredBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  "http://localhost:8000/api";

export const apiBaseUrl = configuredBaseUrl.replace(/\/$/, "");

type ApiEnvelope<T> = { data: T };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.message ?? payload?.error ?? "Request failed";
    throw new Error(message);
  }

  return payload as T;
}

export async function login(email: string, password: string): Promise<User> {
  const payload = await request<{ token?: string; access_token?: string; user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const token = payload.token ?? payload.access_token;

  if (!token) {
    throw new Error("Login succeeded but no API token was returned.");
  }

  await saveToken(token);

  return payload.user;
}

export function me(): Promise<ApiEnvelope<User>> {
  return request<ApiEnvelope<User>>("/auth/me");
}

export function listLeads(search = ""): Promise<Paginated<Lead>> {
  const query = new URLSearchParams({
    per_page: "30",
    sort: "created_at",
    dir: "desc",
  });

  if (search.trim()) {
    query.set("search", search.trim());
  }

  return request<Paginated<Lead>>(`/leads?${query.toString()}`);
}

export function getLead(id: number): Promise<ApiEnvelope<Lead>> {
  return request<ApiEnvelope<Lead>>(`/leads/${id}`);
}

export function clockIn(leadId: number, body: Record<string, unknown>): Promise<ApiEnvelope<SalesVisit>> {
  return request<ApiEnvelope<SalesVisit>>(`/leads/${leadId}/sales-visits/clock-in`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function clockOut(visitId: number, body: Record<string, unknown>): Promise<ApiEnvelope<SalesVisit>> {
  return request<ApiEnvelope<SalesVisit>>(`/sales-visits/${visitId}/clock-out`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function uploadVisitMedia(
  visitId: number,
  mediaType: "photo" | "signature",
  uri: string,
  metadata: Record<string, unknown> = {},
): Promise<ApiEnvelope<Record<string, unknown>>> {
  const form = new FormData();
  const extension = mediaType === "signature" ? "png" : "jpg";

  form.append("media_type", mediaType);
  form.append("file", {
    uri,
    name: `${mediaType}-${Date.now()}.${extension}`,
    type: mediaType === "signature" ? "image/png" : "image/jpeg",
  } as unknown as Blob);

  Object.entries(metadata).forEach(([key, value]) => {
    form.append(`metadata[${key}]`, String(value));
  });

  return request<ApiEnvelope<Record<string, unknown>>>(`/sales-visits/${visitId}/media`, {
    method: "POST",
    body: form,
  });
}
