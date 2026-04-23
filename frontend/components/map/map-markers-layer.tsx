import { AdvancedMarker } from "@vis.gl/react-google-maps";
import { Building2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DiscoveredLead } from "@/lib/hooks/use-map-discovery";
import { Z_INDEX } from "@/lib/z-index";

type MapMarkersLayerProps = {
  results: DiscoveredLead[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
};

export function MapMarkersLayer({
  results,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
}: MapMarkersLayerProps) {
  return (
    <>
      {results.map((lead) => {
        const isSelected = selectedId === lead.external_place_id;
        const isHovered = hoveredId === lead.external_place_id;
        const isDup = lead.dedup?.is_duplicate;
        
        // Z-index priority: Selected > Hovered > Duplicates go to bottom > Normal
        let zIndex: number = Z_INDEX.markerDefault;
        if (isDup) zIndex = Z_INDEX.markerDuplicate;
        if (isHovered) zIndex = Z_INDEX.markerHovered;
        if (isSelected) zIndex = Z_INDEX.markerSelected;

        return (
          <AdvancedMarker
            key={lead.external_place_id}
            position={{ lat: lead.lat, lng: lead.lng }}
            onClick={() => onSelect(lead.external_place_id!)}
            onMouseEnter={() => onHover(lead.external_place_id!)}
            onMouseLeave={() => onHover(null)}
            style={{ zIndex }}
          >
            <div className={cn(
              "flex flex-col items-center transition-all duration-200 group origin-bottom",
              (isSelected || isHovered) ? "scale-110" : "scale-100 opacity-90 hover:opacity-100",
              isDup && !isSelected && !isHovered && "opacity-60 grayscale-[50%]"
            )}>
              {/* Custom Marker Pin */}
              <div className={cn(
                "relative flex h-8 w-8 items-center justify-center rounded-full border-2 shadow-lg",
                // Coloring logic
                isSelected ? "border-[color:var(--brand)] bg-[color:var(--brand)] text-[color:var(--brand-foreground)] shadow-[color:var(--brand)]/30" :
                isDup ? "border-[color:var(--status-success)] bg-[color:var(--status-success-soft)] text-[color:var(--status-success)]" :
                "border-border bg-card text-[color:var(--brand)] hover:border-[color:var(--brand)]/50"
              )}>
                {isDup ? <CheckCircle2 className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                
                {/* Pointer Arrow */}
                <div className={cn(
                  "absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-[5px] border-transparent",
                  isSelected ? "border-t-[color:var(--brand)]" :
                  isDup ? "border-t-[color:var(--status-success)]" :
                  "border-t-border group-hover:border-t-[color:var(--brand)]/50"
                )} />
              </div>
              
              {/* Label Popover */}
              {(isSelected || isHovered) && (
                <div className="absolute top-10 pointer-events-none whitespace-nowrap rounded bg-card px-2.5 py-1 text-xs font-semibold shadow-xl border border-border flex flex-col items-center animate-in fade-in zoom-in-95 duration-100">
                  <span>{lead.company_name}</span>
                  {isDup && (
                     <span className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-[color:var(--status-success)]">In Pipeline</span>
                  )}
                </div>
              )}
            </div>
          </AdvancedMarker>
        );
      })}
    </>
  );
}
