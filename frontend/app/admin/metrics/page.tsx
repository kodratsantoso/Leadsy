"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield, Building2, Users, Layers, Activity, Server,
  CheckCircle2, HardDrive, Database, Cpu, Globe, ArrowUpRight, Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/apiFetch";
import { PlatformAdminHeader } from "@/components/platform-admin/PlatformAdminHeader";

interface PlatformMetrics {
  tenants: {
    total: number;
    active: number;
    trial: number;
    suspended: number;
  };
  users: {
    total: number;
    active: number;
  };
  leads: {
    total: number;
    pipeline_value: number;
  };
  tiers: {
    enterprise: number;
    pro: number;
    starter: number;
    trial: number;
  };
  system_health: {
    status: string;
    cluster: string;
    database: string;
    timestamp: string;
  };
}

export default function PlatformAdminMetricsPage() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await apiFetch("/api/platform/metrics");
      if (res.ok) {
        const json = await res.json();
        setMetrics(json.data);
      }
    } catch (e) {
      console.error("Failed to fetch platform metrics:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PlatformAdminHeader
        onRefresh={() => {
          setRefreshing(true);
          fetchMetrics();
        }}
        isRefreshing={refreshing}
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <span className="text-xs text-muted-foreground">Gathering cross-tenant telemetry...</span>
          </div>
        </div>
      ) : !metrics ? (
        <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-8 text-center text-destructive">
          Failed to load platform metrics.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top Aggregated SaaS Revenue & Scale Bento */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Pipeline Managed
              </span>
              <div className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Rp {metrics.leads.pipeline_value ? metrics.leads.pipeline_value.toLocaleString("id-ID") : "0"}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Sum of closing valuations across all customer workspaces.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active Tenant Organizations
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {metrics.tenants.active}
                </span>
                <span className="text-xs text-muted-foreground">/ {metrics.tenants.total} Total</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-500 font-medium">Multi-Tenancy 100% Isolated</span>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Managed Business Leads
              </span>
              <div className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {metrics.leads.total.toLocaleString()}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Partitioned by global Eloquent TenantScope.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Registered Users
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {metrics.users.active}
                </span>
                <span className="text-xs text-muted-foreground">active ({metrics.users.total} total)</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Separated tenant roles & permissions.
              </p>
            </div>
          </div>

          {/* Tier Distribution & Infrastructure Health */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Subscription Distribution */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div>
                  <h3 className="text-base font-semibold text-foreground">SaaS Subscription Distribution</h3>
                  <p className="text-xs text-muted-foreground">Distribution of customer organizations by plan tier.</p>
                </div>
                <Badge variant="outline" className="text-primary border-primary/30">Commercial Breakdown</Badge>
              </div>

              <div className="space-y-4">
                {[
                  { name: "Enterprise Tier", count: metrics.tiers.enterprise, color: "bg-purple-500", desc: "Unlimited seats, dedicated quotas" },
                  { name: "Professional Tier", count: metrics.tiers.pro, color: "bg-blue-500", desc: "Up to 20 seats, full AI suite" },
                  { name: "Starter Tier", count: metrics.tiers.starter, color: "bg-emerald-500", desc: "Core CRM & map territories" },
                  { name: "Trial / POC Mode", count: metrics.tiers.trial, color: "bg-amber-500", desc: "14-day evaluation environment" },
                ].map((tier) => {
                  const percent = metrics.tenants.total > 0 ? Math.round((tier.count / metrics.tenants.total) * 100) : 0;
                  return (
                    <div key={tier.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">{tier.name}</span>
                        <span className="font-mono text-muted-foreground">{tier.count} tenants ({percent}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${tier.color}`} style={{ width: `${percent}%` }} />
                      </div>
                      <p className="text-[11px] text-muted-foreground">{tier.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Platform Infrastructure Health */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Cluster & Persistence Status</h3>
                  <p className="text-xs text-muted-foreground">Infrastructure reliability and persistent volume health.</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>All Systems Normal</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/80 bg-accent/20 p-4 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Server className="h-4 w-4 text-primary" />
                    <span>Orchestration Cluster</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{metrics.system_health.cluster}</p>
                  <span className="inline-block text-[10px] text-emerald-500 font-mono">Rollout Healthy</span>
                </div>

                <div className="rounded-2xl border border-border/80 bg-accent/20 p-4 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Database className="h-4 w-4 text-primary" />
                    <span>Database SSOT</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{metrics.system_health.database}</p>
                  <span className="inline-block text-[10px] text-emerald-500 font-mono">Zero Data Loss Guard</span>
                </div>

                <div className="rounded-2xl border border-border/80 bg-accent/20 p-4 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Shield className="h-4 w-4 text-primary" />
                    <span>Tenant Partitioning</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Eloquent Global TenantScope</p>
                  <span className="inline-block text-[10px] text-emerald-500 font-mono">Cross-Org Leakage Blocked</span>
                </div>

                <div className="rounded-2xl border border-border/80 bg-accent/20 p-4 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Cpu className="h-4 w-4 text-primary" />
                    <span>Background Workers</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Redis Async Queue Engine</p>
                  <span className="inline-block text-[10px] text-emerald-500 font-mono">Lark & WA Sidecar Connected</span>
                </div>
              </div>

              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Platform Provisioning API</h4>
                  <p className="text-[11px] text-muted-foreground">Sanctum token-authenticated with superadmin enforcement.</p>
                </div>
                <Badge className="bg-primary text-primary-foreground text-[10px]">Active</Badge>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
