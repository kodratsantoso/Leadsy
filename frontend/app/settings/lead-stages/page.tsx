"use client";

import { useState } from "react";
import { GitBranch, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterBar, FilterBarSearch } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
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

type FunnelStage = {
  id: number;
  name: string;
  sequence: number;
  color?: string | null;
  probability: number;
  is_active: boolean;
};

type FormState = {
  name: string;
  sequence: string;
  color: string;
  probability: string;
  is_active: string;
};

const emptyForm: FormState = {
  name: "",
  sequence: "0",
  color: "#6366f1",
  probability: "0",
  is_active: "true",
};

export default function LeadStagesSettingsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<FunnelStage | null>(null);
  const [deleteStage, setDeleteStage] = useState<FunnelStage | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [feedback, setFeedback] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["funnel-stages-settings"],
    queryFn: async () => {
      const response = await apiFetch("/funnel/stages?include_inactive=1");
      return response.json();
    },
  });

  const stages: FunnelStage[] = data?.data ?? [];
  const filteredStages = stages.filter((stage) => {
    const matchesSearch = stage.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "" ||
      (statusFilter === "active" && stage.is_active) ||
      (statusFilter === "inactive" && !stage.is_active);

    return matchesSearch && matchesStatus;
  });

  const resetForm = () => setForm(emptyForm);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiFetch(
        editingStage ? `/funnel/stages/${editingStage.id}` : "/funnel/stages",
        {
          method: editingStage ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            sequence: Number(form.sequence || 0),
            color: form.color || "#6366f1",
            probability: Number(form.probability || 0),
            is_active: form.is_active === "true",
          }),
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? "Unable to save lead stage.");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funnel-stages-settings"] });
      queryClient.invalidateQueries({ queryKey: ["funnel-stages"] });
      setCreateOpen(false);
      setEditingStage(null);
      resetForm();
      setFeedback("Lead stage saved.");
    },
    onError: (error: Error) => setFeedback(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiFetch(`/funnel/stages/${id}`, { method: "DELETE" });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? "Unable to delete lead stage.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funnel-stages-settings"] });
      queryClient.invalidateQueries({ queryKey: ["funnel-stages"] });
      setDeleteStage(null);
      setFeedback("Lead stage deleted.");
    },
    onError: (error: Error) => setFeedback(error.message),
  });

  const openCreate = () => {
    setEditingStage(null);
    setForm({
      ...emptyForm,
      sequence: String((stages.at(-1)?.sequence ?? 0) + 1),
    });
    setCreateOpen(true);
  };

  const openEdit = (stage: FunnelStage) => {
    setEditingStage(stage);
    setForm({
      name: stage.name,
      sequence: String(stage.sequence ?? 0),
      color: stage.color || "#6366f1",
      probability: String(stage.probability ?? 0),
      is_active: stage.is_active ? "true" : "false",
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
              <CardTitle>Lead Stages</CardTitle>
              <CardDescription>
                Manage database-backed pipeline stages used by Leads, Dashboard funnels, and stage movement.
              </CardDescription>
            </div>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Stage
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
          placeholder="Search lead stages"
        />
        <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} placeholder="All statuses">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </FilterBar>

      <TableShell>
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell className="min-w-[180px]">Stage</TableHeaderCell>
              <TableHeaderCell className="w-[100px]">Order</TableHeaderCell>
              <TableHeaderCell className="w-[130px]">Probability</TableHeaderCell>
              <TableHeaderCell className="w-[140px]">Color</TableHeaderCell>
              <TableHeaderCell className="w-[110px]">Status</TableHeaderCell>
              <TableHeaderCell className="w-[100px]">Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableEmpty colSpan={6}>
                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                Loading lead stages...
              </TableEmpty>
            ) : filteredStages.length === 0 ? (
              <TableEmpty colSpan={6}>
                <GitBranch className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                No lead stages found.
              </TableEmpty>
            ) : (
              filteredStages.map((stage) => (
                <TableRow key={stage.id}>
                  <TableCell className="font-medium">{stage.name}</TableCell>
                  <TableCell>{stage.sequence}</TableCell>
                  <TableCell>{stage.probability}%</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={stage.color || "#6366f1"}
                        disabled
                        aria-label={`${stage.name} color`}
                        className="h-8 w-12 shrink-0 p-1"
                      />
                      <span className="text-xs text-muted-foreground">{stage.color || "#6366f1"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={stage.is_active ? "success" : "warning"}>
                      {stage.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(stage)} tooltip="Edit stage">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteStage(stage)}
                        tooltip="Delete stage"
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
            setEditingStage(null);
            resetForm();
          }
        }}
        title={editingStage ? "Edit Lead Stage" : "Create Lead Stage"}
        description="Lead stages are stored in the database and reused across lead forms, filters, activity stage moves, and dashboard visuals."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name.trim()}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Stage
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Stage Name</label>
            <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Discovery Call" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Order</label>
              <Input type="number" min={0} value={form.sequence} onChange={(event) => setForm((current) => ({ ...current, sequence: event.target.value }))} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Probability (%)</label>
              <Input type="number" min={0} max={100} value={form.probability} onChange={(event) => setForm((current) => ({ ...current, probability: event.target.value }))} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Stage Color</label>
              <Input type="color" value={form.color} onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))} className="h-10 p-1" />
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
        open={deleteStage !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteStage(null);
        }}
        title="Delete Lead Stage"
        description={deleteStage ? `Delete ${deleteStage.name}? Stages assigned to leads cannot be deleted.` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteStage(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleteStage) return;
                deleteMutation.mutate(deleteStage.id);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete Stage
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Use inactive status when you want to hide a stage without removing its historical meaning.
        </p>
      </Modal>
    </div>
  );
}
