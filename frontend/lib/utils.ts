import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeJsonArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Pulls a list out of an API response.
 *
 * The idiom `res?.data ?? res ?? []` looks safe but is not: apiFetch synthesises
 * a plain JSON object when the request fails or the proxy is down, so `.data` is
 * undefined, the fallback yields that OBJECT, and the caller's .map()/.filter()
 * throws — taking the whole page down with an error boundary instead of
 * degrading. Only ever returns an actual array.
 */
export function apiList<T = any>(response: any): T[] {
  if (Array.isArray(response?.data)) return response.data as T[];
  if (Array.isArray(response)) return response as T[];
  return [];
}

export function safeRender(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

/**
 * Safely converts any Eloquent relation object, AI JSON scalar/array/object, or primitive
 * into a human-readable string so React never throws Error #31 ("Objects are not valid as a React child").
 */
export function toDisplayText(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) {
    return val
      .map((item) => toDisplayText(item))
      .filter((s) => s.length > 0)
      .join(', ');
  }
  if (typeof val === 'object') {
    const rec = val as Record<string, unknown>;
    const preferredKeys = [
      'name',
      'label',
      'title',
      'text',
      'detail',
      'question',
      'url',
      'source_url',
      'value',
      'slug',
    ];
    for (const key of preferredKeys) {
      const candidate = rec[key];
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate.trim();
      }
      if (typeof candidate === 'number') {
        return String(candidate);
      }
    }
    const parts = Object.entries(rec)
      .filter(([k, v]) => k !== 'id' && v !== null && v !== undefined && v !== '')
      .map(([k, v]) => {
        const rendered = typeof v === 'object' ? JSON.stringify(v) : String(v).trim();
        return rendered ? `${k.replace(/_/g, ' ')}: ${rendered}` : '';
      })
      .filter(Boolean);
    return parts.join(' • ');
  }
  return String(val);
}

export function toDisplayList(val: unknown): string[] {
  if (val === null || val === undefined) return [];
  if (Array.isArray(val)) {
    return val
      .map((item) => toDisplayText(item))
      .filter((item) => item.length > 0);
  }
  const single = toDisplayText(val);
  return single.length > 0 ? [single] : [];
}
