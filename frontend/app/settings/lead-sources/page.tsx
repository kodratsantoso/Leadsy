"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type LeadSourceType = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
};

type FormState = {
  name: string;
  slug: string;
  description: string;
  sort_order: string;
  is_active: string;
};

const emptyForm: FormState = {
  name: "",
  slug: "",
  description: "",
  sort_order: "0",
  is_active: "true",
};

export default function LeadSourcesSettingsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<LeadSourceType | null>(null);
  const [deleteSource, setDeleteSource] = useState<LeadSourceType | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [feedback, setFeedback] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["lead-source-types"],
    queryFn: async () => {
      const response = await apiFetch("/settings/lead-sources");
      return response.json();
    },
  });

  const sources: LeadSourceType[] = data?.data ?? [];
  const filteredSources = sources.filter((source) => {
    const term = search.toLowerCase();
    return (
      source.name.toLowerCase().includes(term) ||
      source.slug.toLowerCase().includes(term) ||
      (source.description ?? "").toLowerCase().includes(term)
    );
  });

  const resetForm = () => setForm(emptyForm);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        slug: form.slug || undefined,
        description: form.description || null,
        sort_order: Number(form.sort_order || 0),
        is_active: form.is_active === "true",
      };

      const response = await apiFetch(
        editingSource ? `/settings/lead-sources/${editingSource.id}` : "/settings/lead-sources",
        {
          method: editingSource ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? "Unable to save lead source.");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-source-types"] });
      setCreateOpen(false);
      setEditingSource(null);
      resetForm();
      setFeedback("Lead source saved.");
    },
    onError: (error: Error) => setFeedback(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiFetch(`/settings/lead-sources/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? "Unable to deactivate lead source.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-source-types"] });
      setDeleteSource(null);
      setFeedback("Lead source deactivated.");
    },
    onError: (error: Error) => setFeedback(error.message),
  });

  const openCreate = () => {
    setEditingSource(null);
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (source: LeadSourceType) => {
    setEditingSource(source);
    setForm({
      name: source.name,
      slug: source.slug,
      description: source.description ?? "",
      sort_order: String(source.sort_order ?? 0),
      is_active: source.is_active ? "true" : "false",
    });
    setCreateOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <BackToSettings />
            <div>
              <CardTitle>Lead Sources</CardTitle>
              <CardDescription>Manage the source master data used by lead classification.</CardDescription>
            </div>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Source
          </Button>
        </CardHeader>
        {feedback ? (
          <CardContent className="pt-0">
            <Badge variant="info">{feedback}</Badge>
          </CardContent>
        ) : null}
      </Card>

      <FilterBar>
        <FilterBarSearch
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search lead sources"
        />
      </FilterBar>

      <TableShell>
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell className="min-w-[180px]">Source</TableHeaderCell>
              <TableHeaderCell className="min-w-[160px]">Slug</TableHeaderCell>
              <TableHeaderCell>Description</TableHeaderCell>
              <TableHeaderCell className="w-[90px]">Order</TableHeaderCell>
              <TableHeaderCell className="w-[100px]">Status</TableHeaderCell>
              <TableHeaderCell className="w-[100px]">Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableEmpty colSpan={6}>
                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                Loading sources...
              </TableEmpty>
            ) : filteredSources.length === 0 ? (
              <TableEmpty colSpan={6}>
                <Tags className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                No lead sources found.
              </TableEmpty>
            ) : (
              filteredSources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell className="font-medium">{source.name}</TableCell>
                  <TableCell>
                    <Badge variant="neutral">{source.slug}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {source.description || "—"}
                  </TableCell>
                  <TableCell>{source.sort_order}</TableCell>
                  <TableCell>
                    <Badge variant={source.is_active ? "success" : "warning"}>
                      {source.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(source)} tooltip="Edit source">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteSource(source)}
                        disabled={source.slug === "other"}
                        tooltip={source.slug === "other" ? "Fallback source cannot be deleted" : "Deactivate source"}
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
            setEditingSource(null);
            resetForm();
          }
        }}
        title={editingSource ? "Edit Lead Source" : "Create Lead Source"}
        description="Lead source settings are stored in the database and used by lead records."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name.trim()}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Source
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Name</label>
            <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </div>
          {!editingSource ? (
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
        open={Boolean(deleteSource)}
        onOpenChange={(open) => {
          if (!open) setDeleteSource(null);
        }}
        title="Deactivate Lead Source"
        description={deleteSource ? `Deactivate ${deleteSource.name}? Existing leads keep their source history.` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteSource(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteSource && deleteMutation.mutate(deleteSource.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Deactivate
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Deactivated sources are hidden from lead forms but retained for historical reporting.
        </p>
      </Modal>
    </div>
  );
}
