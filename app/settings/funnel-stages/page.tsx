"use client";

import { useState } from "react";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, GripVertical } from "lucide-react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { STAGE_COLORS, type StageColorKey, resolveStageColor } from "@/lib/stage-colors";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { TableWrapper, Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/ui/table";

export default function FunnelStagesPage() {
  const qc = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  const [formName, setFormName] = useState("");
  const [formOrder, setFormOrder] = useState("1");
  const [formColor, setFormColor] = useState<StageColorKey>("brand");
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["funnel-stages"],
    queryFn: async () => {
      const r = await apiFetch("/funnel/stages");
      return r.json();
    },
  });

  const stages: any[] = (data?.data ?? data ?? []).sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = editItem ? `/funnel/stages/${editItem.id}` : "/funnel/stages";
      const method = editItem ? "PUT" : "POST";
      const r = await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.message || "Save failed"); }
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["funnel-stages"] }); closeModal(); },
    onError: (e: any) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await apiFetch(`/funnel/stages/${id}`, { method: "DELETE" });
      if (!r.ok) { const e = await r.json(); throw new Error(e.message || "Delete failed"); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["funnel-stages"] }); setDeleteConfirm(null); },
    onError: (e: any) => setError(e.message),
  });

  const openCreate = () => {
    setEditItem(null); setFormName(""); setFormOrder(String((stages.length + 1))); setFormColor("brand"); setError(""); setShowModal(true);
  };
  const openEdit = (s: any) => {
    setEditItem(s); setFormName(s.name || ""); setFormOrder(String(s.order ?? 1));
    setFormColor(s.color && s.color in STAGE_COLORS ? s.color as StageColorKey : "brand");
    setError(""); setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditItem(null); setError(""); };

  const handleSave = () => {
    if (!formName.trim()) { setError("Name is required"); return; }
    saveMutation.mutate({ name: formName.trim(), order: parseInt(formOrder, 10) || 1, color: formColor });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Funnel Stages</h1>
            <p className="text-sm text-muted-foreground">Manage pipeline stages for lead progression</p>
          </div>
        </div>
        <Button variant="brand" size="compact" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Add Stage
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : stages.length === 0 ? (
        <Card className="p-16 text-center">
          <GripVertical className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">No funnel stages configured</p>
          <p className="mt-1 text-xs text-muted-foreground">Add stages to define your lead pipeline (e.g. Prospecting → Qualified → Proposal → Closed)</p>
          <Button variant="brand" size="compact" className="mt-4" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> Create First Stage
          </Button>
        </Card>
      ) : (
        <TableWrapper>
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Order</TableHeaderCell>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Color</TableHeaderCell>
                <TableHeaderCell>Leads</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {stages.map((stage) => (
                <TableRow key={stage.id}>
                  <TableCell>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold">{stage.order ?? "—"}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: resolveStageColor(stage.color) }} />
                      <span className="font-medium">{stage.name}</span>
                    </div>
                  </TableCell>
                  <TableCell muted><span className="text-xs capitalize">{stage.color && stage.color in STAGE_COLORS ? STAGE_COLORS[stage.color as StageColorKey].label : "—"}</span></TableCell>
                  <TableCell muted>{stage.leads_count ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(stage)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteConfirm(stage)} className="rounded-md p-1.5 text-muted-foreground hover:bg-[var(--status-danger)]/10 hover:text-[var(--status-danger)]" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableWrapper>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={showModal}
        onClose={closeModal}
        title={editItem ? "Edit Stage" : "Create Stage"}
        size="sm"
        footer={
          <>
            <Button variant="soft" size="compact" onClick={closeModal}>Cancel</Button>
            <Button variant="brand" size="compact" disabled={saveMutation.isPending || !formName} onClick={handleSave}>
              {saveMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              {editItem ? "Update" : "Create"}
            </Button>
          </>
        }
      >
        <div>
          <Label>Stage Name *</Label>
          <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Qualified, Proposal, Closed Won" />
        </div>
        <div>
          <Label>Order</Label>
          <Input type="number" min="1" value={formOrder} onChange={e => setFormOrder(e.target.value)} />
        </div>
        <div>
          <Label>Color</Label>
          <div className="mt-1 flex flex-wrap gap-2">
            {(Object.entries(STAGE_COLORS) as [StageColorKey, typeof STAGE_COLORS[StageColorKey]][]).map(([key, { token, label }]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFormColor(key)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  formColor === key
                    ? "border-[var(--brand)] bg-[color-mix(in_oklch,var(--brand)_10%,transparent)] text-foreground"
                    : "border-border text-muted-foreground hover:border-[var(--brand)]/50"
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: token }} />
                {label}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-xs text-[var(--status-danger)]">{error}</p>}
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Stage"
        size="sm"
        footer={
          <>
            <Button variant="soft" size="compact" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" size="compact" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteConfirm.id)}>
              {deleteMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />} Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Delete <span className="font-semibold text-foreground">{deleteConfirm?.name}</span>?
        </p>
        <p className="text-xs text-muted-foreground">Leads in this stage will have their stage cleared.</p>
        {deleteMutation.isError && <p className="text-xs text-[var(--status-danger)]">{(deleteMutation.error as Error)?.message}</p>}
      </Modal>
    </div>
  );
}
