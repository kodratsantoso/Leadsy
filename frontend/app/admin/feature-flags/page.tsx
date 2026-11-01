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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Feature Flags & Modul Tenant
            </h1>
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs font-semibold">
              Module Gating
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Kontrol kapabilitas platform dan aktifkan atau nonaktifkan modul enterprise untuk setiap tenant.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFeatures}
            className="h-8 gap-1.5 rounded-lg border-border bg-card text-xs text-foreground hover:bg-muted"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Segarkan</span>
          </Button>
        </div>
      </div>

      {notice && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs ${
            notice.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="text-muted-foreground hover:text-foreground">
            ×
          </button>
        </div>
      )}

      {/* Global Module Definitions */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4 flex items-center gap-2">
          <Sliders className="h-4 w-4 text-primary" />
          Modul Standar Platform ({modules.length})
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod) => (
            <div key={mod.key} className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">{mod.name}</span>
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-[10px] uppercase font-mono">
                  {mod.tier_requirement}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{mod.description}</p>
              <div className="mt-3 text-[11px] font-mono text-muted-foreground border-t border-border pt-2">
                Key: <span className="text-primary font-semibold">{mod.key}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tenant Matrix Table */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Matriks Entitlement Tenant ({filteredTenants.length})
          </h2>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari tenant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 pl-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/60 text-[11px] font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Paket Langganan</th>
                  {modules.map((m) => (
                    <th key={m.key} className="px-3 py-3 text-center">
                      {m.name.split(" ")[0]}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{t.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">#{t.id} • {t.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px] uppercase font-mono border-border bg-muted">
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
                              isEnabled ? "bg-primary" : "bg-muted-foreground/30"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
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
                        className="h-7 gap-1 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-xs"
                      >
                        <Save className="h-3 w-3" />
                        <span>{savingId === t.id ? "Menyimpan..." : "Simpan"}</span>
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
