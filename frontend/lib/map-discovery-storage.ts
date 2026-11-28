import type { DiscoveredLead, GeocodeResult } from "./hooks/use-map-discovery";
import type { AiMode } from "@/components/ai/ai-mode-selector";

const STORAGE_PREFIX = "leadsy_map_discovery_cache";
const CACHE_VERSION = 1;

export type MapDiscoverySessionCache = {
  version: number;
  userId: number;
  tenantId?: number;
  timestamp: number;
  searchParams: {
    lat: number;
    lng: number;
    radius: number;
    keyword: string;
    category: string;
    searchMode: "nearby" | "text";
    areaQuery?: string;
    areaInfo?: GeocodeResult | null;
    aiMode: AiMode;
    selectedProductId: number | null;
  };
  results: DiscoveredLead[];
  center: { lat: number; lng: number };
  zoom: number;
  radius: number;
  activeArea: GeocodeResult | null;
  selectedId: string | null;
  filters: { hasPhone: boolean; newOnly: boolean };
};

/**
 * Constructs user-session-isolated storage key.
 */
export function getDiscoveryStorageKey(userId: number | string, tenantId?: number | string): string {
  const tPart = tenantId ? `_t${tenantId}` : "";
  return `${STORAGE_PREFIX}_u${userId}${tPart}`;
}

/**
 * Saves current discovery search state & results to localStorage scoped by logged-in user.
 */
export function saveDiscoverySessionCache(
  userId: number,
  data: Omit<MapDiscoverySessionCache, "version" | "userId" | "timestamp">,
  tenantId?: number
): void {
  if (typeof window === "undefined" || !userId) return;

  try {
    const key = getDiscoveryStorageKey(userId, tenantId);
    const payload: MapDiscoverySessionCache = {
      ...data,
      version: CACHE_VERSION,
      userId,
      tenantId,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    // Gracefully handle potential QuotaExceededError or private browsing restrictions
    console.warn("[MapDiscoveryStorage] Failed to save cache:", err);
  }
}

/**
 * Loads cached discovery scan results for the specified user session.
 */
export function loadDiscoverySessionCache(
  userId: number,
  tenantId?: number
): MapDiscoverySessionCache | null {
  if (typeof window === "undefined" || !userId) return null;

  try {
    const key = getDiscoveryStorageKey(userId, tenantId);
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as MapDiscoverySessionCache;
    if (!parsed || parsed.version !== CACHE_VERSION || !Array.isArray(parsed.results)) {
      return null;
    }

    return parsed;
  } catch (err) {
    console.warn("[MapDiscoveryStorage] Failed to load cache:", err);
    return null;
  }
}

/**
 * Clears discovery scan cache for the specified user session.
 */
export function clearDiscoverySessionCache(userId: number, tenantId?: number): void {
  if (typeof window === "undefined" || !userId) return;

  try {
    const key = getDiscoveryStorageKey(userId, tenantId);
    localStorage.removeItem(key);
  } catch (err) {
    console.warn("[MapDiscoveryStorage] Failed to clear cache:", err);
  }
}

/**
 * Format relative timestamp to human readable label.
 */
export function formatRelativeDiscoveryTime(timestamp: number): string {
  if (!timestamp) return "";
  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (diffSeconds < 60) return "baru saja";
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes} menit yang lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam yang lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari yang lalu`;
}
