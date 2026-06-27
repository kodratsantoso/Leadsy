"use client";

import { useState } from "react";
import { Plus, Package, Loader2, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterBar, FilterBarSearch } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { apiFetch } from "@/lib/apiFetch";

type ProductRecord = {
  id: number;
  name: string;
  description?: string | null;
  category?: string | null;
  status?: string | null;
};

export default function ProductsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formName, setFormName] = useState("");
  const [deleteProduct, setDeleteProduct] = useState<ProductRecord | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await apiFetch("/products");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string }) => {
      return apiFetch("/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(res => res.json());
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      setShowCreateModal(false);
      if (res.data?.id) {
        router.push(`/products/${res.data.id}`);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      setDeleteProduct(null);
    },
  });

  const products: ProductRecord[] = (data?.data ?? []).filter((product: ProductRecord) => {
    const term = search.toLowerCase();
    return (
      product.name?.toLowerCase().includes(term) ||
      product.description?.toLowerCase().includes(term)
    );
  });

  const handleCreate = () => {
    if (!formName.trim()) return;
    createMutation.mutate({ name: formName });
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Products</CardTitle>
              <CardDescription>
                Manage your product catalog, pricing tiers, and AI configurations.
              </CardDescription>
            </div>
            <Button onClick={() => { setFormName(""); setShowCreateModal(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
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
            No products found. Add a product to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="flex flex-col overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5 border-border/60">
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--brand)]/10">
                    <Package className="h-5 w-5 text-[color:var(--brand)]" />
                  </div>
                  <Badge variant={product.status === "active" ? "success" : "neutral"} className="shrink-0 uppercase text-[10px] px-2 py-0.5">
                    {product.status || "Unknown"}
                  </Badge>
                </div>
                
                <div className="mt-4 flex-1">
                  <h3 className="font-semibold text-lg line-clamp-1">{product.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                    {product.description || "No description provided."}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-border flex items-center gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => router.push(`/products/${product.id}`)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Manage Details
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 border-border/50 shrink-0" onClick={() => setDeleteProduct(product)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteProduct}
        onOpenChange={(isOpen) => !isOpen && setDeleteProduct(null)}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteProduct(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteProduct && deleteMutation.mutate(deleteProduct.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </>
        }
      >
        <p className="text-sm font-semibold p-4 bg-muted/50 rounded-lg border border-border">
          {deleteProduct?.name}
        </p>
      </Modal>

      {/* Create Modal */}
      <Modal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        title="Add New Product"
        description="Enter the name of your new product. You can configure AI references and pricing tiers in the next step."
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !formName.trim()}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create & Proceed
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Product Name *</label>
          <Input
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="e.g. Sales CRM Pro"
            onKeyDown={(e) => e.key === "Enter" && formName.trim() && handleCreate()}
          />
        </div>
      </Modal>
    </div>
  );
}
