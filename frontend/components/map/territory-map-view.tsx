"use client";

import {
  APIProvider,
  Circle,
  Map,
  Marker,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  deleteTerritory,
  loadSavedTerritories,
  type SavedTerritory,
  saveTerritory,
} from "@/lib/territory-storage";

/** Default map center (Jakarta) — adjust per deployment region as needed. */
const DEFAULT_CENTER = { lat: -6.2088, lng: 106.8456 };
const DEFAULT_ZOOM = 12;

type TerritoryMapViewProps = {
  apiKey: string;
  className?: string;
};

function MapPane({
  center,
  zoom,
  radiusMeters,
  onMapClick,
}: {
  center: google.maps.LatLngLiteral;
  zoom: number;
  radiusMeters: number;
  onMapClick: (e: {
    detail: { latLng: google.maps.LatLngLiteral | null };
  }) => void;
}) {
  return (
    <Map
      className="h-full w-full"
      center={center}
      zoom={zoom}
      gestureHandling="greedy"
      disableDefaultUI={false}
      mapTypeControl
      streetViewControl={false}
      fullscreenControl
      onClick={onMapClick}
    >
      <Circle
        center={center}
        radius={radiusMeters}
        strokeColor="oklch(0.205 0 0)"
        strokeOpacity={0.9}
        strokeWeight={2}
        fillColor="oklch(0.205 0 0)"
        fillOpacity={0.08}
      />
      <Marker position={center} title="Territory center" />
    </Map>
  );
}

function GeocodeSearch({
  onFound,
}: {
  onFound: (loc: google.maps.LatLngLiteral) => void;
}) {
  const geocodingLib = useMapsLibrary("geocoding");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runGeocode = useCallback(
    (address: string) => {
      if (!geocodingLib || !address.trim()) return;
      setBusy(true);
      setError(null);
      const geocoder = new geocodingLib.Geocoder();
      geocoder.geocode(
        { address: address.trim() },
        (
          results: google.maps.GeocoderResult[] | null,
          status: google.maps.GeocoderStatus,
        ) => {
        setBusy(false);
        if (status !== "OK" || !results?.[0]?.geometry?.location) {
          setError("Location not found. Try a more specific address.");
          return;
        }
        const loc = results[0].geometry.location;
        const literal = { lat: loc.lat(), lng: loc.lng() };
        onFound(literal);
        },
      );
    },
    [geocodingLib, onFound],
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    runGeocode(query);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <label className="text-xs font-medium text-muted-foreground">
        Search location
      </label>
      <div className="flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="City, district, or address"
          className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 min-w-0 flex-1 rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2"
          autoComplete="off"
        />
        <Button type="submit" disabled={busy || !query.trim()}>
          {busy ? "…" : "Go"}
        </Button>
      </div>
      {error ? (
        <p className="text-destructive text-xs">{error}</p>
      ) : (
        <p className="text-muted-foreground text-xs">
          Uses the Geocoding API (loaded with the map).
        </p>
      )}
    </form>
  );
}

export function TerritoryMapView({ apiKey, className }: TerritoryMapViewProps) {
  const [center, setCenter] =
    useState<google.maps.LatLngLiteral>(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [radiusKm, setRadiusKm] = useState(5);
  const [savedTerritories, setSavedTerritories] = useState<SavedTerritory[]>(
    [],
  );
  const [saveName, setSaveName] = useState("");

  useEffect(() => {
    setSavedTerritories(loadSavedTerritories());
  }, []);

  const radiusMeters = Math.round(radiusKm * 1000);

  const onMapClick = useCallback(
    (e: { detail: { latLng: google.maps.LatLngLiteral | null } }) => {
      const ll = e.detail.latLng;
      if (ll) setCenter(ll);
    },
    [],
  );

  const territoryJson = JSON.stringify(
    {
      searchCenterLat: center.lat,
      searchCenterLng: center.lng,
      radiusKm,
      radiusMeters,
    },
    null,
    2,
  );

  return (
    <APIProvider apiKey={apiKey} libraries={["geocoding", "marker"]}>
      <div
        className={cn(
          "border-border bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-4 shadow-sm",
          className,
        )}
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-start">
          <div className="flex flex-col gap-4">
            <GeocodeSearch
              onFound={(loc) => {
                setCenter(loc);
                setZoom(14);
              }}
            />
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="radius-km"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Radius
                </label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {radiusKm.toFixed(1)} km
                </span>
              </div>
              <input
                id="radius-km"
                type="range"
                min={0.5}
                max={50}
                step={0.5}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="accent-primary w-full"
              />
            </div>
            <dl className="bg-muted/40 grid gap-1 rounded-lg p-3 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Latitude</dt>
                <dd className="font-mono tabular-nums">
                  {center.lat.toFixed(6)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Longitude</dt>
                <dd className="font-mono tabular-nums">
                  {center.lng.toFixed(6)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Radius</dt>
                <dd className="font-mono tabular-nums">{radiusMeters} m</dd>
              </div>
            </dl>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Save territory (this browser)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Name (optional)"
                  className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring h-9 min-w-0 flex-1 rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const name =
                      saveName.trim() ||
                      `Territory ${savedTerritories.length + 1}`;
                    saveTerritory({
                      name,
                      searchCenterLat: center.lat,
                      searchCenterLng: center.lng,
                      radiusKm,
                    });
                    setSaveName("");
                    setSavedTerritories(loadSavedTerritories());
                  }}
                >
                  Save
                </Button>
              </div>
              {savedTerritories.length > 0 ? (
                <ul className="max-h-44 space-y-2 overflow-y-auto">
                  {savedTerritories.map((t) => (
                    <li
                      key={t.id}
                      className="bg-muted/40 flex flex-col gap-2 rounded-lg p-2 text-xs"
                    >
                      <span className="text-foreground font-medium">
                        {t.name}
                      </span>
                      <span className="text-muted-foreground font-mono tabular-nums">
                        {t.searchCenterLat.toFixed(4)},{" "}
                        {t.searchCenterLng.toFixed(4)} · {t.radiusKm} km
                      </span>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCenter({
                              lat: t.searchCenterLat,
                              lng: t.searchCenterLng,
                            });
                            setRadiusKm(t.radiusKm);
                            setZoom(12);
                          }}
                        >
                          Apply
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            deleteTerritory(t.id);
                            setSavedTerritories(loadSavedTerritories());
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                void navigator.clipboard.writeText(territoryJson);
              }}
            >
              Copy territory JSON
            </Button>
          </div>
          <div className="bg-muted relative h-[min(70vh,560px)] min-h-[320px] w-full overflow-hidden rounded-lg">
            <MapPane
              center={center}
              zoom={zoom}
              radiusMeters={radiusMeters}
              onMapClick={onMapClick}
            />
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          Click the map to move the center. Outputs match BRD §3.1 territory
          metadata (center + radius). Saved names are stored in{" "}
          <code className="bg-muted rounded px-1 py-0.5">localStorage</code> until
          the API persists territories per user/team.
        </p>
      </div>
    </APIProvider>
  );
}
