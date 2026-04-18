"use client";

import { useState } from "react";
import { Package, Plus, Search, Upload, Link as LinkIcon, FileText, Pencil, Trash2, ChevronDown, ChevronUp, Eye, Sparkles, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";

const refTypeLabels: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  none: { label: "None", icon: FileText, color: "text-muted-foreground" },
  document: { label: "Document", icon: Upload, color: "text-blue-500" },
  url: { label: "URL", icon: LinkIcon, color: "text-emerald-500" },
  master: { label: "Master", icon: Package, color: "text-purple-500" },
};

export default function ProductsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  // Form
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formTargetIndustry, setFormTargetIndustry] = useState("");
  const [formTargetPersona, setFormTargetPersona] = useState("");
  const [formStatus, setFormStatus] = useState("active");

  const { data, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => { const r = await apiFetch("/products"); return r.json(); },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editItem) {
        return apiFetch(`/products/${editItem.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      return apiFetch("/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/products/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });

  const openCreate = () => { setEditItem(null); setFormName(""); setFormDesc(""); setFormCategory(""); setFormTargetIndustry(""); setFormTargetPersona(""); setFormStatus("active"); setShowModal(true); };
  const openEdit = (item: any) => { setEditItem(item); setFormName(item.name||""); setFormDesc(item.description||""); setFormCategory(item.category||""); setFormTargetIndustry(item.target_industry||""); setFormTargetPersona(item.target_persona||""); setFormStatus(item.status||"active"); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditItem(null); };
  const handleSave = () => {
    saveMutation.mutate({ name: formName, description: formDesc, category: formCategory, target_industry: formTargetIndustry, target_persona: formTargetPersona, status: formStatus });
  };

  const products = (data?.data || []).filter((p: any) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">Product catalog & AI reference system — BRD §3.2</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-2 text-xs font-medium text-white shadow-lg shadow-indigo-500/25">
          <Plus className="h-3.5 w-3.5" /> Add Product
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {isLoading ? (
        <div className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-16 text-center text-xs text-muted-foreground shadow-sm">No products found. Start the backend and create your first product.</div>
      ) : (
        <div className="space-y-3">
          {products.map((product: any) => {
            const expanded = expandedId === product.id;
            const refType = product.ai_reference_source_type || "none";
            const ref = refTypeLabels[refType] || refTypeLabels.none;
            return (
              <div key={product.id} className="rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={() => setExpandedId(expanded ? null : product.id)}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/10 to-purple-600/10"><Package className="h-5 w-5 text-indigo-500" /></div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-semibold">{product.name}</h3>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{product.description || "No description"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${product.status === "active" ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>{product.status}</span>
                    {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
                {expanded && (
                  <div className="border-t border-border px-5 py-4 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div><p className="text-xs font-medium uppercase text-muted-foreground">Category</p><p className="mt-0.5 text-sm">{product.category || "—"}</p></div>
                      <div><p className="text-xs font-medium uppercase text-muted-foreground">Target Industry</p><p className="mt-0.5 text-sm">{product.target_industry || "—"}</p></div>
                      <div><p className="text-xs font-medium uppercase text-muted-foreground">Target Persona</p><p className="mt-0.5 text-sm">{product.target_persona || "—"}</p></div>
                      <div><p className="text-xs font-medium uppercase text-muted-foreground">Created</p><p className="mt-0.5 text-sm">{product.created_at ? new Date(product.created_at).toLocaleDateString() : "—"}</p></div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button onClick={() => openEdit(product)} className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /> Edit</button>
                      <button onClick={() => { if (confirm("Delete this product?")) deleteMutation.mutate(product.id); }} className="flex items-center gap-1.5 rounded-md border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10"><Trash2 className="h-3 w-3" /> Delete</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editItem ? "Edit Product" : "Create Product"}</h2>
              <button onClick={closeModal} className="rounded-md p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-muted-foreground">Name *</label><input value={formName} onChange={e => setFormName(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Description</label><textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Category</label><input value={formCategory} onChange={e => setFormCategory(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Target Industry</label><input value={formTargetIndustry} onChange={e => setFormTargetIndustry(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Target Persona</label><input value={formTargetPersona} onChange={e => setFormTargetPersona(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Status</label>
                <select value={formStatus} onChange={e => setFormStatus(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"><option value="active">Active</option><option value="inactive">Inactive</option></select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={closeModal} className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground">Cancel</button>
              <button onClick={handleSave} disabled={saveMutation.isPending || !formName} className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-50">
                {saveMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />} {editItem ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
