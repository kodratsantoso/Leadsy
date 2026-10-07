"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/apiFetch";
import { useDebounce } from "@/hooks/useDebounce";
import { cn, apiList } from "@/lib/utils";

export type PickedLead = {
  id: number;
  company_name: string;
  qualification_status?: string | null;
  ai_processing_status?: string | null;
};

export function LeadPicker({
  selected,
  onSelect,
}: {
  selected: PickedLead | null;
  onSelect: (lead: PickedLead | null) => void;
}) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  const { data, isFetching } = useQuery({
    queryKey: ["ai-testing-lead-search", debouncedQuery],
    queryFn: () =>
      apiFetch(`/leads?search=${encodeURIComponent(debouncedQuery)}&per_page=5`).then((r) => r.json()),
    enabled: debouncedQuery.trim().length >= 2,
  });

  const results: PickedLead[] = apiList<PickedLead>(data);

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-[color:var(--surface-subtle)] p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--brand)]/10">
            <Building2 className="h-4 w-4 text-[color:var(--brand)]" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{selected.company_name}</p>
            <p className="text-xs text-muted-foreground">Lead #{selected.id}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            setQuery("");
          }}
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Clear selected lead"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search lead by company name..."
          className="pl-9"
        />
        {isFetching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {debouncedQuery.trim().length >= 2 && (
        <div
          className={cn(
            "absolute z-10 mt-1.5 w-full overflow-hidden rounded-2xl border border-border bg-card shadow-lg",
            results.length === 0 && !isFetching && "hidden"
          )}
        >
          {results.map((lead) => (
            <button
              key={lead.id}
              type="button"
              onClick={() => {
                onSelect(lead);
                setQuery("");
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-muted"
            >
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{lead.company_name}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">#{lead.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
