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

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (cause) {
    // `fetch` rejects with a bare "TypeError: Failed to fetch" when the connection drops,
    // the request is blocked, or the tab is offline. Callers used to see that string on
    // screen, which says nothing. Turn it into an answer the caller can present, in the
    // same JSON shape as a real API error so one code path handles both.
    console.error("Request to", url, "could not be sent.", cause);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message:
            typeof navigator !== "undefined" && navigator.onLine === false
              ? "You are offline, so this request was never sent."
              : "Could not reach the server, so this request was never sent.",
          hint: "Check your connection and try again. Nothing was saved.",
        },
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  if (response.status === 401) {
    // Attempted to access something unauthorized or token expired
    useAuthStore.getState().clearAuth();
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
       window.location.href = '/login';
    }
  }

  // A 5xx that is not JSON did not come from Laravel — it is the Next.js proxy reporting
  // that the backend is down, restarting, or took longer than the gateway allows. Laravel's
  // own 5xx responses are JSON and already carry a reason and a reference code, so those
  // pass straight through untouched.
  if (response.status >= 500) {
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.error(`Backend returned a non-JSON ${response.status} for ${url} — proxy or gateway level failure.`);

      const isTimeout = response.status === 504;
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: isTimeout ? "GATEWAY_TIMEOUT" : "BACKEND_UNAVAILABLE",
            message: isTimeout
              ? "This took too long to finish and the connection was closed."
              : "The server is not responding right now.",
            hint: isTimeout
              ? "Long AI analyses keep running in the background — reload the page in a few minutes to see the result."
              : "This usually happens for a minute or two during a deployment. Nothing was saved — try again shortly.",
          },
        }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  return response;
}
