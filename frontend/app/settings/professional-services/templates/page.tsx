"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2, List } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { 
  getPsSettingsTemplates, 
  createPsSettingsTemplate, 
  updatePsSettingsTemplate, 
  deletePsSettingsTemplate,
  getPsServiceCategories,
} from "@/lib/api/professional-services";

// Define a local type to handle the serviceCategory relation included by the API
type TemplateWithCategory = {
  id: number;
  service_category_id: number;
  name: string;
  description: string;
  is_active: boolean;
  serviceCategory?: { id: number; name: string };
};

export default function PsEstimationTemplatesPage() {
  const pathname = usePathname();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<TemplateWithCategory | null>(null);
  const [formState, setFormState] = useState({ service_category_id: 0, name: "", description: "", is_active: true });
  const [deleteItem, setDeleteItem] = useState<TemplateWithCategory | null>(null);

  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["ps-settings-templates"],
    queryFn: getPsSettingsTemplates,
  });

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ["ps-service-categories"],
    queryFn: getPsServiceCategories,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { service_category_id: number; name: string; description: string; is_active: boolean }) => {
      if (editItem) {
        return updatePsSettingsTemplate(editItem.id, payload);
      }
      return createPsSettingsTemplate(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ps-settings-templates"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => deletePsSettingsTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ps-settings-templates"] });
      setDeleteItem(null);
    },
  });

  const openCreate = () => {
    setEditItem(null);
    setFormState({ 
      service_category_id: categories.length > 0 ? categories[0].id : 0, 
      name: "", 
      description: "", 
      is_active: true 
    });
    setShowModal(true);
  };

  const openEdit = (item: TemplateWithCategory) => {
    setEditItem(item);
    setFormState({ 
      service_category_id: item.service_category_id, 
      name: item.name, 
      description: item.description || "", 
      is_active: item.is_active 
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditItem(null);
  };

  const isLoading = loadingTemplates || loadingCategories;

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            {pathname.startsWith("/settings/") ? <BackToSettings /> : null}
            <CardTitle>Estimation Templates</CardTitle>
            <CardDescription>
              Manage pre-defined structures linked to service categories.
            </CardDescription>
          </div>
          <Button onClick={openCreate} disabled={loadingCategories || categories.length === 0}>
            <Plus className="h-4 w-4 mr-2" />
            Add Template
          </Button>
        </CardHeader>
      </Card>

      {categories.length === 0 && !isLoading && (
         <div className="rounded-xl border border-dashed border-red-200 bg-red-50 p-6 text-red-700">
           <strong>Attention:</strong> You must create at least one Service Category before you can create an Estimation Template.
         </div>
      )}

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl: any) => (
            <Card key={tpl.id} className="hover:border-[color:var(--status-success)] transition-colors">
              <CardHeader className="flex flex-col space-y-4 py-4">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Badge variant="outline" className="bg-muted text-xs">
                      {tpl.serviceCategory?.name || "Unknown Category"}
                    </Badge>
                    {tpl.is_active ? (
                      <Badge variant="success" className="bg-[color:var(--status-success)] hover:bg-[color:var(--status-success)] text-white text-[10px] h-4 px-1.5">Active</Badge>
                    ) : (
                      <Badge variant="neutral" className="text-[10px] h-4 px-1.5">Inactive</Badge>
                    )}
                  </div>
                  <span className="font-semibold text-lg">{tpl.name}</span>
                  {tpl.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{tpl.description}</p>}
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                     <List className="h-3 w-3" />
                     {/* In a real implementation we might show components count here */}
                     Components
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(tpl)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteItem(tpl)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
          {templates.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
              No templates defined.
            </div>
          )}
        </div>
      )}

      {showModal && (
        <Modal
          open={showModal}
          title={editItem ? "Edit Template" : "New Template"}
          onOpenChange={closeModal}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Service Category</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={formState.service_category_id}
                onChange={(e) => setFormState({ ...formState, service_category_id: parseInt(e.target.value) })}
              >
                <option value={0} disabled>Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Template Name</label>
              <Input
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                placeholder="e.g. ERP Implementation Baseline"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={formState.description}
                onChange={(e) => setFormState({ ...formState, description: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Active Status</label>
              <input type="checkbox" checked={formState.is_active} onChange={(e) => setFormState({ ...formState, is_active: e.target.checked })} className="h-4 w-4" />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={closeModal}>Cancel</Button>
              <Button
                onClick={() => saveMutation.mutate(formState)}
                disabled={saveMutation.isPending || !formState.name.trim() || formState.service_category_id === 0}
              >
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {deleteItem && (
        <Modal open={!!deleteItem} title="Deactivate Template" onOpenChange={() => setDeleteItem(null)}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to deactivate <strong>{deleteItem.name}</strong>?
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteItem.id)} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? "Deactivating..." : "Deactivate"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
