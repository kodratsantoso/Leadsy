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
