"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { 
  getPsServiceCategories, 
  createPsServiceCategory, 
  updatePsServiceCategory, 
  deletePsServiceCategory,
  PsServiceCategory
} from "@/lib/api/professional-services";

export default function PsServiceCategoriesPage() {
  const pathname = usePathname();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<PsServiceCategory | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [deleteItem, setDeleteItem] = useState<PsServiceCategory | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["ps-service-categories"],
    queryFn: getPsServiceCategories,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { name: string; description: string; is_active: boolean }) => {
      if (editItem) {
        return updatePsServiceCategory(editItem.id, payload);
      }
      return createPsServiceCategory(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ps-service-categories"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => deletePsServiceCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ps-service-categories"] });
      setDeleteItem(null);
    },
  });

  const openCreate = () => {
    setEditItem(null);
    setFormName("");
    setFormDesc("");
    setFormActive(true);
    setShowModal(true);
  };

  const openEdit = (item: PsServiceCategory) => {
    setEditItem(item);
    setFormName(item.name);
    setFormDesc(item.description || "");
    setFormActive(item.is_active);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditItem(null);
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            {pathname.startsWith("/settings/") ? <BackToSettings /> : null}
            <CardTitle>Professional Service Categories</CardTitle>
            <CardDescription>
              Manage high-level service domains used to group estimations.
            </CardDescription>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4">
          {categories.map((cat) => (
            <Card key={cat.id} className="hover:border-[color:var(--brand)] transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{cat.name}</span>
                    {cat.is_active ? (
                      <Badge variant="success" className="bg-[color:var(--status-success)] hover:bg-[color:var(--status-success)] text-white">Active</Badge>
                    ) : (
                      <Badge variant="neutral">Inactive</Badge>
                    )}
                  </div>
                  {cat.description && <p className="text-sm text-muted-foreground mt-1">{cat.description}</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(cat)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteItem(cat)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
          {categories.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
              No service categories defined.
            </div>
          )}
        </div>
      )}

      {showModal && (
        <Modal
          open={showModal}
          title={editItem ? "Edit Service Category" : "New Service Category"}
          onOpenChange={closeModal}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Implementation, Advisory"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Brief description of the service domain"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Active Status</label>
              <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} className="h-4 w-4" />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                onClick={() => saveMutation.mutate({ name: formName, description: formDesc, is_active: formActive })}
                disabled={saveMutation.isPending || !formName.trim()}
              >
                {saveMutation.isPending ? "Saving..." : "Save Category"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {deleteItem && (
        <Modal
          open={!!deleteItem}
          title="Deactivate Category"
          onOpenChange={() => setDeleteItem(null)}
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to deactivate <strong>{deleteItem.name}</strong>? It will no longer be available for new estimations.
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setDeleteItem(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate(deleteItem.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deactivating..." : "Deactivate"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
