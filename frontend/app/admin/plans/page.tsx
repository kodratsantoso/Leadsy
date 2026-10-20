"use client";

import { useState, useEffect, useCallback } from "react";
import { CreditCard, DollarSign, Check, Users, Shield, ArrowUpRight, Sparkles, RefreshCw, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/apiFetch";

interface PlansData {
  mrr: number;
  arr: number;
  plan_counts: {
    starter: number;
    pro: number;
    enterprise: number;
    trial: number;
  };
  tiers: Array<{
    id: string;
    name: string;
    price_monthly: number;
    price_annual: number;
    seats_limit: number;
    leads_limit: number;
    features: string[];
    is_popular: boolean;
  }>;
}

export default function PlatformPlansPage() {
  const [data, setData] = useState<PlansData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await apiFetch("/api/platform/plans");
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (e) {
      console.error("Failed to load plans data:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Plans & Monetization Engine
            </h1>
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-semibold">
              SaaS Packaging
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Subscription tier packaging, quotas, pricing models, and recurring revenue calculations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRefreshing(true);
              fetchPlans();
            }}
            disabled={refreshing}
            className="h-8 gap-1.5 rounded-lg border-slate-700 bg-slate-900/80 text-xs text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-emerald-400" : ""}`} />
            <span>Refresh Financials</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-emerald-500" />
        </div>
      ) : (
        <>
          {/* Revenue KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium uppercase tracking-wider">Estimated MRR</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-white font-mono">
                ${data?.mrr.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-emerald-400">Monthly Recurring Revenue</p>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium uppercase tracking-wider">Projected ARR</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-white font-mono">
                ${data?.arr.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-indigo-300">Annual Run-Rate</p>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium uppercase tracking-wider">Paying Workspaces</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                  <CreditCard className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-white font-mono">
                {(data?.plan_counts.starter ?? 0) + (data?.plan_counts.pro ?? 0) + (data?.plan_counts.enterprise ?? 0)}
              </p>
              <p className="mt-1 text-xs text-cyan-300">Active commercial subscriptions</p>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium uppercase tracking-wider">Trial Workspaces</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-white font-mono">
                {data?.plan_counts.trial ?? 0}
              </p>
              <p className="mt-1 text-xs text-amber-300">Free evaluation trials</p>
            </div>
          </div>

          {/* Pricing Tiers Cards */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-6 flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-400" />
              SaaS Packaging Tiers & Quota Configurations
            </h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {data?.tiers.map((tier) => (
                <div
                  key={tier.id}
                  className={`relative flex flex-col justify-between rounded-2xl border p-6 transition-all ${
                    tier.is_popular
                      ? "border-indigo-500/50 bg-gradient-to-b from-indigo-950/30 to-slate-950 shadow-lg shadow-indigo-500/10"
                      : "border-slate-800 bg-slate-950/60"
                  }`}
                >
                  {tier.is_popular && (
                    <div className="absolute -top-3 right-6">
                      <span className="rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 px-3 py-0.5 text-[10px] font-bold text-slate-950 uppercase tracking-wider shadow">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono border-slate-700 bg-slate-800/60">
                        {data.plan_counts[tier.id as keyof typeof data.plan_counts] || 0} active
                      </Badge>
                    </div>

                    <div className="mt-4 flex items-baseline text-white">
                      <span className="text-3xl font-extrabold font-mono">${tier.price_monthly}</span>
                      <span className="ml-1 text-xs text-slate-400">/ workspace / month</span>
                    </div>
                    <p className="mt-1 text-[11px] text-emerald-400 font-mono">
                      Billed annually at ${tier.price_annual}/yr
                    </p>

                    <div className="mt-6 space-y-2 border-t border-slate-800/80 pt-4 text-xs">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400">Max Member Seats</span>
                        <span className="font-semibold text-white font-mono">{tier.seats_limit} seats</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="text-slate-400">Monthly Lead Quota</span>
                        <span className="font-semibold text-white font-mono">{tier.leads_limit.toLocaleString()} leads</span>
                      </div>
                    </div>

                    <div className="mt-6 space-y-2.5 border-t border-slate-800/80 pt-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Included Capabilities
                      </p>
                      {tier.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                          <Check className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 border-t border-slate-800/80 pt-4">
                    <Button
                      variant="outline"
                      className="w-full rounded-xl border-slate-700 bg-slate-800/60 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white"
                    >
                      <span>Configure Quotas</span>
                      <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
