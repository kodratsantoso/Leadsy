"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, Key, MapPin, MessageSquare, CheckCircle2, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

type IntegrationConfig = {
  id?: number;
  category: string;
  key: string;
  value: string;
  is_secret: boolean;
  is_active: boolean;
  value_type: "string" | "boolean" | "number" | "json";
};

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
  const [tab, setTab] = useState<"maps" | "whatsapp" | "lusha" | "webhooks">("maps");
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg]   = useState("");

  const [mapsConfig, setMapsConfig]         = useState<Record<string, IntegrationConfig>>(DEFAULT_MAPS);
  const [whatsappConfig, setWhatsappConfig] = useState<Record<string, IntegrationConfig>>(DEFAULT_WHATSAPP);
  const [lushaConfig, setLushaConfig]       = useState<Record<string, IntegrationConfig>>(DEFAULT_LUSHA);

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
          (json.data.maps as IntegrationConfig[]).forEach((c) => { next[c.key] = c; });
          setMapsConfig(next);
        }

        if (json.data.whatsapp) {
          const next = { ...DEFAULT_WHATSAPP };
          (json.data.whatsapp as IntegrationConfig[]).forEach((c) => { next[c.key] = c; });
          setWhatsappConfig(next);
        }

        if (json.data.lusha) {
          const next = { ...DEFAULT_LUSHA };
          (json.data.lusha as IntegrationConfig[]).forEach((c) => { next[c.key] = c; });
          setLushaConfig(next);
        }
      })
      .catch(err => console.warn("Integration config load:", err))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          Manage API keys, endpoints, and third-party systems — BRD Integration Registry
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-border">
        {[
          { id: "maps",      label: "Google Maps", icon: MapPin },
          { id: "whatsapp",  label: "WhatsApp",    icon: MessageSquare },
          { id: "lusha",     label: "Lusha",       icon: Key },
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
