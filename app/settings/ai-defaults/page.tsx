"use client";

import { useState } from "react";
import {
  Bot, Plus, Zap, Activity, DollarSign,
  Check, X, Loader2, Settings, ChevronDown, ChevronUp, ArrowLeft, AlertCircle
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";

type Provider = {
  id: number;
  name: string;
  slug: string;
  base_url: string;
  is_active: boolean;
  has_key: boolean;
  models: Model[];
};

type Model = {
  id: number;
  name: string;
  cost_tier: "low" | "medium" | "high";
  is_active: boolean;
};

type RouteConfig = {
  id: number;
  feature_name: string;
  ai_model: {
    name: string;
    provider: { name: string; slug: string; };
  };
  priority: number;
  is_active: boolean;
};

type UsageSummary = {
  summary: {
    total_calls: number;
    total_cost_usd: number;
    success_rate: number | null;
    avg_latency_ms: number | null;
    has_data: boolean;
  };
  per_provider: {
    provider_id: number;
    provider_name: string;
    provider_slug: string;
    total_calls: number;
    total_cost_usd: number;
    avg_latency_ms: number | null;
    success_rate: number | null;
  }[];
};

const costTierColors: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-500",
  medium: "bg-amber-500/10 text-amber-500",
  high: "bg-red-500/10 text-red-500",
};

const providerColors: Record<string, string> = {
  openai: "from-emerald-400 to-teal-600",
  anthropic: "from-amber-400 to-orange-600",
  google: "from-blue-400 to-indigo-600",
};

