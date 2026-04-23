"use client";

import { useState } from "react";
import { Layers, Plus, ChevronRight, Pencil, Trash2, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

export default function IndustriesPage() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formName, setFormName] = useState("");
  const [subModal, setSubModal] = useState<{ industryId: number } | null>(null);
  const [subName, setSubName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["industries"],
    queryFn: async () => { const r = await apiFetch("/industries"); return r.json(); },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editItem) {
        return apiFetch(`/industries/${editItem.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      return apiFetch("/industries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["industries"] }); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/industries/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["industries"] }),
  });

  const addSubMutation = useMutation({
    mutationFn: async ({ industryId, name }: { industryId: number; name: string }) => {
      return apiFetch(`/industries/${industryId}/sub-industries`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["industries"] }); setSubModal(null); setSubName(""); },
  });

  const deleteSubMutation = useMutation({
    mutationFn: async ({ industryId, subId }: { industryId: number; subId: number }) => {
      return apiFetch(`/industries/${industryId}/sub-industries/${subId}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["industries"] }),
  });

  const [editSubModal, setEditSubModal] = useState<{ industryId: number; sub: any } | null>(null);
  const [editSubName, setEditSubName] = useState("");

  const updateSubMutation = useMutation({
    mutationFn: async ({ industryId, subId, name }: { industryId: number; subId: number; name: string }) => {
      return apiFetch(`/industries/${industryId}/sub-industries/${subId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["industries"] }); setEditSubModal(null); setEditSubName(""); },
  });

  const toggle = (id: number) => { const next = new Set(expanded); next.has(id) ? next.delete(id) : next.add(id); setExpanded(next); };
  const openCreate = () => { setEditItem(null); setFormName(""); setShowModal(true); };
  const openEdit = (item: any) => { setEditItem(item); setFormName(item.name); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditItem(null); };

  const industries = data?.data || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Industries</h1>
          <p className="text-sm text-muted-foreground">Master industry & sub-industry — BRD §4.2</p>
        </div>
        <Button variant="brand" size="compact" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Add Industry
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : industries.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground">No industries found. Start the backend and seed the database.</div>
        ) : industries.map((ind: any, idx: number) => (
          <div key={ind.id}>
            {idx > 0 && <div className="border-t border-border" />}
            <div className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-accent/30">
              <button onClick={() => toggle(ind.id)} className="flex items-center gap-3 flex-1 text-left">
                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expanded.has(ind.id) ? "rotate-90" : ""}`} />
                <Layers className="h-4 w-4 text-[var(--brand)]" />
                <span className="text-sm font-medium">{ind.name}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">{ind.sub_industries?.length ?? 0}</span>
                {ind.is_active === false && <span className="inline-flex items-center rounded-full bg-[var(--status-danger)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--status-danger)]">Inactive</span>}
              </button>
              <div className="flex gap-1">
                <button onClick={() => openEdit(ind)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => { if (confirm("Delete this industry?")) deleteMutation.mutate(ind.id); }} className="rounded-md p-1.5 text-muted-foreground hover:text-[var(--status-danger)]"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            {expanded.has(ind.id) && (
              <div className="border-t border-border/50 bg-muted/20 px-5 py-2">
                <div className="space-y-1 pl-7">
                  {(ind.sub_industries || []).map((sub: any) => (
                    <div key={sub.id} className="group flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-accent/30">
                      <div className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-[var(--brand)]" /><span className="text-xs font-medium">{sub.name}</span></div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                        <button onClick={() => { setEditSubModal({ industryId: ind.id, sub }); setEditSubName(sub.name); }} className="rounded p-1 text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
                        <button onClick={() => { if (confirm("Delete?")) deleteSubMutation.mutate({ industryId: ind.id, subId: sub.id }); }} className="rounded p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => { setSubModal({ industryId: ind.id }); setSubName(""); }} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-[var(--brand)]">
                    <Plus className="h-3 w-3" /> Add Sub-Industry
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </Card>

      {/* Industry Modal */}
      <Modal
        open={showModal}
        onClose={closeModal}
        title={editItem ? "Edit Industry" : "Create Industry"}
        size="sm"
        footer={
          <>
            <Button variant="soft" size="compact" onClick={closeModal}>Cancel</Button>
            <Button variant="brand" size="compact" disabled={saveMutation.isPending || !formName} onClick={() => saveMutation.mutate({ name: formName })}>
              {saveMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />} {editItem ? "Update" : "Create"}
            </Button>
          </>
        }
      >
        <div>
          <Label>Name</Label>
          <Input value={formName} onChange={e => setFormName(e.target.value)} />
        </div>
      </Modal>

      {/* Sub-Industry Modal */}
      <Modal
        open={!!subModal}
        onClose={() => setSubModal(null)}
        title="Add Sub-Industry"
        size="sm"
        footer={
          <>
            <Button variant="soft" size="compact" onClick={() => setSubModal(null)}>Cancel</Button>
            <Button variant="brand" size="compact" disabled={addSubMutation.isPending || !subName} onClick={() => addSubMutation.mutate({ industryId: subModal!.industryId, name: subName })}>
              {addSubMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />} Add
            </Button>
          </>
        }
      >
        <div>
          <Label>Name</Label>
          <Input value={subName} onChange={e => setSubName(e.target.value)} />
        </div>
      </Modal>

      {/* Edit Sub-Industry Modal */}
      <Modal
        open={!!editSubModal}
        onClose={() => setEditSubModal(null)}
        title="Edit Sub-Industry"
        size="sm"
        footer={
          <>
            <Button variant="soft" size="compact" onClick={() => setEditSubModal(null)}>Cancel</Button>
            <Button
              variant="brand"
              size="compact"
              disabled={updateSubMutation.isPending || !editSubName}
              onClick={() => updateSubMutation.mutate({ industryId: editSubModal!.industryId, subId: editSubModal!.sub.id, name: editSubName })}
            >
              {updateSubMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />} Save
            </Button>
          </>
        }
      >
        <div>
          <Label>Name</Label>
          <Input value={editSubName} onChange={e => setEditSubName(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
