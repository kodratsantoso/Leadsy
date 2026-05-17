"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, GitBranch, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterBar, FilterBarSearch } from "@/components/ui/filter-bar";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableShell,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/apiFetch";
import { cn } from "@/lib/utils";

type LeadSourceType = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
};

type LeadChannelType = {
  id: number;
  lead_source_type_id: number;
  name: string;
  slug: string;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
  source_type?: LeadSourceType | null;
};

type FormState = {
  lead_source_type_id: string;
  name: string;
  slug: string;
  description: string;
  sort_order: string;
  is_active: string;
};

const emptyForm: FormState = {
  lead_source_type_id: "",
  name: "",
  slug: "",
  description: "",
  sort_order: "0",
  is_active: "true",
};

export default function LeadChannelsSettingsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<LeadChannelType | null>(null);
  const [deleteChannel, setDeleteChannel] = useState<LeadChannelType | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [feedback, setFeedback] = useState("");

  const { data: sourcesData } = useQuery({
    queryKey: ["lead-source-types"],
    queryFn: async () => {
      const response = await apiFetch("/settings/lead-sources");
      return response.json();
    },
  });

  const { data: channelsData, isLoading } = useQuery({
    queryKey: ["lead-channel-types", sourceFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sourceFilter) params.set("source_type", sourceFilter);
      const response = await apiFetch(`/settings/lead-channels${params.toString() ? `?${params}` : ""}`);
      return response.json();
    },
  });

  const sources: LeadSourceType[] = sourcesData?.data ?? [];
  const activeSources = sources.filter((source) => source.is_active);
  const channels: LeadChannelType[] = channelsData?.data ?? [];
  const filteredChannels = channels.filter((channel) => {
    const term = search.toLowerCase();
    return (
      channel.name.toLowerCase().includes(term) ||
      channel.slug.toLowerCase().includes(term) ||
      (channel.description ?? "").toLowerCase().includes(term) ||
      (channel.source_type?.name ?? "").toLowerCase().includes(term)
    );
  });

  const resetForm = () => setForm(emptyForm);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiFetch(
        editingChannel ? `/settings/lead-channels/${editingChannel.id}` : "/settings/lead-channels",
        {
          method: editingChannel ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lead_source_type_id: Number(form.lead_source_type_id),
            name: form.name,
            slug: form.slug || undefined,
            description: form.description || null,
            sort_order: Number(form.sort_order || 0),
            is_active: form.is_active === "true",
          }),
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? "Unable to save lead channel.");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-channel-types"] });
      queryClient.invalidateQueries({ queryKey: ["lead-source-types"] });
      setCreateOpen(false);
      setEditingChannel(null);
      resetForm();
      setFeedback("Lead channel saved.");
    },
    onError: (error: Error) => setFeedback(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiFetch(`/settings/lead-channels/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? "Unable to deactivate lead channel.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-channel-types"] });
      queryClient.invalidateQueries({ queryKey: ["lead-source-types"] });
      setDeleteChannel(null);
      setFeedback("Lead channel deactivated.");
    },
    onError: (error: Error) => setFeedback(error.message),
  });

  const openCreate = () => {
    setEditingChannel(null);
    setForm({ ...emptyForm, lead_source_type_id: activeSources[0]?.id ? String(activeSources[0].id) : "" });
    setCreateOpen(true);
  };

  const openEdit = (channel: LeadChannelType) => {
    setEditingChannel(channel);
    setForm({
      lead_source_type_id: String(channel.lead_source_type_id),
      name: channel.name,
      slug: channel.slug,
      description: channel.description ?? "",
      sort_order: String(channel.sort_order ?? 0),
      is_active: channel.is_active ? "true" : "false",
    });
    setCreateOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Link href="/settings" className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))} aria-label="Back to settings">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <CardTitle>Lead Channels</CardTitle>
              <CardDescription>Manage channel types under each lead source for deeper classification.</CardDescription>
            </div>
          </div>
          <Button onClick={openCreate} disabled={activeSources.length === 0}>
            <Plus className="h-4 w-4" />
            Add Channel
          </Button>
        </CardHeader>
        {feedback ? (
          <CardContent className="pt-0">
            <Badge variant="info">{feedback}</Badge>
          </CardContent>
        ) : null}
      </Card>

      <FilterBar>
        <FilterBarSearch value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search lead channels" />
        <Select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} placeholder="All sources">
          {sources.map((source) => (
            <option key={source.id} value={source.slug}>{source.name}</option>
          ))}
        </Select>
      </FilterBar>

      <TableShell>
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell className="min-w-[160px]">Channel</TableHeaderCell>
              <TableHeaderCell className="min-w-[140px]">Source</TableHeaderCell>
              <TableHeaderCell className="min-w-[150px]">Slug</TableHeaderCell>
              <TableHeaderCell>Description</TableHeaderCell>
              <TableHeaderCell className="w-[90px]">Order</TableHeaderCell>
              <TableHeaderCell className="w-[100px]">Status</TableHeaderCell>
              <TableHeaderCell className="w-[100px]">Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableEmpty colSpan={7}>
                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                Loading channels...
              </TableEmpty>
            ) : filteredChannels.length === 0 ? (
              <TableEmpty colSpan={7}>
                <GitBranch className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                No lead channels found.
              </TableEmpty>
            ) : (
              filteredChannels.map((channel) => (
                <TableRow key={channel.id}>
                  <TableCell className="font-medium">{channel.name}</TableCell>
                  <TableCell><Badge variant="brand">{channel.source_type?.name ?? "Unknown"}</Badge></TableCell>
                  <TableCell><Badge variant="neutral">{channel.slug}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{channel.description || "—"}</TableCell>
                  <TableCell>{channel.sort_order}</TableCell>
                  <TableCell>
                    <Badge variant={channel.is_active ? "success" : "warning"}>{channel.is_active ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(channel)} tooltip="Edit channel">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteChannel(channel)}
                        disabled={channel.slug === "unclassified"}
                        tooltip={channel.slug === "unclassified" ? "Fallback channel cannot be deleted" : "Deactivate channel"}
                      >
                        <Trash2 className="h-4 w-4 text-[color:var(--danger)]" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableShell>

      <Modal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setEditingChannel(null);
            resetForm();
          }
        }}
        title={editingChannel ? "Edit Lead Channel" : "Create Lead Channel"}
        description="Channels are tied to a lead source and stored as database-backed master data."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name.trim() || !form.lead_source_type_id}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Channel
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
              <label className="text-sm font-medium">Lead Source</label>
              <Select value={form.lead_source_type_id} onChange={(event) => setForm((current) => ({ ...current, lead_source_type_id: event.target.value }))}>
                {activeSources.map((source) => (
                <option key={source.id} value={String(source.id)}>{source.name}</option>
              ))}
            </Select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Name</label>
            <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </div>
          {!editingChannel ? (
            <div className="grid gap-2">
              <label className="text-sm font-medium">Slug</label>
              <Input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} placeholder="auto-generated when blank" />
            </div>
          ) : null}
          <div className="grid gap-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Sort Order</label>
              <Input inputMode="numeric" value={form.sort_order} onChange={(event) => setForm((current) => ({ ...current, sort_order: event.target.value }))} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.value }))}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Select>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteChannel)}
        onOpenChange={(open) => {
          if (!open) setDeleteChannel(null);
        }}
        title="Deactivate Lead Channel"
        description={deleteChannel ? `Deactivate ${deleteChannel.name}? Existing leads keep their channel history.` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteChannel(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteChannel && deleteMutation.mutate(deleteChannel.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Deactivate
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Deactivated channels are hidden from lead forms but retained on historical lead records.
        </p>
      </Modal>
    </div>
  );
}
