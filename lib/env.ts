/**
 * Public API base URL (Laravel in production). No trailing slash.
 * When empty, requests use same-origin relative paths (Next.js `app/api/*`
 * route handlers) until an external API is configured.
 */
export function getPublicApiUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? "";
  return raw.replace(/\/$/, "");
}

/** True when `NEXT_PUBLIC_API_URL` points at an external backend (e.g. Laravel). */
export function isExternalApiUrlConfigured(): boolean {
  return getPublicApiUrl().length > 0;
}

/**
 * Build fetch URL. With empty base, `path` must start with `/` (e.g. `/api/leads`).
 */
export function resolveApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = getPublicApiUrl();
  return base ? `${base}${p}` : p;
}
