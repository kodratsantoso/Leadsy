/**
 * Canonical public site origin for absolute OG/Twitter URLs in SSR metadata.
 * Prefer NEXT_PUBLIC_SITE_URL; fall back to NEXT_PUBLIC_API_BASE_URL (already set per env in K3s).
 */
export function getSiteUrl(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (site?.startsWith("http")) return site;

  const api = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");
  if (api?.startsWith("http")) return api;

  return "https://leadsy.tech";
}
