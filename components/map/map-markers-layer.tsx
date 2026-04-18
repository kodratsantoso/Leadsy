import { AdvancedMarker } from "@vis.gl/react-google-maps";
import { Building2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DiscoveredLead } from "@/lib/hooks/use-map-discovery";

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
        let zIndex = 10;
        if (isDup) zIndex = 5;
        if (isHovered) zIndex = 20;
        if (isSelected) zIndex = 30;

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
                isSelected ? "border-indigo-500 bg-indigo-500 text-white shadow-indigo-500/50" :
                isDup ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" :
                "border-indigo-200 bg-white text-indigo-600 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-400 hover:border-indigo-400"
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
                     <span className="text-[9px] text-emerald-500 uppercase tracking-widest font-bold mt-0.5">In Pipeline</span>
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
