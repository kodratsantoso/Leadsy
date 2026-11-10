"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Globe2,
  Key,
  ShieldCheck,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ExternalLink,
  Server,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/apiFetch";
import { cn } from "@/lib/utils";

type SearchEngineKey = "serper" | "custom" | "google_cse" | "tavily" | "lusha";

interface SearchEngineConfig {
  SERPER_ENABLED: boolean;
  SERPER_API_KEY: string;

  CUSTOM_SEARCH_ENABLED: boolean;
  CUSTOM_SEARCH_ENDPOINT: string;
  CUSTOM_SEARCH_API_KEY: string;
  CUSTOM_SEARCH_HEADER_NAME: string;
  CUSTOM_SEARCH_AUTH_TYPE: "Bearer" | "Header" | "QueryParam";
  CUSTOM_SEARCH_METHOD: "POST" | "GET";

  GOOGLE_CSE_ENABLED: boolean;
  GOOGLE_CUSTOM_SEARCH_API_KEY: string;
  GOOGLE_CUSTOM_SEARCH_ENGINE_ID: string;

  TAVILY_ENABLED: boolean;
  TAVILY_API_KEY: string;

  LUSHA_SEARCH_ENABLED: boolean;
  LUSHA_API_KEY: string;

  SEARCH_ENGINE_PRIORITY: SearchEngineKey[];
}

const DEFAULT_CONFIG: SearchEngineConfig = {
  SERPER_ENABLED: false,
  SERPER_API_KEY: "",

  CUSTOM_SEARCH_ENABLED: false,
  CUSTOM_SEARCH_ENDPOINT: "",
  CUSTOM_SEARCH_API_KEY: "",
  CUSTOM_SEARCH_HEADER_NAME: "Authorization",
  CUSTOM_SEARCH_AUTH_TYPE: "Bearer",
  CUSTOM_SEARCH_METHOD: "POST",

  GOOGLE_CSE_ENABLED: false,
  GOOGLE_CUSTOM_SEARCH_API_KEY: "",
  GOOGLE_CUSTOM_SEARCH_ENGINE_ID: "",

  TAVILY_ENABLED: false,
  TAVILY_API_KEY: "",

  LUSHA_SEARCH_ENABLED: false,
  LUSHA_API_KEY: "",

  SEARCH_ENGINE_PRIORITY: ["serper", "custom", "google_cse", "tavily", "lusha"],
};

const ENGINE_METADATA: Record<SearchEngineKey, { name: string; tag: string; desc: string }> = {
  serper: {
    name: "Serper.dev",
    tag: "Google SERP JSON",
    desc: "Google Search JSON API berkecepatan tinggi (<1s) dengan bypass reCAPTCHA & residential proxy otomatis.",
  },
  custom: {
    name: "Custom Search Endpoint",
    tag: "BYOE / SearXNG / Proxy",
    desc: "Hubungkan endpoint HTTP proxy atau instance SearXNG/SERP internal milik tim Anda.",
  },
  google_cse: {
    name: "Google Custom Search (CSE)",
    tag: "Official Google API",
    desc: "Google Programmable Search Engine resmi menggunakan Google Cloud API Key & Search Engine ID (cx).",
  },
  tavily: {
    name: "Tavily AI Search",
    tag: "Agentic Search",
    desc: "Search engine bertenaga AI khusus LLM Agent dengan domain filter LinkedIn profil.",
  },
  lusha: {
    name: "Lusha B2B People Directory",
    tag: "Direct B2B DB",
    desc: "Pencarian kontak langsung ke database perusahaan Lusha menggunakan integrasi Lusha V3.",
  },
};

