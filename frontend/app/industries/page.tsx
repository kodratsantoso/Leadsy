"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Briefcase,
  ChevronRight,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { TaxonomyPresetModal } from "@/app/settings/_components/taxonomy-preset-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { TagInput } from "@/components/ui/tag-input";
import { useToast } from "@/components/ui/toast";
import { throwIfApiError } from "@/lib/apiError";
import { apiFetch } from "@/lib/apiFetch";
import { cn } from "@/lib/utils";
import type { BusinessCategory, Industry } from "@/types/api";

type SubIndustryRecord = {
  id: number;
  industry_id?: number;
  name: string;
  synonyms?: string[] | null;
  scoring_hints?: string | null;
  is_active?: boolean;
};

type IndustryRecord = Omit<Industry, "sub_industries" | "business_categories"> & {
  sub_industries?: SubIndustryRecord[];
  business_categories?: BusinessCategory[];
};

export default function IndustriesPage() {
  const pathname = usePathname();
  const qc = useQueryClient();
  const toast = useToast();

  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [presetModalOpen, setPresetModalOpen] = useState(false);

  // Industry Create/Edit state
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<IndustryRecord | null>(null);
  const [formName, setFormName] = useState("");
  const [formSynonyms, setFormSynonyms] = useState<string[]>([]);
  const [formScoringHints, setFormScoringHints] = useState("");

  // Sub-industry Create/Edit state
  const [subModal, setSubModal] = useState<{
    industryId: number;
    subIndustry?: SubIndustryRecord | null;
  } | null>(null);
  const [subName, setSubName] = useState("");
  const [subSynonyms, setSubSynonyms] = useState<string[]>([]);
  const [subScoringHints, setSubScoringHints] = useState("");

  // Destructive modals
  const [deleteIndustry, setDeleteIndustry] = useState<IndustryRecord | null>(null);
  const [deleteSubIndustry, setDeleteSubIndustry] = useState<{
    industryId: number;
    subIndustry: SubIndustryRecord;
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["industries"],
    queryFn: async () => {
      const response = await apiFetch("/industries");
      await throwIfApiError(response, "Gagal memuat data industri.");
      return response.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      synonyms: string[];
      scoring_hints: string | null;
    }) => {
      const res = editItem
        ? await apiFetch(`/industries/${editItem.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await apiFetch("/industries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      await throwIfApiError(res, "Gagal menyimpan industri.");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["industries"] });
      qc.invalidateQueries({ queryKey: ["newsletter-industries"] });
      toast.success(editItem ? "Industry diperbarui" : "Industry ditambahkan");
      closeModal();
    },
    onError: (err) => toast.fromError(err, "Gagal menyimpan industri."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/industries/${id}`, { method: "DELETE" });
      await throwIfApiError(res, "Gagal menghapus industri.");
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["industries"] });
      qc.invalidateQueries({ queryKey: ["newsletter-industries"] });
      toast.success("Industry dihapus");
      setDeleteIndustry(null);
    },
    onError: (err) => toast.fromError(err, "Gagal menghapus industri."),
  });

  const saveSubMutation = useMutation({
    mutationFn: async ({
      industryId,
      subId,
      name,
      synonyms,
      scoring_hints,
    }: {
      industryId: number;
      subId?: number;
      name: string;
      synonyms: string[];
      scoring_hints: string | null;
    }) => {
      const url = subId
        ? `/industries/${industryId}/sub-industries/${subId}`
        : `/industries/${industryId}/sub-industries`;
      const res = await apiFetch(url, {
        method: subId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, synonyms, scoring_hints }),
      });
      await throwIfApiError(res, "Gagal menyimpan sub-industri.");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["industries"] });
      qc.invalidateQueries({ queryKey: ["newsletter-industries"] });
      toast.success(subModal?.subIndustry ? "Sub-Industry diperbarui" : "Sub-Industry ditambahkan");
      closeSubModal();
    },
    onError: (err) => toast.fromError(err, "Gagal menyimpan sub-industri."),
  });

  const deleteSubMutation = useMutation({
    mutationFn: async ({ industryId, subId }: { industryId: number; subId: number }) => {
      const res = await apiFetch(`/industries/${industryId}/sub-industries/${subId}`, {
        method: "DELETE",
      });
      await throwIfApiError(res, "Gagal menghapus sub-industri.");
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["industries"] });
      qc.invalidateQueries({ queryKey: ["newsletter-industries"] });
      toast.success("Sub-Industry dihapus");
      setDeleteSubIndustry(null);
    },
    onError: (err) => toast.fromError(err, "Gagal menghapus sub-industri."),
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
    setFormSynonyms([]);
    setFormScoringHints("");
    setShowModal(true);
  };

  const openEdit = (item: IndustryRecord) => {
    setEditItem(item);
    setFormName(item.name);
    setFormSynonyms(Array.isArray(item.synonyms) ? item.synonyms : []);
    setFormScoringHints(item.scoring_hints || "");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditItem(null);
    setFormName("");
    setFormSynonyms([]);
    setFormScoringHints("");
  };

  const openCreateSub = (industryId: number) => {
    setSubModal({ industryId, subIndustry: null });
    setSubName("");
    setSubSynonyms([]);
    setSubScoringHints("");
  };

  const openEditSub = (industryId: number, sub: SubIndustryRecord) => {
    setSubModal({ industryId, subIndustry: sub });
    setSubName(sub.name);
    setSubSynonyms(Array.isArray(sub.synonyms) ? sub.synonyms : []);
    setSubScoringHints(sub.scoring_hints || "");
  };

  const closeSubModal = () => {
    setSubModal(null);
    setSubName("");
    setSubSynonyms([]);
    setSubScoringHints("");
  };

  const industries: IndustryRecord[] = data?.data ?? [];
  const isTenantIsolated = Boolean(data?.meta?.is_tenant_isolated);
  const categoriesHref = pathname.startsWith("/settings/")
    ? "/settings/business-categories"
    : "/business-categories";

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="space-y-1">
            {pathname.startsWith("/settings/") ? <BackToSettings /> : null}
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Industries & Segments</CardTitle>
              <Badge variant={isTenantIsolated ? "brand" : "neutral"}>
                {isTenantIsolated ? "Isolated Tenant Taxonomy" : "Global Default"}
              </Badge>
            </div>
            <CardDescription>
              Kelola hierarki Segmen Utama (Industry), Sub-Industri Spesifik, dan relasi #LOB Business Category untuk AI Enrichment & Industry Newsletter.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setPresetModalOpen(true)}>
              <Sparkles className="h-4 w-4 text-[color:var(--brand)]" />
              Apply Vertical Preset
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add Industry
            </Button>
          </div>
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
              Belum ada data industri. Gunakan tombol Apply Vertical Preset atau Add Industry untuk memulai.
            </div>
          ) : (
            industries.map((industry, index) => {
              const subList = industry.sub_industries ?? [];
              const lobList = industry.business_categories ?? [];
              const isOpen = expanded.has(industry.id);

              return (
                <div key={industry.id}>
                  {index > 0 ? <div className="border-t border-border" /> : null}
                  <div className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-accent/30">
                    <button
                      type="button"
                      onClick={() => toggle(industry.id)}
                      className="flex flex-1 flex-wrap items-center gap-2.5 text-left"
                    >
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                          isOpen ? "rotate-90" : ""
                        )}
                      />
                      <Layers className="h-4 w-4 shrink-0 text-[color:var(--brand)]" />
                      <span className="text-sm font-medium text-foreground">{industry.name}</span>
                      <Badge variant="neutral">{subList.length} Sub-Industries</Badge>
                      {lobList.length > 0 ? (
                        <Badge variant="info">{lobList.length} #LOB Categories</Badge>
                      ) : null}
                      {industry.is_active === false ? (
                        <Badge variant="danger">Inactive</Badge>
                      ) : null}
                    </button>

                    <div className="flex items-center gap-1">
                      <Link href={`/leads/industry/${industry.id}`}>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          tooltip={`Lihat Leads — ${industry.name}`}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                      </Link>
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

                  {isOpen ? (
                    <div className="border-t border-border/70 bg-[color:var(--surface-subtle)] px-5 py-4">
                      <div className="space-y-4 pl-7">
                        {industry.scoring_hints ? (
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            <span className="font-medium text-foreground">AI Scoring & Fit Hint:</span>{" "}
                            {industry.scoring_hints}
                          </p>
                        ) : null}

                        <div className="space-y-1.5">
                          <div className="text-xs font-medium text-muted-foreground">
                            Sub-Industries ({subList.length})
                          </div>
                          {subList.map((subIndustry) => (
                            <div
                              key={subIndustry.id}
                              className="group flex items-center justify-between gap-2 rounded-xl px-3 py-2 transition-colors hover:bg-card"
                            >
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="h-2 w-2 shrink-0 rounded-full bg-[color:var(--brand)]/70" />
                                  <span className="text-sm font-medium text-foreground">
                                    {subIndustry.name}
                                  </span>
                                  {Array.isArray(subIndustry.synonyms) &&
                                  subIndustry.synonyms.length > 0 ? (
                                    <span className="text-xs text-muted-foreground">
                                      ({subIndustry.synonyms.slice(0, 3).join(", ")})
                                    </span>
                                  ) : null}
                                </div>
                                {subIndustry.scoring_hints ? (
                                  <p className="pl-4 text-xs text-muted-foreground">
                                    {subIndustry.scoring_hints}
                                  </p>
                                ) : null}
                              </div>

                              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => openEditSub(industry.id, subIndustry)}
                                  tooltip={`Edit ${subIndustry.name}`}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
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
                            </div>
                          ))}

                          <Button
                            variant="ghost"
                            size="sm"
                            className="justify-start text-[color:var(--brand)] hover:text-[color:var(--brand)]"
                            onClick={() => openCreateSub(industry.id)}
                          >
                            <Plus className="h-4 w-4" />
                            Add Sub-Industry
                          </Button>
                        </div>

                        {lobList.length > 0 ? (
                          <div className="space-y-2 border-t border-border/60 pt-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                <Briefcase className="h-3.5 w-3.5 text-[color:var(--brand)]" />
                                Linked Business Categories / #LOB ({lobList.length})
                              </span>
                              <Link
                                href={categoriesHref}
                                className="text-xs font-medium text-[color:var(--brand)] hover:underline"
                              >
                                Manage Categories
                              </Link>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {lobList.map((cat) => (
                                <Badge key={cat.id} variant="outline" className="gap-1.5">
                                  {cat.code ? (
                                    <span className="font-mono font-semibold text-[color:var(--brand)]">
                                      #{cat.code}
                                    </span>
                                  ) : null}
                                  <span>{cat.name}</span>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <TaxonomyPresetModal open={presetModalOpen} onOpenChange={setPresetModalOpen} />

      <Modal
        open={showModal}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
        title={editItem ? "Edit Industry / Segment" : "Create Industry / Segment"}
        description="Konfigurasi nama segmen utama, kata kunci sinonim pencarian, serta petunjuk kualifikasi AI."
        footer={
          <>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                saveMutation.mutate({
                  name: formName.trim(),
                  synonyms: formSynonyms,
                  scoring_hints: formScoringHints.trim() || null,
                })
              }
              disabled={saveMutation.isPending || !formName.trim()}
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editItem ? "Update Industry" : "Create Industry"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Industry / Segment Name</label>
            <Input
              value={formName}
              onChange={(event) => setFormName(event.target.value)}
              placeholder="e.g. Hospitality & Residential (H&R)"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Search Synonyms (Optional)</label>
            <TagInput
              value={formSynonyms}
              onChange={setFormSynonyms}
              placeholder="Ketik kata kunci lalu tekan Enter..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">AI Qualification & Solution Hints (Optional)</label>
            <Input
              value={formScoringHints}
              onChange={(event) => setFormScoringHints(event.target.value)}
              placeholder="e.g. Fokus properti bintang 4/5, kondominium premium, kebutuhan estetika..."
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={subModal !== null}
        onOpenChange={(open) => {
          if (!open) closeSubModal();
        }}
        title={subModal?.subIndustry ? "Edit Sub-Industry" : "Add Sub-Industry"}
        description="Sub-industri spesifik digunakan untuk pemetaan presisi AI Enrichment dan pencarian berita Newsletter."
        footer={
          <>
            <Button variant="outline" onClick={closeSubModal}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!subModal) return;
                saveSubMutation.mutate({
                  industryId: subModal.industryId,
                  subId: subModal.subIndustry?.id,
                  name: subName.trim(),
                  synonyms: subSynonyms,
                  scoring_hints: subScoringHints.trim() || null,
                });
              }}
              disabled={saveSubMutation.isPending || !subName.trim()}
            >
              {saveSubMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {subModal?.subIndustry ? "Update Sub-Industry" : "Add Sub-Industry"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Sub-Industry Name</label>
            <Input
              value={subName}
              onChange={(event) => setSubName(event.target.value)}
              placeholder="e.g. Luxury Hotels & Resorts"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Search Synonyms (Optional)</label>
            <TagInput
              value={subSynonyms}
              onChange={setSubSynonyms}
              placeholder="e.g. five star hotel, luxury resort..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Project Profile & Equipment Hint (Optional)</label>
            <Input
              value={subScoringHints}
              onChange={(event) => setSubScoringHints(event.target.value)}
              placeholder="e.g. Tamu VIP, rekomendasi Artis Line & Biostrength..."
            />
          </div>
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
          Penghapusan industri dikelola melalui dialog terstandar untuk menjaga keamanan data master.
        </p>
      </Modal>

      <Modal
        open={deleteSubIndustry !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteSubIndustry(null);
        }}
        title="Delete Sub-Industry"
        description={
          deleteSubIndustry ? `Delete ${deleteSubIndustry.subIndustry.name}?` : undefined
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
          Sub-industri ini akan dihapus dari daftar segmen aktif.
        </p>
      </Modal>
    </div>
  );
}
