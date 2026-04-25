"use client";

import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Globe,
  Loader2,
  MapPin,
  Phone,
  PlusCircle,
  Star,
  Tag,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DiscoveredLead } from "@/lib/hooks/use-map-discovery";
import type { AiMode } from "@/components/ai/ai-mode-selector";

type ResultPanelProps = {
  results: DiscoveredLead[];
  totalCount: number;
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
  totalCount,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  onAdd,
  aiMode,
  isDetailFetching,
}: ResultPanelProps) {
  const selectedLead = results.find((result) => result.external_place_id === selectedId);

  return (
    <div className="relative flex w-full shrink-0 flex-col border-l border-border bg-background p-4 sm:w-[420px]">
      <Card className="flex h-full flex-col">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Discovery Results</CardTitle>
              {totalCount > 0 && !selectedId ? (
                <Badge variant="brand">{results.length}{results.length !== totalCount ? `/${totalCount}` : ""}</Badge>
              ) : null}
            </div>
            {selectedId ? (
              <Button variant="ghost" size="sm" onClick={() => onSelect(null)}>
                Back to list
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="relative flex-1 overflow-y-auto pt-0">
          {isDetailFetching && selectedId ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-background/85 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-[color:var(--brand)]" />
                <p className="text-sm font-medium text-muted-foreground">Loading business details...</p>
              </div>
            </div>
          ) : null}

          {results.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center text-muted-foreground">
              <Building2 className="h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">No businesses found yet.</p>
              <p className="max-w-xs text-sm">Run a discovery scan to populate this list.</p>
            </div>
          ) : null}

          {!selectedLead
            ? results.map((result) => {
                const isDuplicate = result.dedup?.is_duplicate;

                return (
                  <button
                    key={result.external_place_id}
                    onMouseEnter={() => onHover(result.external_place_id!)}
                    onMouseLeave={() => onHover(null)}
                    onClick={() => onSelect(result.external_place_id!)}
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-border/70 px-1 py-4 text-left transition-colors",
                      hoveredId === result.external_place_id && "bg-accent/20",
                      isDuplicate && "opacity-80"
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--surface-subtle)]">
                      {isDuplicate ? (
                        <CheckCircle2 className="h-4 w-4 text-[color:var(--success)]" />
                      ) : (
                        <Building2 className="h-4 w-4 text-[color:var(--brand)]" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <p className="truncate font-medium">{result.company_name}</p>
                        {result.rating ? (
                          <Badge variant="warning">
                            <Star className="h-3.5 w-3.5" />
                            {result.rating}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="truncate text-sm text-muted-foreground">{result.address}</p>
                      <div className="flex flex-wrap gap-2">
                        {result.business_category ? (
                          <Badge variant="neutral">{result.business_category.split(",")[0]}</Badge>
                        ) : null}
                        {isDuplicate ? <Badge variant="success">In Pipeline</Badge> : null}
                      </div>
                    </div>

                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                );
              })
            : (
              <div className="space-y-4 py-1">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedLead.dedup?.is_duplicate ? (
                      <Badge variant="success">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Already in Pipeline
                      </Badge>
                    ) : (
                      <Badge variant="brand">
                        <Tag className="h-3.5 w-3.5" />
                        New Discovery
                      </Badge>
                    )}
                    {selectedLead.rating ? (
                      <Badge variant="warning">
                        <Star className="h-3.5 w-3.5" />
                        {selectedLead.rating}
                      </Badge>
                    ) : null}
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold">{selectedLead.company_name}</h2>
                    {selectedLead.business_category ? (
                      <div className="mt-2">
                        <Badge variant="neutral">{selectedLead.business_category}</Badge>
                      </div>
                    ) : null}
                  </div>
                </div>

                {!selectedLead.dedup?.is_duplicate ? (
                  <Button className="w-full" onClick={() => onAdd(selectedLead, aiMode)}>
                    <PlusCircle className="h-4 w-4" />
                    Add to Leads Pipeline
                  </Button>
                ) : null}

                <div className="space-y-3 rounded-2xl border border-border bg-[color:var(--surface-subtle)] p-4">
                  <div className="grid gap-1">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Address</p>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span>{selectedLead.address}</span>
                    </div>
                  </div>

                  <div className="grid gap-1">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Phone</p>
                    <div className="flex items-start gap-2 text-sm">
                      <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span>{selectedLead.phone || "Not available"}</span>
                    </div>
                  </div>

                  <div className="grid gap-1">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Website</p>
                    <div className="flex items-start gap-2 text-sm">
                      <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      {selectedLead.website ? (
                        <a
                          href={selectedLead.website}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all text-[color:var(--brand)] hover:underline"
                        >
                          {selectedLead.website}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">Not available</span>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-1">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Operating Hours</p>
                    <p className="text-sm">{selectedLead.operating_hours || "Not available"}</p>
                  </div>

                  {selectedLead.google_maps_url ? (
                    <div className="grid gap-1">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Google Maps</p>
                      <a
                        href={selectedLead.google_maps_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-[color:var(--brand)] hover:underline"
                      >
                        View on Google Maps
                      </a>
                    </div>
                  ) : null}
                </div>

                {selectedLead.google_maps_url ? (
                  <p className="text-center text-xs text-muted-foreground">
                    Data provided by Google Places API. Place ID: {selectedLead.external_place_id}
                  </p>
                ) : null}
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
