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
      {results.map((lead, index) => {
        const markerKey =
          lead.external_place_id ??
          `${lead.company_name}-${lead.lat ?? "no-lat"}-${lead.lng ?? "no-lng"}-${index}`;
        const canInteract = Boolean(lead.external_place_id);
        const isSelected = canInteract && selectedId === lead.external_place_id;
        const isHovered = canInteract && hoveredId === lead.external_place_id;
        const isDup = lead.dedup?.is_duplicate;
        
        // Z-index priority: Selected > Hovered > Duplicates go to bottom > Normal
        let zIndex = Z_INDEX.markerDefault;
        if (isDup) zIndex = Z_INDEX.markerDuplicate;
        if (isHovered) zIndex = Z_INDEX.markerHovered;
        if (isSelected) zIndex = Z_INDEX.markerSelected;

        return (
          <AdvancedMarker
            key={markerKey}
            position={{ lat: lead.lat, lng: lead.lng }}
            onClick={() => {
              if (lead.external_place_id) onSelect(lead.external_place_id);
            }}
            onMouseEnter={() => {
              if (lead.external_place_id) onHover(lead.external_place_id);
            }}
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
                isSelected ? "border-[var(--brand)] bg-[var(--brand)] text-white shadow-[color-mix(in_oklch,var(--brand)_50%,transparent)]" :
                isDup ? "border-[var(--status-success)] bg-[color-mix(in_oklch,var(--status-success)_10%,transparent)] text-[var(--status-success)]" :
                "border-[color-mix(in_oklch,var(--brand)_30%,transparent)] bg-card text-[var(--brand)] hover:border-[var(--brand)]"
              )}>
                {isDup ? <CheckCircle2 className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                
                {/* Pointer Arrow */}
                <div className={cn(
                  "absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-[5px] border-transparent",
                  isSelected ? "border-t-indigo-500" :
                  isDup ? "border-t-emerald-500 dark:border-t-emerald-950" :
                  "border-t-indigo-200 dark:border-t-indigo-800 group-hover:border-t-indigo-400"
                )} />
              </div>
              
              {/* Label Popover */}
              {(isSelected || isHovered) && (
                <div className="absolute top-10 pointer-events-none whitespace-nowrap rounded bg-card px-2.5 py-1 text-xs font-semibold shadow-xl border border-border flex flex-col items-center animate-in fade-in zoom-in-95 duration-100">
                  <span>{lead.company_name}</span>
                  {isDup && (
                     <span className="text-[9px] text-[var(--status-success)] uppercase tracking-widest font-bold mt-0.5">In Pipeline</span>
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
