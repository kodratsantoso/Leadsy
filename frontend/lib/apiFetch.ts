import { useAuthStore } from "@/store/useAuthStore";

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().token;
  
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  // Automatically set Content-Type to application/json for stringified JSON bodies
  if (options.body && typeof options.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Always use the Next.js proxy (/api/...) so that:
  //  - In Docker: the server-side rewrite forwards to the backend via the internal network (backend:8000)
  //  - In local dev: the rewrite forwards to localhost:3001
  // Never call the backend directly from the browser (Docker internal hostnames are not accessible).
  let url: string;
  if (endpoint.startsWith("http")) {
    // Absolute URL passed explicitly — use as-is (edge case).
    url = endpoint;
  } else {
    // Ensure the path starts with /api/
    url = endpoint.startsWith("/api/") ? endpoint : `/api/${endpoint.replace(/^\//, "")}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Attempted to access something unauthorized or token expired
    useAuthStore.getState().clearAuth();
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
       window.location.href = '/login';
    }
  }

  // Intercept 500 Internal Server error directly from Next.js proxy if backend disconnected
  if (response.status === 500) {
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
       console.error("Critical Backend Failure or Disconnected Proxy.");
    }
  }

  return response;
}
