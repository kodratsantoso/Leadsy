"use client";

import { useState, useEffect } from "react";
import { Clock, Key, Loader2, CheckCircle2, AlertCircle, Save } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

type SecuritySettings = {
  session_timeout_minutes: number | null;
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_special: boolean;
};

const TIMEOUT_OPTIONS = [15, 30, 60, 120, 240];

export function SessionSecuritySettings() {
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    apiFetch("/settings/security")
      .then(res => res.json())
      .then(json => setSettings(json.data))
      .catch(() => setError("Failed to load security settings."))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const res = await apiFetch("/settings/security", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save security settings.");
      setSettings(data.data);
      setSuccess("Security settings saved.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3"><Clock className="h-4 w-4 text-indigo-500" /><h3 className="text-sm font-semibold">Session Timeout</h3></div>
        <p className="text-xs text-muted-foreground mb-3">Auto-logout after this many minutes of inactivity. Disabled means sessions never expire from inactivity.</p>
        <select
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          value={settings.session_timeout_minutes ?? ""}
          onChange={e => setSettings({ ...settings, session_timeout_minutes: e.target.value ? parseInt(e.target.value) : null })}
        >
          <option value="">Disabled (no timeout)</option>
          {TIMEOUT_OPTIONS.map(m => <option key={m} value={m}>{m} minutes</option>)}
        </select>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3"><Key className="h-4 w-4 text-amber-500" /><h3 className="text-sm font-semibold">Password Policy</h3></div>
        <p className="text-xs text-muted-foreground mb-3">Minimum requirements enforced when a password is created or changed anywhere in Leadsy.</p>
        <div className="space-y-3 text-xs">
          <label className="flex items-center justify-between gap-2">
            <span>Minimum length</span>
            <input
              type="number"
              min={8}
              max={64}
              value={settings.password_min_length}
              onChange={e => setSettings({ ...settings, password_min_length: Math.max(8, parseInt(e.target.value) || 8) })}
              className="w-16 rounded-md border border-input bg-background px-2 py-1 text-right"
            />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="rounded" checked={settings.password_require_uppercase}
              onChange={e => setSettings({ ...settings, password_require_uppercase: e.target.checked })} />
            Require uppercase and lowercase letters
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="rounded" checked={settings.password_require_special}
              onChange={e => setSettings({ ...settings, password_require_special: e.target.checked })} />
            Require a special character
          </label>
        </div>
      </div>

      <div className="sm:col-span-2 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Security Settings
        </button>
        {success && <span className="flex items-center gap-1 text-sm font-medium text-emerald-500"><CheckCircle2 className="h-4 w-4" /> {success}</span>}
        {error && <span className="flex items-center gap-1 text-sm font-medium text-red-500"><AlertCircle className="h-4 w-4" /> {error}</span>}
      </div>
    </>
  );
}
