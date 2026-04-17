"use client";

import { useState, useEffect } from "react";
import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { MapPin, Loader2 } from "lucide-react";

import { useMapDiscovery, type DiscoveredLead, type GeocodeResult } from "@/lib/hooks/use-map-discovery";
import { MapSearchPanel } from "@/components/map/map-search-panel";
import { MapResultsPanel } from "@/components/map/map-results-panel";
import { MapMarkersLayer } from "@/components/map/map-markers-layer";
import type { AiMode } from "@/components/ai/ai-mode-selector";

export default function MapPage() {
  const [apiKey, setApiKey] = useState("");
  const [loadingKey, setLoadingKey] = useState(true);

  const { isSearching, error, searchPlaces, addToLeads, getPlaceDetails } = useMapDiscovery();

  // Selected State
  const [results, setResults] = useState<DiscoveredLead[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isDetailFetching, setIsDetailFetching] = useState(false);
  
  // Map State
  const [center, setCenter] = useState({ lat: -6.2088, lng: 106.8456 });
  const [zoom, setZoom] = useState(13);
  
  // Filter State
  const [filters, setFilters] = useState({ hasPhone: false, newOnly: false });

  // Load API Key
  useEffect(() => {
    fetch('/api/settings/public')
      .then(res => res.json())
      .then(json => {
        if (json?.data?.GOOGLE_MAPS_BROWSER_API_KEY) setApiKey(json.data.GOOGLE_MAPS_BROWSER_API_KEY);
        else setApiKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "");
      })
      .catch(() => setApiKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""))
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
    setResults([]);
    setSelectedId(null);
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
    // Move map to search area if bounds are provided, otherwise just center
    if (params.areaInfo?.viewport) {
      // Bounds will be handled by fitBounds if we get complex, but simply setCenter is fine for now
      setCenter({ lat: params.lat, lng: params.lng });
      setZoom(14);
    } else {
      setCenter({ lat: params.lat, lng: params.lng });
    }
  };

  const handleSelect = async (placeId: string | null) => {
    setSelectedId(placeId);
    
    if (!placeId) return;
    
    // Check if we already fetched details for this place (e.g. check if it has phone or website already or if we explicitly enriched it)
    const existing = results.find(r => r.external_place_id === placeId);
    
    // In many cases, phone is only populated upon deep dive. We can attempt to fetch it anyway if last_enriched isn't tracked here.
    // For simplicity, we fetch it if missing phone / website / hours. If it simply doesn't exist on Google, backend caches it, so subsequent clicks are fast.
    setIsDetailFetching(true);
    
    try {
        const detail = await getPlaceDetails(placeId);
        if (detail) {
            setResults(prev => prev.map(r => 
                r.external_place_id === placeId 
                  ? { ...r, ...detail } // merge fully enriched payload
                  : r
            ));
        }
    } catch {
        // gracefully ignore and render basic info if detail fetch fails
    } finally {
        setIsDetailFetching(false);
    }
  };

  const handleAddLead = async (lead: DiscoveredLead, aiMode: AiMode) => {
    try {
      await addToLeads(lead, aiMode);
      // Optimistically update the list to show it's a duplicate/in pipeline now
      setResults(prev => prev.map(r => 
        r.external_place_id === lead.external_place_id 
          ? { ...r, dedup: { is_duplicate: true, status: 'existing_new_pic', recommendation: 'skip' } } 
          : r
      ));
      alert("Successfully added to Leads Pipeline");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      alert("Error adding lead: " + message);
    }
  };

  const filteredResults = results.filter(r => {
    if (filters.hasPhone && !r.phone) return false;
    if (filters.newOnly && r.dedup?.is_duplicate) return false;
    return true;
  });

  return (
    <div className="flex h-full overflow-hidden">
      {/* 1. LEFT PANEL - Controls */}
      <MapSearchPanel 
        onSearch={handleSearch}
        isSearching={isSearching}
        resultCount={results.length}
        onAreaFound={(area) => {
          setCenter({ lat: area.lat, lng: area.lng });
          setZoom(14);
        }}
        filters={filters}
        onFilterChange={setFilters}
      />

      {/* 2. CENTER - Map */}
      <div className="flex-1 relative bg-muted">
        {apiKey ? (
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
          <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-background text-muted-foreground">
            {loadingKey ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <>
                <MapPin className="mb-4 h-12 w-12 text-muted-foreground/30" />
                <h3 className="mb-2 text-lg font-semibold text-foreground">Google Maps Configuration Required</h3>
                <p className="max-w-md text-sm">Please insert your Google Maps Browser API Key in the settings page to render the map.</p>
                <a href="/settings/integrations" className="mt-4 rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                  Configure Settings
                </a>
              </>
            )}
          </div>
        )}

        {/* Global Error Toast Overlay */}
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-destructive/10 border border-destructive/20 backdrop-blur px-4 py-2 text-destructive shadow-lg text-sm font-medium flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}
      </div>

      {/* 3. RIGHT PANEL - Result List & Details */}
      {(results.length > 0 || isSearching) && (
        <MapResultsPanel 
          results={filteredResults}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={handleSelect}
          onHover={setHoveredId}
          onAdd={handleAddLead}
          isDetailFetching={isDetailFetching} // Pass our new state down
          aiMode="hybrid" // This will be passed dynamically if needed, defaulted here
        />
      )}
    </div>
  );
}
