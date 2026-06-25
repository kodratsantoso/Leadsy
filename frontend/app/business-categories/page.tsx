"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Briefcase, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { apiFetch } from "@/lib/apiFetch";
import { Badge } from "@/components/ui/badge";

type BusinessCategoryRecord = {
  id: number;
  name: string;
  is_active?: boolean;
};

export default function BusinessCategoriesPage() {
  const pathname = usePathname();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<BusinessCategoryRecord | null>(null);
  const [formName, setFormName] = useState("");
  const [deleteCategory, setDeleteCategory] = useState<BusinessCategoryRecord | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["business-categories"],
    queryFn: async () => {
      const response = await apiFetch("/business-categories");
      return response.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { name: string }) => {
      if (editItem) {
        return apiFetch(`/business-categories/${editItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      return apiFetch("/business-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business-categories"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/business-categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business-categories"] });
      setDeleteCategory(null);
    },
  });

  const openCreate = () => {
    setEditItem(null);
    setFormName("");
    setShowModal(true);
  };

  const openEdit = (item: BusinessCategoryRecord) => {
    setEditItem(item);
    setFormName(item.name);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditItem(null);
    setFormName("");
  };

  const categories: BusinessCategoryRecord[] = data?.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="space-y-1">
            {pathname.startsWith("/settings/") ? <BackToSettings /> : null}
            <CardTitle>Business Categories</CardTitle>
            <CardDescription>
              Manage Business Categories used for AI Enrichment and CRM Taxonomy.
            </CardDescription>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        </CardHeader>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : categories.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No categories found. Start adding some or run AI enrichment!
            </div>
          ) : (
            categories.map((category, index) => (
              <div key={category.id}>
                {index > 0 ? <div className="border-t border-border" /> : null}
                <div className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-accent/30">
                  <div className="flex flex-1 items-center gap-3 text-left">
                    <Briefcase className="h-4 w-4 text-[color:var(--brand)]" />
                    <span className="text-sm font-medium">{category.name}</span>
                    {category.is_active === false ? (
                      <Badge variant="danger">Inactive</Badge>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEdit(category)}
                      tooltip={`Edit ${category.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteCategory(category)}
                      tooltip={`Delete ${category.name}`}
                    >
                      <Trash2 className="h-4 w-4 text-[color:var(--danger)]" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Modal
        open={showModal}
        onOpenChange={setShowModal}
        title={editItem ? "Edit Category" : "Create Category"}
        description="Business Categories map specific firmographics to your leads."
        footer={
          <>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate({ name: formName })}
              disabled={saveMutation.isPending || !formName.trim()}
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editItem ? "Update" : "Create"}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">Name</label>
          <Input
            value={formName}
            onChange={(event) => setFormName(event.target.value)}
            placeholder="e.g. B2B Software"
          />
        </div>
      </Modal>

      <Modal
        open={deleteCategory !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteCategory(null);
        }}
        title="Delete Category"
        description={
          deleteCategory
            ? `Are you sure you want to delete ${deleteCategory.name}?`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteCategory(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleteCategory) return;
                deleteMutation.mutate(deleteCategory.id);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          This category will be permanently deleted.
        </p>
      </Modal>
    </div>
  );
}
