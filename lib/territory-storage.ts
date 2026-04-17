const STORAGE_KEY = "leads-generator.territories.v1";

export type SavedTerritory = {
  id: string;
  name: string;
  searchCenterLat: number;
  searchCenterLng: number;
  radiusKm: number;
  savedAt: string;
};

export function loadSavedTerritories(): SavedTerritory[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as SavedTerritory[]) : [];
  } catch {
    return [];
  }
}

export function saveTerritory(
  entry: Pick<
    SavedTerritory,
    "name" | "searchCenterLat" | "searchCenterLng" | "radiusKm"
  >,
): SavedTerritory {
  const list = loadSavedTerritories();
  const item: SavedTerritory = {
    ...entry,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    savedAt: new Date().toISOString(),
  };
  const next = [item, ...list];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return item;
}

export function deleteTerritory(id: string): void {
  const list = loadSavedTerritories().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
