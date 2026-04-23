"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Link as LinkIcon,
  Loader2,
  Package,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterBar, FilterBarSearch } from "@/components/ui/filter-bar";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/apiFetch";

type ProductRecord = {
  id: number;
  name: string;
  description?: string | null;
  category?: string | null;
  target_industry?: string | null;
  target_persona?: string | null;
  status?: string | null;
  ai_reference_source_type?: string | null;
  created_at?: string | null;
};

const refTypeLabels: Record<
  string,
  { label: string; icon: typeof FileText; iconClassName: string; badgeVariant: "neutral" | "info" | "success" | "brand" }
> = {
  none: { label: "None", icon: FileText, iconClassName: "text-muted-foreground", badgeVariant: "neutral" },
  document: { label: "Document", icon: Upload, iconClassName: "text-[color:var(--info)]", badgeVariant: "info" },
  url: { label: "URL", icon: LinkIcon, iconClassName: "text-[color:var(--success)]", badgeVariant: "success" },
  master: { label: "Master", icon: Package, iconClassName: "text-[color:var(--brand)]", badgeVariant: "brand" },
};

export default function ProductsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<ProductRecord | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<ProductRecord | null>(null);

  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formTargetIndustry, setFormTargetIndustry] = useState("");
  const [formTargetPersona, setFormTargetPersona] = useState("");
  const [formStatus, setFormStatus] = useState("active");

  const { data, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await apiFetch("/products");
      return response.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      if (editItem) {
        return apiFetch(`/products/${editItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      return apiFetch("/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      setDeleteProduct(null);
    },
  });

  const openCreate = () => {
    setEditItem(null);
    setFormName("");
    setFormDesc("");
    setFormCategory("");
    setFormTargetIndustry("");
    setFormTargetPersona("");
    setFormStatus("active");
    setShowModal(true);
  };

  const openEdit = (item: ProductRecord) => {
    setEditItem(item);
    setFormName(item.name || "");
    setFormDesc(item.description || "");
    setFormCategory(item.category || "");
    setFormTargetIndustry(item.target_industry || "");
    setFormTargetPersona(item.target_persona || "");
    setFormStatus(item.status || "active");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditItem(null);
  };

  const handleSave = () => {
    saveMutation.mutate({
      name: formName,
      description: formDesc,
      category: formCategory,
      target_industry: formTargetIndustry,
      target_persona: formTargetPersona,
      status: formStatus,
    });
  };

  const products: ProductRecord[] = (data?.data ?? []).filter((product: ProductRecord) => {
    const term = search.toLowerCase();
    return (
      product.name?.toLowerCase().includes(term) ||
      product.description?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Products</CardTitle>
            <CardDescription>
              Product catalog and AI reference management aligned to the shared admin design system.
            </CardDescription>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </CardHeader>
      </Card>

      <FilterBar>
        <FilterBarSearch
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search products"
        />
      </FilterBar>

      {isLoading ? (
        <div className="py-16 text-center">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="p-16 text-center text-sm text-muted-foreground">
            No products found. Start the backend and create your first product.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {products.map((product) => {
            const expanded = expandedId === product.id;
            const reference = refTypeLabels[product.ai_reference_source_type || "none"] || refTypeLabels.none;
            const ReferenceIcon = reference.icon;

            return (
              <Card key={product.id} className="overflow-hidden transition-shadow hover:shadow-md">
                <button
                  onClick={() => setExpandedId(expanded ? null : product.id)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--brand)]/10">
                    <Package className="h-5 w-5 text-[color:var(--brand)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-semibold">{product.name}</h2>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {product.description || "No description"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={product.status === "active" ? "success" : "neutral"}>
                      {product.status || "unknown"}
                    </Badge>
                    {expanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {expanded ? (
                  <CardContent className="border-t border-border pt-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Category
                        </p>
                        <p className="mt-1 text-sm">{product.category || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Target Industry
                        </p>
                        <p className="mt-1 text-sm">{product.target_industry || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Target Persona
                        </p>
                        <p className="mt-1 text-sm">{product.target_persona || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Reference Source
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <ReferenceIcon className={`h-4 w-4 ${reference.iconClassName}`} />
                          <Badge variant={reference.badgeVariant}>{reference.label}</Badge>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Created
                        </p>
                        <p className="mt-1 text-sm">
                          {product.created_at
                            ? new Date(product.created_at).toLocaleDateString()
                            : "—"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center gap-2">
                      <Button variant="outline" onClick={() => openEdit(product)}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => setDeleteProduct(product)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={showModal}
        onOpenChange={setShowModal}
        title={editItem ? "Edit Product" : "Create Product"}
        description="Product CRUD must use shared form, button, and modal primitives."
        footer={
          <>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending || !formName.trim()}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editItem ? "Update Product" : "Create Product"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input value={formName} onChange={(event) => setFormName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={formDesc}
              onChange={(event) => setFormDesc(event.target.value)}
              rows={3}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Input
                value={formCategory}
                onChange={(event) => setFormCategory(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={formStatus} onChange={(event) => setFormStatus(event.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Industry</label>
              <Input
                value={formTargetIndustry}
                onChange={(event) => setFormTargetIndustry(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Persona</label>
              <Input
                value={formTargetPersona}
                onChange={(event) => setFormTargetPersona(event.target.value)}
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteProduct !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteProduct(null);
        }}
        title="Delete Product"
        description={
          deleteProduct
            ? `Delete ${deleteProduct.name}? This replaces the old browser confirm flow.`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteProduct(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleteProduct) return;
                deleteMutation.mutate(deleteProduct.id);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete Product
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Destructive product actions now go through the shared modal and button variants.
        </p>
      </Modal>
    </div>
  );
}
