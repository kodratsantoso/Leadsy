"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Database,
  ExternalLink,
  Layers,
  Megaphone,
  MessageSquare,
  Radio,
  RefreshCw,
  Search,
  Share2,
  SlidersHorizontal,
  Video,
  Webhook,
} from "lucide-react";

import { apiFetch } from "@/lib/apiFetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type PlatformItem = {
  id: string;
  name: string;
  docs_url: string | null;
  group: string;
  description: string;
  icon: string;
  is_enabled: boolean;
  has_credentials: boolean;
  is_configured: boolean;
  status: "active" | "configured" | "unconfigured";
  settings_url: string;
};

export type PlatformSummary = {
  total: number;
  configured_count: number;
  unconfigured_count: number;
};

const ICON_MAP: Record<string, React.ElementType> = {
  Share2,
  Video,
  Megaphone,
  MessageSquare,
  Database,
  Webhook,
  BadgeCheck,
};

export default function LeadPlatformGeneratorPage() {
  const [platforms, setPlatforms] = useState<PlatformItem[]>([]);
  const [summary, setSummary] = useState<PlatformSummary>({
    total: 0,
    configured_count: 0,
    unconfigured_count: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"configured" | "catalog">("configured");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPlatforms = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const res = await apiFetch("/lead-generator/platforms");
      if (res.ok) {
        const json = await res.json();
        setPlatforms(json.data || []);
        if (json.summary) {
          setSummary(json.summary);
        }
      }
    } catch (err) {
      console.error("Failed to load platform configurations:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const configuredPlatforms = useMemo(() => {
    return platforms.filter((p) => p.is_configured);
  }, [platforms]);

  const filteredCatalog = useMemo(() => {
    let list = platforms;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.group.toLowerCase().includes(q)
      );
    }
    // Group by category
    const grouped: Record<string, PlatformItem[]> = {};
    for (const item of list) {
      if (!grouped[item.group]) {
        grouped[item.group] = [];
      }
      grouped[item.group].push(item);
    }
    return grouped;
  }, [platforms, searchQuery]);

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Social & Platform Generator</h1>
            <Badge variant="outline" className="text-xs">
              Inbound Channels
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola dan pantau saluran intake prospek otomatis dari akun media sosial, formulir iklan berbayar, dan CRM terintegrasi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchPlatforms(true)}
            disabled={isLoading || isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh Status
          </Button>
          <Link href="/settings/integrations?tab=platforms">
            <Button size="sm" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Pengaturan Integrasi
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs & View Controls */}
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setActiveTab("configured")}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "configured"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Platform Terkonfigurasi
            <Badge
              variant={summary.configured_count > 0 ? "success" : "neutral"}
              className="ml-1 h-5 px-1.5 text-[10px]"
            >
              {summary.configured_count}
            </Badge>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("catalog")}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "catalog"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Katalog Platform Tersedia
            <Badge variant="outline" className="ml-1 h-5 px-1.5 text-[10px]">
              {summary.total}
            </Badge>
          </button>
        </div>

        {activeTab === "catalog" && (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari platform atau jenis saluran..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-xl border border-border bg-card p-5"
            >
              <div className="h-6 w-1/3 rounded bg-muted" />
              <div className="mt-4 h-4 w-3/4 rounded bg-muted/60" />
              <div className="mt-2 h-4 w-1/2 rounded bg-muted/40" />
            </div>
          ))}
        </div>
      ) : activeTab === "configured" ? (
        /* Tab 1: Configured Platforms Only */
        configuredPlatforms.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {configuredPlatforms.map((platform) => {
              const IconComponent = ICON_MAP[platform.icon] || Share2;
              return (
                <Card
                  key={platform.id}
                  className="flex flex-col justify-between border-border shadow-sm transition-all hover:shadow-md"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--surface-strong)]">
                        <IconComponent className="h-5 w-5 text-[color:var(--brand)]" />
                      </div>
                      <Badge
                        variant={platform.status === "active" ? "success" : "info"}
                        className="gap-1.5"
                      >
                        {platform.status === "active" && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                        {platform.status === "active" ? "Aktif & Terhubung" : "Terkonfigurasi"}
                      </Badge>
                    </div>
                    <div className="mt-2">
                      <CardTitle className="text-base">{platform.name}</CardTitle>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {platform.group}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pb-4">
                    <CardDescription className="text-xs leading-relaxed">
                      {platform.description}
                    </CardDescription>

                    <div className="flex items-center gap-2 pt-2">
                      <Link href={platform.settings_url} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
                          Buka Pengaturan
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      {platform.docs_url && (
                        <a
                          href={platform.docs_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-muted"
                          title="Dokumentasi Platform"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Empty State for Configured Platforms */
          <Card className="border-dashed border-2 border-border/80 bg-[color:var(--surface-subtle)] p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Radio className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">
              Belum Ada Platform yang Dikonfigurasi
            </h3>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
              Saat ini belum ada akun media sosial, formulir iklan, atau CRM yang terhubung ke Leadsy.
              Hubungkan platform Anda melalui menu Pengaturan Integrasi untuk mulai menerima prospek secara otomatis.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/settings/integrations?tab=platforms">
                <Button size="sm" className="gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Konfigurasi di Pengaturan Integrasi
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("catalog")}
                className="gap-2 text-xs"
              >
                Lihat Katalog Platform yang Didukung ({summary.total})
              </Button>
            </div>
          </Card>
        )
      ) : (
        /* Tab 2: Catalog of Available Platforms (Clean compact directory layout) */
        <div className="space-y-6">
          {Object.keys(filteredCatalog).length > 0 ? (
            Object.entries(filteredCatalog).map(([groupTitle, items]) => (
              <div key={groupTitle} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {groupTitle}
                  </h3>
                  <Badge variant="outline" className="h-4 text-[10px]">
                    {items.length}
                  </Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((platform) => {
                    const IconComponent = ICON_MAP[platform.icon] || Share2;
                    return (
                      <div
                        key={platform.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-[color:var(--brand)]/40"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color:var(--surface-strong)]">
                            <IconComponent className="h-4 w-4 text-[color:var(--brand)]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-foreground">
                              {platform.name}
                            </p>
                            <p className="line-clamp-1 text-[11px] text-muted-foreground">
                              {platform.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {platform.is_configured ? (
                            <Badge variant="success" className="text-[10px] py-0 px-2">
                              Terkonfigurasi
                            </Badge>
                          ) : (
                            <Link href="/settings/integrations?tab=platforms">
                              <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2 gap-1 text-muted-foreground hover:text-foreground">
                                Setup
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Tidak ada platform yang cocok dengan pencarian &quot;{searchQuery}&quot;.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
