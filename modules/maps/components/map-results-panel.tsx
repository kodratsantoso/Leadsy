"use client";

import { Building2, Phone, Tag, CheckCircle2, ChevronRight, MapPin, Globe, PlusCircle, Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DiscoveredLead } from "@/lib/hooks/use-map-discovery";
import type { AiMode } from "@/modules/ai/components/ai-mode-selector";

type ResultPanelProps = {
  results: DiscoveredLead[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onAdd: (lead: DiscoveredLead, aiMode: AiMode) => void;
  aiMode: AiMode;
  isDetailFetching?: boolean;
};

export function MapResultsPanel({
  results,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  onAdd,
  aiMode,
  isDetailFetching,
}: ResultPanelProps) {
  const selectedLead = results.find((r) => r.external_place_id === selectedId);

  return (
    <div className="flex w-full sm:w-[400px] shrink-0 flex-col border-l border-border bg-card h-full relative z-20 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] transition-transform duration-300">
      <div className="h-12 border-b border-border flex items-center px-4 bg-muted/20 shrink-0">
        <h3 className="font-semibold text-sm">Discovery Results</h3>
        {selectedId && (
          <button 
            onClick={() => onSelect(null)}
            className="ml-auto text-[10px] uppercase font-bold tracking-wider text-muted-foreground hover:text-foreground"
          >
            ← Back to list
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isDetailFetching && selectedId && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" />
              <p className="text-xs font-semibold text-[var(--brand)] uppercase tracking-widest">Enriching Details...</p>
            </div>
          </div>
        )}
        {results.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center">
            <Building2 className="mb-3 h-8 w-8 opacity-20" />
            <p>No businesses found yet.</p>
            <p className="text-xs mt-1">Run a scan to discover leads in your target area.</p>
          </div>
        )}

        {/* LIST VIEW */}
        {!selectedLead && results.map((result, index) => {
          const resultKey =
            result.external_place_id ??
            `${result.company_name}-${result.lat ?? "no-lat"}-${result.lng ?? "no-lng"}-${index}`;
          const canSelect = Boolean(result.external_place_id);
          const isDup = result.dedup?.is_duplicate;
          return (
            <div
              key={resultKey}
              className={cn(
                "border-b border-border/50 p-3 transition-colors cursor-pointer group",
                canSelect && hoveredId === result.external_place_id && "bg-accent/30",
                isDup && "opacity-75 bg-muted/10 grayscale-[50%]",
                !canSelect && "cursor-default"
              )}
              onMouseEnter={() => {
                if (result.external_place_id) onHover(result.external_place_id);
              }}
              onMouseLeave={() => onHover(null)}
              onClick={() => {
                if (result.external_place_id) onSelect(result.external_place_id);
              }}
            >
              <div className="flex gap-3">
                {/* Result Type Icon */}
                <div className={cn(
                  "flex h-8 w-8 mt-0.5 shrink-0 items-center justify-center rounded-lg border",
                  isDup ? "bg-muted border-border" : "bg-[color-mix(in_oklch,var(--brand)_10%,transparent)] border-[color-mix(in_oklch,var(--brand)_20%,transparent)] text-[var(--brand)]"
                )}>
                  {isDup ? <CheckCircle2 className="h-4 w-4 text-muted-foreground" /> : <Building2 className="h-4 w-4" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="truncate text-sm font-semibold">{result.company_name}</h4>
                    {result.rating && (
                      <div className="flex items-center gap-0.5 text-xs font-bold text-[var(--status-warning)] shrink-0">
                        {result.rating} <Star className="h-3 w-3 fill-[var(--status-warning)]" />
                      </div>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{result.address}</p>
                  
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {result.business_category && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground truncate max-w-[120px]">
                        {result.business_category.split(',')[0]}
                      </span>
                    )}
                    {isDup && (
                      <span className="rounded bg-[color-mix(in_oklch,var(--status-success)_10%,transparent)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--status-success)] border border-[color-mix(in_oklch,var(--status-success)_20%,transparent)]">
                        In Pipeline
                      </span>
                    )}
                    {!canSelect && (
                      <span className="rounded bg-[color-mix(in_oklch,var(--status-warning)_10%,transparent)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--status-warning)] border border-amber-500/20">
                        Missing Place ID
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          );
        })}

        {/* DETAIL VIEW */}
        {selectedLead && (
          <div className="p-4 space-y-6 animate-in slide-in-from-right-4 fade-in duration-200">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                {selectedLead.dedup?.is_duplicate ? (
                  <span className="rounded bg-[color-mix(in_oklch,var(--status-success)_10%,transparent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--status-success)] border border-[color-mix(in_oklch,var(--status-success)_20%,transparent)] flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Already in Pipeline
                  </span>
                ) : (
                  <span className="rounded bg-[color-mix(in_oklch,var(--brand)_10%,transparent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand)] border border-[color-mix(in_oklch,var(--brand)_20%,transparent)] flex items-center gap-1">
                    <Tag className="h-3 w-3" /> New Discovery
                  </span>
                )}
                {selectedLead.rating && (
                   <span className="rounded bg-[color-mix(in_oklch,var(--status-warning)_10%,transparent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--status-warning)] flex items-center gap-1">
                    <Star className="h-3 w-3 fill-[var(--status-warning)]" /> {selectedLead.rating}
                  </span>
                )}
              </div>
              
              <h2 className="text-xl font-bold leading-tight">{selectedLead.company_name}</h2>
              {selectedLead.business_category && (
                <p className="text-sm text-[var(--brand)] font-medium mt-1 uppercase tracking-wide text-[10px] bg-[color-mix(in_oklch,var(--brand)_10%,transparent)] border border-[color-mix(in_oklch,var(--brand)_20%,transparent)] inline-block px-2 py-0.5 rounded">
                  {selectedLead.business_category}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            {!selectedLead.dedup?.is_duplicate && (
              <button 
                onClick={() => onAdd(selectedLead, aiMode)}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[var(--status-success)] text-white p-3 text-sm font-semibold shadow-lg shadow-[color-mix(in_oklch,var(--status-success)_20%,transparent)] hover:bg-[var(--status-success)] transition-colors"
              >
                <PlusCircle className="h-4 w-4" /> Add to Leads Pipeline
              </button>
            )}

            {/* Details Grid */}
            <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-4 shadow-sm">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Google Map Details</h4>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase">Address</p>
                    <p className="text-sm">{selectedLead.address}</p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase">Phone Number</p>
                    <p className="text-sm font-mono">{selectedLead.phone || "Not available"}</p>
                  </div>
                </div>

                {/* Website */}
                <div className="flex items-start gap-3">
                  <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase">Website</p>
                    {selectedLead.website ? (
                      <a href={selectedLead.website} target="_blank" rel="noreferrer" className="text-sm text-[var(--brand)] hover:text-[var(--brand-hover)] underline underline-offset-2 break-all">
                        {selectedLead.website}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Not available</p>
                    )}
                  </div>
                </div>

                {/* Operating Hours */}
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase">Operating Hours</p>
                    {selectedLead.operating_hours ? (
                      <p className="text-sm">{selectedLead.operating_hours}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Not available</p>
                    )}
                  </div>
                </div>
                
                {/* Google Maps URL */}
                {selectedLead.google_maps_url && (
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase">Google Maps Link</p>
                      <a href={selectedLead.google_maps_url} target="_blank" rel="noreferrer" className="text-sm text-[var(--brand)] hover:text-[var(--brand-hover)] underline underline-offset-2">
                        View directly on Google Maps ↗
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {selectedLead.google_maps_url && (
              <p className="text-[10px] text-muted-foreground text-center">
                Data provided by Google Places API.<br/>Place ID: {selectedLead.external_place_id}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
