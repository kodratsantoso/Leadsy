"use client";

import {
  AlertTriangle,
  ArrowUpDown,
  Brain,
  Building2,
  CheckCircle2,
  ChevronRight,
  Globe,
  Loader2,
  MapPin,
  Phone,
  PlusCircle,
  ShieldAlert,
  Sparkles,
  Star,
  Tag,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ProgressiveFluxLoader } from "@/components/ui/progressive-flux-loader";
import type { DiscoveredLead, FitLevel, GeoProductFitAnalysis } from "@/lib/hooks/use-map-discovery";
import type { AiMode } from "@/components/ai/ai-mode-selector";
import { useState } from "react";

type SortKey = "default" | "fit_score_desc" | "fit_score_asc" | "rating_desc";
type FitFilter = "all" | "high" | "medium" | "low";

type ResultPanelProps = {
  results: DiscoveredLead[];
  totalCount: number;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onAdd: (lead: DiscoveredLead, aiMode: AiMode) => void;
  onAnalyze?: () => void;
  aiMode: AiMode;
  isDetailFetching?: boolean;
  isAnalyzing?: boolean;
  selectedProductId?: number | null;
};

const FIT_LEVEL_CONFIG: Record<FitLevel, { label: string; variant: "success" | "warning" | "neutral" | "outline"; color: string }> = {
  high:    { label: "High Fit",    variant: "success", color: "text-[color:var(--status-success)]" },
  medium:  { label: "Medium Fit",  variant: "warning", color: "text-[color:var(--status-warning)]" },
  low:     { label: "Low Fit",     variant: "neutral", color: "text-muted-foreground" },
  unknown: { label: "No Analysis", variant: "outline", color: "text-muted-foreground" },
};

function FitScoreBadge({ analysis }: { analysis?: GeoProductFitAnalysis }) {
  if (!analysis) return null;
  const cfg = FIT_LEVEL_CONFIG[analysis.fit_level] ?? FIT_LEVEL_CONFIG.unknown;
  return (
    <Badge variant={cfg.variant} className="shrink-0 tabular-nums">
      <TrendingUp className="h-3 w-3" />
      {analysis.fit_score}
    </Badge>
  );
}

function FitLevelBadge({ level }: { level: FitLevel }) {
  const cfg = FIT_LEVEL_CONFIG[level] ?? FIT_LEVEL_CONFIG.unknown;
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function FitScoreGauge({ score }: { score: number }) {
  const gradient =
    score >= 80 ? "var(--status-success)" :
    score >= 60 ? "var(--status-warning)" :
    score >= 40 ? "var(--brand)" :
    "currentColor";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <ProgressiveFluxLoader
          value={score}
          showLabel={false}
          barClassName="h-2"
          gradient={gradient}
        />
      </div>
      <span className="w-7 text-right text-xs font-semibold tabular-nums">{score}</span>
    </div>
  );
}

