"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Save, Loader2, Loader, Key, MapPin, MessageSquare, CheckCircle2, Check, X, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type IntegrationConfig = {
  id?: number;
  category: string;
  key: string;
  value: string;
  is_secret: boolean;
  is_active: boolean;
  value_type: "string" | "boolean" | "number" | "json";
};

const asBooleanString = (value: unknown) => (value === true || value === "true" || value === 1 || value === "1" ? "true" : "false");
const asStringValue = (value: unknown) => (value == null ? "" : String(value));

const normalizeLarkModuleValue = (value: unknown) => value === true || value === "true";
const normalizeLarkModules = (modules: Record<string, unknown> | null | undefined) => ({
  messenger: normalizeLarkModuleValue(modules?.messenger),
  meeting: normalizeLarkModuleValue(modules?.meeting),
  calendar: normalizeLarkModuleValue(modules?.calendar),
  task: normalizeLarkModuleValue(modules?.task),
  base: normalizeLarkModuleValue(modules?.base),
  sso: normalizeLarkModuleValue(modules?.sso),
});

const DEFAULT_MAPS: Record<string, IntegrationConfig> = {
  GOOGLE_MAPS_ENABLED:            { category: "maps", key: "GOOGLE_MAPS_ENABLED",            value: "true",    is_secret: false, is_active: true, value_type: "boolean" },
  GOOGLE_MAPS_BROWSER_API_KEY:    { category: "maps", key: "GOOGLE_MAPS_BROWSER_API_KEY",    value: "",        is_secret: false, is_active: true, value_type: "string"  },
  GOOGLE_MAPS_DEFAULT_CENTER_LAT: { category: "maps", key: "GOOGLE_MAPS_DEFAULT_CENTER_LAT", value: "-6.2088", is_secret: false, is_active: true, value_type: "number"  },
  GOOGLE_MAPS_DEFAULT_CENTER_LNG: { category: "maps", key: "GOOGLE_MAPS_DEFAULT_CENTER_LNG", value: "106.8456",is_secret: false, is_active: true, value_type: "number"  },
};

const DEFAULT_WHATSAPP: Record<string, IntegrationConfig> = {
  WHATSAPP_ENABLED:      { category: "whatsapp", key: "WHATSAPP_ENABLED",      value: "true",                  is_secret: false, is_active: true, value_type: "boolean" },
  WHATSAPP_SESSION_NAME: { category: "whatsapp", key: "WHATSAPP_SESSION_NAME", value: "leads_platform_session", is_secret: false, is_active: true, value_type: "string"  },
  WHATSAPP_WEBHOOK_URL:  { category: "whatsapp", key: "WHATSAPP_WEBHOOK_URL",  value: "",                      is_secret: false, is_active: true, value_type: "string"  },
};

const DEFAULT_LUSHA: Record<string, IntegrationConfig> = {
  LUSHA_ENABLED:              { category: "lusha", key: "LUSHA_ENABLED",              value: "false", is_secret: false, is_active: true, value_type: "boolean" },
  LUSHA_API_KEY:              { category: "lusha", key: "LUSHA_API_KEY",              value: "",      is_secret: true,  is_active: true, value_type: "string"  },
  LUSHA_MAX_DAILY_REQUESTS:   { category: "lusha", key: "LUSHA_MAX_DAILY_REQUESTS",   value: "50",    is_secret: false, is_active: true, value_type: "number"  },
  LUSHA_MAX_PER_BATCH:        { category: "lusha", key: "LUSHA_MAX_PER_BATCH",        value: "10",    is_secret: false, is_active: true, value_type: "number"  },
  LUSHA_ENRICHMENT_PRIORITY:  { category: "lusha", key: "LUSHA_ENRICHMENT_PRIORITY",  value: "1",     is_secret: false, is_active: true, value_type: "number"  },
};

