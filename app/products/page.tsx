"use client";

import { useState } from "react";
import { Package, Plus, Search, Upload, Link as LinkIcon, FileText, Pencil, Trash2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";

const refTypeLabels: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  none: { label: "None", icon: FileText, color: "text-muted-foreground" },
  document: { label: "Document", icon: Upload, color: "text-[var(--status-info)]" },
  url: { label: "URL", icon: LinkIcon, color: "text-[var(--status-success)]" },
  master: { label: "Master", icon: Package, color: "text-[var(--brand)]" },
};

export default function ProductsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

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
  const openEdit = (item: any) => { setEditItem(item); setFormName(item.name || ""); setFormDesc(item.description || ""); setFormCategory(item.category || ""); setFormTargetIndustry(item.target_industry || ""); setFormTargetPersona(item.target_persona || ""); setFormStatus(item.status || "active"); setShowModal(true); };
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
        <Button variant="brand" size="compact" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Add Product
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="pl-9" />
      </div>

      {isLoading ? (
        <div className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : products.length === 0 ? (
        <Card className="p-16 text-center text-xs text-muted-foreground">No products found. Start the backend and create your first product.</Card>
      ) : (
        <div className="space-y-3">
          {products.map((product: any) => {
            const expanded = expandedId === product.id;
            return (
              <Card key={product.id} interactive className="transition-all hover:shadow-md">
                <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={() => setExpandedId(expanded ? null : product.id)}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--brand)]/10 to-[var(--brand)]/5"><Package className="h-5 w-5 text-[var(--brand)]" /></div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-semibold">{product.name}</h3>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{product.description || "No description"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={product.status === "active" ? "success" : "neutral"}>{product.status}</Badge>
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
                      <Button variant="outline" size="sm" onClick={() => openEdit(product)}><Pencil className="h-3 w-3" /> Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => { if (confirm("Delete this product?")) deleteMutation.mutate(product.id); }}><Trash2 className="h-3 w-3" /> Delete</Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={showModal}
        onClose={closeModal}
        title={editItem ? "Edit Product" : "Create Product"}
        size="md"
        scrollable
        footer={
          <>
            <Button variant="soft" size="compact" onClick={closeModal}>Cancel</Button>
            <Button variant="brand" size="compact" disabled={saveMutation.isPending || !formName} onClick={handleSave}>
              {saveMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />} {editItem ? "Update" : "Create"}
            </Button>
          </>
        }
      >
        <div><Label>Name *</Label><Input value={formName} onChange={e => setFormName(e.target.value)} /></div>
        <div><Label>Description</Label><Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={3} /></div>
        <div><Label>Category</Label><Input value={formCategory} onChange={e => setFormCategory(e.target.value)} /></div>
        <div><Label>Target Industry</Label><Input value={formTargetIndustry} onChange={e => setFormTargetIndustry(e.target.value)} /></div>
        <div><Label>Target Persona</Label><Input value={formTargetPersona} onChange={e => setFormTargetPersona(e.target.value)} /></div>
        <div>
          <Label>Status</Label>
          <Select value={formStatus} onChange={e => setFormStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
      </Modal>
    </div>
  );
}