export function MapResultsPanel({
  results,
  totalCount,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  onAdd,
  onAnalyze,
  aiMode,
  isDetailFetching,
  isAnalyzing,
  selectedProductId,
}: ResultPanelProps) {
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [fitFilter, setFitFilter] = useState<FitFilter>("all");

  const selectedLead = results.find((r) => r.external_place_id === selectedId);

  const hasAnyAnalysis = results.some((r) => r.fit_analysis != null);

  // Filter
  let displayed = results.filter((r) => {
    if (fitFilter === "all") return true;
    return r.fit_analysis?.fit_level === fitFilter;
  });

  // Sort
  if (sortKey === "fit_score_desc") {
    displayed = [...displayed].sort((a, b) => (b.fit_analysis?.fit_score ?? -1) - (a.fit_analysis?.fit_score ?? -1));
  } else if (sortKey === "fit_score_asc") {
    displayed = [...displayed].sort((a, b) => (a.fit_analysis?.fit_score ?? 101) - (b.fit_analysis?.fit_score ?? 101));
  } else if (sortKey === "rating_desc") {
    displayed = [...displayed].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }

  return (
    <div className="relative flex w-full shrink-0 flex-col border-l border-border bg-background p-4 sm:w-[420px]">
      <Card className="flex h-full flex-col">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Discovery Results</CardTitle>
              {totalCount > 0 && !selectedId ? (
                <Badge variant="brand">
                  {displayed.length}{displayed.length !== totalCount ? `/${totalCount}` : ""}
                </Badge>
              ) : null}
            </div>
            {selectedId ? (
              <Button variant="ghost" size="sm" onClick={() => onSelect(null)}>
                Back to list
              </Button>
            ) : null}
          </div>

          {/* Analyze + sort/filter bar — only shown on list view */}
          {!selectedId && totalCount > 0 ? (
            <div className="space-y-2 pt-1">
              {/* Analyze button */}
              {selectedProductId ? (
                <Button
                  variant={hasAnyAnalysis ? "outline" : "default"}
                  size="sm"
                  className="w-full"
                  onClick={onAnalyze}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {isAnalyzing ? "Analyzing product fit…" : hasAnyAnalysis ? "Re-analyze Product Fit" : "Analyze Product Fit"}
                </Button>
              ) : null}

              {/* Sort + fit filter — only when analysis exists */}
              {hasAnyAnalysis ? (
                <div className="flex gap-2">
                  <Select
                    value={fitFilter}
                    onChange={(e) => setFitFilter(e.target.value as FitFilter)}
                    className="flex-1 text-xs"
                  >
                    <option value="all">All fit levels</option>
                    <option value="high">High fit only</option>
                    <option value="medium">Medium fit only</option>
                    <option value="low">Low fit only</option>
                  </Select>
                  <Select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className="flex-1 text-xs"
                  >
                    <option value="default">Default order</option>
                    <option value="fit_score_desc">Fit score ↓</option>
                    <option value="fit_score_asc">Fit score ↑</option>
                    <option value="rating_desc">Rating ↓</option>
                  </Select>
                </div>
              ) : null}
            </div>
          ) : null}
        </CardHeader>

        <CardContent className="relative flex-1 overflow-y-auto pt-0">
          {isDetailFetching && selectedId ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-background/85 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-[color:var(--brand)]" />
                <p className="text-sm font-medium text-muted-foreground">Loading business details…</p>
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

          {/* List view */}
          {!selectedLead
            ? displayed.map((result) => {
                const isDuplicate = result.dedup?.is_duplicate;
                const fit = result.fit_analysis;

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
                    {/* Icon */}
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      fit?.fit_level === "high"   ? "bg-[color:var(--status-success-soft)]" :
                      fit?.fit_level === "medium" ? "bg-[color:var(--status-warning-soft)]" :
                      "bg-[color:var(--surface-subtle)]"
                    )}>
                      {isDuplicate ? (
                        <CheckCircle2 className="h-4 w-4 text-[color:var(--status-success)]" />
                      ) : fit?.fit_level === "high" ? (
                        <TrendingUp className="h-4 w-4 text-[color:var(--status-success)]" />
                      ) : (
                        <Building2 className="h-4 w-4 text-[color:var(--brand)]" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-medium leading-tight">{result.company_name}</p>
                        <div className="flex shrink-0 items-center gap-1">
                          {result.rating ? (
                            <Badge variant="warning">
                              <Star className="h-3 w-3" />
                              {result.rating}
                            </Badge>
                          ) : null}
                          {fit ? <FitScoreBadge analysis={fit} /> : null}
                        </div>
                      </div>

                      <p className="truncate text-sm text-muted-foreground">{result.address}</p>

                      <div className="flex flex-wrap gap-1.5">
                        {result.business_category ? (
                          <Badge variant="neutral">{result.business_category.split(",")[0]}</Badge>
                        ) : null}
                        {isDuplicate ? <Badge variant="success">In Pipeline</Badge> : null}
                        {fit ? <FitLevelBadge level={fit.fit_level} /> : null}
                      </div>

                      {/* Mini fit score bar */}
                      {fit ? (
                        <FitScoreGauge score={fit.fit_score} />
                      ) : null}
                    </div>

                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                );
              })
            : (
              /* Detail view */
              <DetailView
                lead={selectedLead}
                aiMode={aiMode}
                onAdd={onAdd}
                selectedProductId={selectedProductId}
              />
            )}
        </CardContent>
      </Card>
    </div>
  );
}