export default function IntegrationsSettingsPage() {
  const [tab, setTab] = useState<"maps" | "whatsapp" | "lusha" | "webhooks" | "lark">("maps");
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg]   = useState("");

  const [mapsConfig, setMapsConfig]         = useState<Record<string, IntegrationConfig>>(DEFAULT_MAPS);
  const [whatsappConfig, setWhatsappConfig] = useState<Record<string, IntegrationConfig>>(DEFAULT_WHATSAPP);
  const [lushaConfig, setLushaConfig]       = useState<Record<string, IntegrationConfig>>(DEFAULT_LUSHA);
  const [larkConfig, setLarkConfig] = useState({
    app_id: '',
    app_secret: '',
    verification_token: '',
    encrypt_key: '',
    base_url: '',
  });
  const [larkModules, setLarkModules] = useState({
    messenger: false,
    meeting: false,
    calendar: false,
    task: false,
    base: false,
    sso: false,
  });

  // ── Load saved configs from DB (authenticated) ──────────────────────────────
  useEffect(() => {
    apiFetch("/settings/integrations")
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => {
        if (!json?.data) return;

        if (json.data.maps) {
          const next = { ...DEFAULT_MAPS };
          (json.data.maps as IntegrationConfig[]).forEach((c) => {
            next[c.key] = {
              ...c,
              value: c.value_type === "boolean" ? asBooleanString(c.value) : asStringValue(c.value),
            };
          });
          setMapsConfig(next);
        }

        if (json.data.whatsapp) {
          const next = { ...DEFAULT_WHATSAPP };
          (json.data.whatsapp as IntegrationConfig[]).forEach((c) => {
            next[c.key] = {
              ...c,
              value: c.value_type === "boolean" ? asBooleanString(c.value) : asStringValue(c.value),
            };
          });
          setWhatsappConfig(next);
        }

        if (json.data.lusha) {
          const next = { ...DEFAULT_LUSHA };
          (json.data.lusha as IntegrationConfig[]).forEach((c) => {
            next[c.key] = {
              ...c,
              value: c.value_type === "boolean" ? asBooleanString(c.value) : asStringValue(c.value),
            };
          });
          setLushaConfig(next);
        }
      })
      .catch(err => console.warn("Integration config load:", err))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: larkConfigData, refetch: refetchLarkConfig } = useQuery({
    queryKey: ['lark-config'],
    queryFn: async () => {
      const res = await apiFetch('/api/lark/config');
      return res.json();
    },
  });

  const { data: larkStatusData } = useQuery({
    queryKey: ['lark-status'],
    queryFn: async () => {
      const res = await apiFetch('/api/lark/status');
      return res.json();
    },
    refetchInterval: 5000,
  });

  const saveLarkConfigMutation = useMutation({
    mutationFn: async (data: typeof larkConfig) => {
      const res = await apiFetch('/api/lark/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          enabled_modules: larkModules,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to save Lark configuration');
      }
      return json;
    },
    onSuccess: () => {
      refetchLarkConfig();
      setSuccessMsg('Lark integration configured successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (error: any) => {
      setErrorMsg(error?.message || 'Failed to save Lark configuration');
      setTimeout(() => setErrorMsg(''), 5000);
    },
  });

  const testLarkConnectionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/api/lark/test-connection', {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to verify Lark connection');
      }
      return json;
    },
    onError: (error: any) => {
      setErrorMsg(error?.message || 'Failed to verify Lark connection');
      setTimeout(() => setErrorMsg(''), 5000);
    },
  });

  const toggleLarkModuleMutation = useMutation({
    mutationFn: async ({ module, enabled }: { module: string; enabled: boolean }) => {
      const res = await apiFetch('/api/lark/toggle-module', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module, enabled }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to update Lark module state');
      }
      return json;
    },
    onSuccess: (data) => {
      setLarkModules(data.enabled_modules || larkModules);
      refetchLarkConfig();
    },
    onError: (error: any) => {
      setErrorMsg(error?.message || 'Failed to update Lark module state');
      setTimeout(() => setErrorMsg(''), 5000);
    },
  });

  useEffect(() => {
    if (larkConfigData?.configured) {
      setLarkConfig({
        app_id: larkConfigData.app_id || '',
        app_secret: '',
        verification_token: '',
        encrypt_key: '',
        base_url: larkConfigData.base_url || '',
      });
      setLarkModules(normalizeLarkModules(larkConfigData.enabled_modules));
    }
  }, [larkConfigData]);

  // ── Save configs to DB (authenticated) ──────────────────────────────────────
  const handleSave = async (category: string, configs: Record<string, IntegrationConfig>) => {
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const payload = {
        category,
        configs: Object.values(configs).map((c) => ({
          key:        c.key,
          value:      c.value,
          is_secret:  c.is_secret,
          value_type: c.value_type,
          is_active:  c.is_active,
        })),
      };

      const res = await apiFetch("/settings/integrations", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccessMsg("Settings saved successfully!");
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        const body = await res.json().catch(() => ({}));
        setErrorMsg(body?.message || `Save failed (HTTP ${res.status})`);
        setTimeout(() => setErrorMsg(""), 5000);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Network error");
      setTimeout(() => setErrorMsg(""), 5000);
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
    <div className="space-y-6 p-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integration Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage non-AI API keys, endpoints, and third-party systems.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--brand)]/20 bg-[var(--brand)]/5 p-4">
        <p className="text-sm font-medium text-foreground">AI providers and AI API keys now live in one place.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Use <Link href="/settings/ai-defaults" className="font-medium text-[var(--brand)] hover:underline">Settings → AI Default</Link> for AI providers, model routing, prompt templates, fallback order, and secure key visibility.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-border">
        {[
          { id: "maps",      label: "Google Maps", icon: MapPin },
          { id: "whatsapp",  label: "WhatsApp",    icon: MessageSquare },
          { id: "lusha",     label: "Lusha",       icon: Key },
          { id: "lark",      label: "Lark",        icon: Key },
          { id: "webhooks",  label: "Webhooks",    icon: Key },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 border-b-2 px-1 pb-2.5 text-sm font-medium capitalize transition-colors ${
              tab === t.id
                ? "border-indigo-500 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Google Maps ── */}
      {tab === "maps" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-1">Google Maps Configuration</h2>
            <p className="text-xs text-muted-foreground mb-6">
              Configure the Google Maps API key for the Map & Territory page.
              Get a key from{" "}
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-indigo-400 underline">
                Google Cloud Console
              </a>
              .
            </p>

            <div className="space-y-5">
              {/* Enable toggle */}
              <div className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3">
                <div>
                  <label className="text-sm font-medium">Enable Maps Integration</label>
                  <p className="text-xs text-muted-foreground">Toggle the map interface across the entire application.</p>
                </div>
                <input
                  type="checkbox"
                  checked={mapsConfig.GOOGLE_MAPS_ENABLED.value === "true"}
                  onChange={(e) => setMapsConfig({
                    ...mapsConfig,
                    GOOGLE_MAPS_ENABLED: { ...mapsConfig.GOOGLE_MAPS_ENABLED, value: e.target.checked ? "true" : "false" },
                  })}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
              </div>

              {/* Browser API Key */}
              <div>
                <label className="text-sm font-semibold">Browser API Key (Public)</label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Key used for client-side map rendering. Must be restricted by HTTP referrer in Google Cloud Console.
                </p>
                <input
                  type="text"
                  placeholder="AIzaSy..."
                  value={mapsConfig.GOOGLE_MAPS_BROWSER_API_KEY.value}
                  onChange={(e) => setMapsConfig({
                    ...mapsConfig,
                    GOOGLE_MAPS_BROWSER_API_KEY: { ...mapsConfig.GOOGLE_MAPS_BROWSER_API_KEY, value: e.target.value },
                  })}
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground/40"
                  autoComplete="off"
                  spellCheck={false}
                />
                {mapsConfig.GOOGLE_MAPS_BROWSER_API_KEY.value && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-emerald-500">
                    <CheckCircle2 className="h-3 w-3" /> API key entered — save to apply
                  </p>
                )}
                {!mapsConfig.GOOGLE_MAPS_BROWSER_API_KEY.value && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-amber-500">
                    <AlertCircle className="h-3 w-3" /> No key configured — map runs in preview mode
                  </p>
                )}
              </div>

              {/* Lat / Lng */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Default Center Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={mapsConfig.GOOGLE_MAPS_DEFAULT_CENTER_LAT.value}
                    onChange={(e) => setMapsConfig({
                      ...mapsConfig,
                      GOOGLE_MAPS_DEFAULT_CENTER_LAT: { ...mapsConfig.GOOGLE_MAPS_DEFAULT_CENTER_LAT, value: e.target.value },
                    })}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Default Center Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={mapsConfig.GOOGLE_MAPS_DEFAULT_CENTER_LNG.value}
                    onChange={(e) => setMapsConfig({
                      ...mapsConfig,
                      GOOGLE_MAPS_DEFAULT_CENTER_LNG: { ...mapsConfig.GOOGLE_MAPS_DEFAULT_CENTER_LNG, value: e.target.value },
                    })}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => handleSave("maps", mapsConfig)}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Maps Config
              </button>
              {successMsg && (
                <span className="flex items-center gap-1 text-sm font-medium text-emerald-500">
                  <CheckCircle2 className="h-4 w-4" /> {successMsg}
                </span>
              )}
              {errorMsg && (
                <span className="flex items-center gap-1 text-sm font-medium text-red-500">
                  <AlertCircle className="h-4 w-4" /> {errorMsg}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── WhatsApp ── */}
      {tab === "whatsapp" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-1">WhatsApp Integration</h2>
            <p className="text-xs text-muted-foreground mb-6">
              Configure the WhatsApp session and webhook settings for the messaging module.
            </p>

            <div className="space-y-5">
              <div className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3">
                <div>
                  <label className="text-sm font-medium">Enable WhatsApp Features</label>
                  <p className="text-xs text-muted-foreground">Allows users to scan a QR code and sync session for direct messaging.</p>
                </div>
                <input
                  type="checkbox"
                  checked={whatsappConfig.WHATSAPP_ENABLED.value === "true"}
                  onChange={(e) => setWhatsappConfig({
                    ...whatsappConfig,
                    WHATSAPP_ENABLED: { ...whatsappConfig.WHATSAPP_ENABLED, value: e.target.checked ? "true" : "false" },
                  })}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Session Name</label>
                <p className="text-xs text-muted-foreground mt-0.5">Identifies this WhatsApp session in the sidecar service.</p>
                <input
                  value={whatsappConfig.WHATSAPP_SESSION_NAME.value}
                  onChange={(e) => setWhatsappConfig({
                    ...whatsappConfig,
                    WHATSAPP_SESSION_NAME: { ...whatsappConfig.WHATSAPP_SESSION_NAME, value: e.target.value },
                  })}
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Webhook URL</label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  URL the WhatsApp sidecar service sends events to (must be reachable from the sidecar container).
                </p>
                <input
                  placeholder="http://backend:8000/api/webhooks/whatsapp"
                  value={whatsappConfig.WHATSAPP_WEBHOOK_URL.value}
                  onChange={(e) => setWhatsappConfig({
                    ...whatsappConfig,
                    WHATSAPP_WEBHOOK_URL: { ...whatsappConfig.WHATSAPP_WEBHOOK_URL, value: e.target.value },
                  })}
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground/40"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => handleSave("whatsapp", whatsappConfig)}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save WhatsApp Config
              </button>
              {successMsg && (
                <span className="flex items-center gap-1 text-sm font-medium text-emerald-500">
                  <CheckCircle2 className="h-4 w-4" /> {successMsg}
                </span>
              )}
              {errorMsg && (
                <span className="flex items-center gap-1 text-sm font-medium text-red-500">
                  <AlertCircle className="h-4 w-4" /> {errorMsg}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Lusha ── */}
      {tab === "lusha" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-1">Lusha Extension (Contact Enrichment)</h2>
            <p className="text-xs text-muted-foreground mb-6">
              Configure Lusha API Key and rate-limiting policies for the Contact Discovery Engine.
            </p>

            <div className="space-y-5">
              <div className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3">
                <div>
                  <label className="text-sm font-medium">Enable Lusha Contact Discovery</label>
                  <p className="text-xs text-muted-foreground">Allows automatic contact discovery during the lead ingestion process.</p>
                </div>
                <input
                  type="checkbox"
                  checked={lushaConfig.LUSHA_ENABLED.value === "true"}
                  onChange={(e) => setLushaConfig({
                    ...lushaConfig,
                    LUSHA_ENABLED: { ...lushaConfig.LUSHA_ENABLED, value: e.target.checked ? "true" : "false" },
                  })}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Lusha API Key</label>
                <input
                  type="password"
                  placeholder="Secret Key..."
                  value={lushaConfig.LUSHA_API_KEY.value}
                  onChange={(e) => setLushaConfig({
                    ...lushaConfig,
                    LUSHA_API_KEY: { ...lushaConfig.LUSHA_API_KEY, value: e.target.value },
                  })}
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Max Daily Requests</label>
                <p className="text-xs text-muted-foreground mt-0.5">Total Lusha API calls allowed per calendar day across all batches.</p>
                <input
                  type="number"
                  min="1"
                  value={lushaConfig.LUSHA_MAX_DAILY_REQUESTS.value}
                  onChange={(e) => setLushaConfig({
                    ...lushaConfig,
                    LUSHA_MAX_DAILY_REQUESTS: { ...lushaConfig.LUSHA_MAX_DAILY_REQUESTS, value: e.target.value },
                  })}
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Max Enrichments per Batch</label>
                <p className="text-xs text-muted-foreground mt-0.5">Maximum number of leads to enrich in a single queue batch run.</p>
                <input
                  type="number"
                  min="1"
                  value={lushaConfig.LUSHA_MAX_PER_BATCH.value}
                  onChange={(e) => setLushaConfig({
                    ...lushaConfig,
                    LUSHA_MAX_PER_BATCH: { ...lushaConfig.LUSHA_MAX_PER_BATCH, value: e.target.value },
                  })}
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Enrichment Priority</label>
                <p className="text-xs text-muted-foreground mt-0.5">Provider order when multiple enrichment sources are configured (lower = higher priority).</p>
                <input
                  type="number"
                  min="1"
                  value={lushaConfig.LUSHA_ENRICHMENT_PRIORITY.value}
                  onChange={(e) => setLushaConfig({
                    ...lushaConfig,
                    LUSHA_ENRICHMENT_PRIORITY: { ...lushaConfig.LUSHA_ENRICHMENT_PRIORITY, value: e.target.value },
                  })}
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => handleSave("lusha", lushaConfig)}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Lusha Config
              </button>
              {successMsg && (
                <span className="flex items-center gap-1 text-sm font-medium text-emerald-500">
                  <CheckCircle2 className="h-4 w-4" /> {successMsg}
                </span>
              )}
              {errorMsg && (
                <span className="flex items-center gap-1 text-sm font-medium text-red-500">
                  <AlertCircle className="h-4 w-4" /> {errorMsg}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Webhooks tab — redirect to Settings → Webhooks ── */}
      {tab === "lark" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-2">
              <div>
                <h2 className="text-xl font-semibold mb-1">Lark Integration</h2>
                <p className="text-xs text-muted-foreground mb-4">
                  Configure your Lark App ID, App Secret, and enable SSO from the Integration Settings page.
                </p>
              </div>
              <div className="rounded-xl border border-border/50 bg-[var(--background)] p-4">
                <p className="text-sm font-semibold">Integration Status</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {larkStatusData?.configured ? (
                    <span className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      Configured and {larkStatusData?.is_active ? 'Active' : 'Inactive'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <X className="w-4 h-4 text-red-600" />
                      Not Configured
                    </span>
                  )}
                </p>
                {larkStatusData?.last_sync_at && (
                  <p className="text-xs text-muted-foreground mt-1">Last sync: {new Date(larkStatusData.last_sync_at).toLocaleString()}</p>
                )}
              </div>
            </div>
          </div>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Lark SSO Credentials</h3>
            <div className="rounded-xl border border-border/50 bg-[var(--background)] p-4 mb-4">
              <p className="text-sm font-medium">Redirect URL for Lark Custom App</p>
              <p className="text-xs text-muted-foreground mt-1">
                Daftarkan URL ini di Lark App → Redirect URLs. Leadsy akan menggunakan URL ini untuk menerima authorization code dari Lark.
              </p>
              <code className="mt-2 block rounded bg-slate-950/5 px-2 py-1 text-xs">
                {typeof window !== 'undefined' ? `${window.location.origin}/auth/lark/callback` : 'https://your-domain.com/auth/lark/callback'}
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Jangan tambahkan query string atau parameter tambahan. Tenant dipilih lewat state internal Leadsy.
              </p>
            </div>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">App ID</label>
                <Input
                  type="text"
                  name="app_id"
                  value={larkConfig.app_id}
                  onChange={(e) => setLarkConfig({ ...larkConfig, app_id: e.target.value })}
                  placeholder="Your Lark App ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">App Secret</label>
                <Input
                  type="password"
                  name="app_secret"
                  value={larkConfig.app_secret}
                  onChange={(e) => setLarkConfig({ ...larkConfig, app_secret: e.target.value })}
                  placeholder="Your Lark App Secret"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Verification Token (Optional)</label>
                <Input
                  type="password"
                  name="verification_token"
                  value={larkConfig.verification_token}
                  onChange={(e) => setLarkConfig({ ...larkConfig, verification_token: e.target.value })}
                  placeholder="For webhook verification"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Encrypt Key (Optional)</label>
                <Input
                  type="password"
                  name="encrypt_key"
                  value={larkConfig.encrypt_key}
                  onChange={(e) => setLarkConfig({ ...larkConfig, encrypt_key: e.target.value })}
                  placeholder="For encrypting webhook data"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Base URL (Optional)</label>
                <Input
                  type="url"
                  name="base_url"
                  value={larkConfig.base_url}
                  onChange={(e) => setLarkConfig({ ...larkConfig, base_url: e.target.value })}
                  placeholder="For Lark Base integration"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={() => saveLarkConfigMutation.mutate(larkConfig)} disabled={saveLarkConfigMutation.isPending}>
                  {saveLarkConfigMutation.isPending ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Configuration'
                  )}
                </Button>
                <Button variant="outline" onClick={() => testLarkConnectionMutation.mutate()} disabled={testLarkConnectionMutation.isPending || !larkConfig.app_id}>
                  {testLarkConnectionMutation.isPending ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </Button>
              </div>
              {successMsg && (
                <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
                  {errorMsg}
                </div>
              )}
              {testLarkConnectionMutation.data && (
                <div className={`mt-3 p-3 rounded-lg ${testLarkConnectionMutation.data.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  {testLarkConnectionMutation.data.success ? '✓ Connection successful!' : '✗ Connection failed: ' + testLarkConnectionMutation.data.error}
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Enabled Lark Modules</h3>
            <p className="text-sm text-muted-foreground mb-4">Enable Lark services by module, including SSO.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(larkModules).map(([module, enabled]) => (
                <button
                  key={module}
                  type="button"
                  onClick={() => toggleLarkModuleMutation.mutate({ module, enabled: !enabled })}
                  className={`text-left p-4 rounded-lg border transition ${enabled ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-gray-50 border-border hover:border-gray-300'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-semibold capitalize">{module}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{getLarkModuleDescription(module)}</p>
                    </div>
                    <div className={`h-5 w-5 rounded border-2 flex items-center justify-center ${enabled ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                      {enabled && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "webhooks" && (
        <div className="rounded-xl border border-border bg-card p-10 text-center shadow-sm">
          <Key className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">Webhook URLs are managed in</p>
          <a href="/settings/webhooks" className="mt-1 inline-block text-sm text-indigo-400 underline underline-offset-2 hover:text-indigo-300">
            Settings → Webhooks →
          </a>
        </div>
      )}
    </div>
  );
}

function getLarkModuleDescription(module: string): string {
  const descriptions: Record<string, string> = {
    messenger: 'Send notifications and messages via Lark',
    meeting: 'Capture meeting transcripts and details',
    calendar: 'Create follow-up calendar events',
    task: 'Create and manage tasks for leads',
    base: 'Sync leads with Lark Base tables',
    sso: 'Log in users via Lark SSO',
  };
  return descriptions[module] || '';
}
