"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Briefcase, Layers, Loader2, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { TaxonomyPresetModal } from "@/app/settings/_components/taxonomy-preset-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterBar, FilterBarSearch } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { TagInput } from "@/components/ui/tag-input";
import { useToast } from "@/components/ui/toast";
import { throwIfApiError } from "@/lib/apiError";
import { apiFetch } from "@/lib/apiFetch";
import type { BusinessCategory, BusinessCategoryChannelRole, Industry } from "@/types/api";

const CHANNEL_ROLE_META: Record<
  BusinessCategoryChannelRole,
  {
    label: string;
    badgeVariant: "brand" | "info" | "success" | "warning" | "neutral" | "outline";
  }
> = {
  direct_b2b: { label: "Direct B2B", badgeVariant: "neutral" },
  direct_b2c: { label: "Private / B2C", badgeVariant: "info" },
  partner_influencer: { label: "Partner / Influencer", badgeVariant: "brand" },
  indirect_contract: { label: "Contract / Leasing", badgeVariant: "warning" },
};

function getChannelRoleMeta(role: string | null | undefined) {
  const key = (role || "direct_b2b") as BusinessCategoryChannelRole;
  return CHANNEL_ROLE_META[key] || CHANNEL_ROLE_META.direct_b2b;
}

export default function BusinessCategoriesPage() {
  const pathname = usePathname();
  const qc = useQueryClient();
  const toast = useToast();

  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Create / Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<BusinessCategory | null>(null);
  const [formIndustryId, setFormIndustryId] = useState<string>("");
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formChannelRole, setFormChannelRole] =
    useState<BusinessCategoryChannelRole>("direct_b2b");
  const [formDescription, setFormDescription] = useState("");
  const [formSynonyms, setFormSynonyms] = useState<string[]>([]);
  const [formScoringHints, setFormScoringHints] = useState("");

  const [deleteCategory, setDeleteCategory] = useState<BusinessCategory | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["business-categories"],
    queryFn: async () => {
      const response = await apiFetch("/business-categories");
      await throwIfApiError(response, "Gagal memuat data Business Categories.");
      return response.json();
    },
  });

  const industriesQuery = useQuery({
    queryKey: ["industries"],
    queryFn: async () => {
      const response = await apiFetch("/industries");
      await throwIfApiError(response, "Gagal memuat daftar industri.");
      return response.json();
    },
  });

  const industries: Industry[] = industriesQuery.data?.data ?? [];
  const categories: BusinessCategory[] = useMemo(() => data?.data ?? [], [data]);
  const isTenantIsolated = Boolean(data?.meta?.is_tenant_isolated);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return categories.filter((cat) => {
      if (industryFilter === "universal" && cat.industry_id !== null && cat.industry_id !== undefined) {
        return false;
      }
      if (
        industryFilter !== "all" &&
        industryFilter !== "universal" &&
        String(cat.industry_id ?? "") !== industryFilter
      ) {
        return false;
      }
      if (roleFilter !== "all" && (cat.channel_role || "direct_b2b") !== roleFilter) {
        return false;
      }
      if (q) {
        const hay = `${cat.code || ""} ${cat.name} ${cat.description || ""} ${cat.industry?.name || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [categories, industryFilter, roleFilter, searchQuery]);

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      industry_id: number | null;
      code: string | null;
      name: string;
      channel_role: BusinessCategoryChannelRole;
      description: string | null;
      synonyms: string[];
      scoring_hints: string | null;
    }) => {
      const res = editItem
        ? await apiFetch(`/business-categories/${editItem.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await apiFetch("/business-categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      await throwIfApiError(res, "Gagal menyimpan Business Category.");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business-categories"] });
      qc.invalidateQueries({ queryKey: ["industries"] });
      qc.invalidateQueries({ queryKey: ["newsletter-industries"] });
      toast.success(editItem ? "Business Category diperbarui" : "Business Category ditambahkan");
      closeModal();
    },
    onError: (err) => toast.fromError(err, "Gagal menyimpan Business Category."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/business-categories/${id}`, { method: "DELETE" });
      await throwIfApiError(res, "Gagal menghapus Business Category.");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business-categories"] });
      qc.invalidateQueries({ queryKey: ["industries"] });
      qc.invalidateQueries({ queryKey: ["newsletter-industries"] });
      toast.success("Business Category dihapus");
      setDeleteCategory(null);
    },
    onError: (err) => toast.fromError(err, "Gagal menghapus Business Category."),
  });

  const openCreate = () => {
    setEditItem(null);
    setFormIndustryId(
      industryFilter !== "all" && industryFilter !== "universal" ? industryFilter : ""
    );
    setFormCode("");
    setFormName("");
    setFormChannelRole("direct_b2b");
    setFormDescription("");
    setFormSynonyms([]);
    setFormScoringHints("");
    setShowModal(true);
  };

  const openEdit = (item: BusinessCategory) => {
    setEditItem(item);
    setFormIndustryId(item.industry_id ? String(item.industry_id) : "");
    setFormCode(item.code || "");
    setFormName(item.name);
    setFormChannelRole((item.channel_role as BusinessCategoryChannelRole) || "direct_b2b");
    setFormDescription(item.description || "");
    setFormSynonyms(Array.isArray(item.synonyms) ? item.synonyms : []);
    setFormScoringHints(typeof item.scoring_hints === "string" ? item.scoring_hints : "");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditItem(null);
    setFormIndustryId("");
    setFormCode("");
    setFormName("");
    setFormChannelRole("direct_b2b");
    setFormDescription("");
    setFormSynonyms([]);
    setFormScoringHints("");
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="space-y-1">
            {pathname.startsWith("/settings/") ? <BackToSettings /> : null}
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Business Categories & #LOB</CardTitle>
              <Badge variant={isTenantIsolated ? "brand" : "neutral"}>
                {isTenantIsolated ? "Isolated Tenant Taxonomy" : "Global Default"}
              </Badge>
            </div>
            <CardDescription>
              Kelola klasifikasi Line of Business (#LOB), relasi Segmen Industri, dan peran kanal bisnis (B2B, Private B2C, Partner/Specifier, Contract) untuk AI Enrichment & Newsletter.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setPresetModalOpen(true)}>
              <Sparkles className="h-4 w-4 text-[color:var(--brand)]" />
              Apply Vertical Preset
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          </div>
        </CardHeader>
      </Card>

      <FilterBar>
        <FilterBarSearch
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Cari kode #LOB, nama kategori, atau definisi..."
        />
        <Select
          value={industryFilter}
          onChange={(event) => setIndustryFilter(event.target.value)}
          className="w-56"
        >
          <option value="all">All Segments / Industries</option>
          <option value="universal">Universal (Cross-Industry)</option>
          {industries.map((ind) => (
            <option key={ind.id} value={String(ind.id)}>
              {ind.name}
            </option>
          ))}
        </Select>
        <Select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          className="w-48"
        >
          <option value="all">All Channel Roles</option>
          <option value="direct_b2b">Direct B2B</option>
          <option value="direct_b2c">Private / B2C</option>
          <option value="partner_influencer">Partner / Influencer</option>
          <option value="indirect_contract">Contract / Leasing</option>
        </Select>
      </FilterBar>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Tidak ada Business Category yang sesuai filter saat ini.
            </div>
          ) : (
            filteredCategories.map((category, index) => {
              const roleMeta = getChannelRoleMeta(category.channel_role);

              return (
                <div key={category.id}>
                  {index > 0 ? <div className="border-t border-border" /> : null}
                  <div className="flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-accent/30">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Briefcase className="h-4 w-4 shrink-0 text-[color:var(--brand)]" />
                        {category.code ? (
                          <Badge variant="brand" className="font-mono">
                            #{category.code}
                          </Badge>
                        ) : null}
                        <span className="text-sm font-medium text-foreground">
                          {category.name}
                        </span>
                        <Badge variant="outline">
                          <Layers className="h-3 w-3 text-muted-foreground" />
                          {category.industry?.name || "Universal"}
                        </Badge>
                        <Badge variant={roleMeta.badgeVariant}>{roleMeta.label}</Badge>
                        {category.is_active === false ? (
                          <Badge variant="danger">Inactive</Badge>
                        ) : null}
                      </div>

                      {category.description ? (
                        <p className="pl-6 text-xs leading-relaxed text-muted-foreground">
                          {category.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
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
        title={editItem ? "Edit Business Category / #LOB" : "Create Business Category / #LOB"}
        description="Petakan kategori bisnis atau Line of Business resmi ke segmen industri terkait."
        footer={
          <>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                saveMutation.mutate({
                  industry_id: formIndustryId ? Number(formIndustryId) : null,
                  code: formCode.trim() || null,
                  name: formName.trim(),
                  channel_role: formChannelRole,
                  description: formDescription.trim() || null,
                  synonyms: formSynonyms,
                  scoring_hints: formScoringHints.trim() || null,
                })
              }
              disabled={saveMutation.isPending || !formName.trim()}
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editItem ? "Update Category" : "Create Category"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Code / #LOB (Optional)</label>
              <Input
                value={formCode}
                onChange={(event) => setFormCode(event.target.value)}
                placeholder="e.g. 205 or B2B"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Channel Role</label>
              <Select
                value={formChannelRole}
                onChange={(event) =>
                  setFormChannelRole(event.target.value as BusinessCategoryChannelRole)
                }
              >
                <option value="direct_b2b">Direct B2B (Commercial Account)</option>
                <option value="direct_b2c">Private / B2C (VIP & Home Client)</option>
                <option value="partner_influencer">Partner / Influencer (Architect, PT)</option>
                <option value="indirect_contract">Contract / Leasing (Mgmt & Bank)</option>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Parent Segment / Industry</label>
            <Select
              value={formIndustryId}
              onChange={(event) => setFormIndustryId(event.target.value)}
            >
              <option value="">Universal (Applies to All Industries)</option>
              {industries.map((ind) => (
                <option key={ind.id} value={String(ind.id)}>
                  {ind.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Category / LOB Name</label>
            <Input
              value={formName}
              onChange={(event) => setFormName(event.target.value)}
              placeholder="e.g. HOTEL & RESORTS"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Official Definition (Optional)</label>
            <Input
              value={formDescription}
              onChange={(event) => setFormDescription(event.target.value)}
              placeholder="e.g. Hotels and resorts, fitness areas in private condominiums..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Search Synonyms (Optional)</label>
            <TagInput
              value={formSynonyms}
              onChange={setFormSynonyms}
              placeholder="Ketik sinonim pencarian lalu tekan Enter..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">AI Scoring Hints (Optional)</label>
            <Input
              value={formScoringHints}
              onChange={(event) => setFormScoringHints(event.target.value)}
              placeholder="Petunjuk kualifikasi prospek untuk AI Profiling..."
            />
          </div>
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
          Kategori bisnis ini akan dihapus secara permanen dari taksonomi aktif.
        </p>
      </Modal>
    </div>
  );
}
