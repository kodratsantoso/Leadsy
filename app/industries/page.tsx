"use client";

import { useState } from "react";
import { Layers, Plus, ChevronRight, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";

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

  const toggle = (id: number) => { const next = new Set(expanded); next.has(id) ? next.delete(id) : next.add(id); setExpanded(next); };
  const openCreate = () => { setEditItem(null); setFormName(""); setShowModal(true); };
  const openEdit = (item: any) => { setEditItem(item); setFormName(item.name); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditItem(null); };

  const industries = data?.data || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Industries</h1>
          <p className="text-sm text-muted-foreground">Master industry & sub-industry — BRD §4.2</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-2 text-xs font-medium text-white shadow-lg shadow-indigo-500/25">
          <Plus className="h-3.5 w-3.5" /> Add Industry
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
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
                <Layers className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-medium">{ind.name}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">{ind.sub_industries?.length ?? 0}</span>
                {ind.is_active === false && <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-500">Inactive</span>}
              </button>
              <div className="flex gap-1">
                <button onClick={() => openEdit(ind)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => { if (confirm("Delete this industry?")) deleteMutation.mutate(ind.id); }} className="rounded-md p-1.5 text-muted-foreground hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            {expanded.has(ind.id) && (
              <div className="border-t border-border/50 bg-muted/20 px-5 py-2">
                <div className="space-y-1 pl-7">
                  {(ind.sub_industries || []).map((sub: any) => (
                    <div key={sub.id} className="group flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-accent/30">
                      <div className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-indigo-400" /><span className="text-xs font-medium">{sub.name}</span></div>
                      <button onClick={() => { if (confirm("Delete?")) deleteSubMutation.mutate({ industryId: ind.id, subId: sub.id }); }} className="rounded p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  ))}
                  <button onClick={() => { setSubModal({ industryId: ind.id }); setSubName(""); }} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-indigo-500 hover:text-indigo-400">
                    <Plus className="h-3 w-3" /> Add Sub-Industry
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Industry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editItem ? "Edit Industry" : "Create Industry"}</h2>
              <button onClick={closeModal} className="rounded-md p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Name</label><input value={formName} onChange={e => setFormName(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={closeModal} className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground">Cancel</button>
              <button onClick={() => saveMutation.mutate({ name: formName })} disabled={saveMutation.isPending || !formName} className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-50">
                {saveMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />} {editItem ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Industry Modal */}
      {subModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add Sub-Industry</h2>
              <button onClick={() => setSubModal(null)} className="rounded-md p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground">Name</label><input value={subName} onChange={e => setSubName(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setSubModal(null)} className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground">Cancel</button>
              <button onClick={() => addSubMutation.mutate({ industryId: subModal.industryId, name: subName })} disabled={addSubMutation.isPending || !subName} className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-50">
                {addSubMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />} Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
