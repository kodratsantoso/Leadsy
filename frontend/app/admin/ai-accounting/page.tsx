"use client";

import { useState, useEffect, useCallback } from "react";
import { Bot, Zap, DollarSign, Activity, RefreshCw, BarChart2, ShieldAlert, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/apiFetch";

interface AiTelemetryData {
  summary: {
    total_tokens_consumed: number;
    total_cost_usd: number;
    total_requests: number;
    active_models: string[];
  };
  models_distribution: Array<{
    model: string;
    percentage: number;
    tokens: number;
  }>;
  tenants: Array<{
    tenant_id: number;
    tenant_name: string;
    plan: string;
    leads_analyzed: number;
    tokens_consumed: number;
    estimated_cost_usd: number;
    budget_cap_usd: number;
    budget_utilization_percent: number;
  }>;
}

export default function PlatformAiAccountingPage() {
  const [data, setData] = useState<AiTelemetryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTelemetry = useCallback(async () => {
    try {
      const res = await apiFetch("/api/platform/ai-telemetry");
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (e) {
      console.error("Failed to load AI telemetry:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              AI Cost Accounting & Token Telemetry
            </h1>
            <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-semibold">
              LLM Unit Economics
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Monitor API token consumption across LLM providers (OpenAI, Gemini, Anthropic), margins, and per-tenant budget ceilings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRefreshing(true);
              fetchTelemetry();
            }}
            disabled={refreshing}
            className="h-8 gap-1.5 rounded-lg border-slate-700 bg-slate-900/80 text-xs text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
            <span>Sync LLM Logs</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-cyan-500" />
        </div>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium uppercase tracking-wider">Total Tokens Consumed</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Zap className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-white font-mono">
                {((data?.summary.total_tokens_consumed ?? 0) / 1000).toLocaleString()}k
              </p>
              <p className="mt-1 text-xs text-slate-400">Aggregated across all active tenants</p>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium uppercase tracking-wider">Estimated LLM Cost</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-white font-mono">
                ${data?.summary.total_cost_usd.toFixed(2) ?? "0.00"}
              </p>
              <p className="mt-1 text-xs text-emerald-400">Blended rate: ~$1.50 / 1M tokens</p>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium uppercase tracking-wider">Scoring Requests</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Activity className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-white font-mono">
                {data?.summary.total_requests.toLocaleString() ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-400">AI DeepSearch & lead qualifications</p>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium uppercase tracking-wider">Active Models</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                  <Cpu className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-white">4 Engines</p>
              <p className="mt-1 text-xs text-purple-300">OpenAI, Google, Anthropic</p>
            </div>
          </div>

          {/* Model Distribution Section */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-cyan-400" />
              LLM Workload Distribution by Model
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {data?.models_distribution.map((m) => (
                <div key={m.model} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-white">{m.model}</span>
                    <Badge variant="outline" className="border-cyan-500/30 text-cyan-300 text-[10px]">
                      {m.percentage}%
                    </Badge>
                  </div>
                  <div className="mt-3 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                      style={{ width: `${m.percentage}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] font-mono text-slate-400">
                    {Math.round(m.tokens / 1000)}k tokens
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Tenant Consumption & Budget Cap Matrix */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Bot className="h-4 w-4 text-indigo-400" />
                Tenant Token Usage & Budget Ceiling Matrix
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Track AI expenditure per workspace to prevent budget overruns and guarantee healthy gross margins.
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Tenant</th>
                    <th className="px-4 py-3">Tier</th>
                    <th className="px-4 py-3">Leads Processed</th>
                    <th className="px-4 py-3">Tokens Consumed</th>
                    <th className="px-4 py-3">Estimated Cost</th>
                    <th className="px-4 py-3">Budget Cap</th>
                    <th className="px-4 py-3">Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {data?.tenants.map((t) => (
                    <tr key={t.tenant_id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-sans">
                        <div className="font-semibold text-white">{t.tenant_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Tenant #{t.tenant_id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px] uppercase border-slate-700 bg-slate-800/50">
                          {t.plan}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{t.leads_analyzed}</td>
                      <td className="px-4 py-3 text-cyan-300">
                        {Math.round(t.tokens_consumed / 1000)}k
                      </td>
                      <td className="px-4 py-3 text-emerald-400 font-semibold">
                        ${t.estimated_cost_usd.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        ${t.budget_cap_usd.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                t.budget_utilization_percent > 80
                                  ? "bg-red-500"
                                  : t.budget_utilization_percent > 50
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${t.budget_utilization_percent}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-300">
                            {t.budget_utilization_percent}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
