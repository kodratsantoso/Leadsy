"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ExternalLink,
  Globe,
  Layers,
  Loader2,
  Newspaper,
  Plus,
  RefreshCw,
  RotateCcw,
  Tag,
  TrendingUp,
} from "lucide-react";

import { apiFetch } from "@/lib/apiFetch";
import { throwIfApiError } from "@/lib/apiError";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorNotice } from "@/components/ui/error-notice";
import { FilterBar, FilterBarSearch } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableShell,
} from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import type {
  NewsSignalType,
  NewsletterArticle,
  NewsletterDirectoryEntity,
  NewsletterEntityTag,
  NewsletterIndexResponse,
  NewsletterIndustryOption,
} from "@/types/newsletter";

type BadgeVariant = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "outline";

const SIGNAL_META: Record<
  NewsSignalType,
  { label: string; shortLabel: string; badgeVariant: BadgeVariant; barClass: string }
> = {
  expansion: {
    label: "Expansion & Capex",
    shortLabel: "EXPANSION",
    badgeVariant: "brand",
    barClass: "bg-[color:var(--brand)]",
  },
  investment: {
    label: "Funding & Investment",
    shortLabel: "INVESTMENT",
    badgeVariant: "success",
    barClass: "bg-[color:var(--status-success)]",
  },
  partnership: {
    label: "Strategic Partnership",
    shortLabel: "PARTNERSHIP",
    badgeVariant: "info",
    barClass: "bg-[color:var(--status-info)]",
  },
  digital_transformation: {
    label: "Digital & Tech Initiative",
    shortLabel: "DIGITAL INIT",
    badgeVariant: "brand",
    barClass: "bg-[color:var(--chart-1)]",
  },
  tender: {
    label: "Project & Contract",
    shortLabel: "PROJECT / TENDER",
    badgeVariant: "warning",
    barClass: "bg-[color:var(--status-warning)]",
  },
  leadership: {
    label: "Executive & Governance",
    shortLabel: "LEADERSHIP",
    badgeVariant: "outline",
    barClass: "bg-[color:var(--chart-4)]",
  },
  market_move: {
    label: "Market Activity",
    shortLabel: "MARKET MOVE",
    badgeVariant: "neutral",
    barClass: "bg-muted-foreground/50",
  },
};

function getSignalMeta(signal: string | null | undefined) {
  const key = (signal || "market_move") as NewsSignalType;
  return SIGNAL_META[key] || SIGNAL_META.market_move;
}

