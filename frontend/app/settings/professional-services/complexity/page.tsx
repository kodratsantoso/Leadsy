"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { 
  getPsComplexityLevels, 
  createPsComplexityLevel, 
  updatePsComplexityLevel, 
  deletePsComplexityLevel,
  PsComplexityLevel
} from "@/lib/api/professional-services";

export default function PsComplexityLevelsPage() {
  const pathname = usePathname();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<PsComplexityLevel | null>(null);
  const [formState, setFormState] = useState({ name: "", multiplier: 1, description: "", is_active: true });
  const [deleteItem, setDeleteItem] = useState<PsComplexityLevel | null>(null);

  const { data: levels = [], isLoading } = useQuery({
    queryKey: ["ps-complexity-levels"],
    queryFn: getPsComplexityLevels,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { name: string; multiplier: number; description: string; is_active: boolean }) => {
      if (editItem) {
        return updatePsComplexityLevel(editItem.id, payload);
      }
      return createPsComplexityLevel(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ps-complexity-levels"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => deletePsComplexityLevel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ps-complexity-levels"] });
      setDeleteItem(null);
    },
  });

  const openCreate = () => {
    setEditItem(null);
    setFormState({ name: "", multiplier: 1, description: "", is_active: true });
    setShowModal(true);
  };

  const openEdit = (item: PsComplexityLevel) => {
    setEditItem(item);
    setFormState({ name: item.name, multiplier: parseFloat(item.multiplier), description: item.description || "", is_active: item.is_active });
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
            <CardTitle>Complexity Matrix</CardTitle>
            <CardDescription>
              Manage complexity levels and multipliers used for scoping adjustments.
            </CardDescription>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Level
          </Button>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {levels.map((level) => (
            <Card key={level.id} className="hover:border-[color:var(--status-warning)] transition-colors">
              <CardHeader className="flex flex-col space-y-4 py-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">{level.name}</span>
                      {level.is_active ? (
                        <Badge variant="success" className="bg-[color:var(--status-success)] hover:bg-[color:var(--status-success)] text-white text-[10px] h-4 px-1.5">Active</Badge>
                      ) : (
                        <Badge variant="neutral" className="text-[10px] h-4 px-1.5">Inactive</Badge>
                      )}
                    </div>
                    {level.description && <p className="text-sm text-muted-foreground mt-1">{level.description}</p>}
                  </div>
                  <div className="flex bg-muted/50 rounded-lg px-3 py-1">
                    <span className="text-lg font-bold text-foreground">x{parseFloat(level.multiplier).toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button variant="outline" size="sm" onClick={() => openEdit(level)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteItem(level)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
          {levels.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
              No complexity levels defined.
            </div>
          )}
        </div>
      )}

      {showModal && (
        <Modal
          open={showModal}
          title={editItem ? "Edit Complexity Level" : "New Complexity Level"}
          onOpenChange={closeModal}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                placeholder="e.g. Standard, Complex, High"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Multiplier (x)</label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={formState.multiplier}
                onChange={(e) => setFormState({ ...formState, multiplier: parseFloat(e.target.value) })}
                placeholder="e.g. 1.0, 1.25"
              />
              <p className="text-xs text-muted-foreground">Used to multiply base ManDays (e.g. 1.25 = +25% effort).</p>
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
                disabled={saveMutation.isPending || !formState.name.trim()}
              >
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {deleteItem && (
        <Modal open={!!deleteItem} title="Deactivate Level" onOpenChange={() => setDeleteItem(null)}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to deactivate <strong>{deleteItem.name}</strong>? It will no longer be available for new estimations.
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
