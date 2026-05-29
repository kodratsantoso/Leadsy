"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2, Webhook } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { apiFetch } from "@/lib/apiFetch";

type WebhookRecord = {
  id: number;
  key: string;
  value: string;
  category: string;
  is_active?: boolean;
};

export default function WebhooksPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState("lead.created,lead.updated");
  const [deleteWebhook, setDeleteWebhook] = useState<WebhookRecord | null>(null);

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ["webhooks-config"],
    queryFn: async () => {
      const response = await apiFetch("/settings/integrations");
      const json = await response.json();
      const flat = Object.values(json?.data || {}).flat() as WebhookRecord[];
      return flat.filter((config) => config.category === "webhook");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () =>
      apiFetch("/settings/integrations", {
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
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks-config"] });
      setShowAdd(false);
      setUrl("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) =>
      apiFetch(`/settings/integrations/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks-config"] });
      setDeleteWebhook(null);
    },
  });

  const list: WebhookRecord[] = webhooks || [];

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <BackToSettings />
            <div>
              <CardTitle>Webhooks</CardTitle>
              <CardDescription>
                Webhook URL configuration and event management using shared settings primitives.
              </CardDescription>
            </div>
          </div>
          <Button onClick={() => setShowAdd((current) => !current)}>
            <Plus className="h-4 w-4" />
            {showAdd ? "Hide Form" : "Add Webhook"}
          </Button>
        </CardHeader>
      </Card>

      {showAdd ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>New Webhook</CardTitle>
              <CardDescription>
                Create webhook endpoints without page-local button or input styling.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Endpoint URL</label>
              <Input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/webhook"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Events (comma-separated)</label>
              <Input
                value={events}
                onChange={(event) => setEvents(event.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !url.trim()}
              >
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save Webhook
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAdd(false);
                  setUrl("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : list.length === 0 ? (
            <div className="py-16 text-center">
              <Webhook className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No webhooks configured yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {list.map((webhook) => (
                <div key={webhook.id} className="flex items-center justify-between px-5 py-4">
                  <div className="space-y-1">
                    <p className="break-all font-mono text-sm font-medium">{webhook.value}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="neutral">{webhook.key}</Badge>
                      <Badge variant={webhook.is_active === false ? "warning" : "success"}>
                        {webhook.is_active === false ? "Inactive" : "Active"}
                      </Badge>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleteWebhook(webhook)}
                    disabled={deleteMutation.isPending && deleteMutation.variables === webhook.id}
                    tooltip={`Delete ${webhook.key}`}
                  >
                    {deleteMutation.isPending && deleteMutation.variables === webhook.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-[color:var(--danger)]" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={deleteWebhook !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteWebhook(null);
        }}
        title="Delete Webhook"
        description={
          deleteWebhook ? `Delete ${deleteWebhook.key}? This action is irreversible.` : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteWebhook(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleteWebhook) return;
                deleteMutation.mutate(deleteWebhook.id);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete Webhook
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Webhook deletion is now routed through the shared modal flow instead of `confirm()`.
        </p>
      </Modal>
    </div>
  );
}
