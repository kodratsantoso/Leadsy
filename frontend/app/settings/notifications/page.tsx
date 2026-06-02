"use client";
import { Bell, Loader2, Mail, MessageSquare } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { apiFetch } from "@/lib/apiFetch";

const CHANNEL_KEYS = [
  { key: "notify_inapp_enabled",    label: "In-App Notifications", icon: Bell },
  { key: "notify_email_enabled",    label: "Email Alerts",         icon: Mail },
  { key: "notify_whatsapp_enabled", label: "WhatsApp Alerts",      icon: MessageSquare },
] as const;

export default function NotificationsPage() {
  const qc = useQueryClient();

  // Load from DB — integration_configs table, category = notifications
  const { data, isLoading } = useQuery({
    queryKey: ["notifications-config"],
    queryFn: async () => {
      const r = await apiFetch("/settings/integrations");
      const json = await r.json();
      // grouped by category — find notifications group
      const notifGroup: any[] = json?.data?.notifications || [];
      // Build a key→value map
      const map: Record<string, boolean> = {};
      for (const item of notifGroup) {
        map[item.key] = item.value === "1" || item.value === true || item.value === "true";
      }
      return map;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      return apiFetch("/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          value: enabled ? "1" : "0",
          category: "notifications",
          is_secret: false,
          value_type: "boolean",
        }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications-config"] }),
  });

  const toggle = (key: string, current: boolean) => {
    saveMutation.mutate({ key, enabled: !current });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <BackToSettings />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">Alert preferences and channels — BRD §5.4</p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          {CHANNEL_KEYS.map(({ key, label, icon: Icon }) => {
            const enabled = data?.[key] ?? false;
            const isSaving = saveMutation.isPending && saveMutation.variables?.key === key;
            return (
              <div key={key} className="flex items-center justify-between rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <button
                  onClick={() => toggle(key, enabled)}
                  disabled={isSaving}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                    enabled
                      ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                  {enabled ? "Enabled" : "Disabled"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
