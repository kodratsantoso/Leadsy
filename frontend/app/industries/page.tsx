"use client";

import { useState } from "react";
import { ChevronRight, Layers, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { apiFetch } from "@/lib/apiFetch";
import { cn } from "@/lib/utils";

type SubIndustryRecord = {
  id: number;
  name: string;
};

type IndustryRecord = {
  id: number;
  name: string;
  is_active?: boolean;
  sub_industries?: SubIndustryRecord[];
};

export default function IndustriesPage() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<IndustryRecord | null>(null);
  const [formName, setFormName] = useState("");
  const [subModal, setSubModal] = useState<{ industryId: number } | null>(null);
  const [subName, setSubName] = useState("");
  const [deleteIndustry, setDeleteIndustry] = useState<IndustryRecord | null>(null);
  const [deleteSubIndustry, setDeleteSubIndustry] = useState<{
    industryId: number;
    subIndustry: SubIndustryRecord;
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["industries"],
    queryFn: async () => {
      const response = await apiFetch("/industries");
      return response.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { name: string }) => {
      if (editItem) {
        return apiFetch(`/industries/${editItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      return apiFetch("/industries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["industries"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/industries/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["industries"] });
      setDeleteIndustry(null);
    },
  });

  const addSubMutation = useMutation({
    mutationFn: async ({ industryId, name }: { industryId: number; name: string }) =>
      apiFetch(`/industries/${industryId}/sub-industries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["industries"] });
      setSubModal(null);
      setSubName("");
    },
  });

  const deleteSubMutation = useMutation({
    mutationFn: async ({ industryId, subId }: { industryId: number; subId: number }) =>
      apiFetch(`/industries/${industryId}/sub-industries/${subId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["industries"] });
      setDeleteSubIndustry(null);
    },
  });

  const toggle = (id: number) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreate = () => {
    setEditItem(null);
    setFormName("");
    setShowModal(true);
  };

  const openEdit = (item: IndustryRecord) => {
    setEditItem(item);
    setFormName(item.name);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditItem(null);
    setFormName("");
  };

  const industries: IndustryRecord[] = data?.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Industries</CardTitle>
            <CardDescription>
              Governed industry and sub-industry management using shared admin components.
            </CardDescription>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Industry
          </Button>
        </CardHeader>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : industries.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No industries found. Start the backend and seed the database.
            </div>
          ) : (
            industries.map((industry, index) => (
              <div key={industry.id}>
                {index > 0 ? <div className="border-t border-border" /> : null}
                <div className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-accent/30">
                  <button
                    onClick={() => toggle(industry.id)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        expanded.has(industry.id) ? "rotate-90" : ""
                      )}
                    />
                    <Layers className="h-4 w-4 text-[color:var(--brand)]" />
                    <span className="text-sm font-medium">{industry.name}</span>
                    <Badge variant="neutral">
                      {(industry.sub_industries ?? []).length}
                    </Badge>
                    {industry.is_active === false ? (
                      <Badge variant="danger">Inactive</Badge>
                    ) : null}
                  </button>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEdit(industry)}
                      tooltip={`Edit ${industry.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteIndustry(industry)}
                      tooltip={`Delete ${industry.name}`}
                    >
                      <Trash2 className="h-4 w-4 text-[color:var(--danger)]" />
                    </Button>
                  </div>
                </div>

                {expanded.has(industry.id) ? (
                  <div className="border-t border-border/70 bg-[color:var(--surface-subtle)] px-5 py-3">
                    <div className="space-y-2 pl-7">
                      {(industry.sub_industries ?? []).map((subIndustry) => (
                        <div
                          key={subIndustry.id}
                          className="group flex items-center justify-between rounded-xl px-3 py-2 transition-colors hover:bg-card"
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-[color:var(--brand)]/70" />
                            <span className="text-sm font-medium">{subIndustry.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={() =>
                              setDeleteSubIndustry({
                                industryId: industry.id,
                                subIndustry,
                              })
                            }
                            tooltip={`Delete ${subIndustry.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-[color:var(--danger)]" />
                          </Button>
                        </div>
                      ))}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start text-[color:var(--brand)] hover:text-[color:var(--brand)]"
                        onClick={() => {
                          setSubModal({ industryId: industry.id });
                          setSubName("");
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        Add Sub-Industry
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Modal
        open={showModal}
        onOpenChange={setShowModal}
        title={editItem ? "Edit Industry" : "Create Industry"}
        description="Use the shared form controls for master data updates."
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
              {editItem ? "Update Industry" : "Create Industry"}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">Name</label>
          <Input
            value={formName}
            onChange={(event) => setFormName(event.target.value)}
            placeholder="Industry name"
          />
        </div>
      </Modal>

      <Modal
        open={subModal !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSubModal(null);
            setSubName("");
          }
        }}
        title="Add Sub-Industry"
        description="Sub-industries inherit the same governed visual language."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setSubModal(null);
                setSubName("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!subModal) return;
                addSubMutation.mutate({ industryId: subModal.industryId, name: subName });
              }}
              disabled={addSubMutation.isPending || !subName.trim()}
            >
              {addSubMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Add Sub-Industry
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">Name</label>
          <Input
            value={subName}
            onChange={(event) => setSubName(event.target.value)}
            placeholder="Sub-industry name"
          />
        </div>
      </Modal>

      <Modal
        open={deleteIndustry !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteIndustry(null);
        }}
        title="Delete Industry"
        description={
          deleteIndustry
            ? `Delete ${deleteIndustry.name}? This action cannot be undone from the UI.`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteIndustry(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleteIndustry) return;
                deleteMutation.mutate(deleteIndustry.id);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete Industry
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Industry deletion is now governed through the shared modal flow instead of browser
          `confirm()`.
        </p>
      </Modal>

      <Modal
        open={deleteSubIndustry !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteSubIndustry(null);
        }}
        title="Delete Sub-Industry"
        description={
          deleteSubIndustry
            ? `Delete ${deleteSubIndustry.subIndustry.name}?`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteSubIndustry(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleteSubIndustry) return;
                deleteSubMutation.mutate({
                  industryId: deleteSubIndustry.industryId,
                  subId: deleteSubIndustry.subIndustry.id,
                });
              }}
              disabled={deleteSubMutation.isPending}
            >
              {deleteSubMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete Sub-Industry
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          This keeps destructive actions aligned with the shared admin confirmation pattern.
        </p>
      </Modal>
    </div>
  );
}
