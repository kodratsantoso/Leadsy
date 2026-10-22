"use client";

import { useState, useEffect } from "react";
import {
  Bookmark,
  Crosshair,
  History,
  Map,
  MapPin,
  Navigation,
  Package,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

import { AiModeSelector, type AiMode } from "@/components/ai/ai-mode-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/apiFetch";
import {
  useMapDiscovery,
  type GeocodeResult,
  type ProductOption,
} from "@/lib/hooks/use-map-discovery";
import {
  loadSavedTerritories,
  saveTerritory,
  deleteTerritory,
  type SavedTerritory,
} from "@/lib/territory-storage";

type DiscoveryCategory = { id: number; label: string; value: string };

type SearchPanelProps = {
  onSearch: (params: {
    lat: number;
    lng: number;
    radius: number;
    keyword: string;
    category: string;
    searchMode: "nearby" | "text";
    areaInfo?: GeocodeResult;
    aiMode: AiMode;
    selectedProductId: number | null;
  }) => void;
  onReset: () => void;
  isSearching: boolean;
  resultCount: number;
  onAreaFound: (area: GeocodeResult) => void;
  filters: { hasPhone: boolean; newOnly: boolean };
  onFilterChange: (filters: { hasPhone: boolean; newOnly: boolean }) => void;
  onMessage: (message: string) => void;
  selectedProductId: number | null;
  onProductChange: (productId: number | null) => void;
  // Two-way synchronization with map canvas
  radius?: number;
  onRadiusChange?: (radius: number) => void;
  activeArea?: GeocodeResult | null;
  onAreaSelect?: (area: GeocodeResult | null) => void;
};

const searchModeTabs = [
  { key: "nearby", label: "Nearby Search" },
  { key: "text", label: "Text Search" },
] as const;

const RADIUS_PRESETS = [
  { label: "1 km", value: 1000 },
  { label: "3 km", value: 3000 },
  { label: "5 km", value: 5000 },
  { label: "10 km", value: 10000 },
  { label: "25 km", value: 25000 },
];

export function MapSearchPanel({
  onSearch,
  onReset,
  isSearching,
  resultCount,
  onAreaFound,
  filters,
  onFilterChange,
  onMessage,
  selectedProductId,
  onProductChange,
  radius: externalRadius = 3000,
  onRadiusChange,
  activeArea: externalActiveArea,
  onAreaSelect,
}: SearchPanelProps) {
  const { geocodeArea, getSearchHistory } = useMapDiscovery();

  const [areaQuery, setAreaQuery] = useState("");
  const [activeArea, setActiveArea] = useState<GeocodeResult | null>(externalActiveArea ?? null);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [radius, setRadius] = useState<number>(externalRadius);
  const [searchMode, setSearchMode] = useState<"nearby" | "text">("nearby");
  const [aiMode, setAiMode] = useState<AiMode>("hybrid");
  const [showFilters, setShowFilters] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [categories, setCategories] = useState<DiscoveryCategory[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [historyItems, setHistoryItems] = useState<
    {
      area_name: string;
      area_place_id: string | null;
      area_lat: number | null;
      area_lng: number | null;
      keyword: string | null;
      category: string | null;
      search_mode: string;
      radius_meters: number;
      result_count: number;
    }[]
  >([]);

  // Territory management state
  const [savedTerritories, setSavedTerritories] = useState<SavedTerritory[]>([]);
  const [showSavedTerritories, setShowSavedTerritories] = useState(false);
  const [isSavingTerritory, setIsSavingTerritory] = useState(false);
  const [customTerritoryName, setCustomTerritoryName] = useState("");

  // Sync external changes (e.g. from map click or map circle drag)
  useEffect(() => {
    if (externalActiveArea && externalActiveArea.lat !== activeArea?.lat && externalActiveArea.lng !== activeArea?.lng) {
      setActiveArea(externalActiveArea);
      setAreaQuery(externalActiveArea.formatted_address);
    }
  }, [externalActiveArea, activeArea?.lat, activeArea?.lng]);

  useEffect(() => {
    if (externalRadius && externalRadius !== radius) {
      setRadius(externalRadius);
    }
  }, [externalRadius, radius]);

  // Load saved territories from storage
  useEffect(() => {
    setSavedTerritories(loadSavedTerritories());
  }, []);

  // Fetch DB-backed discovery categories on mount
  useEffect(() => {
    apiFetch("/maps/categories")
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json?.data)) setCategories(json.data);
      })
      .catch(() => {/* silently ignore */});
  }, []);

  // Fetch active products for the product selector
  useEffect(() => {
    apiFetch("/products?status=active")
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json?.data)) setProducts(json.data);
      })
      .catch(() => {/* silently ignore */});
  }, []);

  const handleRadiusUpdate = (newRadius: number) => {
    setRadius(newRadius);
    onRadiusChange?.(newRadius);
  };

  const handleReset = () => {
    setAreaQuery("");
    setActiveArea(null);
    onAreaSelect?.(null);
    setKeyword("");
    setCategory("");
    handleRadiusUpdate(3000);
    setSearchMode("nearby");
    onProductChange(null);
    onReset();
    onMessage("");
  };

  const handleGeocode = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!areaQuery.trim()) return;

    const result = await geocodeArea(areaQuery);
    if (result) {
      setActiveArea(result);
      onAreaFound(result);
      onAreaSelect?.(result);
      setAreaQuery(result.formatted_address);
    }
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      onMessage("Geolocation is not supported by your browser.");
      return;
    }
    onMessage("Detecting current GPS location…");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const fallbackArea: GeocodeResult = {
          place_id: `gps_${Date.now()}`,
          formatted_address: `Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          lat,
          lng,
        };
        setActiveArea(fallbackArea);
        onAreaFound(fallbackArea);
        onAreaSelect?.(fallbackArea);
        setAreaQuery(fallbackArea.formatted_address);

        // Try reverse geocoding to human-readable street
        const res = await geocodeArea(`${lat},${lng}`);
        if (res) {
          setActiveArea(res);
          onAreaFound(res);
          onAreaSelect?.(res);
          setAreaQuery(res.formatted_address);
          onMessage(`GPS Centered: ${res.formatted_address}`);
        } else {
          onMessage("GPS location pinned successfully.");
        }
      },
      (err) => {
        onMessage(`Location detection failed: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveCurrentTerritory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeArea) {
      onMessage("Locate a territory first before saving.");
      return;
    }
    const name = customTerritoryName.trim() || activeArea.formatted_address.split(",")[0] || "Custom Territory";
    const item = saveTerritory({
      name,
      searchCenterLat: activeArea.lat,
      searchCenterLng: activeArea.lng,
      radiusKm: radius / 1000,
    });
    setSavedTerritories(loadSavedTerritories());
    setIsSavingTerritory(false);
    setCustomTerritoryName("");
    onMessage(`Territory saved: ${item.name}`);
  };

  const handleApplySavedTerritory = (t: SavedTerritory) => {
    const area: GeocodeResult = {
      place_id: `saved_${t.id}`,
      formatted_address: t.name,
      lat: t.searchCenterLat,
      lng: t.searchCenterLng,
    };
    setActiveArea(area);
    onAreaFound(area);
    onAreaSelect?.(area);
    setAreaQuery(t.name);
    const r = (t.radiusKm || 3) * 1000;
    handleRadiusUpdate(r);
    setShowSavedTerritories(false);
    onMessage(`Switched to territory: ${t.name} (${t.radiusKm} km)`);
  };

  const handleDeleteSavedTerritory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTerritory(id);
    setSavedTerritories(loadSavedTerritories());
  };

  const handleTriggerSearch = () => {
    if (!activeArea) {
      onMessage("Search for a territory or click on the map first.");
      return;
    }

    onSearch({
      lat: activeArea.lat,
      lng: activeArea.lng,
      radius,
      keyword,
      category,
      searchMode,
      areaInfo: activeArea,
      aiMode,
      selectedProductId,
    });
  };

  const loadHistory = async () => {
    if (!showHistory) {
      const items = await getSearchHistory();
      setHistoryItems(items);
    }
    setShowHistory(!showHistory);
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId) ?? null;

  return (
    <div className="flex w-[380px] shrink-0 flex-col gap-4 overflow-auto border-r border-border bg-background p-4">
      {/* Target Territory Card with GPS & Saved Presets */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[color:var(--brand)]" />
              Target Territory
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant={showSavedTerritories ? "secondary" : "ghost"}
                size="icon-sm"
                onClick={() => setShowSavedTerritories(!showSavedTerritories)}
                tooltip="Saved Territories"
              >
                <Bookmark className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleDetectGPS}
                tooltip="Use Current GPS Location"
              >
                <Crosshair className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <form onSubmit={handleGeocode} className="flex gap-2">
            <div className="relative flex-1">
              <Map className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                hasIcon
                value={areaQuery}
                onChange={(event) => setAreaQuery(event.target.value)}
                placeholder="e.g. Menteng, SCBD, Surabaya"
              />
            </div>
            <Button type="submit" variant="outline">
              Locate
            </Button>
          </form>

          {/* Active Area Badge & Save Action */}
          {activeArea ? (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-[color:var(--surface-subtle)] p-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="success" className="shrink-0">
                  <MapPin className="h-3 w-3" />
                  Active
                </Badge>
                <span className="truncate text-xs font-medium">{activeArea.formatted_address}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsSavingTerritory(!isSavingTerritory)}
                tooltip="Save as territory preset"
              >
                <Save className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </Button>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground italic">
              💡 Tip: Click anywhere on the map or use GPS to set the territory center.
            </p>
          )}

          {/* Save Territory Inline Form */}
          {isSavingTerritory && activeArea && (
            <form onSubmit={handleSaveCurrentTerritory} className="space-y-2 rounded-xl border border-border bg-card p-3 shadow-xs">
              <span className="text-xs font-medium">Save Territory Preset</span>
              <div className="flex gap-2">
                <Input
                  value={customTerritoryName}
                  onChange={(e) => setCustomTerritoryName(e.target.value)}
                  placeholder={activeArea.formatted_address.split(",")[0] || "Territory Name"}
                  className="h-8 text-xs"
                />
                <Button type="submit" size="sm" variant="default">
                  Save
                </Button>
              </div>
            </form>
          )}

          {/* Saved Territories List */}
          {showSavedTerritories && (
            <div className="space-y-2 rounded-2xl border border-border bg-[color:var(--surface-subtle)] p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saved Territories</span>
                <Badge variant="neutral">{savedTerritories.length}</Badge>
              </div>
              {savedTerritories.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">No saved territories yet.</p>
              ) : (
                <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                  {savedTerritories.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleApplySavedTerritory(t)}
                      className="group flex cursor-pointer items-center justify-between rounded-xl border border-transparent bg-background px-3 py-2 text-xs transition-colors hover:border-border"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{t.name}</p>
                        <p className="text-[10px] text-muted-foreground">Radius: {t.radiusKm} km</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => handleDeleteSavedTerritory(t.id, e)}
                          tooltip="Delete"
                          className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-[color:var(--brand)]" />
              Product Fit Target
            </CardTitle>
            {selectedProduct ? (
              <button
                onClick={() => onProductChange(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {products.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-[color:var(--surface-subtle)] px-4 py-3 text-center">
              <Package className="mx-auto mb-1.5 h-5 w-5 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">
                No active products found.{" "}
                <a href="/products" className="text-[color:var(--brand)] hover:underline">
                  Add a product
                </a>{" "}
                to enable product-fit scoring.
              </p>
            </div>
          ) : (
            <>
              <Select
                value={selectedProductId?.toString() ?? ""}
                onChange={(e) =>
                  onProductChange(e.target.value ? Number(e.target.value) : null)
                }
                placeholder="Select product for fit analysis…"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.category ? ` — ${p.category}` : ""}
                  </option>
                ))}
              </Select>
              {selectedProduct ? (
                <Badge variant="brand">
                  <Package className="h-3 w-3" />
                  {selectedProduct.name}
                </Badge>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Select a product to enable AI product-fit analysis after discovery.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Discovery Target & Radius Presets */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="text-base">Discovery Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Business keyword (e.g. coffee shop, clinic)"
          />

          <Select value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Any category">
            {categories.map((cat) => (
              <option key={cat.id} value={cat.value}>{cat.label}</option>
            ))}
          </Select>

          <Tabs
            value={searchMode}
            onValueChange={setSearchMode}
            items={searchModeTabs.map((item) => ({ key: item.key, label: item.label }))}
          />

          {/* Interactive Radius Controller with Quick Pills */}
          <div className="space-y-3 rounded-2xl border border-border bg-[color:var(--surface-subtle)] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Scan Radius</span>
              <Badge variant="brand">{(radius / 1000).toFixed(1)} km</Badge>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {RADIUS_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handleRadiusUpdate(preset.value)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                    radius === preset.value
                      ? "bg-[color:var(--brand)] text-[color:var(--brand-foreground)] shadow-xs"
                      : "bg-background text-muted-foreground hover:bg-accent/40 border border-border/60"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <input
              type="range"
              min={500}
              max={50000}
              step={500}
              value={radius}
              onChange={(event) => handleRadiusUpdate(Number(event.target.value))}
              className="w-full accent-[color:var(--brand)]"
            />
          </div>

          <AiModeSelector value={aiMode} onChange={setAiMode} />
        </CardContent>
      </Card>

      {/* Actions and Filters Bar */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <Button
              variant={showFilters ? "secondary" : "outline"}
              className="flex-1"
              onClick={() => setShowFilters((current) => !current)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </Button>
            <Button
              variant={showHistory ? "secondary" : "outline"}
              size="icon-sm"
              onClick={loadHistory}
              tooltip="Search history"
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleReset}
              disabled={isSearching}
              tooltip="Reset search state"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {showFilters ? (
            <div className="space-y-2 rounded-2xl border border-border bg-[color:var(--surface-subtle)] p-4">
              <label className="flex items-center gap-3 text-sm text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.hasPhone}
                  onChange={(event) =>
                    onFilterChange({ ...filters, hasPhone: event.target.checked })
                  }
                  className="rounded border-border text-[color:var(--brand)] focus:ring-[color:var(--brand)]"
                />
                Has phone number
              </label>
              <label className="flex items-center gap-3 text-sm text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.newOnly}
                  onChange={(event) =>
                    onFilterChange({ ...filters, newOnly: event.target.checked })
                  }
                  className="rounded border-border text-[color:var(--brand)] focus:ring-[color:var(--brand)]"
                />
                Not in pipeline (New only)
              </label>
            </div>
          ) : null}

          {showHistory ? (
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-2xl border border-border bg-[color:var(--surface-subtle)] p-3">
              {historyItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No history found.</p>
              ) : (
                historyItems.map((item, index) => (
                  <button
                    key={`${item.area_name}-${index}`}
                    className="flex w-full items-center justify-between rounded-xl border border-transparent bg-background px-3 py-2 text-left text-sm transition-colors hover:border-border"
                    onClick={() => {
                      setAreaQuery(item.area_name);
                      setKeyword(item.keyword || "");
                      setCategory(item.category || "");
                      handleRadiusUpdate(item.radius_meters);
                      setSearchMode(item.search_mode as "nearby" | "text");
                      if (item.area_lat != null && item.area_lng != null) {
                        const area = {
                          place_id: item.area_place_id || "",
                          formatted_address: item.area_name,
                          lat: item.area_lat,
                          lng: item.area_lng,
                        };
                        setActiveArea(area);
                        onAreaFound(area);
                        onAreaSelect?.(area);
                      }
                      setShowHistory(false);
                    }}
                  >
                    <span className="truncate">
                      {item.keyword || item.category || "Search"} in {item.area_name}
                    </span>
                    <Badge variant="outline">{item.result_count}</Badge>
                  </button>
                ))
              )}
            </div>
          ) : null}

          <Button
            className="w-full"
            onClick={handleTriggerSearch}
            disabled={isSearching || !activeArea}
          >
            <Navigation className="h-4 w-4" />
            {isSearching ? "Scanning Territory..." : "Run Discovery Scan"}
          </Button>

          {resultCount > 0 && !isSearching ? (
            <p className="text-center text-xs text-muted-foreground">
              Found <span className="font-semibold text-foreground">{resultCount}</span> businesses
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