function formatEditorialDate(iso: string | null | undefined): string {
  if (!iso) return "Recent";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Recent";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatSyncTimestamp(iso: string | null | undefined): string {
  if (!iso) return "Never synced";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Never synced";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

type ConvertDraftItem = {
  entity_id: number;
  original_entity_name: string;
  entity_type: "company" | "brand";
  company_name: string;
  brand: string;
  website: string;
  sub_industry_id: string;
  business_category_id: string;
  headline: string | null;
  source_name: string | null;
  signal_type: string | null;
};

export default function IndustryNewsletterPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  // Selection & Filters
  const [selectedIndustryId, setSelectedIndustryId] = useState<string>("");
  const [selectedSubIndustryId, setSelectedSubIndustryId] = useState<string>("");
  const [selectedBusinessCategoryId, setSelectedBusinessCategoryId] = useState<string>("");
  const [regionScope, setRegionScope] = useState<"id" | "global">("id");
  const [signalFilter, setSignalFilter] = useState<string>("all");
  const [entityStatusFilter, setEntityStatusFilter] = useState<"all" | "prospects" | "in_leads">("all");
  const [searchInput, setSearchInput] = useState<string>("");
  const [activeSearch, setActiveSearch] = useState<string>("");
  const [focusKeyword, setFocusKeyword] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<"wire" | "entities">("wire");

  // Sync runtime state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStageText, setSyncStageText] = useState<string>("");
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Convert Modal & Bulk selection state
  const [selectedDirectoryIds, setSelectedDirectoryIds] = useState<number[]>([]);
  const [convertModalOpen, setConvertModalOpen] = useState<boolean>(false);
  const [convertDrafts, setConvertDrafts] = useState<ConvertDraftItem[]>([]);
  const [triggerAiEnrichment, setTriggerAiEnrichment] = useState<boolean>(true);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  // 1. Load Industries + Cache counts
  const industriesQuery = useQuery({
    queryKey: ["newsletter-industries"],
    queryFn: async () => {
      const res = await apiFetch("/lead-generator/newsletter/industries");
      await throwIfApiError(res, "Could not load industries for newsletter.");
      const json = await res.json();
      return (Array.isArray(json.data) ? json.data : []) as NewsletterIndustryOption[];
    },
  });

  const industries = useMemo(
    () => (Array.isArray(industriesQuery.data) ? industriesQuery.data : []),
    [industriesQuery.data]
  );

  // Initialize selectedIndustryId once industries arrive
  useEffect(() => {
    if (!selectedIndustryId && industries.length > 0) {
      const withCached = industries.find((ind) => ind.cached_articles_count > 0);
      setSelectedIndustryId(String((withCached || industries[0]).id));
    }
  }, [industries, selectedIndustryId]);

  const currentIndustryOption = useMemo(
    () => industries.find((ind) => String(ind.id) === selectedIndustryId) || null,
    [industries, selectedIndustryId]
  );

  const subIndustries = useMemo(
    () => (Array.isArray(currentIndustryOption?.sub_industries) ? currentIndustryOption.sub_industries : []),
    [currentIndustryOption]
  );

  const businessCategories = useMemo(
    () => (Array.isArray(currentIndustryOption?.business_categories) ? currentIndustryOption.business_categories : []),
    [currentIndustryOption]
  );

  const selectedBusinessCategoryOption = useMemo(
    () => businessCategories.find((cat) => String(cat.id) === selectedBusinessCategoryId) || null,
    [businessCategories, selectedBusinessCategoryId]
  );

  const cachedIndustries = useMemo(
    () => industries.filter((ind) => ind.cached_articles_count > 0),
    [industries]
  );

  // 2. Load DB-cached Newsletter Edition for the selected 3D Industry + Sub-Industry + Business Category slice
  const newsletterQuery = useQuery({
    queryKey: [
      "industry-newsletter",
      selectedIndustryId,
      selectedSubIndustryId,
      selectedBusinessCategoryId,
      signalFilter,
      entityStatusFilter,
      activeSearch,
      page,
    ],
    enabled: Boolean(selectedIndustryId),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("industry_id", selectedIndustryId);
      params.set("page", String(page));
      params.set("per_page", "24");
      if (selectedSubIndustryId) params.set("sub_industry_id", selectedSubIndustryId);
      if (selectedBusinessCategoryId) params.set("business_category_id", selectedBusinessCategoryId);
      if (signalFilter !== "all") params.set("signal_type", signalFilter);
      if (entityStatusFilter !== "all") params.set("entity_status", entityStatusFilter);
      if (activeSearch) params.set("search", activeSearch);

      const res = await apiFetch(`/lead-generator/newsletter?${params.toString()}`);
      await throwIfApiError(res, "Could not load industry newsletter data.");
      return (await res.json()) as NewsletterIndexResponse;
    },
  });

  const payload = newsletterQuery.data?.data;
  const telemetry = payload?.telemetry;
  const articles = useMemo(
    () => (Array.isArray(payload?.articles) ? payload.articles : []),
    [payload?.articles]
  );
  const entityDirectory = useMemo(
    () => (Array.isArray(payload?.entity_directory) ? payload.entity_directory : []),
    [payload?.entity_directory]
  );
  const meta = payload?.meta;

  const featuredArticles = useMemo(() => articles.slice(0, 2), [articles]);
  const wireArticles = useMemo(() => articles.slice(2), [articles]);

  // 3. Trigger First-Time Discovery or Manual Refresh
  const handleRunSync = async (forceInline = true) => {
    if (!selectedIndustryId || isSyncing) return;

    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    setIsSyncing(true);
    setSyncStageText("Collecting press feeds, extracting corporate entities & cross-checking CRM...");

    try {
      const res = await apiFetch("/lead-generator/newsletter/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry_id: Number(selectedIndustryId),
          sub_industry_id: selectedSubIndustryId ? Number(selectedSubIndustryId) : undefined,
          business_category_id: selectedBusinessCategoryId ? Number(selectedBusinessCategoryId) : undefined,
          region_scope: regionScope,
          focus_keyword: focusKeyword.trim() || undefined,
          sync: forceInline,
        }),
      });

      await throwIfApiError(res, "Failed to initiate industry news sync.");
      const json = await res.json();
      const syncData = json?.data;

      if (!syncData) {
        throw new Error("Empty sync response from server.");
      }

      if (syncData.status === "completed") {
        setIsSyncing(false);
        setSyncStageText("");
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["industry-newsletter"] }),
          queryClient.invalidateQueries({ queryKey: ["newsletter-industries"] }),
        ]);
        toast.success(
          syncData.new_articles_saved > 0
            ? `Edition updated: ${syncData.new_articles_saved} new article(s) & ${syncData.entities_detected} entity mention(s) saved to DB.`
            : "Edition is already up to date — no newer articles found."
        );
        return;
      }

      if (syncData.status === "failed") {
        setIsSyncing(false);
        setSyncStageText("");
        toast.error(syncData.error_message || "News sync failed.");
        return;
      }

      // If queued, poll status cleanly
      let attempts = 0;
      pollTimerRef.current = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await apiFetch(`/lead-generator/newsletter/sync/${syncData.id}/status`);
          if (!statusRes.ok) return;
          const statusJson = await statusRes.json();
          const current = statusJson?.data;
          if (current?.status === "completed") {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setIsSyncing(false);
            setSyncStageText("");
            queryClient.invalidateQueries({ queryKey: ["industry-newsletter"] });
            queryClient.invalidateQueries({ queryKey: ["newsletter-industries"] });
            toast.success(
              `Edition updated: ${current.new_articles_saved ?? 0} new article(s) archived.`
            );
          } else if (current?.status === "failed" || attempts >= 45) {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setIsSyncing(false);
            setSyncStageText("");
            toast.error(current?.error_message || "News sync timed out.");
          }
        } catch {
          // Keep polling across transient hiccups
        }
      }, 2000);
    } catch (err) {
      setIsSyncing(false);
      setSyncStageText("");
      toast.fromError(err, "Could not complete industry news sync.");
    }
  };

  // 4. Convert Entity / Batch Entities into Leads Mutation
  const convertMutation = useMutation({
    mutationFn: async (body: {
      items: Array<{
        entity_id: number;
        company_name?: string;
        brand?: string;
        website?: string;
        sub_industry_id?: number;
        business_category_id?: number;
      }>;
      trigger_ai_enrichment: boolean;
    }) => {
      const res = await apiFetch("/lead-generator/newsletter/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await throwIfApiError(res, "Could not convert entity into Lead.");
      return res.json();
    },
    onSuccess: (json) => {
      setConvertModalOpen(false);
      setConvertDrafts([]);
      setSelectedDirectoryIds([]);
      queryClient.invalidateQueries({ queryKey: ["industry-newsletter"] });
      const created = json?.data?.converted ?? 0;
      const linked = json?.data?.linked_existing ?? 0;
      toast.success(
        created > 0
          ? `${created} prospect(s) converted into Leads${linked > 0 ? ` (${linked} linked to existing)` : ""}.`
          : `Matched & linked ${linked} entity record(s) to existing CRM Leads.`
      );
    },
    onError: (err) => {
      toast.fromError(err, "Lead conversion failed.");
    },
  });

  const openSingleConvertModal = (
    entity: NewsletterEntityTag,
    article: Pick<
      NewsletterArticle,
      "title" | "source_name" | "signal_type" | "sub_industry" | "business_category"
    >
  ) => {
    const resolvedCompany =
      entity.entity_type === "brand" && entity.parent_company_hint
        ? entity.parent_company_hint
        : entity.entity_name;
    const resolvedBrand =
      entity.entity_type === "brand" ? entity.entity_name : "";

    setConvertDrafts([
      {
        entity_id: entity.id,
        original_entity_name: entity.entity_name,
        entity_type: entity.entity_type,
        company_name: resolvedCompany,
        brand: resolvedBrand,
        website: entity.website_hint || "",
        sub_industry_id: article.sub_industry?.id
          ? String(article.sub_industry.id)
          : selectedSubIndustryId,
        business_category_id: article.business_category?.id
          ? String(article.business_category.id)
          : selectedBusinessCategoryId,
        headline: article.title,
        source_name: article.source_name,
        signal_type: article.signal_type,
      },
    ]);
    setConvertModalOpen(true);
  };

  const openDirectoryConvertModal = (items: NewsletterDirectoryEntity[]) => {
    const drafts: ConvertDraftItem[] = items.map((item) => ({
      entity_id: item.representative_entity_id,
      original_entity_name: item.entity_name,
      entity_type: item.entity_type,
      company_name:
        item.entity_type === "brand" && item.parent_company_hint
          ? item.parent_company_hint
          : item.entity_name,
      brand: item.entity_type === "brand" ? item.entity_name : "",
      website: item.website_hint || "",
      sub_industry_id: item.latest_sub_industry_id
        ? String(item.latest_sub_industry_id)
        : selectedSubIndustryId,
      business_category_id: item.latest_business_category_id
        ? String(item.latest_business_category_id)
        : selectedBusinessCategoryId,
      headline: item.latest_headline,
      source_name: item.latest_source_name,
      signal_type: item.latest_signal_type,
    }));
    setConvertDrafts(drafts);
    setConvertModalOpen(true);
  };

  const handleConfirmConvert = () => {
    if (convertDrafts.length === 0 || convertMutation.isPending) return;

    const formattedItems = convertDrafts.map((d) => ({
      entity_id: d.entity_id,
      company_name: d.company_name.trim() || d.original_entity_name,
      brand: d.brand.trim() || undefined,
      website: d.website.trim() || undefined,
      sub_industry_id: d.sub_industry_id ? Number(d.sub_industry_id) : undefined,
      business_category_id: d.business_category_id ? Number(d.business_category_id) : undefined,
    }));

    convertMutation.mutate({
      items: formattedItems,
      trigger_ai_enrichment: triggerAiEnrichment,
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(searchInput.trim());
  };

  const handleResetFilters = () => {
    setSelectedSubIndustryId("");
    setSelectedBusinessCategoryId("");
    setSignalFilter("all");
    setEntityStatusFilter("all");
    setSearchInput("");
    setActiveSearch("");
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    selectedSubIndustryId ||
      selectedBusinessCategoryId ||
      signalFilter !== "all" ||
      entityStatusFilter !== "all" ||
      activeSearch
  );

  const convertibleDirectoryRows = useMemo(
    () => entityDirectory.filter((row) => !row.matched_lead_id),
    [entityDirectory]
  );

  const allConvertibleSelected =
    convertibleDirectoryRows.length > 0 &&
    convertibleDirectoryRows.every((r) => selectedDirectoryIds.includes(r.representative_entity_id));

  const toggleSelectAllDirectory = () => {
    if (allConvertibleSelected) {
      setSelectedDirectoryIds([]);
    } else {
      setSelectedDirectoryIds(convertibleDirectoryRows.map((r) => r.representative_entity_id));
    }
  };

  const toggleDirectoryRow = (entityId: number) => {
    setSelectedDirectoryIds((prev) =>
      prev.includes(entityId) ? prev.filter((id) => id !== entityId) : [...prev, entityId]
    );
  };

  const signalBreakdown = useMemo(
    () => (Array.isArray(telemetry?.signal_breakdown) ? telemetry.signal_breakdown : []),
    [telemetry?.signal_breakdown]
  );

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      {/* Editorial Top Breadcrumb & Masthead */}
      <div className="rounded-3xl border border-border bg-card shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-3 bg-[color:var(--surface-subtle)] rounded-t-3xl">
          <div className="flex items-center gap-3">
            <Link
              href="/lead-generator"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Leads Generator
            </Link>
            <span className="text-border">/</span>
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-foreground">
              Market Intelligence Wire
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <span>
              EDITION #{String(telemetry?.edition_number ?? 0).padStart(2, "0")}
            </span>
            <span>·</span>
            <span>
              LAST ARCHIVED: {formatSyncTimestamp(telemetry?.last_sync?.completed_at)}
            </span>
            {(telemetry?.total_articles ?? 0) > 0 && (
              <Badge variant="success" className="font-mono text-[10px] py-0.5">
                DB CACHED
              </Badge>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[color:var(--brand)]">
                <Newspaper className="h-4 w-4" />
                <span>INDUSTRY BRIEFING & ENTITY RADAR</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {currentIndustryOption?.name || "Select Target Industry"}{" "}
                <span className="font-normal text-muted-foreground">Intelligence Edition</span>
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Aggregated commercial press coverage for brands and corporations in this sector. Initial discovery fetches and indexes news into PostgreSQL so subsequent reads load instantaneously.
              </p>
            </div>

            {/* Primary Industry & Sync Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Select
                value={regionScope}
                onChange={(e) => setRegionScope(e.target.value as "id" | "global")}
                className="w-40"
                aria-label="News region scope"
              >
                <option value="id">Indonesia Press</option>
                <option value="global">Global English</option>
              </Select>

              <Input
                value={focusKeyword}
                onChange={(e) => setFocusKeyword(e.target.value)}
                placeholder="Optional topic focus (e.g. ERP, Pabrik)..."
                className="w-56"
              />

              <Button
                onClick={() => handleRunSync(true)}
                disabled={!selectedIndustryId || isSyncing}
                className="gap-2"
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {(telemetry?.total_articles ?? 0) === 0
                  ? isSyncing
                    ? "Indexing First Edition..."
                    : "Fetch First Edition"
                  : isSyncing
                    ? "Refreshing Wire..."
                    : "Refresh Latest News"}
              </Button>
            </div>
          </div>

          {/* Industry Selector + Sub-Industry + Business Category (#LOB) + Cached Editions Rail */}
          <div className="flex flex-col gap-3 pt-4 border-t border-border xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Target Sector:
              </span>
              <Select
                value={selectedIndustryId}
                onChange={(e) => {
                  setSelectedIndustryId(e.target.value);
                  setSelectedSubIndustryId("");
                  setSelectedBusinessCategoryId("");
                  setSelectedDirectoryIds([]);
                  setPage(1);
                }}
                className="w-full font-medium sm:w-60"
                aria-label="Select industry"
              >
                {industries.map((ind) => (
                  <option key={ind.id} value={String(ind.id)}>
                    {ind.name} {ind.cached_articles_count > 0 ? `(${ind.cached_articles_count} articles)` : "(Not indexed)"}
                  </option>
                ))}
              </Select>

              {subIndustries.length > 0 && (
                <Select
                  value={selectedSubIndustryId}
                  onChange={(e) => {
                    setSelectedSubIndustryId(e.target.value);
                    setPage(1);
                  }}
                  className="w-52"
                  aria-label="Filter sub-industry"
                >
                  <option value="">All Sub-Industries</option>
                  {subIndustries.map((sub) => (
                    <option key={sub.id} value={String(sub.id)}>
                      {sub.name}
                    </option>
                  ))}
                </Select>
              )}

              {businessCategories.length > 0 && (
                <Select
                  value={selectedBusinessCategoryId}
                  onChange={(e) => {
                    setSelectedBusinessCategoryId(e.target.value);
                    setPage(1);
                  }}
                  className="w-full sm:w-60"
                  aria-label="Filter business category or LOB"
                >
                  <option value="">All Business Categories / #LOB</option>
                  {businessCategories.map((cat) => (
                    <option key={cat.id} value={String(cat.id)}>
                      {cat.code ? `[${cat.code}] ` : ""}
                      {cat.name}
                    </option>
                  ))}
                </Select>
              )}
            </div>

            {cachedIndustries.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mr-1">
                  Cached Editions:
                </span>
                {cachedIndustries.slice(0, 6).map((ind) => {
                  const isActive = String(ind.id) === selectedIndustryId;
                  return (
                    <button
                      key={ind.id}
                      type="button"
                      onClick={() => {
                        setSelectedIndustryId(String(ind.id));
                        setSelectedSubIndustryId("");
                        setSelectedBusinessCategoryId("");
                        setSelectedDirectoryIds([]);
                        setPage(1);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                        isActive
                          ? "border-[color:var(--brand)] bg-[color:var(--brand)]/10 font-semibold text-[color:var(--brand)]"
                          : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <span>{ind.name}</span>
                      <span className="font-mono text-[10px] opacity-80">{ind.cached_articles_count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {isSyncing && syncStageText && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--brand)]/30 bg-[color:var(--brand)]/5 px-4 py-3 text-xs">
              <div className="flex items-center gap-2.5 text-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-[color:var(--brand)] shrink-0" />
                <span>{syncStageText}</span>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                Persisting to PostgreSQL
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Structured Data Headers (4 Precision Telemetry Blocks) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                01 / Indexed Coverage
              </span>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold tracking-tight text-foreground">
                {telemetry?.total_articles ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">stored articles</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Sourced across <span className="font-mono font-semibold text-foreground">{telemetry?.unique_publishers ?? 0}</span> distinct media outlets
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                02 / Tagged Entities
              </span>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold tracking-tight text-foreground">
                {telemetry?.unique_entities ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">brands & companies</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Extracted & normalized for instant duplicate checking
            </p>
          </CardContent>
        </Card>

        <Card
          className={`border-border transition-colors cursor-pointer hover:border-[color:var(--brand)]/50 ${
            entityStatusFilter === "prospects" ? "ring-2 ring-[color:var(--brand)]/25 border-[color:var(--brand)]" : ""
          }`}
          onClick={() => {
            setEntityStatusFilter((prev) => (prev === "prospects" ? "all" : "prospects"));
            setPage(1);
          }}
        >
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[color:var(--brand)]">
                03 / Net-New Prospects
              </span>
              <Badge variant="brand" className="font-mono text-[10px] py-0">
                CONVERTIBLE
              </Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold tracking-tight text-foreground">
                {telemetry?.convertible_prospects ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">not yet in CRM</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Click header to filter articles with net-new entities
            </p>
          </CardContent>
        </Card>

        <Card
          className={`border-border transition-colors cursor-pointer hover:border-[color:var(--status-success)]/50 ${
            entityStatusFilter === "in_leads" ? "ring-2 ring-[color:var(--status-success)]/25 border-[color:var(--status-success)]" : ""
          }`}
          onClick={() => {
            setEntityStatusFilter((prev) => (prev === "in_leads" ? "all" : "in_leads"));
            setPage(1);
          }}
        >
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[color:var(--status-success)]">
                04 / Pipeline Mentions
              </span>
              <TrendingUp className="h-4 w-4 text-[color:var(--status-success)]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold tracking-tight text-foreground">
                {telemetry?.pipeline_mentions ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">matched in Leads</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {telemetry?.dominant_signal
                ? `Top signal: ${getSignalMeta(telemetry.dominant_signal.signal_type).label} (${telemetry.dominant_signal.percentage}%)`
                : "Active accounts appearing in industry coverage"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Buying Signal Distribution Header Bar */}
      {signalBreakdown.length > 0 && (
        <Card className="border-border">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Commercial Signal Breakdown (Click to Filter Wire)
              </span>
              {signalFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => {
                    setSignalFilter("all");
                    setPage(1);
                  }}
                  className="text-xs font-medium text-[color:var(--brand)] hover:underline"
                >
                  Show All Signals
                </button>
              )}
            </div>

            {/* Proportional Signal Bar (Approved dynamic-safe progress width) */}
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
              {signalBreakdown.map((stat) => {
                const metaInfo = getSignalMeta(stat.signal_type);
                return (
                  <div
                    key={stat.signal_type}
                    className={`h-full transition-all duration-300 ${metaInfo.barClass}`}
                    style={{ width: `${Math.max(stat.percentage, 2)}%` }}
                    title={`${metaInfo.label}: ${stat.count} (${stat.percentage}%)`}
                  />
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {signalBreakdown.map((stat) => {
                const metaInfo = getSignalMeta(stat.signal_type);
                const active = signalFilter === stat.signal_type;
                return (
                  <button
                    key={stat.signal_type}
                    type="button"
                    onClick={() => {
                      setSignalFilter((prev) => (prev === stat.signal_type ? "all" : stat.signal_type));
                      setPage(1);
                    }}
                    className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                      active
                        ? "border-[color:var(--brand)] bg-[color:var(--brand)]/10 font-semibold text-foreground"
                        : "border-border bg-[color:var(--surface-subtle)] text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>{metaInfo.label}</span>
                    <span className="font-mono text-[11px] font-semibold text-foreground">
                      {stat.count}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      ({stat.percentage}%)
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Switcher Tabs & Filter Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val)}
          items={[
            {
              key: "wire",
              label: `Briefing Wire (${meta?.total ?? articles.length})`,
              icon: Newspaper,
            },
            {
              key: "entities",
              label: `Detected Entities (${entityDirectory.length})`,
              icon: Layers,
            },
          ]}
        />

        {activeTab === "entities" && selectedDirectoryIds.length > 0 && (
          <Button
            onClick={() => {
              const chosen = entityDirectory.filter((e) =>
                selectedDirectoryIds.includes(e.representative_entity_id)
              );
              openDirectoryConvertModal(chosen);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Convert Selected to Leads ({selectedDirectoryIds.length})
          </Button>
        )}
      </div>

      <FilterBar>
        <form onSubmit={handleSearchSubmit} className="flex flex-1 flex-wrap items-center gap-2 min-w-[260px]">
          <FilterBarSearch
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search headline, company/brand entity, or publisher..."
          />
          <Button type="submit" variant="outline" size="default">
            Filter
          </Button>
        </form>

        <Select
          value={signalFilter}
          onChange={(e) => {
            setSignalFilter(e.target.value);
            setPage(1);
          }}
          className="w-48"
          aria-label="Filter by signal type"
        >
          <option value="all">All Signal Types</option>
          <option value="expansion">Expansion & Capex</option>
          <option value="investment">Funding & Investment</option>
          <option value="partnership">Partnership & MoU</option>
          <option value="digital_transformation">Digital Initiative</option>
          <option value="tender">Project & Tender</option>
          <option value="leadership">Leadership Move</option>
          <option value="market_move">General Market Move</option>
        </Select>

        <Select
          value={entityStatusFilter}
          onChange={(e) => {
            setEntityStatusFilter(e.target.value as "all" | "prospects" | "in_leads");
            setPage(1);
          }}
          className="w-48"
          aria-label="Filter by CRM status"
        >
          <option value="all">All Entity Statuses</option>
          <option value="prospects">Net-New Prospects Only</option>
          <option value="in_leads">Already in CRM Leads</option>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" onClick={handleResetFilters} className="gap-1.5 text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        )}
      </FilterBar>

      {/* Error Notice */}
      {newsletterQuery.isError && (
        <ErrorNotice error={newsletterQuery.error} onRetry={() => newsletterQuery.refetch()} />
      )}

      {/* Loading Skeleton */}
      {newsletterQuery.isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-52 w-full rounded-2xl" />
            <Skeleton className="h-52 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      ) : (telemetry?.total_articles ?? 0) === 0 ? (
        /* First-Time Unindexed Industry Empty State */
        <Card className="border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-[color:var(--surface-strong)]">
              <Newspaper className="h-6 w-6 text-[color:var(--brand)]" />
            </div>
            <div className="space-y-1.5 max-w-lg">
              <h2 className="text-lg font-semibold text-foreground">
                No Cached Edition Yet for{" "}
                {selectedBusinessCategoryOption
                  ? `${currentIndustryOption?.name || "Sector"} · ${
                      selectedBusinessCategoryOption.code
                        ? `[${selectedBusinessCategoryOption.code}] `
                        : ""
                    }${selectedBusinessCategoryOption.name}`
                  : currentIndustryOption?.name || "This Industry"}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                To keep Leadsy fast and lightweight, industry news is fetched on demand during the first scan and permanently stored in PostgreSQL. Click below to build a targeted edition for your selected Industry, Sub-Industry, and Business Category (#LOB).
              </p>
            </div>
            <Button onClick={() => handleRunSync(true)} disabled={isSyncing} className="gap-2">
              {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {isSyncing ? "Fetching & Extracting Entities..." : `Fetch First Edition for ${currentIndustryOption?.name || "Industry"}`}
            </Button>
          </CardContent>
        </Card>
      ) : activeTab === "wire" ? (
        /* TAB 1: EDITORIAL BRIEFING WIRE */
        articles.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <p className="text-sm font-medium text-foreground">No articles match your current filter criteria.</p>
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                Reset Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Top Lead Stories (2-Column Editorial Feature) */}
            {featuredArticles.length > 0 && (
              <div className="grid gap-4 lg:grid-cols-2">
                {featuredArticles.map((article, idx) => {
                  const sig = getSignalMeta(article.signal_type);
                  const articleEntities = Array.isArray(article.entities) ? article.entities : [];

                  return (
                    <Card key={article.id} className="border-border flex flex-col justify-between">
                      <CardContent className="p-6 flex flex-col justify-between h-full space-y-4">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                LEAD {String(idx + 1).padStart(2, "0")}
                              </span>
                              <Badge variant={sig.badgeVariant} className="font-mono text-[10px] py-0.5">
                                {sig.shortLabel}
                              </Badge>
                              {article.sub_industry && (
                                <Badge variant="outline" className="text-[10px] py-0.5">
                                  {article.sub_industry.name}
                                </Badge>
                              )}
                              {article.business_category && (
                                <Badge variant="info" className="text-[10px] py-0.5 font-mono">
                                  {article.business_category.code
                                    ? `#${article.business_category.code} `
                                    : ""}
                                  {article.business_category.name}
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                              <span className="font-medium text-foreground/80">
                                {article.source_name || article.source_domain || "Business Wire"}
                              </span>
                              <span>·</span>
                              <span>{formatEditorialDate(article.published_at)}</span>
                            </div>
                          </div>

                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block space-y-2"
                          >
                            <h2 className="text-lg font-bold leading-snug tracking-tight text-foreground group-hover:text-[color:var(--brand)] transition-colors">
                              {article.title}
                              <ExternalLink className="ml-1.5 inline h-3.5 w-3.5 text-muted-foreground group-hover:text-[color:var(--brand)]" />
                            </h2>
                          </a>

                          {article.snippet && article.snippet !== article.title && (
                            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                              {article.snippet}
                            </p>
                          )}
                        </div>

                        {/* Tagged Entities Conversion Strip */}
                        <div className="pt-3 border-t border-border space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              Tagged Entities ({articleEntities.length})
                            </span>
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                            >
                              Source Article
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </a>
                          </div>

                          {articleEntities.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              Sector-wide coverage — no specific single corporation tagged.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {articleEntities.map((ent) =>
                                ent.matched_lead_id ? (
                                  <Link
                                    key={ent.id}
                                    href={`/leads/${ent.matched_lead_id}`}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--status-success)]/30 bg-[color:var(--status-success-soft)] px-2.5 py-1 text-xs font-medium text-[color:var(--status-success)] hover:opacity-90 transition-opacity"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                    <span>{ent.entity_name}</span>
                                    <span className="font-mono text-[10px] opacity-80">
                                      Lead #{ent.matched_lead_id}
                                    </span>
                                    <ArrowUpRight className="h-3 w-3 shrink-0" />
                                  </Link>
                                ) : (
                                  <button
                                    key={ent.id}
                                    type="button"
                                    onClick={() => openSingleConvertModal(ent, article)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-[color:var(--surface-subtle)] px-2.5 py-1 text-xs font-medium text-foreground hover:border-[color:var(--brand)] hover:bg-[color:var(--brand)]/10 transition-colors"
                                  >
                                    {ent.entity_type === "brand" ? (
                                      <Tag className="h-3 w-3 text-[color:var(--brand)] shrink-0" />
                                    ) : (
                                      <Building2 className="h-3 w-3 text-[color:var(--brand)] shrink-0" />
                                    )}
                                    <span>{ent.entity_name}</span>
                                    <span className="ml-1 inline-flex items-center gap-0.5 border-l border-border pl-1.5 font-mono text-[10px] font-semibold text-[color:var(--brand)]">
                                      <Plus className="h-2.5 w-2.5" />
                                      Convert
                                    </span>
                                  </button>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Chronological Market Wire Feed */}
            {wireArticles.length > 0 && (
              <Card className="border-border overflow-hidden">
                <div className="border-b border-border bg-[color:var(--surface-subtle)] px-6 py-3 flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Chronological Sector Dispatches
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    Page {meta?.current_page ?? 1} of {meta?.last_page ?? 1}
                  </span>
                </div>

                <div className="divide-y divide-border">
                  {wireArticles.map((article) => {
                    const sig = getSignalMeta(article.signal_type);
                    const articleEntities = Array.isArray(article.entities) ? article.entities : [];

                    return (
                      <div
                        key={article.id}
                        className="p-5 hover:bg-[color:var(--surface-subtle)]/60 transition-colors space-y-3"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <Badge variant={sig.badgeVariant} className="font-mono text-[10px] py-0">
                                {sig.shortLabel}
                              </Badge>
                              <span className="font-mono text-[11px] font-semibold text-foreground/80">
                                {article.source_name || article.source_domain || "News"}
                              </span>
                              <span className="text-muted-foreground">·</span>
                              <span className="font-mono text-[11px] text-muted-foreground">
                                {formatEditorialDate(article.published_at)}
                              </span>
                              {article.sub_industry && (
                                <>
                                  <span className="text-muted-foreground">·</span>
                                  <span className="text-xs text-muted-foreground">
                                    {article.sub_industry.name}
                                  </span>
                                </>
                              )}
                              {article.business_category && (
                                <Badge variant="info" className="font-mono text-[10px] py-0">
                                  {article.business_category.code
                                    ? `#${article.business_category.code} `
                                    : ""}
                                  {article.business_category.name}
                                </Badge>
                              )}
                            </div>

                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group inline-block"
                            >
                              <h3 className="text-base font-semibold leading-snug text-foreground group-hover:text-[color:var(--brand)] transition-colors">
                                {article.title}
                                <ExternalLink className="ml-1.5 inline h-3.5 w-3.5 text-muted-foreground group-hover:text-[color:var(--brand)]" />
                              </h3>
                            </a>

                            {article.snippet && article.snippet !== article.title && (
                              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2">
                                {article.snippet}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Entities Rail */}
                        {articleEntities.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mr-1">
                              Entities:
                            </span>
                            {articleEntities.map((ent) =>
                              ent.matched_lead_id ? (
                                <Link
                                  key={ent.id}
                                  href={`/leads/${ent.matched_lead_id}`}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--status-success)]/30 bg-[color:var(--status-success-soft)] px-2.5 py-1 text-xs font-medium text-[color:var(--status-success)] hover:opacity-90"
                                >
                                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                                  <span>{ent.entity_name}</span>
                                  <span className="font-mono text-[10px] opacity-80">
                                    #{ent.matched_lead_id}
                                  </span>
                                </Link>
                              ) : (
                                <button
                                  key={ent.id}
                                  type="button"
                                  onClick={() => openSingleConvertModal(ent, article)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:border-[color:var(--brand)] hover:bg-[color:var(--brand)]/10 transition-colors"
                                >
                                  {ent.entity_type === "brand" ? (
                                    <Tag className="h-3 w-3 text-[color:var(--brand)] shrink-0" />
                                  ) : (
                                    <Building2 className="h-3 w-3 text-[color:var(--brand)] shrink-0" />
                                  )}
                                  <span>{ent.entity_name}</span>
                                  <span className="ml-1 border-l border-border pl-1.5 font-mono text-[10px] font-semibold text-[color:var(--brand)]">
                                    + Convert
                                  </span>
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Pagination */}
            {meta && meta.last_page > 1 && (
              <div className="flex items-center justify-between pt-2">
                <span className="font-mono text-xs text-muted-foreground">
                  Showing page {meta.current_page} of {meta.last_page} ({meta.total} articles)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={meta.current_page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={meta.current_page >= meta.last_page}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        /* TAB 2: DETECTED ENTITY DIRECTORY MATRIX */
        <TableShell>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell className="w-10">
                  <input
                    type="checkbox"
                    checked={allConvertibleSelected}
                    onChange={toggleSelectAllDirectory}
                    disabled={convertibleDirectoryRows.length === 0}
                    aria-label="Select all convertible entities"
                    className="h-4 w-4 rounded border-border accent-[var(--brand)]"
                  />
                </TableHeaderCell>
                <TableHeaderCell>Entity / Brand</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Mentions</TableHeaderCell>
                <TableHeaderCell>Latest Signal</TableHeaderCell>
                <TableHeaderCell>Latest Press Context</TableHeaderCell>
                <TableHeaderCell>CRM Status</TableHeaderCell>
                <TableHeaderCell className="text-right">Action</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entityDirectory.length === 0 ? (
                <TableEmpty colSpan={8}>
                  No corporate or brand entities matched your current filter.
                </TableEmpty>
              ) : (
                entityDirectory.map((row) => {
                  const sig = getSignalMeta(row.latest_signal_type);
                  const isConvertible = !row.matched_lead_id;
                  const isChecked = selectedDirectoryIds.includes(row.representative_entity_id);

                  return (
                    <TableRow key={row.normalized_name}>
                      <TableCell>
                        {isConvertible ? (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleDirectoryRow(row.representative_entity_id)}
                            aria-label={`Select ${row.entity_name}`}
                            className="h-4 w-4 rounded border-border accent-[var(--brand)]"
                          />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-[color:var(--status-success)]" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-semibold text-foreground">{row.entity_name}</div>
                          {row.parent_company_hint && (
                            <div className="text-xs text-muted-foreground">
                              Parent: {row.parent_company_hint}
                            </div>
                          )}
                          {row.website_hint && (
                            <div className="font-mono text-[11px] text-muted-foreground">
                              {row.website_hint}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px] uppercase">
                          {row.entity_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {row.mention_count}x
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sig.badgeVariant} className="font-mono text-[10px]">
                          {sig.shortLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md">
                        {row.latest_headline ? (
                          <div className="space-y-0.5">
                            <a
                              href={row.latest_article_url || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-foreground hover:text-[color:var(--brand)] line-clamp-2"
                            >
                              {row.latest_headline}
                            </a>
                            <div className="font-mono text-[10px] text-muted-foreground">
                              {row.latest_source_name || "Press"} · {formatEditorialDate(row.latest_published_at)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.matched_lead_id ? (
                          <Badge variant="success" className="font-mono text-[10px]">
                            IN LEADS #{row.matched_lead_id}
                          </Badge>
                        ) : (
                          <Badge variant="brand" className="font-mono text-[10px]">
                            NEW PROSPECT
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.matched_lead_id ? (
                          <Link href={`/leads/${row.matched_lead_id}`}>
                            <Button variant="outline" size="sm" className="gap-1.5">
                              Open Lead
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDirectoryConvertModal([row])}
                            className="gap-1.5"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Convert to Lead
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableShell>
      )}

      {/* Governed Convert Entity to Lead Modal */}
      <Modal
        open={convertModalOpen}
        onOpenChange={(open) => {
          if (!convertMutation.isPending) {
            setConvertModalOpen(open);
          }
        }}
        title={
          convertDrafts.length === 1
            ? "Convert News Entity to CRM Lead"
            : `Convert ${convertDrafts.length} Selected Entities to Leads`
        }
        description={`Target Industry: ${currentIndustryOption?.name || "Selected Sector"} · Source: News Intelligence / Industry Newsletter`}
        size={convertDrafts.length === 1 ? "lg" : "xl"}
        preventClose={convertMutation.isPending}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setConvertModalOpen(false)}
              disabled={convertMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmConvert}
              disabled={convertMutation.isPending || convertDrafts.length === 0}
              className="gap-2"
            >
              {convertMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {convertDrafts.length === 1
                ? "Create Lead in Pipeline"
                : `Create ${convertDrafts.length} Leads`}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {convertDrafts.length === 1 ? (
            <div className="space-y-4">
              {convertDrafts[0].headline && (
                <div className="rounded-2xl border border-border bg-[color:var(--surface-subtle)] p-4 space-y-1">
                  <div className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Originating Press Context ({convertDrafts[0].source_name || "News"})
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {convertDrafts[0].headline}
                  </p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="conv-company-name" className="text-xs font-semibold text-foreground">
                    Company / Legal Entity Name *
                  </label>
                  <Input
                    id="conv-company-name"
                    value={convertDrafts[0].company_name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setConvertDrafts((prev) =>
                        prev.map((item, idx) => (idx === 0 ? { ...item, company_name: val } : item))
                      );
                    }}
                    placeholder="e.g. PT Kino Indonesia Tbk"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="conv-brand-name" className="text-xs font-semibold text-foreground">
                    Brand Name (Optional)
                  </label>
                  <Input
                    id="conv-brand-name"
                    value={convertDrafts[0].brand}
                    onChange={(e) => {
                      const val = e.target.value;
                      setConvertDrafts((prev) =>
                        prev.map((item, idx) => (idx === 0 ? { ...item, brand: val } : item))
                      );
                    }}
                    placeholder="Commercial brand if different from PT"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="conv-website" className="text-xs font-semibold text-foreground">
                    Company Website (Optional)
                  </label>
                  <Input
                    id="conv-website"
                    value={convertDrafts[0].website}
                    onChange={(e) => {
                      const val = e.target.value;
                      setConvertDrafts((prev) =>
                        prev.map((item, idx) => (idx === 0 ? { ...item, website: val } : item))
                      );
                    }}
                    placeholder="https://company.co.id"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="conv-sub-ind" className="text-xs font-semibold text-foreground">
                    Sub-Industry (Optional)
                  </label>
                  <Select
                    id="conv-sub-ind"
                    value={convertDrafts[0].sub_industry_id}
                    onChange={(e) => {
                      const val = e.target.value;
                      setConvertDrafts((prev) =>
                        prev.map((item, idx) => (idx === 0 ? { ...item, sub_industry_id: val } : item))
                      );
                    }}
                  >
                    <option value="">Unassigned / General {currentIndustryOption?.name}</option>
                    {subIndustries.map((sub) => (
                      <option key={sub.id} value={String(sub.id)}>
                        {sub.name}
                      </option>
                    ))}
                  </Select>
                </div>

                {businessCategories.length > 0 && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="conv-biz-cat" className="text-xs font-semibold text-foreground">
                      Business Category / #LOB (Optional)
                    </label>
                    <Select
                      id="conv-biz-cat"
                      value={convertDrafts[0].business_category_id}
                      onChange={(e) => {
                        const val = e.target.value;
                        setConvertDrafts((prev) =>
                          prev.map((item, idx) =>
                            idx === 0 ? { ...item, business_category_id: val } : item
                          )
                        );
                      }}
                    >
                      <option value="">Auto-detect via AI / Unassigned</option>
                      {businessCategories.map((cat) => (
                        <option key={cat.id} value={String(cat.id)}>
                          {cat.code ? `[${cat.code}] ` : ""}
                          {cat.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {convertDrafts.map((draft, index) => (
                <div
                  key={draft.entity_id}
                  className="grid gap-3 rounded-2xl border border-border bg-[color:var(--surface-subtle)] p-3.5 sm:grid-cols-2"
                >
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Company Name #{index + 1}
                    </label>
                    <Input
                      value={draft.company_name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setConvertDrafts((prev) =>
                          prev.map((d, i) => (i === index ? { ...d, company_name: val } : d))
                        );
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Website (Optional)
                    </label>
                    <Input
                      value={draft.website}
                      placeholder="https://..."
                      onChange={(e) => {
                        const val = e.target.value;
                        setConvertDrafts((prev) =>
                          prev.map((d, i) => (i === index ? { ...d, website: val } : d))
                        );
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <label className="flex items-start gap-3 rounded-2xl border border-border bg-[color:var(--surface-subtle)] p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={triggerAiEnrichment}
              onChange={(e) => setTriggerAiEnrichment(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border accent-[var(--brand)]"
            />
            <div className="space-y-0.5 text-xs">
              <div className="font-semibold text-foreground">
                Run Background AI Firmographic Enrichment & Lead Scoring
              </div>
              <p className="text-muted-foreground">
                Automatically enriches company profile, ICP fit, and qualification score in the background while preserving the originating news headline in the Lead timeline.
              </p>
            </div>
          </label>
        </div>
      </Modal>
    </div>
  );
}