export default function AiProvidersPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"providers" | "routing" | "usage">("providers");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);

  // ── Providers — real API via apiFetch (Bearer token injected) ──
  const { data: providersData, isLoading: providersLoading } = useQuery({
    queryKey: ["ai-providers"],
    queryFn: async () => {
      const r = await apiFetch("/ai-providers");
      return r.json();
    },
  });

  // ── Feature Routes (Priority Engine) ──
  const { data: routesData, isLoading: routesLoading } = useQuery({
    queryKey: ["ai-feature-routes"],
    queryFn: async () => {
      const r = await apiFetch("/ai-feature-routes");
      return r.json();
    },
  });

  // ── Usage Summary — real ai_requests aggregation ──
  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ["ai-usage-summary"],
    queryFn: async () => {
      const r = await apiFetch("/ai-providers/usage-summary");
      return r.json() as Promise<{ data: UsageSummary }>;
    },
    enabled: tab === "usage",
  });

  const testMutation = useMutation({
    mutationFn: async (id: number) => {
      setTestingId(id);
      const r = await apiFetch(`/ai-providers/${id}/test`, { method: "POST" });
      return r.json();
    },
    onSettled: () => setTestingId(null),
  });

  // Map API response to local type
  const providers: Provider[] = (providersData?.data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    base_url: p.base_url || "",
    is_active: p.status === "active",
    has_key: !!p.api_key_masked && !p.api_key_masked?.includes("PLACEHOLDER"),
    models: (p.models || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      cost_tier: m.cost_tier || "medium",
      is_active: m.status !== "deprecated",
    })),
  }));

  const routes: RouteConfig[] = (routesData?.data || []).map((rt: any) => ({
    id: rt.id,
    feature_name: rt.feature_name,
    ai_model: rt.ai_model || { name: "—", provider: { name: "—", slug: "openai" } },
    priority: rt.priority || 1,
    is_active: rt.is_active ?? true,
  }));

  // Group routes by feature name to display priority sequences
  const routesByFeature = routes.reduce((acc: Record<string, RouteConfig[]>, route) => {
      if (!acc[route.feature_name]) acc[route.feature_name] = [];
      acc[route.feature_name].push(route);
      return acc;
  }, {});

  const usage: UsageSummary | null = usageData?.data ?? null;
  const maxProviderCost = Math.max(...(usage?.per_provider.map((p) => p.total_cost_usd) || [0]), 0.001);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Defaults</h1>
            <p className="text-sm text-muted-foreground">Multi-provider AI orchestration — BRD §3.10, §11</p>
          </div>
        </div>
        <button
          onClick={() => alert("Add Provider: Configure via Settings → Integrations (API key required)")}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-2 text-xs font-medium text-white shadow-lg shadow-indigo-500/25"
        >
          <Plus className="h-3.5 w-3.5" /> Add Provider
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-border">
        {(["providers", "routing", "usage"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-1 pb-2.5 text-sm font-medium capitalize transition-colors ${
              tab === t ? "border-indigo-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Providers Tab ── */}
      {tab === "providers" && (
        <div className="space-y-3">
          {providersLoading ? (
            <div className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : providers.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Bot className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">No AI providers configured</p>
              <p className="mt-1 text-xs text-muted-foreground">Seed the database or add providers via Settings → AI Defaults</p>
            </div>
          ) : (
            providers.map((provider) => {
              const expanded = expandedId === provider.id;
              return (
                <div key={provider.id} className="rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={() => setExpandedId(expanded ? null : provider.id)}>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${providerColors[provider.slug] ?? "from-gray-400 to-gray-600"} shadow-lg`}>
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-semibold">{provider.name}</h3>
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", provider.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground")}>
                          {provider.is_active ? "Active" : "Inactive"}
                        </span>
                        {!provider.has_key && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-500">
                            <AlertCircle className="h-3 w-3" /> No API Key
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{provider.base_url || "—"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">{provider.models.length} models</span>
                      {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {expanded && (
                    <div className="border-t border-border px-5 py-4 space-y-4">
                      {/* Models */}
                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Registered Models</h4>
                        <div className="space-y-1.5">
                          {provider.models.map((model) => (
                            <div key={model.id} className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className={cn("h-1.5 w-1.5 rounded-full", model.is_active ? "bg-emerald-500" : "bg-muted-foreground")} />
                                <span className="text-xs font-medium font-mono">{model.name}</span>
                              </div>
                              <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", costTierColors[model.cost_tier])}>
                                {model.cost_tier}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => testMutation.mutate(provider.id)}
                          disabled={testingId === provider.id || !provider.has_key}
                          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
                        >
                          {testingId === provider.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                          Test Connection
                        </button>
                        {!provider.has_key && (
                          <p className="text-xs text-amber-500">Configure API key in Settings → Integrations to enable</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Routing Tab ── */}
      {tab === "routing" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Configure which model handles each AI function, with automatic fallback</p>
          {routesLoading ? (
            <div className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : routes.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Zap className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No routing rules configured yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Routing rules map AI functions to specific models</p>
            </div>
          ) : (
            Object.entries(routesByFeature).map(([featureName, featureRoutes]) => (
              <div key={featureName} className="flex flex-col gap-3 rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10">
                      <Zap className="h-4 w-4 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold font-mono">{featureName}</p>
                      <p className="text-xs text-muted-foreground">Priority Engine Fallback Sequence</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 mt-1">
                  {featureRoutes.sort((a, b) => a.priority - b.priority).map((route) => (
                    <div key={route.id} className="flex items-center justify-between rounded-md border border-border/50 bg-muted/20 px-3 py-2">
                      <div className="flex items-center gap-3">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] font-bold text-indigo-500">
                          {route.priority}
                        </span>
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-foreground">{route.ai_model.provider.name} — {route.ai_model.name}</span>
                        </div>
                      </div>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide", route.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground")}>
                        {route.is_active ? "ACTIVE" : "DISABLED"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Usage Tab — Real ai_requests data ── */}
      {tab === "usage" && (
        <div className="space-y-4">
          {usageLoading ? (
            <div className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : !usage?.summary.has_data ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Activity className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">No AI requests logged yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Usage statistics will appear here once the system starts processing leads with AI scoring.
              </p>
            </div>
          ) : (
            <>
              {/* Summary cards — real data from ai_requests */}
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground">Total Calls</p>
                  <p className="mt-1 text-xl font-bold">{usage.summary.total_calls.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground">Total Cost</p>
                  <p className="mt-1 text-xl font-bold text-emerald-500">${usage.summary.total_cost_usd.toFixed(4)}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground">Success Rate</p>
                  <p className="mt-1 text-xl font-bold">
                    {usage.summary.success_rate !== null ? `${usage.summary.success_rate}%` : "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground">Avg Latency</p>
                  <p className="mt-1 text-xl font-bold">
                    {usage.summary.avg_latency_ms !== null ? `${usage.summary.avg_latency_ms}ms` : "—"}
                  </p>
                </div>
              </div>

              {/* Cost breakdown by provider */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h3 className="mb-3 text-xl font-semibold">Cost Breakdown by Provider</h3>
                <div className="space-y-3">
                  {usage.per_provider.map((p) => {
                    const pct = maxProviderCost > 0 ? (p.total_cost_usd / maxProviderCost) * 100 : 0;
                    return (
                      <div key={p.provider_id}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium">{p.provider_name}</span>
                          <span className="text-muted-foreground">${p.total_cost_usd.toFixed(4)} · {p.total_calls.toLocaleString()} calls</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${providerColors[p.provider_slug] ?? "from-gray-400 to-gray-600"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
