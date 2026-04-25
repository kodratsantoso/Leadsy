"use client";

import { useState, useEffect } from "react";
import { APIProvider, Map } from "@vis.gl/react-google-maps";
import Link from "next/link";
import { Loader2, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/apiFetch";
import { useMapDiscovery, type DiscoveredLead, type GeocodeResult } from "@/lib/hooks/use-map-discovery";
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

  const { isSearching, error, searchPlaces, addToLeads, getPlaceDetails } = useMapDiscovery();

  const [results, setResults] = useState<DiscoveredLead[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isDetailFetching, setIsDetailFetching] = useState(false);
  const [currentAiMode, setCurrentAiMode] = useState<AiMode>("hybrid");

  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(13);

  const [filters, setFilters] = useState({ hasPhone: false, newOnly: false });
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    apiFetch("/settings/public")
      .then(res => res.json())
      .then(json => {
        const settings = json?.data ?? {};
        const publicApiKey = settings.GOOGLE_MAPS_BROWSER_API_KEY;
        const fallbackApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
        const lat = Number(settings.GOOGLE_MAPS_DEFAULT_CENTER_LAT);
        const lng = Number(settings.GOOGLE_MAPS_DEFAULT_CENTER_LNG);

        setApiKey(typeof publicApiKey === "string" && publicApiKey.trim() ? publicApiKey : fallbackApiKey);
        setIsMapsEnabled(settings.GOOGLE_MAPS_ENABLED === undefined ? true : isEnabledFlag(settings.GOOGLE_MAPS_ENABLED));

        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setCenter({ lat, lng });
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
  }) => {
    // Capture selected AI mode so results panel uses the correct mode
    setCurrentAiMode(params.aiMode);
    // Keep existing results visible during loading (no flash to empty state)
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
    setZoom(14);
  };

  const handleSelect = async (placeId: string | null) => {
    setSelectedId(placeId);
    
    if (!placeId) return;

    setIsDetailFetching(true);
    
    try {
        const detail = await getPlaceDetails(placeId);
        if (detail) {
            setResults(prev => prev.map(r => 
                r.external_place_id === placeId 
                  ? { ...r, ...detail }
                  : r
            ));
        }
    } catch {
    } finally {
        setIsDetailFetching(false);
    }
  };

  const handleAddLead = async (lead: DiscoveredLead, aiMode: AiMode) => {
    try {
      const result = await addToLeads(lead, aiMode);
      setResults(prev => prev.map(r =>
        r.external_place_id === lead.external_place_id
          ? { ...r, dedup: { is_duplicate: true, status: 'existing_new_pic', recommendation: 'skip' } }
          : r
      ));
      if (result?.ai_warning) {
        setFeedback(`Lead added. ⚠ ${result.ai_warning}`);
      } else {
        setFeedback("Lead added to leads queue successfully.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setFeedback(`Unable to add lead: ${message}`);
    }
  };

  const filteredResults = results.filter(r => {
    if (filters.hasPhone && !r.phone) return false;
    if (filters.newOnly && r.dedup?.is_duplicate) return false;
    return true;
  });

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Maps Discovery</CardTitle>
            <CardDescription>Discover businesses and move qualified results into the lead pipeline with the shared admin UI.</CardDescription>
          </div>
          {feedback ? <Badge variant="info">{feedback}</Badge> : null}
        </CardHeader>
      </Card>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card">
      <MapSearchPanel
        onSearch={handleSearch}
        onReset={() => { setResults([]); setSelectedId(null); setFeedback(""); }}
        isSearching={isSearching}
        resultCount={results.length}
        onAreaFound={(area) => {
          setCenter({ lat: area.lat, lng: area.lng });
          setZoom(14);
        }}
        filters={filters}
        onFilterChange={setFilters}
        onMessage={setFeedback}
      />

      <div className="relative flex-1 bg-[color:var(--surface-subtle)]">
        {isMapsEnabled && apiKey ? (
          <APIProvider apiKey={apiKey}>
            <Map
              mapId="prasetia-leads-map-id"
              defaultCenter={center}
              center={center}
              zoom={zoom}
              onCenterChanged={(ev) => setCenter(ev.detail.center)}
              onZoomChanged={(ev) => setZoom(ev.detail.zoom)}
              gestureHandling={"greedy"}
              disableDefaultUI={false}
              mapTypeControl={false}
              streetViewControl={false}
            >
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
                <p className="max-w-md text-sm">
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

        {error && (
          <div className="absolute left-1/2 top-4 z-50 -translate-x-1/2">
            <Badge variant="danger">{error}</Badge>
          </div>
        )}
      </div>

      {(results.length > 0 || isSearching) && (
        <MapResultsPanel
          results={filteredResults}
          totalCount={results.length}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={handleSelect}
          onHover={setHoveredId}
          onAdd={handleAddLead}
          isDetailFetching={isDetailFetching}
          aiMode={currentAiMode}
        />
      )}
      </div>
    </div>
  );
}
