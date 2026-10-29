"use client";

import { useState, useEffect } from "react";
import {
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Crosshair,
  Filter,
  History,
  Layers,
  Map,
  MapPin,
  Navigation,
  Package,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";

import { AiModeSelector, type AiMode } from "@/components/ai/ai-mode-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  // Panel collapse
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
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
  isCollapsed = false,
  onToggleCollapse,
}: SearchPanelProps) {
  const { geocodeArea, getSearchHistory } = useMapDiscovery();

  const [areaQuery, setAreaQuery] = useState("");
  const [activeArea, setActiveArea] = useState<GeocodeResult | null>(externalActiveArea ?? null);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [radius, setRadius] = useState<number>(externalRadius);
  const [searchMode, setSearchMode] = useState<"nearby" | "text">("nearby");
  const [aiMode, setAiMode] = useState<AiMode>("hybrid");
  
  // Collapsible sections
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSavedTerritories, setShowSavedTerritories] = useState(false);
  const [isSavingTerritory, setIsSavingTerritory] = useState(false);
  const [customTerritoryName, setCustomTerritoryName] = useState("");

  const [categories, setCategories] = useState<DiscoveryCategory[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [savedTerritories, setSavedTerritories] = useState<SavedTerritory[]>([]);
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

  // Sync external changes (e.g. from map click or map circle drag)
  useEffect(() => {
    if (externalActiveArea && (externalActiveArea.lat !== activeArea?.lat || externalActiveArea.lng !== activeArea?.lng)) {
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

  if (isCollapsed) {
    return (
      <div className="flex h-full w-12 shrink-0 flex-col items-center justify-between border-r border-border bg-background py-4">
        <div className="flex flex-col items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onToggleCollapse}
            tooltip="Expand Search Controls"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="h-4 w-px bg-border" />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleDetectGPS}
            tooltip="Detect GPS"
          >
            <Crosshair className="h-4 w-4 text-[color:var(--brand)]" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onToggleCollapse?.()}
            tooltip="Saved Territories"
          >
            <Bookmark className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-col items-center gap-2">
          {resultCount > 0 && (
            <Badge variant="brand" className="text-[10px] px-1.5 py-0.5">
              {resultCount}
            </Badge>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleReset}
            tooltip="Reset Search"
          >
            <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-[340px] lg:w-[360px] shrink-0 flex-col border-r border-border bg-background">
      {/* ── Top Header Bar ── */}
      <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 bg-[color:var(--surface-subtle)]/50">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[color:var(--brand)]/10 text-[color:var(--brand)]">
            <Search className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Discovery Filter</h2>
            <p className="text-[11px] text-muted-foreground">Find local leads & territory</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleReset}
            disabled={isSearching}
            tooltip="Reset All Fields"
          >
            <RotateCcw className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </Button>
          {onToggleCollapse && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onToggleCollapse}
              tooltip="Collapse Panel"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </Button>
          )}
        </div>
      </div>

      {/* ── Scrollable Form Body ── */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* 1. Target Territory Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[color:var(--brand)]" />
              Target Location
            </label>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant={showSavedTerritories ? "secondary" : "ghost"}
                size="icon-xs"
                onClick={() => setShowSavedTerritories(!showSavedTerritories)}
                tooltip="Saved Territories"
                className="h-6 w-6"
              >
                <Bookmark className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={handleDetectGPS}
                tooltip="GPS Location"
                className="h-6 w-6 text-[color:var(--brand)]"
              >
                <Crosshair className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <form onSubmit={handleGeocode} className="flex gap-1.5">
            <div className="relative flex-1">
              <Map className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={areaQuery}
                onChange={(event) => setAreaQuery(event.target.value)}
                placeholder="City, subdistrict, or area..."
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Button type="submit" variant="outline" size="sm" className="h-8 px-2.5 text-xs">
              Locate
            </Button>
          </form>

          {/* Active Area Status Pill */}
          {activeArea && (
            <div className="flex items-center justify-between gap-1.5 rounded-lg border border-[color:var(--brand)]/20 bg-[color:var(--brand)]/5 px-2.5 py-1.5 text-xs">
              <span className="truncate font-medium text-foreground">{activeArea.formatted_address}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setIsSavingTerritory(!isSavingTerritory)}
                tooltip="Bookmark this territory"
                className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground"
              >
                <Save className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Save Territory Inline Form */}
          {isSavingTerritory && activeArea && (
            <form onSubmit={handleSaveCurrentTerritory} className="space-y-1.5 rounded-lg border border-border bg-card p-2.5 shadow-xs">
              <span className="text-[11px] font-semibold text-muted-foreground">Save Preset Name</span>
              <div className="flex gap-1.5">
                <Input
                  value={customTerritoryName}
                  onChange={(e) => setCustomTerritoryName(e.target.value)}
                  placeholder={activeArea.formatted_address.split(",")[0] || "Name"}
                  className="h-7 text-xs"
                />
                <Button type="submit" size="xs" variant="default" className="h-7 px-2 text-xs">
                  Save
                </Button>
              </div>
            </form>
          )}

          {/* Saved Territories Dropdown View */}
          {showSavedTerritories && (
            <div className="space-y-1.5 rounded-lg border border-border bg-[color:var(--surface-subtle)] p-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Bookmarks</span>
                <Badge variant="neutral" className="text-[10px] px-1 py-0">{savedTerritories.length}</Badge>
              </div>
              {savedTerritories.length === 0 ? (
                <p className="py-1 text-center text-[11px] text-muted-foreground">No saved territories yet.</p>
              ) : (
                <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
                  {savedTerritories.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleApplySavedTerritory(t)}
                      className="group flex cursor-pointer items-center justify-between rounded-md border border-transparent bg-background px-2 py-1.5 text-xs transition-colors hover:border-border"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{t.name}</p>
                        <p className="text-[10px] text-muted-foreground">Radius {t.radiusKm} km</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => handleDeleteSavedTerritory(t.id, e)}
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Business Keyword & Category Grid */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Business Target
          </label>
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Keyword (e.g. clinic, restaurant, salon)"
            className="h-8 text-xs"
          />
          <Select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="All Categories"
            className="h-8 text-xs"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.value}>{cat.label}</option>
            ))}
          </Select>
          <Tabs
            value={searchMode}
            onValueChange={setSearchMode}
            items={searchModeTabs.map((item) => ({ key: item.key, label: item.label }))}
          />
        </div>

        {/* 3. Scan Radius Control */}
        <div className="space-y-2 rounded-xl border border-border/80 bg-[color:var(--surface-subtle)]/40 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">Scan Radius</span>
            <Badge variant="brand" className="font-mono text-xs px-2 py-0.5">
              {(radius / 1000).toFixed(1)} km
            </Badge>
          </div>
          
          {/* Quick Preset Pills */}
          <div className="flex items-center gap-1 flex-wrap">
            {RADIUS_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => handleRadiusUpdate(preset.value)}
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all ${
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
            className="w-full accent-[color:var(--brand)] h-1.5 cursor-pointer"
          />
        </div>

        {/* 4. Advanced Settings Toggle (Product Match, AI Mode, Filters) */}
        <div className="rounded-xl border border-border/80 bg-[color:var(--surface-subtle)]/30 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-[color:var(--brand)]" />
              Advanced Filters & Product Fit
            </span>
            {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showAdvanced && (
            <div className="border-t border-border/60 p-3 space-y-3 bg-background">
              {/* Product Match */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium flex items-center gap-1 text-muted-foreground">
                    <Package className="h-3 w-3 text-[color:var(--brand)]" />
                    Product Fit Match
                  </span>
                  {selectedProduct && (
                    <button
                      type="button"
                      onClick={() => onProductChange(null)}
                      className="text-[10px] text-muted-foreground hover:text-foreground underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <Select
                  value={selectedProductId?.toString() ?? ""}
                  onChange={(e) => onProductChange(e.target.value ? Number(e.target.value) : null)}
                  placeholder="Select product..."
                  className="h-8 text-xs"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.category ? ` (${p.category})` : ""}
                    </option>
                  ))}
                </Select>
              </div>

              {/* AI Analysis Mode */}
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground">AI Intelligence Mode</span>
                <AiModeSelector value={aiMode} onChange={setAiMode} hideLabel />
              </div>

              {/* Data Filters */}
              <div className="space-y-1.5 pt-1 border-t border-border/50">
                <span className="text-[11px] font-medium text-muted-foreground">Lead Filtering</span>
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.hasPhone}
                    onChange={(e) => onFilterChange({ ...filters, hasPhone: e.target.checked })}
                    className="rounded border-border text-[color:var(--brand)] focus:ring-[color:var(--brand)] h-3.5 w-3.5"
                  />
                  Has phone number
                </label>
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.newOnly}
                    onChange={(e) => onFilterChange({ ...filters, newOnly: e.target.checked })}
                    className="rounded border-border text-[color:var(--brand)] focus:ring-[color:var(--brand)] h-3.5 w-3.5"
                  />
                  Not yet in pipeline (New only)
                </label>
              </div>

              {/* History Trigger */}
              <div className="pt-1 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={loadHistory}
                  className="w-full justify-center gap-1.5 text-xs h-7"
                >
                  <History className="h-3 w-3" />
                  {showHistory ? "Hide History" : "View Search History"}
                </Button>
                {showHistory && (
                  <div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-md border border-border p-1.5 text-xs bg-[color:var(--surface-subtle)]">
                    {historyItems.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground text-center py-1">No history records.</p>
                    ) : (
                      historyItems.map((item, index) => (
                        <div
                          key={index}
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
                          className="cursor-pointer truncate rounded px-1.5 py-1 hover:bg-background transition-colors"
                        >
                          <span className="font-medium text-foreground">{item.keyword || item.category || "Search"}</span> in {item.area_name}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky Bottom Action Bar ── */}
      <div className="border-t border-border bg-background p-3 space-y-2">
        <Button
          className="w-full gap-2 font-semibold shadow-sm"
          onClick={handleTriggerSearch}
          disabled={isSearching || !activeArea}
        >
          <Navigation className="h-4 w-4" />
          {isSearching ? "Scanning Territory..." : "Run Discovery Scan"}
        </Button>
        {resultCount > 0 && !isSearching && (
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>Discovered Businesses</span>
            <Badge variant="brand" className="font-semibold">{resultCount}</Badge>
          </div>
        )}
      </div>
    </div>
  );
}
