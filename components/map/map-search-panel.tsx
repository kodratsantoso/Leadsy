"use client";

import { useState } from "react";
import { MapPin, Map, Navigation, Loader2, SlidersHorizontal, History } from "lucide-react";
import { AiModeSelector, type AiMode } from "@/components/ai/ai-mode-selector";
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
  // Expose filter state back to parent
  filters: { hasPhone: boolean; newOnly: boolean };
  onFilterChange: (filters: { hasPhone: boolean; newOnly: boolean }) => void;
};

export function MapSearchPanel({ 
  onSearch, 
  isSearching, 
  resultCount,
  onAreaFound,
  filters,
  onFilterChange
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
  const [historyItems, setHistoryItems] = useState<{
    area_name: string;
    area_place_id: string | null;
    area_lat: number | null;
    area_lng: number | null;
    keyword: string | null;
    category: string | null;
    search_mode: string;
    radius_meters: number;
    result_count: number;
  }[]>([]);

  // Geocode area on enter or button click
  const handleGeocode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!areaQuery.trim()) return;
    
    const res = await geocodeArea(areaQuery);
    if (res) {
      setActiveArea(res);
      onAreaFound(res);
      setAreaQuery(res.formatted_address);
    }
  };

  const handleTriggerSearch = () => {
    if (!activeArea) {
      alert("Please search for an area first.");
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
    <div className="flex w-[340px] shrink-0 flex-col border-r border-border bg-card h-full">
      {/* 1. AREA SEARCH */}
      <div className="border-b border-border p-4 bg-muted/10">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
          1. Target Territory
        </label>
        <form onSubmit={handleGeocode} className="flex gap-2">
          <div className="relative flex-1">
            <Map className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input 
              value={areaQuery} 
              onChange={(e) => setAreaQuery(e.target.value)} 
              placeholder="e.g. Menteng, Jakarta" 
              className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm" 
            />
          </div>
          <button 
            type="submit"
            className="flex h-8 items-center justify-center rounded-md bg-secondary px-3 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 border border-border disabled:opacity-50"
          >
            Locate
          </button>
        </form>
        
        {activeArea && (
          <div className="mt-2 text-[10px] text-emerald-600 flex items-center gap-1 font-medium bg-emerald-500/10 px-2 py-1 rounded">
            <MapPin className="h-3 w-3" /> Area locked: {activeArea.formatted_address.substring(0, 30)}...
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-5">
          {/* 2. BUSINESS CRITERIA */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              2. Discovery Target
            </label>
            
            <div className="space-y-2.5">
              <div>
                <input 
                  value={keyword} 
                  onChange={(e) => setKeyword(e.target.value)} 
                  placeholder="Business Keyword (e.g. coffee, software)" 
                  className="h-8 w-full rounded-md border border-input bg-background px-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all" 
                />
              </div>
              
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-8 w-full appearance-none rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
                >
                  <option value="">Any Category</option>
                  <option value="restaurant">Restaurant / F&B</option>
                  <option value="cafe">Cafe / Coffee Shop</option>
                  <option value="hotel">Hotel / Accommodation</option>
                  <option value="store">Retail Store</option>
                  <option value="office">Corporate Office</option>
                  <option value="factory">Manufacturing / Factory</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                  <svg className="h-3 w-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
            
            {/* SEARCH TABS */}
            <div className="flex rounded-md border border-border p-0.5 bg-muted/30">
              <button 
                onClick={() => setSearchMode("nearby")}
                className={cn("flex-1 rounded py-1 text-[10px] font-medium transition-colors", searchMode === "nearby" ? "bg-background shadow-sm border border-border/50 text-foreground" : "text-muted-foreground")}
              >
                Nearby Search
              </button>
              <button 
                onClick={() => setSearchMode("text")}
                className={cn("flex-1 rounded py-1 text-[10px] font-medium transition-colors", searchMode === "text" ? "bg-background shadow-sm border border-border/50 text-foreground" : "text-muted-foreground")}
              >
                Text Search
              </button>
            </div>
          </div>

          {/* 3. SETTINGS */}
          <div className="space-y-4">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              3. Scan Configuration
            </label>
            
            <div className="bg-muted/20 border border-border/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-foreground">Radius</label>
                <span className="text-xs font-bold text-indigo-400">{(radius / 1000).toFixed(1)} km</span>
              </div>
              <input 
                type="range" min={500} max={20000} step={500} value={radius} 
                onChange={(e) => setRadius(Number(e.target.value))} 
                className="w-full h-1.5 cursor-pointer appearance-none rounded-full bg-muted accent-indigo-500" 
              />
            </div>

            <AiModeSelector value={aiMode} onChange={setAiMode} />
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="border-t border-border p-3 space-y-3 bg-card shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between gap-2">
          <button 
            onClick={() => setShowFilters(!showFilters)} 
            className={cn("flex-1 flex items-center justify-center gap-1.5 rounded-md border py-1.5 text-xs font-medium transition-colors", showFilters ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400" : "border-border text-muted-foreground hover:bg-muted")}
          >
            <SlidersHorizontal className="h-3 w-3" /> Filters
          </button>
          <button 
            onClick={loadHistory} 
            className={cn("flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground transition-colors", showHistory ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400" : "border-border hover:bg-muted")}
            title="Search History"
          >
            <History className="h-3.5 w-3.5" />
          </button>
        </div>
        
        {showFilters && (
          <div className="rounded-lg border border-border bg-muted/20 p-2.5 space-y-2 animate-in fade-in slide-in-from-top-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={filters.hasPhone}
                onChange={(e) => onFilterChange({ ...filters, hasPhone: e.target.checked })}
                className="rounded border-border accent-indigo-500 h-3.5 w-3.5" 
              />
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Has Phone Number</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={filters.newOnly}
                onChange={(e) => onFilterChange({ ...filters, newOnly: e.target.checked })}
                className="rounded border-border accent-indigo-500 h-3.5 w-3.5" 
              />
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Not in Pipeline</span>
            </label>
          </div>
        )}

        {showHistory && (
          <div className="rounded-lg border border-border bg-muted/20 p-2 max-h-40 overflow-y-auto animate-in fade-in slide-in-from-top-2 text-xs">
            <h4 className="font-semibold mb-2 text-[10px] uppercase text-muted-foreground pl-1">Recent Searches</h4>
            {historyItems.length === 0 ? (
              <p className="text-muted-foreground pl-1 text-[10px]">No history found.</p>
            ) : (
              historyItems.map((h, i) => (
                <button
                  key={i}
                  className="w-full text-left p-1.5 hover:bg-accent rounded flex justify-between items-center group"
                  onClick={() => {
                    setAreaQuery(h.area_name);
                    setKeyword(h.keyword || "");
                    setCategory(h.category || "");
                    setRadius(h.radius_meters);
                    setSearchMode(h.search_mode as "nearby" | "text");
                    if (h.area_lat != null && h.area_lng != null) {
                      setActiveArea({
                        place_id: h.area_place_id || '',
                        formatted_address: h.area_name,
                        lat: h.area_lat,
                        lng: h.area_lng
                      });
                      onAreaFound({
                        place_id: h.area_place_id || '',
                        formatted_address: h.area_name,
                        lat: h.area_lat,
                        lng: h.area_lng
                      });
                    }
                    setShowHistory(false);
                  }}
                >
                  <span className="truncate max-w-[200px]">{h.keyword || h.category} in {h.area_name}</span>
                  <span className="text-[9px] text-muted-foreground bg-background px-1 rounded border border-border/50 group-hover:border-border">{h.result_count}</span>
                </button>
              ))
            )}
          </div>
        )}

        <button
          onClick={handleTriggerSearch}
          disabled={isSearching || !activeArea}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:shadow-none disabled:transform-none"
        >
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4 fill-white/20" />}
          {isSearching ? "Discovering..." : "Run Discovery Scan"}
        </button>
        
        {resultCount > 0 && !isSearching && (
          <div className="text-center text-[10px] text-muted-foreground font-medium">
            Found <span className="text-foreground">{resultCount}</span> businesses matching scan
          </div>
        )}
      </div>
    </div>
  );
}
