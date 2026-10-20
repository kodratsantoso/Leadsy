"use client";

import { useState, useEffect, useCallback } from "react";
import { Flag, Save, RefreshCw, CheckCircle2, Shield, Search, Sliders, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/apiFetch";

interface SystemModule {
  key: string;
  name: string;
  description: string;
  default_enabled: boolean;
  tier_requirement: string;
}

interface TenantFeatureItem {
  id: number;
  name: string;
  slug: string;
  plan: string;
  modules: Record<string, boolean>;
}

export default function PlatformFeatureFlagsPage() {
  const [modules, setModules] = useState<SystemModule[]>([]);
  const [tenants, setTenants] = useState<TenantFeatureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchFeatures = useCallback(async () => {
    try {
      const res = await apiFetch("/api/platform/feature-flags");
      if (res.ok) {
        const json = await res.json();
        setModules(json.data?.system_modules || []);
        setTenants(json.data?.tenants || []);
      }
    } catch (e) {
      console.error("Failed to load feature flags:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  const handleToggleModule = (tenantId: number, moduleKey: string) => {
    setTenants((prev) =>
      prev.map((t) => {
        if (t.id !== tenantId) return t;
        return {
          ...t,
          modules: {
            ...t.modules,
            [moduleKey]: !t.modules[moduleKey],
          },
        };
      })
    );
  };

  const handleSaveTenantFeatures = async (tenant: TenantFeatureItem) => {
    setSavingId(tenant.id);
    try {
      const res = await apiFetch(`/api/platform/tenants/${tenant.id}/features`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules: tenant.modules }),
      });
      const json = await res.json();
      if (res.ok) {
        setNotice({ text: `Feature flags saved for ${tenant.name}`, type: "success" });
      } else {
        setNotice({ text: json.message || "Failed to update feature flags.", type: "error" });
      }
    } catch {
      setNotice({ text: "Error saving feature flags.", type: "error" });
    } finally {
      setSavingId(null);
    }
  };

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Feature Flags & Entitlements
            </h1>
            <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold">
              Module Gating
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Control platform capabilities and selectively enable or disable enterprise modules per tenant.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFeatures}
            className="h-8 gap-1.5 rounded-lg border-slate-700 bg-slate-900/80 text-xs text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {notice && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs ${
            notice.type === "success"
              ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-300"
              : "border-red-500/30 bg-red-950/30 text-red-300"
          }`}
        >
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-white">
            ×
          </button>
        </div>
      )}

      {/* Global Module Definitions */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
          <Sliders className="h-4 w-4 text-indigo-400" />
          Standard Platform Modules ({modules.length})
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod) => (
            <div key={mod.key} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">{mod.name}</span>
                <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-[10px] uppercase font-mono">
                  {mod.tier_requirement}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-400 line-clamp-2">{mod.description}</p>
              <div className="mt-3 text-[11px] font-mono text-slate-400 border-t border-slate-800/60 pt-2">
                Key: <span className="text-indigo-400 font-semibold">{mod.key}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tenant Matrix Table */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Layers className="h-4 w-4 text-cyan-400" />
            Tenant Entitlements Matrix ({filteredTenants.length})
          </h2>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter tenants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 pl-8 text-xs text-slate-200 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Plan Tier</th>
                  {modules.map((m) => (
                    <th key={m.key} className="px-3 py-3 text-center">
                      {m.name.split(" ")[0]}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{t.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">#{t.id} • {t.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px] uppercase font-mono border-slate-700 bg-slate-800/50">
                        {t.plan}
                      </Badge>
                    </td>
                    {modules.map((m) => {
                      const isEnabled = !!t.modules[m.key];
                      return (
                        <td key={m.key} className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleModule(t.id, m.key)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              isEnabled ? "bg-indigo-600" : "bg-slate-800"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                isEnabled ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right">
                      <Button
                        onClick={() => handleSaveTenantFeatures(t)}
                        disabled={savingId === t.id}
                        size="sm"
                        className="h-7 gap-1 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-500 shadow-sm"
                      >
                        <Save className="h-3 w-3" />
                        <span>{savingId === t.id ? "Saving..." : "Save"}</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