function DetailView({
  lead,
  aiMode,
  onAdd,
  selectedProductId,
}: {
  lead: DiscoveredLead;
  aiMode: AiMode;
  onAdd: (lead: DiscoveredLead, aiMode: AiMode) => void;
  selectedProductId?: number | null;
}) {
  const [showFullReasoning, setShowFullReasoning] = useState(false);
  const fit = lead.fit_analysis;
  const isDuplicate = lead.dedup?.is_duplicate;

  return (
    <div className="space-y-4 py-1">
      {/* Status badges */}
      <div className="flex flex-wrap items-center gap-2">
        {isDuplicate ? (
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
        {lead.rating ? (
          <Badge variant="warning">
            <Star className="h-3.5 w-3.5" />
            {lead.rating}
          </Badge>
        ) : null}
        {fit ? <FitLevelBadge level={fit.fit_level} /> : null}
      </div>

      {/* Name */}
      <div>
        <h2 className="text-xl font-semibold">{lead.company_name}</h2>
        {lead.business_category ? (
          <div className="mt-2">
            <Badge variant="neutral">{lead.business_category}</Badge>
          </div>
        ) : null}
      </div>

      {/* Add to Leads */}
      {!isDuplicate ? (
        <Button className="w-full" onClick={() => onAdd(lead, aiMode)}>
          <PlusCircle className="h-4 w-4" />
          Add to Leads Pipeline
          {fit && fit.fit_level === "high" ? " ★" : ""}
        </Button>
      ) : null}

      {/* Product Fit Analysis card */}
      {fit ? (
        <div className="rounded-2xl border border-border bg-[color:var(--surface-subtle)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-[color:var(--brand)]" />
              <span className="text-sm font-semibold">Product Fit Analysis</span>
            </div>
            {fit.analyzed_with_ai ? (
              <Badge variant="brand">
                <Sparkles className="h-3 w-3" />
                AI
              </Badge>
            ) : (
              <Badge variant="neutral">Rule-based</Badge>
            )}
          </div>

          {/* Score gauge */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Fit Score</span>
              <span>Confidence: {fit.confidence_score}%</span>
            </div>
            <FitScoreGauge score={fit.fit_score} />
          </div>

          {/* Reasoning */}
          {fit.reasoning?.length ? (
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Reasoning</p>
              <ul className="space-y-1">
                {(showFullReasoning ? fit.reasoning : fit.reasoning.slice(0, 3)).map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--brand)]" />
                    {r}
                  </li>
                ))}
              </ul>
              {fit.reasoning.length > 3 ? (
                <button
                  className="text-xs text-[color:var(--brand)] hover:underline"
                  onClick={() => setShowFullReasoning((v) => !v)}
                >
                  {showFullReasoning ? "Show less" : `+${fit.reasoning.length - 3} more`}
                </button>
              ) : null}
            </div>
          ) : null}

          {/* Matched signals */}
          {fit.matched_signals?.length ? (
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Matched Signals</p>
              <div className="flex flex-wrap gap-1.5">
                {fit.matched_signals.map((s, i) => (
                  <Badge key={i} variant="success">{s}</Badge>
                ))}
              </div>
            </div>
          ) : null}

          {/* Recommended approach */}
          {fit.recommended_approach ? (
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Recommended Approach</p>
              <p className="text-sm">{fit.recommended_approach}</p>
            </div>
          ) : null}

          {/* Potential use case */}
          {fit.potential_use_case ? (
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Potential Use Case</p>
              <p className="text-sm">{fit.potential_use_case}</p>
            </div>
          ) : null}

          {/* Risk flags */}
          {fit.risk_flags?.length ? (
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" /> Risk Flags
              </p>
              <ul className="space-y-1">
                {fit.risk_flags.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[color:var(--status-warning)]">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Missing info */}
          {fit.missing_information?.length ? (
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Missing Information</p>
              <p className="text-xs text-muted-foreground">{fit.missing_information.join(", ")}</p>
            </div>
          ) : null}

          {/* AI provenance */}
          {fit.ai_model_used ? (
            <p className="text-xs text-muted-foreground">
              Analyzed by {fit.ai_provider_used} / {fit.ai_model_used}
            </p>
          ) : null}
        </div>
      ) : selectedProductId ? (
        <div className="flex items-center gap-2 rounded-2xl border border-dashed border-border bg-[color:var(--surface-subtle)] p-4 text-sm text-muted-foreground">
          <ArrowUpDown className="h-4 w-4 shrink-0" />
          No product-fit analysis yet. Run analysis from the results list.
        </div>
      ) : null}

      {/* Business details */}
      <div className="space-y-3 rounded-2xl border border-border bg-[color:var(--surface-subtle)] p-4">
        <div className="grid gap-1">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Address</p>
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{lead.address}</span>
          </div>
        </div>

        <div className="grid gap-1">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Phone</p>
          <div className="flex items-start gap-2 text-sm">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{lead.phone || "Not available"}</span>
          </div>
        </div>

        <div className="grid gap-1">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Website</p>
          <div className="flex items-start gap-2 text-sm">
            <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            {lead.website ? (
              <a
                href={lead.website}
                target="_blank"
                rel="noreferrer"
                className="break-all text-[color:var(--brand)] hover:underline"
              >
                {lead.website}
              </a>
            ) : (
              <span className="text-muted-foreground">Not available</span>
            )}
          </div>
        </div>

        <div className="grid gap-1">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Operating Hours</p>
          <p className="text-sm">{lead.operating_hours || "Not available"}</p>
        </div>

        {lead.google_maps_url ? (
          <div className="grid gap-1">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Google Maps</p>
            <a
              href={lead.google_maps_url}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-[color:var(--brand)] hover:underline"
            >
              View on Google Maps
            </a>
          </div>
        ) : null}
      </div>

      {lead.google_maps_url ? (
        <p className="text-center text-xs text-muted-foreground">
          Data provided by Google Places API. Place ID: {lead.external_place_id}
        </p>
      ) : null}
    </div>
  );
}
