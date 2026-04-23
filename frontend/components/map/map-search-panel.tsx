"use client";

import { useState } from "react";
import { History, Map, MapPin, Navigation, SlidersHorizontal } from "lucide-react";

import { AiModeSelector, type AiMode } from "@/components/ai/ai-mode-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useMapDiscovery, type GeocodeResult } from "@/lib/hooks/use-map-discovery";

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
  }) => void;
  isSearching: boolean;
  resultCount: number;
  onAreaFound: (area: GeocodeResult) => void;
  filters: { hasPhone: boolean; newOnly: boolean };
  onFilterChange: (filters: { hasPhone: boolean; newOnly: boolean }) => void;
  onMessage: (message: string) => void;
};

const searchModeTabs = [
  { key: "nearby", label: "Nearby Search" },
  { key: "text", label: "Text Search" },
] as const;

export function MapSearchPanel({
  onSearch,
  isSearching,
  resultCount,
  onAreaFound,
  filters,
  onFilterChange,
  onMessage,
}: SearchPanelProps) {
  const { geocodeArea, getSearchHistory } = useMapDiscovery();

  const [areaQuery, setAreaQuery] = useState("");
  const [activeArea, setActiveArea] = useState<GeocodeResult | null>(null);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [radius, setRadius] = useState(3000);
  const [searchMode, setSearchMode] = useState<"nearby" | "text">("nearby");
  const [aiMode, setAiMode] = useState<AiMode>("hybrid");
  const [showFilters, setShowFilters] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
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

  const handleGeocode = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!areaQuery.trim()) return;

    const result = await geocodeArea(areaQuery);
    if (result) {
      setActiveArea(result);
      onAreaFound(result);
      setAreaQuery(result.formatted_address);
    }
  };

  const handleTriggerSearch = () => {
    if (!activeArea) {
      onMessage("Search for a territory first.");
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
    });
  };

  const loadHistory = async () => {
    if (!showHistory) {
      const items = await getSearchHistory();
      setHistoryItems(items);
    }
    setShowHistory(!showHistory);
  };

  return (
    <div className="flex w-[360px] shrink-0 flex-col gap-4 overflow-auto border-r border-border bg-background p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Target Territory</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <form onSubmit={handleGeocode} className="flex gap-2">
            <div className="relative flex-1">
              <Map className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                hasIcon
                value={areaQuery}
                onChange={(event) => setAreaQuery(event.target.value)}
                placeholder="e.g. Menteng, Jakarta"
              />
            </div>
            <Button type="submit" variant="outline">
              Locate
            </Button>
          </form>

          {activeArea ? (
            <Badge variant="success">
              <MapPin className="h-3.5 w-3.5" />
              {activeArea.formatted_address}
            </Badge>
          ) : null}
        </CardContent>
      </Card>

      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="text-base">Discovery Target</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Business keyword"
          />

          <Select value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Any category">
            <option value="restaurant">Restaurant / F&B</option>
            <option value="cafe">Cafe / Coffee Shop</option>
            <option value="hotel">Hotel / Accommodation</option>
            <option value="store">Retail Store</option>
            <option value="office">Corporate Office</option>
            <option value="factory">Manufacturing / Factory</option>
          </Select>

          <Tabs
            value={searchMode}
            onValueChange={setSearchMode}
            items={searchModeTabs.map((item) => ({ key: item.key, label: item.label }))}
          />

          <div className="space-y-3 rounded-2xl border border-border bg-[color:var(--surface-subtle)] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Radius</span>
              <Badge variant="brand">{(radius / 1000).toFixed(1)} km</Badge>
            </div>
            <input
              type="range"
              min={500}
              max={20000}
              step={500}
              value={radius}
              onChange={(event) => setRadius(Number(event.target.value))}
              className="w-full accent-[color:var(--brand)]"
            />
          </div>

          <AiModeSelector value={aiMode} onChange={setAiMode} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5 pt-5">
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
          </div>

          {showFilters ? (
            <div className="space-y-2 rounded-2xl border border-border bg-[color:var(--surface-subtle)] p-4">
              <label className="flex items-center gap-3 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={filters.hasPhone}
                  onChange={(event) =>
                    onFilterChange({ ...filters, hasPhone: event.target.checked })
                  }
                />
                Has phone number
              </label>
              <label className="flex items-center gap-3 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={filters.newOnly}
                  onChange={(event) =>
                    onFilterChange({ ...filters, newOnly: event.target.checked })
                  }
                />
                Not in pipeline
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
                      setRadius(item.radius_meters);
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
            {isSearching ? "Discovering..." : "Run Discovery Scan"}
          </Button>

          {resultCount > 0 && !isSearching ? (
            <p className="text-center text-sm text-muted-foreground">
              Found <span className="font-medium text-foreground">{resultCount}</span> businesses
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
