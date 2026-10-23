"use client";

import { useState, useEffect } from "react";
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

const DEFAULT_CENTER = { lat: -6.2088, lng: 106.8456 };

function isEnabledFlag(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

export default function MapPage() {
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
      })
      .catch(() => {
        setApiKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "");
        setIsMapsEnabled(true);
      })
      .finally(() => setLoadingKey(false));
  }, []);

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
    setCenter({ lat: params.lat, lng: params.lng });
    setZoom(params.radius > 10000 ? 11 : params.radius > 5000 ? 13 : 14);
    setIsResultsCollapsed(false);
  };

  const handleSelect = async (placeId: string | null) => {
    setSelectedId(placeId);

    if (!placeId) return;

    setIsDetailFetching(true);
    try {
      const detail = await getPlaceDetails(placeId);
      if (detail) {
        setResults((prev) =>
          prev.map((r) =>
            r.external_place_id === placeId ? { ...r, ...detail, fit_analysis: r.fit_analysis } : r
          )
        );
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
      setResults((prev) =>
        prev.map((r) =>
          r.external_place_id === lead.external_place_id
            ? { ...r, dedup: { is_duplicate: true, status: "existing_new_pic", recommendation: "skip" } }
            : r
        )
      );
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
      setResults((prev) =>
        prev.map((r) =>
          r.external_place_id && addedSet.has(r.external_place_id)
            ? { ...r, dedup: { is_duplicate: true, status: "existing_new_pic", recommendation: "skip" } }
            : r
        )
      );

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

    setResults((prev) =>
      prev.map((r) => {
        const placeId = r.external_place_id;
        if (!placeId) return r;
        const analysis: GeoProductFitAnalysis | undefined = analysisMap[placeId];
        return analysis ? { ...r, fit_analysis: analysis } : r;
      })
    );

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
    <div className="flex h-full flex-col gap-3 p-3 sm:p-4">
      {/* ── Page Header Bar ── */}
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--brand)] text-[color:var(--brand-foreground)] shadow-xs">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">Map & Territory Discovery</h1>
            <p className="text-xs text-muted-foreground">
              Geospatial prospecting, radius scanning, and AI product-fit matching.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {feedback ? (
            <Badge variant="info" className="shrink-0 max-w-sm truncate text-xs">
              {feedback}
            </Badge>
          ) : null}

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
          onReset={() => {
            setResults([]);
            setSelectedId(null);
            setFeedback("");
          }}
          isSearching={isSearching}
          resultCount={results.length}
          onAreaFound={(area) => {
            setActiveArea(area);
            setCenter({ lat: area.lat, lng: area.lng });
            setZoom(radius > 10000 ? 11 : radius > 5000 ? 13 : 14);
          }}
          filters={filters}
          onFilterChange={setFilters}
          onMessage={setFeedback}
          selectedProductId={selectedProductId}
          onProductChange={setSelectedProductId}
          radius={radius}
          onRadiusChange={setRadius}
          activeArea={activeArea}
          onAreaSelect={setActiveArea}
          isCollapsed={isSearchCollapsed}
          onToggleCollapse={() => setIsSearchCollapsed(!isSearchCollapsed)}
        />

        {/* ── Map Canvas ── */}
        <div className="relative flex-1 bg-[color:var(--surface-subtle)]">
          {/* Floating Map Utility Bar */}
          <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
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
                className="gap-1.5 text-xs h-8 shadow-md"
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
                className="gap-1.5 text-xs h-8 shadow-md"
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
                      strokeColor="#6366f1"
                      strokeOpacity={0.8}
                      strokeWeight={2}
                      fillColor="#6366f1"
                      fillOpacity={0.08}
                    />
                    <AdvancedMarker
                      position={{ lat: activeArea.lat, lng: activeArea.lng }}
                      title={`Territory Center: ${activeArea.formatted_address}`}
                      style={{ zIndex: 999 }}
                    >
                      <div className="flex flex-col items-center pointer-events-none origin-bottom select-none">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-[color:var(--brand)] text-[color:var(--brand-foreground)] shadow-md ring-2 ring-[color:var(--brand)]/30">
                          <Crosshair className="h-3.5 w-3.5" />
                        </div>
                        <div className="mt-1 whitespace-nowrap rounded-md bg-card/95 backdrop-blur px-2 py-0.5 text-[10px] font-semibold text-foreground shadow-sm border border-border">
                          Territory Center · {(radius / 1000).toFixed(1)} km
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
          />
        )}
      </div>
    </div>
  );
}