export function SearchEnginesIntegrationSubTab() {
  const [config, setConfig] = useState<SearchEngineConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const [testStatus, setTestStatus] = useState<Record<string, { loading: boolean; success?: boolean; message?: string }>>({});

  const toggleVisibility = (key: string) => {
    setVisibleSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/settings/integrations");
      const json = await res.json();

      if (res.ok && json.data) {
        const rawMap = json.data as Record<string, Array<{ key: string; value: string; is_active: boolean }>>;
        const allItems = Object.values(rawMap).flat();

        const findVal = (key: string, def = ""): string => {
          const item = allItems.find((i) => i.key === key);
          return item ? item.value : def;
        };

        const findBool = (key: string, def = false): boolean => {
          const item = allItems.find((i) => i.key === key);
          if (!item) return def;
          return item.value === "true" || item.value === "1" || (item.value as unknown) === true;
        };

        let priorityArr: SearchEngineKey[] = DEFAULT_CONFIG.SEARCH_ENGINE_PRIORITY;
        const priorityItem = allItems.find((i) => i.key === "SEARCH_ENGINE_PRIORITY");
        if (priorityItem && priorityItem.value) {
          try {
            const parsed = typeof priorityItem.value === "string" ? JSON.parse(priorityItem.value) : priorityItem.value;
            if (Array.isArray(parsed) && parsed.length > 0) {
              priorityArr = parsed.filter((k) => k in ENGINE_METADATA);
            }
          } catch {
            // Keep default
          }
        }

        setConfig({
          SERPER_ENABLED: findBool("SERPER_ENABLED"),
          SERPER_API_KEY: findVal("SERPER_API_KEY"),

          CUSTOM_SEARCH_ENABLED: findBool("CUSTOM_SEARCH_ENABLED"),
          CUSTOM_SEARCH_ENDPOINT: findVal("CUSTOM_SEARCH_ENDPOINT"),
          CUSTOM_SEARCH_API_KEY: findVal("CUSTOM_SEARCH_API_KEY"),
          CUSTOM_SEARCH_HEADER_NAME: findVal("CUSTOM_SEARCH_HEADER_NAME", "Authorization"),
          CUSTOM_SEARCH_AUTH_TYPE: (findVal("CUSTOM_SEARCH_AUTH_TYPE", "Bearer") as "Bearer" | "Header" | "QueryParam"),
          CUSTOM_SEARCH_METHOD: (findVal("CUSTOM_SEARCH_METHOD", "POST") as "POST" | "GET"),

          GOOGLE_CSE_ENABLED: findBool("GOOGLE_CSE_ENABLED"),
          GOOGLE_CUSTOM_SEARCH_API_KEY: findVal("GOOGLE_CUSTOM_SEARCH_API_KEY", findVal("GOOGLE_SEARCH_API_KEY")),
          GOOGLE_CUSTOM_SEARCH_ENGINE_ID: findVal("GOOGLE_CUSTOM_SEARCH_ENGINE_ID", findVal("GOOGLE_SEARCH_ENGINE_ID")),

          TAVILY_ENABLED: findBool("TAVILY_ENABLED"),
          TAVILY_API_KEY: findVal("TAVILY_API_KEY"),

          LUSHA_SEARCH_ENABLED: findBool("LUSHA_SEARCH_ENABLED", findBool("LUSHA_ENABLED")),
          LUSHA_API_KEY: findVal("LUSHA_API_KEY"),

          SEARCH_ENGINE_PRIORITY: priorityArr,
        });
      }
    } catch {
      setNotice({ type: "error", message: "Gagal memuat konfigurasi mesin pencari." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const movePriority = (index: number, direction: "up" | "down") => {
    const newPriority = [...config.SEARCH_ENGINE_PRIORITY];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newPriority.length) return;

    const temp = newPriority[index];
    newPriority[index] = newPriority[targetIndex];
    newPriority[targetIndex] = temp;

    setConfig({ ...config, SEARCH_ENGINE_PRIORITY: newPriority });
  };

  const handleTestConnection = async (provider: SearchEngineKey) => {
    setTestStatus((prev) => ({ ...prev, [provider]: { loading: true } }));
    try {
      const credentials: Record<string, string> = {};
      if (provider === "serper") {
        credentials.SERPER_API_KEY = config.SERPER_API_KEY;
      } else if (provider === "custom") {
        credentials.CUSTOM_SEARCH_ENDPOINT = config.CUSTOM_SEARCH_ENDPOINT;
        credentials.CUSTOM_SEARCH_API_KEY = config.CUSTOM_SEARCH_API_KEY;
        credentials.CUSTOM_SEARCH_HEADER_NAME = config.CUSTOM_SEARCH_HEADER_NAME;
        credentials.CUSTOM_SEARCH_AUTH_TYPE = config.CUSTOM_SEARCH_AUTH_TYPE;
        credentials.CUSTOM_SEARCH_METHOD = config.CUSTOM_SEARCH_METHOD;
      } else if (provider === "google_cse") {
        credentials.GOOGLE_CUSTOM_SEARCH_API_KEY = config.GOOGLE_CUSTOM_SEARCH_API_KEY;
        credentials.GOOGLE_CUSTOM_SEARCH_ENGINE_ID = config.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
      } else if (provider === "tavily") {
        credentials.TAVILY_API_KEY = config.TAVILY_API_KEY;
      } else if (provider === "lusha") {
        credentials.LUSHA_API_KEY = config.LUSHA_API_KEY;
      }

      const res = await apiFetch("/settings/integrations/search-engines/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, credentials }),
      });
      const data = await res.json();

      setTestStatus((prev) => ({
        ...prev,
        [provider]: {
          loading: false,
          success: res.ok && data.success,
          message: data.message || (res.ok ? "Koneksi berhasil terverifikasi." : "Uji koneksi gagal."),
        },
      }));
    } catch (e: unknown) {
      const err = e as Error;
      setTestStatus((prev) => ({
        ...prev,
        [provider]: {
          loading: false,
          success: false,
          message: err.message || "Gagal menghubungi server pengujian.",
        },
      }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setNotice(null);

    const payload = {
      category: "search_engines",
      configs: [
        { key: "SERPER_ENABLED", value: config.SERPER_ENABLED ? "true" : "false", is_secret: false, value_type: "boolean" },
        { key: "SERPER_API_KEY", value: config.SERPER_API_KEY, is_secret: true, value_type: "string" },

        { key: "CUSTOM_SEARCH_ENABLED", value: config.CUSTOM_SEARCH_ENABLED ? "true" : "false", is_secret: false, value_type: "boolean" },
        { key: "CUSTOM_SEARCH_ENDPOINT", value: config.CUSTOM_SEARCH_ENDPOINT, is_secret: false, value_type: "string" },
        { key: "CUSTOM_SEARCH_API_KEY", value: config.CUSTOM_SEARCH_API_KEY, is_secret: true, value_type: "string" },
        { key: "CUSTOM_SEARCH_HEADER_NAME", value: config.CUSTOM_SEARCH_HEADER_NAME, is_secret: false, value_type: "string" },
        { key: "CUSTOM_SEARCH_AUTH_TYPE", value: config.CUSTOM_SEARCH_AUTH_TYPE, is_secret: false, value_type: "string" },
        { key: "CUSTOM_SEARCH_METHOD", value: config.CUSTOM_SEARCH_METHOD, is_secret: false, value_type: "string" },

        { key: "GOOGLE_CSE_ENABLED", value: config.GOOGLE_CSE_ENABLED ? "true" : "false", is_secret: false, value_type: "boolean" },
        { key: "GOOGLE_CUSTOM_SEARCH_API_KEY", value: config.GOOGLE_CUSTOM_SEARCH_API_KEY, is_secret: true, value_type: "string" },
        { key: "GOOGLE_CUSTOM_SEARCH_ENGINE_ID", value: config.GOOGLE_CUSTOM_SEARCH_ENGINE_ID, is_secret: false, value_type: "string" },

        { key: "TAVILY_ENABLED", value: config.TAVILY_ENABLED ? "true" : "false", is_secret: false, value_type: "boolean" },
        { key: "TAVILY_API_KEY", value: config.TAVILY_API_KEY, is_secret: true, value_type: "string" },

        { key: "LUSHA_SEARCH_ENABLED", value: config.LUSHA_SEARCH_ENABLED ? "true" : "false", is_secret: false, value_type: "boolean" },
        { key: "LUSHA_API_KEY", value: config.LUSHA_API_KEY, is_secret: true, value_type: "string" },

        { key: "SEARCH_ENGINE_PRIORITY", value: JSON.stringify(config.SEARCH_ENGINE_PRIORITY), is_secret: false, value_type: "json" },
      ],
    };

    try {
      const res = await apiFetch("/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setNotice({ type: "success", message: "Pengaturan Mesin Pencari & Discovery PIC berhasil disimpan!" });
        fetchConfigs();
      } else {
        const errJson = await res.json();
        setNotice({ type: "error", message: errJson.message || "Gagal menyimpan pengaturan." });
      }
    } catch {
      setNotice({ type: "error", message: "Terjadi kesalahan jaringan saat menyimpan konfigurasi." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Globe2 className="h-5 w-5 text-indigo-500" />
              <h2 className="text-xl font-semibold">Search Engines & PIC Discovery</h2>
              <Badge variant="neutral">Deep Search Engine</Badge>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Konfigurasi mesin pencari dan alur sekuensial prioritas untuk fitur <strong>Contact Deep Search</strong>.
              Sistem akan menjalankan mesin pencari dari <strong>P1</strong>; jika tidak ditemukan profil PIC, sistem secara otomatis
              beralih ke <strong>P2</strong>, <strong>P3</strong>, dan seterusnya secara berurutan tanpa jeda kegagalan.
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="shrink-0 gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan Konfigurasi
          </Button>
        </div>

        {notice && (
          <div
            className={cn(
              "mt-4 flex items-center gap-2 rounded-lg border p-3 text-xs font-medium",
              notice.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
            )}
          >
            {notice.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span>{notice.message}</span>
          </div>
        )}
      </div>

      {/* ── Priority Sequence Visualizer ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Urutan Prioritas Eksekusi (Sequential Fallback Pipeline)
            </span>
            <span className="text-xs font-normal text-muted-foreground">Gunakan tombol panah untuk mengatur prioritas</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Ketika user menekan tombol <strong>Deep Search (Yahoo/AI)</strong> pada modal Tambah Kontak, mesin dengan prioritas tertinggi (P1)
            akan dipanggil lebih dulu. Jika kandidat tidak ditemukan, pencarian akan mengalir ke prioritas berikutnya.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {config.SEARCH_ENGINE_PRIORITY.map((key, idx) => {
              const meta = ENGINE_METADATA[key];
              const isEnabled =
                key === "serper"
                  ? config.SERPER_ENABLED
                  : key === "custom"
                  ? config.CUSTOM_SEARCH_ENABLED
                  : key === "google_cse"
                  ? config.GOOGLE_CSE_ENABLED
                  : key === "tavily"
                  ? config.TAVILY_ENABLED
                  : config.LUSHA_SEARCH_ENABLED;

              return (
                <div
                  key={key}
                  className={cn(
                    "flex flex-col justify-between rounded-xl border p-3 transition-colors",
                    isEnabled ? "border-indigo-500/40 bg-indigo-500/5" : "border-border bg-muted/20 opacity-70"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={isEnabled ? "info" : "neutral"} className="text-[10px] font-bold">
                          P{idx + 1}
                        </Badge>
                        <span className="text-xs font-semibold">{meta.name}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1">{meta.tag}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-xs">
                    <span className={cn("text-[10px] font-medium", isEnabled ? "text-emerald-500" : "text-muted-foreground")}>
                      {isEnabled ? "Aktif" : "Nonaktif"}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        disabled={idx === 0}
                        onClick={() => movePriority(idx, "up")}
                        title="Naikkan prioritas"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        disabled={idx === config.SEARCH_ENGINE_PRIORITY.length - 1}
                        onClick={() => movePriority(idx, "down")}
                        title="Turunkan prioritas"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Search Engines Provider Cards ── */}
      <div className="space-y-4">
        {/* 1. Serper.dev */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold">1. Serper.dev (Google SERP JSON API)</CardTitle>
                  <Badge variant="success">Rekomendasi Utama</Badge>
                </div>
                <CardDescription className="mt-1 text-xs">
                  Mesin Google Search JSON ultra-cepat (&lt;1s) dengan bypass proteksi bot. Menyediakan <strong>2.500 pencarian gratis</strong>.
                </CardDescription>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={config.SERPER_ENABLED}
                  onChange={(e) => setConfig({ ...config, SERPER_ENABLED: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-indigo-600 after:absolute after:top-0.5 after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
              </label>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Serper API Key</label>
              <div className="relative mt-1">
                <Input
                  type={visibleSecrets.SERPER_API_KEY ? "text" : "password"}
                  placeholder="Paste Serper API Key (misal: 64b8a7...)"
                  value={config.SERPER_API_KEY}
                  onChange={(e) => setConfig({ ...config, SERPER_API_KEY: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility("SERPER_API_KEY")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {visibleSecrets.SERPER_API_KEY ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Belum punya akun? Daftar gratis di{" "}
                <a href="https://serper.dev" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline inline-flex items-center gap-0.5">
                  serper.dev <ExternalLink className="h-2.5 w-2.5" />
                </a>{" "}
                (Dapatkan 2.500 credit gratis tanpa kartu kredit).
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTestConnection("serper")}
                disabled={testStatus.serper?.loading || !config.SERPER_API_KEY}
                className="gap-1.5 text-xs"
              >
                {testStatus.serper?.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                Uji Koneksi Serper
              </Button>
              {testStatus.serper && (
                <span
                  className={cn(
                    "text-xs font-medium flex items-center gap-1",
                    testStatus.serper.success ? "text-emerald-500" : "text-rose-500"
                  )}
                >
                  {testStatus.serper.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  {testStatus.serper.message}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 2. Custom Search Endpoint (BYOE) */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold">2. Custom Search Endpoint (BYOE / SearXNG / Proxy)</CardTitle>
                  <Badge variant="neutral">Fleksibel</Badge>
                </div>
                <CardDescription className="mt-1 text-xs">
                  Gunakan server pencarian sendiri atau API gateway proxy HTTP internal untuk mengekstrak hasil pencarian web.
                </CardDescription>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={config.CUSTOM_SEARCH_ENABLED}
                  onChange={(e) => setConfig({ ...config, CUSTOM_SEARCH_ENABLED: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-indigo-600 after:absolute after:top-0.5 after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
              </label>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Search Endpoint URL</label>
                <Input
                  type="url"
                  placeholder="https://search.my-proxy.com/api/v1/search"
                  value={config.CUSTOM_SEARCH_ENDPOINT}
                  onChange={(e) => setConfig({ ...config, CUSTOM_SEARCH_ENDPOINT: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">API Key / Secret Token</label>
                <div className="relative mt-1">
                  <Input
                    type={visibleSecrets.CUSTOM_SEARCH_API_KEY ? "text" : "password"}
                    placeholder="Optional Auth Token..."
                    value={config.CUSTOM_SEARCH_API_KEY}
                    onChange={(e) => setConfig({ ...config, CUSTOM_SEARCH_API_KEY: e.target.value })}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility("CUSTOM_SEARCH_API_KEY")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {visibleSecrets.CUSTOM_SEARCH_API_KEY ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Header Name</label>
                <Input
                  type="text"
                  placeholder="Authorization (atau X-API-Key)"
                  value={config.CUSTOM_SEARCH_HEADER_NAME}
                  onChange={(e) => setConfig({ ...config, CUSTOM_SEARCH_HEADER_NAME: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Auth Format</label>
                <Select
                  value={config.CUSTOM_SEARCH_AUTH_TYPE}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      CUSTOM_SEARCH_AUTH_TYPE: e.target.value as "Bearer" | "Header" | "QueryParam",
                    })
                  }
                  className="mt-1"
                >
                  <option value="Bearer">Bearer Token (Authorization: Bearer &lt;token&gt;)</option>
                  <option value="Header">Raw Header Value (&lt;HeaderName&gt;: &lt;token&gt;)</option>
                  <option value="QueryParam">Query Parameter (?key=&lt;token&gt;)</option>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">HTTP Method</label>
                <Select
                  value={config.CUSTOM_SEARCH_METHOD}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      CUSTOM_SEARCH_METHOD: e.target.value as "POST" | "GET",
                    })
                  }
                  className="mt-1"
                >
                  <option value="POST">POST (JSON Payload)</option>
                  <option value="GET">GET (Query Parameters)</option>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTestConnection("custom")}
                disabled={testStatus.custom?.loading || !config.CUSTOM_SEARCH_ENDPOINT}
                className="gap-1.5 text-xs"
              >
                {testStatus.custom?.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Server className="h-3.5 w-3.5" />}
                Uji Endpoint Custom
              </Button>
              {testStatus.custom && (
                <span
                  className={cn(
                    "text-xs font-medium flex items-center gap-1",
                    testStatus.custom.success ? "text-emerald-500" : "text-rose-500"
                  )}
                >
                  {testStatus.custom.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  {testStatus.custom.message}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3. Google Custom Search (CSE) */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold">3. Google Custom Search (Programmable Search Engine / CSE)</CardTitle>
                  <Badge variant="neutral">Resmi Google</Badge>
                </div>
                <CardDescription className="mt-1 text-xs">
                  Integrasi resmi Google Custom Search API. Membutuhkan Google Cloud API Key dan Search Engine ID (cx).
                </CardDescription>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={config.GOOGLE_CSE_ENABLED}
                  onChange={(e) => setConfig({ ...config, GOOGLE_CSE_ENABLED: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-indigo-600 after:absolute after:top-0.5 after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
              </label>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Google API Key</label>
                <div className="relative mt-1">
                  <Input
                    type={visibleSecrets.GOOGLE_CUSTOM_SEARCH_API_KEY ? "text" : "password"}
                    placeholder="AIzaSy..."
                    value={config.GOOGLE_CUSTOM_SEARCH_API_KEY}
                    onChange={(e) => setConfig({ ...config, GOOGLE_CUSTOM_SEARCH_API_KEY: e.target.value })}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility("GOOGLE_CUSTOM_SEARCH_API_KEY")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {visibleSecrets.GOOGLE_CUSTOM_SEARCH_API_KEY ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Search Engine ID (cx)</label>
                <Input
                  type="text"
                  placeholder="e.g. 0123456789abcdef:example"
                  value={config.GOOGLE_CUSTOM_SEARCH_ENGINE_ID}
                  onChange={(e) => setConfig({ ...config, GOOGLE_CUSTOM_SEARCH_ENGINE_ID: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTestConnection("google_cse")}
                disabled={testStatus.google_cse?.loading || !config.GOOGLE_CUSTOM_SEARCH_API_KEY || !config.GOOGLE_CUSTOM_SEARCH_ENGINE_ID}
                className="gap-1.5 text-xs"
              >
                {testStatus.google_cse?.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                Uji Koneksi Google CSE
              </Button>
              {testStatus.google_cse && (
                <span
                  className={cn(
                    "text-xs font-medium flex items-center gap-1",
                    testStatus.google_cse.success ? "text-emerald-500" : "text-rose-500"
                  )}
                >
                  {testStatus.google_cse.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  {testStatus.google_cse.message}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 4. Tavily AI Search */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold">4. Tavily AI Search (Agentic Search)</CardTitle>
                  <Badge variant="neutral">AI-Native</Badge>
                </div>
                <CardDescription className="mt-1 text-xs">
                  Search Engine yang didesain khusus untuk AI Agent dengan filter domain LinkedIn dan ekstraksi entitas keputusan.
                </CardDescription>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={config.TAVILY_ENABLED}
                  onChange={(e) => setConfig({ ...config, TAVILY_ENABLED: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-indigo-600 after:absolute after:top-0.5 after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
              </label>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tavily API Key</label>
              <div className="relative mt-1">
                <Input
                  type={visibleSecrets.TAVILY_API_KEY ? "text" : "password"}
                  placeholder="tvly-..."
                  value={config.TAVILY_API_KEY}
                  onChange={(e) => setConfig({ ...config, TAVILY_API_KEY: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility("TAVILY_API_KEY")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {visibleSecrets.TAVILY_API_KEY ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Daftar akun gratis di{" "}
                <a href="https://tavily.com" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline inline-flex items-center gap-0.5">
                  tavily.com <ExternalLink className="h-2.5 w-2.5" />
                </a>{" "}
                (Tersedia 1.000 free search per bulan).
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTestConnection("tavily")}
                disabled={testStatus.tavily?.loading || !config.TAVILY_API_KEY}
                className="gap-1.5 text-xs"
              >
                {testStatus.tavily?.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                Uji Koneksi Tavily
              </Button>
              {testStatus.tavily && (
                <span
                  className={cn(
                    "text-xs font-medium flex items-center gap-1",
                    testStatus.tavily.success ? "text-emerald-500" : "text-rose-500"
                  )}
                >
                  {testStatus.tavily.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  {testStatus.tavily.message}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 5. Lusha Discovery */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold">5. Lusha B2B People Discovery</CardTitle>
                  <Badge variant="neutral">B2B Database</Badge>
                </div>
                <CardDescription className="mt-1 text-xs">
                  Mencari profil PIC langsung dari database Lusha berdasarkan nama atau domain perusahaan Lead.
                </CardDescription>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={config.LUSHA_SEARCH_ENABLED}
                  onChange={(e) => setConfig({ ...config, LUSHA_SEARCH_ENABLED: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-indigo-600 after:absolute after:top-0.5 after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
              </label>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Lusha API Key</label>
              <div className="relative mt-1">
                <Input
                  type={visibleSecrets.LUSHA_API_KEY ? "text" : "password"}
                  placeholder="Lusha API Key (terhubung juga dengan tab Lusha)..."
                  value={config.LUSHA_API_KEY}
                  onChange={(e) => setConfig({ ...config, LUSHA_API_KEY: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility("LUSHA_API_KEY")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {visibleSecrets.LUSHA_API_KEY ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Kunci ini tersinkronisasi otomatis dengan pengaturan di tab <strong>Lusha</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTestConnection("lusha")}
                disabled={testStatus.lusha?.loading || !config.LUSHA_API_KEY}
                className="gap-1.5 text-xs"
              >
                {testStatus.lusha?.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                Uji Koneksi Lusha
              </Button>
              {testStatus.lusha && (
                <span
                  className={cn(
                    "text-xs font-medium flex items-center gap-1",
                    testStatus.lusha.success ? "text-emerald-500" : "text-rose-500"
                  )}
                >
                  {testStatus.lusha.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  {testStatus.lusha.message}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom Save Bar ── */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan Semua Pengaturan
        </Button>
      </div>
    </div>
  );
}
