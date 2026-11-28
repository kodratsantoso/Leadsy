"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { APIProvider, Map, Circle, AdvancedMarker } from "@vis.gl/react-google-maps";
import Link from "next/link";
import {
  Crosshair,
  Layers,
  ListFilter,
  Loader2,
  MapPin,
  Navigation,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/apiFetch";
import { useAuthStore } from "@/store/useAuthStore";
import {
  saveDiscoverySessionCache,
  loadDiscoverySessionCache,
  clearDiscoverySessionCache,
  formatRelativeDiscoveryTime,
  type MapDiscoverySessionCache,
} from "@/lib/map-discovery-storage";
import {
  useMapDiscovery,
  type DiscoveredLead,
  type GeoProductFitAnalysis,
  type GeocodeResult,
} from "@/lib/hooks/use-map-discovery";
import { MapSearchPanel } from "@/components/map/map-search-panel";
import { MapResultsPanel } from "@/components/map/map-results-panel";
import { MapMarkersLayer } from "@/components/map/map-markers-layer";
import type { AiMode } from "@/components/ai/ai-mode-selector";
import { cn } from "@/lib/utils";
import { useGoogleMapsTheme } from "@/lib/maps-theme";

const DEFAULT_CENTER = { lat: -6.2088, lng: 106.8456 };

function isEnabledFlag(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

export default function MapPage() {
  const { isDark, colorScheme, styles: mapStyles } = useGoogleMapsTheme();
  const [apiKey, setApiKey] = useState("");
  const [isMapsEnabled, setIsMapsEnabled] = useState(true);
  const [loadingKey, setLoadingKey] = useState(true);

  const {
    isSearching,
    isAnalyzing,
    error,
    searchPlaces,
    addToLeads,
    addBatchToLeads,
    getPlaceDetails,
    analyzeProductFit,
    geocodeArea,
  } = useMapDiscovery();

  const [results, setResults] = useState<DiscoveredLead[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isDetailFetching, setIsDetailFetching] = useState(false);
  const [isBatchAdding, setIsBatchAdding] = useState(false);
  const [currentAiMode, setCurrentAiMode] = useState<AiMode>("hybrid");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(13);

  // Active territory context
  const [activeArea, setActiveArea] = useState<GeocodeResult | null>(null);
  const [radius, setRadius] = useState<number>(3000);

  // Intentional Pin Mode (prevents accidental clicks from moving the territory center)
  const [isPinModeActive, setIsPinModeActive] = useState(false);

  // Panel Collapsible States
  const [isSearchCollapsed, setIsSearchCollapsed] = useState(false);
  const [isResultsCollapsed, setIsResultsCollapsed] = useState(false);

  const [filters, setFilters] = useState({ hasPhone: false, newOnly: false });
  const [feedback, setFeedback] = useState("");

  // User session & discovery cache state
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;
  const tenantId = user?.tenant_id;

  const [isFromCache, setIsFromCache] = useState(false);
  const [cachedTimestamp, setCachedTimestamp] = useState<number | null>(null);
  const [initialSearchValues, setInitialSearchValues] = useState<{
    keyword?: string;
    category?: string;
    searchMode?: "nearby" | "text";
    aiMode?: AiMode;
    areaQuery?: string;
  } | undefined>(undefined);
  const [lastSearchParams, setLastSearchParams] = useState<{
    keyword: string;
    category: string;
    searchMode: "nearby" | "text";
    areaQuery?: string;
  } | null>(null);

  const hasRestoredCacheRef = useRef(false);

  // Restore cached discovery session partitioned by user session
  useEffect(() => {
    if (!userId || hasRestoredCacheRef.current) return;

    const cache = loadDiscoverySessionCache(userId, tenantId);
    if (cache && Array.isArray(cache.results) && cache.results.length > 0) {
      hasRestoredCacheRef.current = true;
      setResults(cache.results);
      if (cache.center) setCenter(cache.center);
      if (cache.zoom) setZoom(cache.zoom);
      if (cache.radius) setRadius(cache.radius);
      if (cache.activeArea) setActiveArea(cache.activeArea);
      if (cache.searchParams?.aiMode) setCurrentAiMode(cache.searchParams.aiMode);
      if (cache.searchParams?.selectedProductId !== undefined) {
        setSelectedProductId(cache.searchParams.selectedProductId);
      }
      if (cache.filters) setFilters(cache.filters);
      if (cache.selectedId) setSelectedId(cache.selectedId);

      setIsFromCache(true);
      setCachedTimestamp(cache.timestamp);
      setInitialSearchValues({
        keyword: cache.searchParams.keyword,
        category: cache.searchParams.category,
        searchMode: cache.searchParams.searchMode,
        aiMode: cache.searchParams.aiMode,
        areaQuery: cache.searchParams.areaQuery || cache.activeArea?.formatted_address,
      });
      setLastSearchParams({
        keyword: cache.searchParams.keyword,
        category: cache.searchParams.category,
        searchMode: cache.searchParams.searchMode,
        areaQuery: cache.searchParams.areaQuery || cache.activeArea?.formatted_address,
      });
      setFeedback(`Memulihkan ${cache.results.length} hasil Discovery Scan dari sesi tersimpan.`);
    }
  }, [userId, tenantId]);

  useEffect(() => {
    apiFetch("/settings/public")
      .then((res) => res.json())
      .then((json) => {
        const settings = json?.data ?? {};
        const publicApiKey = settings.GOOGLE_MAPS_BROWSER_API_KEY;
        const fallbackApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
        const lat = Number(settings.GOOGLE_MAPS_DEFAULT_CENTER_LAT);
        const lng = Number(settings.GOOGLE_MAPS_DEFAULT_CENTER_LNG);

        setApiKey(typeof publicApiKey === "string" && publicApiKey.trim() ? publicApiKey : fallbackApiKey);
        setIsMapsEnabled(settings.GOOGLE_MAPS_ENABLED === undefined ? true : isEnabledFlag(settings.GOOGLE_MAPS_ENABLED));

        // Only override center if user session has not restored a cached discovery territory
        if (!hasRestoredCacheRef.current) {
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            const defaultLoc = { lat, lng };
            setCenter(defaultLoc);
            setActiveArea({
              place_id: "default_center",
              formatted_address: "Default Region Center",
              lat,
              lng,
            });
          } else {
            setActiveArea({
              place_id: "default_center",
              formatted_address: "Jakarta, Indonesia",
              lat: DEFAULT_CENTER.lat,
              lng: DEFAULT_CENTER.lng,
            });
          }
        }
      })
      .catch(() => {
        setApiKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "");
        setIsMapsEnabled(true);
      })
      .finally(() => setLoadingKey(false));
  }, []);

  const persistCurrentSession = useCallback(
    (
      newResults: DiscoveredLead[],
      override?: {
        selectedId?: string | null;
        activeArea?: GeocodeResult | null;
        radius?: number;
        center?: { lat: number; lng: number };
        zoom?: number;
        filters?: { hasPhone: boolean; newOnly: boolean };
      }
    ) => {
      if (!userId) return;
      const effectiveArea = override?.activeArea !== undefined ? override.activeArea : activeArea;
      if (!effectiveArea) return;

      const effectiveParams: MapDiscoverySessionCache["searchParams"] = {
        lat: effectiveArea.lat,
        lng: effectiveArea.lng,
        radius: override?.radius ?? radius,
        keyword: lastSearchParams?.keyword ?? "",
        category: lastSearchParams?.category ?? "",
        searchMode: lastSearchParams?.searchMode ?? "nearby",
        areaQuery: lastSearchParams?.areaQuery ?? effectiveArea.formatted_address,
        areaInfo: effectiveArea,
        aiMode: currentAiMode,
        selectedProductId,
      };

      saveDiscoverySessionCache(
        userId,
        {
          searchParams: effectiveParams,
          results: newResults,
          center: override?.center ?? center,
          zoom: override?.zoom ?? zoom,
          radius: override?.radius ?? radius,
          activeArea: effectiveArea,
          selectedId: override?.selectedId !== undefined ? override.selectedId : selectedId,
          filters: override?.filters ?? filters,
        },
        tenantId
      );
    },
    [userId, tenantId, activeArea, lastSearchParams, currentAiMode, selectedProductId, center, zoom, radius, selectedId, filters]
  );

  const handleClearCache = useCallback(() => {
    if (userId) {
      clearDiscoverySessionCache(userId, tenantId);
    }
    setResults([]);
    setSelectedId(null);
    setIsFromCache(false);
    setCachedTimestamp(null);
    setInitialSearchValues(undefined);
    setLastSearchParams(null);
    hasRestoredCacheRef.current = false;
    setFeedback("Cache Discovery Scan berhasil dibersihkan.");
  }, [userId, tenantId]);

  const handleSearch = async (params: {
    lat: number;
    lng: number;
    radius: number;
    keyword: string;
    category: string;
    searchMode: "nearby" | "text";
    areaInfo?: GeocodeResult;
    aiMode: AiMode;
    selectedProductId: number | null;
  }) => {
    setCurrentAiMode(params.aiMode);
    setSelectedId(null);
    setFeedback("");
    const discovered = await searchPlaces(
      params.lat,
      params.lng,
      params.radius,
      params.keyword,
      params.category,
      params.searchMode,
      params.areaInfo?.formatted_address,
      params.areaInfo?.place_id
    );
    setResults(discovered);
    const nextZoom = params.radius > 10000 ? 11 : params.radius > 5000 ? 13 : 14;
    const nextCenter = { lat: params.lat, lng: params.lng };
    setCenter(nextCenter);
    setZoom(nextZoom);
    setIsResultsCollapsed(false);
    setIsFromCache(false);
    setCachedTimestamp(Date.now());
    hasRestoredCacheRef.current = true;

    const nextParams = {
      keyword: params.keyword,
      category: params.category,
      searchMode: params.searchMode,
      areaQuery: params.areaInfo?.formatted_address,
    };
    setLastSearchParams(nextParams);

    if (userId) {
      saveDiscoverySessionCache(
        userId,
        {
          searchParams: {
            lat: params.lat,
            lng: params.lng,
            radius: params.radius,
            keyword: params.keyword,
            category: params.category,
            searchMode: params.searchMode,
            areaQuery: params.areaInfo?.formatted_address,
            areaInfo: params.areaInfo,
            aiMode: params.aiMode,
            selectedProductId: params.selectedProductId,
          },
          results: discovered,
          center: nextCenter,
          zoom: nextZoom,
          radius: params.radius,
          activeArea: params.areaInfo ?? null,
          selectedId: null,
          filters,
        },
        tenantId
      );
    }

    // On phones & tablets the search panel overlays the map — tuck it away once results arrive
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsSearchCollapsed(true);
    }
  };

  const handleSelect = async (placeId: string | null) => {
    setSelectedId(placeId);

    if (!placeId) {
      persistCurrentSession(results, { selectedId: null });
      return;
    }

    setIsDetailFetching(true);
    try {
      const detail = await getPlaceDetails(placeId);
      if (detail) {
        setResults((prev) => {
          const updated = prev.map((r) =>
            r.external_place_id === placeId ? { ...r, ...detail, fit_analysis: r.fit_analysis } : r
          );
          persistCurrentSession(updated, { selectedId: placeId });
          return updated;
        });
      }
    } catch {
      // ignore
    } finally {
      setIsDetailFetching(false);
    }
  };

  const handleFlyTo = (lead: DiscoveredLead) => {
    setCenter({ lat: lead.lat, lng: lead.lng });
    setZoom(16);
    setSelectedId(lead.external_place_id ?? null);
  };

  const handleAddLead = async (lead: DiscoveredLead, aiMode: AiMode) => {
    try {
      const result = await addToLeads(lead, aiMode, selectedProductId ?? undefined);
      setResults((prev) => {
        const updated = prev.map((r) =>
          r.external_place_id === lead.external_place_id
            ? { ...r, dedup: { is_duplicate: true, status: "existing_new_pic", recommendation: "skip" } }
            : r
        );
        persistCurrentSession(updated);
        return updated;
      });
      if (result?.ai_warning) {
        setFeedback(`Lead added. ⚠ ${result.ai_warning}`);
      } else {
        setFeedback(`Lead "${lead.company_name}" added to pipeline successfully.`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setFeedback(`Unable to add lead: ${message}`);
    }
  };

  const handleAddBatch = async (leadsToAdd: DiscoveredLead[], aiMode: AiMode) => {
    if (leadsToAdd.length === 0) return;
    setIsBatchAdding(true);
    setFeedback(`Adding ${leadsToAdd.length} leads to pipeline…`);
    try {
      const { added, failed } = await addBatchToLeads(
        leadsToAdd,
        aiMode,
        selectedProductId ?? undefined,
        (completed, total) => {
          setFeedback(`Importing leads to pipeline: ${completed}/${total} processed…`);
        }
      );

      const addedSet = new Set(added);
      setResults((prev) => {
        const updated = prev.map((r) =>
          r.external_place_id && addedSet.has(r.external_place_id)
            ? { ...r, dedup: { is_duplicate: true, status: "existing_new_pic", recommendation: "skip" } }
            : r
        );
        persistCurrentSession(updated);
        return updated;
      });

      if (failed.length > 0) {
        setFeedback(`Added ${added.length} leads. (${failed.length} skipped or failed).`);
      } else {
        setFeedback(`Successfully imported ${added.length} leads to pipeline!`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Batch add failed";
      setFeedback(`Batch import error: ${message}`);
    } finally {
      setIsBatchAdding(false);
    }
  };

  const handleAnalyzeProductFit = async () => {
    if (!selectedProductId || results.length === 0) return;

    setFeedback("Running product-fit analysis…");
    const analysisMap = await analyzeProductFit(filteredResults, selectedProductId);

    if (Object.keys(analysisMap).length === 0) {
      setFeedback("Product-fit analysis could not finish. Try again with fewer results or check the error detail on the map.");
      return;
    }

    setResults((prev) => {
      const updated = prev.map((r) => {
        const placeId = r.external_place_id;
        if (!placeId) return r;
        const analysis: GeoProductFitAnalysis | undefined = analysisMap[placeId];
        return analysis ? { ...r, fit_analysis: analysis } : r;
      });
      persistCurrentSession(updated);
      return updated;
    });

    const highCount = Object.values(analysisMap).filter((a) => a.fit_level === "high").length;
    setFeedback(
      `Analysis complete. ${highCount} high-fit business${highCount !== 1 ? "es" : ""} found.`
    );
  };

  // Safe Click to Pin Territory Center (only triggered when isPinModeActive is true)
  const handleMapClick = async (ev: { detail: { latLng: google.maps.LatLngLiteral | null } }) => {
    if (!isPinModeActive) return;

    const loc = ev.detail.latLng;
    if (!loc) return;

    setIsPinModeActive(false);

    const pinnedArea: GeocodeResult = {
      place_id: `pinned_${Date.now()}`,
      formatted_address: `Pinned Territory (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})`,
      lat: loc.lat,
      lng: loc.lng,
    };
    setActiveArea(pinnedArea);
    setCenter(loc);
    setFeedback(`Territory center pinned to: ${pinnedArea.formatted_address}`);

    // Try reverse geocoding to human-readable address
    try {
      const res = await geocodeArea(`${loc.lat},${loc.lng}`);
      if (res) {
        setActiveArea(res);
        setFeedback(`Territory centered at: ${res.formatted_address}`);
      }
    } catch {
      // ignore
    }
  };

  const filteredResults = results.filter((r) => {
    if (filters.hasPhone && !r.phone) return false;
    if (filters.newOnly && r.dedup?.is_duplicate) return false;
    return true;
  });

  return (
    <div className="flex h-full flex-col gap-2 p-2 sm:gap-3 sm:p-4">
      {/* ── Page Header Bar ── */}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-3 py-2.5 sm:px-4 sm:py-3 sm:flex-row sm:items-center sm:justify-between shadow-xs">
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--brand)] text-[color:var(--brand-foreground)] shadow-xs">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold text-foreground sm:text-base">Map & Territory Discovery</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Geospatial prospecting, radius scanning, and AI product-fit matching.
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {feedback ? (
            <Badge variant="info" className="max-w-full truncate text-xs sm:max-w-sm">
              {feedback}
            </Badge>
          ) : null}

          {/* Cached Session Badge */}
          {isFromCache && results.length > 0 && (
            <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5 gap-1.5 py-1">
              <Sparkles className="h-3 w-3 text-blue-500" />
              Sesi Tersimpan ({formatRelativeDiscoveryTime(cachedTimestamp || 0)})
            </Badge>
          )}

          {/* Quick Stats Pill */}
          {results.length > 0 && (
            <Badge variant="brand" className="text-xs">
              {results.length} Discovered
            </Badge>
          )}
        </div>
      </div>

      {/* ── Main Workspace: Search Panel + Map Canvas + Results Panel ── */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        {/* Search Panel with Saved Territories and Radius Controls */}
        <MapSearchPanel
          onSearch={handleSearch}
          onReset={handleClearCache}
          initialValues={initialSearchValues}
          isSearching={isSearching}
          resultCount={results.length}
          onAreaFound={(area) => {
            setActiveArea(area);
            setCenter({ lat: area.lat, lng: area.lng });
            setZoom(radius > 10000 ? 11 : radius > 5000 ? 13 : 14);
            persistCurrentSession(results, { activeArea: area, center: { lat: area.lat, lng: area.lng } });
          }}
          filters={filters}
          onFilterChange={(newFilters) => {
            setFilters(newFilters);
            persistCurrentSession(results, { filters: newFilters });
          }}
          onMessage={setFeedback}
          selectedProductId={selectedProductId}
          onProductChange={(pId) => {
            setSelectedProductId(pId);
            persistCurrentSession(results);
          }}
          radius={radius}
          onRadiusChange={(newRadius) => {
            setRadius(newRadius);
            persistCurrentSession(results, { radius: newRadius });
          }}
          activeArea={activeArea}
          onAreaSelect={(area) => {
            setActiveArea(area);
            if (area) {
              persistCurrentSession(results, { activeArea: area });
            }
          }}
          isCollapsed={isSearchCollapsed}
          onToggleCollapse={() => setIsSearchCollapsed(!isSearchCollapsed)}
        />

        {/* ── Map Canvas ── */}
        <div className="relative min-w-0 flex-1 bg-[color:var(--surface-subtle)]">
          {/* Floating Map Utility Bar */}
          <div className="absolute top-3 left-3 z-30 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2">
            <Button
              variant={isPinModeActive ? "default" : "secondary"}
              size="sm"
              onClick={() => {
                const next = !isPinModeActive;
                setIsPinModeActive(next);
                if (next) {
                  setFeedback("Pin mode active: Click anywhere on the map to set territory center.");
                } else {
                  setFeedback("");
                }
              }}
              className="gap-1.5 text-xs h-8 shadow-md"
            >
              <Crosshair className={cn("h-3.5 w-3.5", isPinModeActive ? "animate-spin" : "")} />
              <span>{isPinModeActive ? "Click map to set center" : "Set Center on Map"}</span>
            </Button>

            {isSearchCollapsed && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsSearchCollapsed(false)}
                className="gap-1.5 text-xs h-8 shadow-md lg:hidden"
              >
                <PanelLeftOpen className="h-3.5 w-3.5" />
                <span>Show Search</span>
              </Button>
            )}

            {results.length > 0 && isResultsCollapsed && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsResultsCollapsed(false)}
                className="gap-1.5 text-xs h-8 shadow-md lg:hidden"
              >
                <PanelRightOpen className="h-3.5 w-3.5" />
                <span>Results ({results.length})</span>
              </Button>
            )}
          </div>

          {isMapsEnabled && apiKey ? (
            <APIProvider apiKey={apiKey}>
              <Map
                mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID"}
                colorScheme={colorScheme}
                styles={mapStyles}
                defaultCenter={center}
                center={center}
                zoom={zoom}
                onCenterChanged={(ev) => setCenter(ev.detail.center)}
                onZoomChanged={(ev) => setZoom(ev.detail.zoom)}
                onClick={handleMapClick}
                gestureHandling={"greedy"}
                disableDefaultUI={false}
                mapTypeControl={false}
                streetViewControl={false}
              >
                {/* Visual Territory Radius Circle */}
                {activeArea && (
                  <>
                    <Circle
                      center={{ lat: activeArea.lat, lng: activeArea.lng }}
                      radius={radius}
                      strokeColor={isDark ? "#818cf8" : "#6366f1"}
                      strokeOpacity={0.8}
                      strokeWeight={2}
                      fillColor={isDark ? "#818cf8" : "#6366f1"}
                      fillOpacity={isDark ? 0.12 : 0.08}
                    />
                    <AdvancedMarker
                      position={{ lat: activeArea.lat, lng: activeArea.lng }}
                      title={`Territory Center: ${activeArea.formatted_address} (Drag to move)`}
                      draggable={true}
                      onDragEnd={(ev) => {
                        if (ev.latLng) {
                          const lat = typeof ev.latLng.lat === "function" ? ev.latLng.lat() : (ev.latLng as any).lat;
                          const lng = typeof ev.latLng.lng === "function" ? ev.latLng.lng() : (ev.latLng as any).lng;
                          if (typeof lat === "number" && typeof lng === "number") {
                            setActiveArea(prev => prev ? {
                              ...prev,
                              lat,
                              lng,
                              formatted_address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
                            } : {
                              place_id: "dragged_center",
                              formatted_address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                              lat,
                              lng
                            });
                            setCenter({ lat, lng });
                            setFeedback(`Territory center moved to: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                          }
                        }
                      }}
                      style={{ zIndex: 999 }}
                    >
                      <div className="flex flex-col items-center origin-bottom select-none cursor-grab active:cursor-grabbing group">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-[color:var(--brand)] text-[color:var(--brand-foreground)] shadow-lg ring-2 ring-[color:var(--brand)]/30 group-hover:scale-110 transition-transform">
                          <Crosshair className="h-4 w-4" />
                        </div>
                        <div className="mt-1 whitespace-nowrap rounded-md bg-card/95 backdrop-blur px-2 py-0.5 text-[10px] font-semibold text-foreground shadow-sm border border-border group-hover:border-[color:var(--brand)] transition-colors">
                          Territory Center · {(radius / 1000).toFixed(1)} km (Drag)
                        </div>
                      </div>
                    </AdvancedMarker>
                  </>
                )}

                {/* Discovered Lead Markers */}
                <MapMarkersLayer
                  results={filteredResults}
                  selectedId={selectedId}
                  hoveredId={hoveredId}
                  onSelect={handleSelect}
                  onHover={setHoveredId}
                />
              </Map>
            </APIProvider>
          ) : (
            <div className="flex h-full items-center justify-center p-8">
              <Card className="max-w-xl">
                <CardContent className="flex flex-col items-center justify-center gap-4 p-8 text-center">
                  {loadingKey ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <>
                      <MapPin className="mb-4 h-12 w-12 text-muted-foreground/30" />
                      <h3 className="mb-2 text-lg font-semibold text-foreground">
                        {isMapsEnabled ? "Google Maps Configuration Required" : "Google Maps Integration Disabled"}
                      </h3>
                      <p className="max-w-md text-sm text-muted-foreground">
                        {isMapsEnabled
                          ? "Please insert your Google Maps Browser API Key in the settings page to render the map."
                          : "Enable Google Maps integration in settings to render the map interface on this page."}
                      </p>
                      <Link href="/settings/integrations" className={cn(buttonVariants({ variant: "default" }), "mt-2")}>
                        Configure Settings
                      </Link>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Floating Map Helper Badge */}
          {activeArea && !isPinModeActive && (
            <div className="pointer-events-none absolute bottom-3 left-3 z-30 hidden sm:flex items-center gap-2 rounded-lg bg-card/90 backdrop-blur px-2.5 py-1 text-xs text-muted-foreground border border-border shadow-xs">
              <Navigation className="h-3.5 w-3.5 text-[color:var(--brand)]" />
              <span>Center: <strong className="text-foreground">{activeArea.formatted_address.split(",")[0]}</strong> ({(radius / 1000).toFixed(1)} km)</span>
            </div>
          )}

          {error && (
            <div className="absolute left-1/2 top-4 z-50 -translate-x-1/2">
              <Badge variant="danger">{error}</Badge>
            </div>
          )}
        </div>

        {/* Results Panel with Batch Actions, FlyTo, and Contact Indicators */}
        {(results.length > 0 || isSearching) && (
          <MapResultsPanel
            results={filteredResults}
            totalCount={results.length}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onSelect={handleSelect}
            onHover={setHoveredId}
            onAdd={handleAddLead}
            onAddBatch={handleAddBatch}
            onAnalyze={handleAnalyzeProductFit}
            onFlyTo={handleFlyTo}
            isDetailFetching={isDetailFetching}
            isAnalyzing={isAnalyzing}
            isBatchAdding={isBatchAdding}
            aiMode={currentAiMode}
            selectedProductId={selectedProductId}
            isCollapsed={isResultsCollapsed}
            onToggleCollapse={() => setIsResultsCollapsed(!isResultsCollapsed)}
            isFromCache={isFromCache}
            cachedTimestamp={cachedTimestamp}
            onClearCache={handleClearCache}
          />
        )}
      </div>
    </div>
  );
}
