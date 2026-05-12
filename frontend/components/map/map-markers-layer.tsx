import { AdvancedMarker } from "@vis.gl/react-google-maps";
import { Building2, CheckCircle2, TrendingUp } from "lucide-react";
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
        const isHovered  = hoveredId === lead.external_place_id;
        const isDup      = lead.dedup?.is_duplicate;
        const fitLevel   = lead.fit_analysis?.fit_level;

        // Z-index priority: Selected > Hovered > High fit > Duplicates > Normal
        let zIndex: number = Z_INDEX.markerDefault;
        if (isDup)         zIndex = Z_INDEX.markerDuplicate;
        if (fitLevel === "high") zIndex = Z_INDEX.markerDefault + 2;
        if (isHovered)     zIndex = Z_INDEX.markerHovered;
        if (isSelected)    zIndex = Z_INDEX.markerSelected;

        // Pin color logic: selected > dup > high-fit > medium-fit > default
        const pinBg =
          isSelected    ? "border-[color:var(--brand)] bg-[color:var(--brand)] text-[color:var(--brand-foreground)] shadow-[color:var(--brand)]/30" :
          isDup         ? "border-[color:var(--status-success)] bg-[color:var(--status-success-soft)] text-[color:var(--status-success)]" :
          fitLevel === "high"   ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" :
          fitLevel === "medium" ? "border-amber-400 bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400" :
          fitLevel === "low"    ? "border-border bg-card text-muted-foreground" :
          "border-border bg-card text-[color:var(--brand)] hover:border-[color:var(--brand)]/50";

        const arrowColor =
          isSelected    ? "border-t-[color:var(--brand)]" :
          isDup         ? "border-t-[color:var(--status-success)]" :
          fitLevel === "high"   ? "border-t-emerald-500" :
          fitLevel === "medium" ? "border-t-amber-400" :
          "border-t-border group-hover:border-t-[color:var(--brand)]/50";

        const icon =
          isDup               ? <CheckCircle2 className="h-4 w-4" /> :
          fitLevel === "high" ? <TrendingUp className="h-4 w-4" /> :
                                <Building2 className="h-4 w-4" />;

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
              <div className={cn(
                "relative flex h-8 w-8 items-center justify-center rounded-full border-2 shadow-lg",
                pinBg
              )}>
                {icon}
                <div className={cn(
                  "absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-[5px] border-transparent",
                  arrowColor
                )} />
              </div>

              {/* Fit score chip — visible on hover/select when analysis exists */}
              {lead.fit_analysis && (isSelected || isHovered) ? (
                <div className={cn(
                  "mt-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                  fitLevel === "high"   ? "bg-emerald-500 text-white" :
                  fitLevel === "medium" ? "bg-amber-400 text-white" :
                  "bg-border text-muted-foreground"
                )}>
                  {lead.fit_analysis.fit_score}
                </div>
              ) : null}

              {/* Label popover */}
              {(isSelected || isHovered) && (
                <div className="absolute top-10 pointer-events-none whitespace-nowrap rounded bg-card px-2.5 py-1 text-xs font-semibold shadow-xl border border-border flex flex-col items-center animate-in fade-in zoom-in-95 duration-100">
                  <span>{lead.company_name}</span>
                  {isDup ? (
                    <span className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-[color:var(--status-success)]">In Pipeline</span>
                  ) : fitLevel === "high" ? (
                    <span className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-500">High Fit</span>
                  ) : fitLevel === "medium" ? (
                    <span className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-500">Medium Fit</span>
                  ) : null}
                </div>
              )}
            </div>
          </AdvancedMarker>
        );
      })}
    </>
  );
}
