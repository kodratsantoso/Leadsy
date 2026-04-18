"use client";
import { Webhook, ArrowLeft, Plus, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";

export default function WebhooksPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState("lead.created,lead.updated");

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ["webhooks-config"],
    queryFn: async () => {
      const r = await apiFetch("/settings/integrations");
      const json = await r.json();
      // integrations returns data grouped by category
      const flat = Object.values(json?.data || {}).flat() as any[];
      return flat.filter((c: any) => c.category === "webhook");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiFetch("/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: `webhook_${Date.now()}`,
          value: url,
          category: "webhook",
          is_secret: false,
          value_type: "string",
          is_active: true,
        }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks-config"] });
      setShowAdd(false);
      setUrl("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiFetch(`/settings/integrations/${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks-config"] }),
  });

  const list = webhooks || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Webhooks</h1>
            <p className="text-sm text-muted-foreground">Webhook URL configuration and event management</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-2 text-xs font-medium text-white shadow-lg shadow-indigo-500/25"
        >
          <Plus className="h-3.5 w-3.5" /> Add Webhook
        </button>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5">
          <h3 className="text-sm font-semibold mb-3">New Webhook</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Endpoint URL</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/webhook"
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Events (comma-separated)</label>
              <input
                value={events}
                onChange={(e) => setEvents(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !url}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
              >
                {saveMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />} Save
              </button>
              <button
                onClick={() => { setShowAdd(false); setUrl(""); }}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : list.length === 0 ? (
          <div className="py-16 text-center">
            <Webhook className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">No webhooks configured yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {list.map((wh: any) => (
              <div key={wh.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-mono font-medium">{wh.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{wh.key}</p>
                </div>
                <button
                  onClick={() => {
                    if (confirm("Delete this webhook?")) deleteMutation.mutate(wh.id);
                  }}
                  disabled={deleteMutation.isPending && deleteMutation.variables === wh.id}
                  className="rounded-md p-1.5 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  {deleteMutation.isPending && deleteMutation.variables === wh.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Trash2 className="h-3.5 w-3.5" />
                  }
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
