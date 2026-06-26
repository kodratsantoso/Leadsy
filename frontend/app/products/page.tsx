"use client";

import { useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Globe,
  Link as LinkIcon,
  Loader2,
  Package,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
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
import { useNumberFormat } from "@/lib/hooks/use-number-format";
import { QuestionGuide } from "@/components/products/QuestionGuide";
import { ProductScrapeAndCompare } from "@/components/products/ProductScrapeAndCompare";

type ProductTier = {
  id?: number;
  name: string;
  price: number;
  pricing_type: "flat_rate" | "per_user" | "usage_based";
  billing_period: "monthly" | "yearly" | "one_time" | "custom";
  subscription_duration_value: number;
  subscription_duration_unit: "day" | "month" | "year" | "lifetime";
  features?: string[] | null;
  status?: string | null;
};

type ProductRecord = {
  id: number;
  name: string;
  description?: string | null;
  category?: string | null;
  target_industry?: string | null;
  target_company_size?: string | null;
  target_pain_points?: string | null;
  target_buyer_persona?: string | null;
  ideal_company_profile?: string | null;
  supported_regions?: string | null;
  budget_range?: string | null;
  use_cases?: string[] | null;
  competitor_notes?: string | null;
  keywords?: string[] | null;
  target_persona?: string | null;
  status?: string | null;
  ai_reference_source_type?: string | null;
  created_at?: string | null;
  tiers?: ProductTier[] | null;
};

type AiGenerateResult = {
  description: string;
  category: string | string[];
  target_industry: string | string[];
  target_company_size: string;
  target_buyer_persona: string | string[];
  budget_range: string;
  supported_regions: string | string[];
  keywords: string[] | string;
  target_pain_points: string;
  use_cases: string[] | string;
  competitor_notes: string;
  ideal_company_profile: string;
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
  const { formatCurrency } = useNumberFormat();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<ProductRecord | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<ProductRecord | null>(null);

  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formTargetIndustry, setFormTargetIndustry] = useState("");
  const [formTargetCompanySize, setFormTargetCompanySize] = useState("");
  const [formTargetPainPoints, setFormTargetPainPoints] = useState("");
  const [formTargetPersona, setFormTargetPersona] = useState("");
  const [formIdealCompanyProfile, setFormIdealCompanyProfile] = useState("");
  const [formSupportedRegions, setFormSupportedRegions] = useState("");
  const [formBudgetRange, setFormBudgetRange] = useState("");
  const [formUseCases, setFormUseCases] = useState("");      // comma-sep → array
  const [formCompetitorNotes, setFormCompetitorNotes] = useState("");
  const [formKeywords, setFormKeywords] = useState("");       // comma-sep → array
  const [formStatus, setFormStatus] = useState("active");
  const [formTiers, setFormTiers] = useState<ProductTier[]>([]);

  const [aiGenerated, setAiGenerated] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSource, setAiSource] = useState<"name" | "url" | "pdf" | null>(null);

  // Reference inputs
  const [refUrl, setRefUrl] = useState("");
  const [refPdfFile, setRefPdfFile] = useState<File | null>(null);
  const [refPdfName, setRefPdfName] = useState("");

  const toParts = (value: string | string[] | null | undefined, splitLines = false) => {
    if (!value) return [];
    const raw = Array.isArray(value)
      ? value.flatMap((item) => splitLines ? item.split(/\n+/) : item.split(","))
      : splitLines ? value.split(/\n+/) : value.split(",");
    return raw.map((item) => item.trim()).filter(Boolean);
  };

  const uniqueJoin = (items: string[], separator = ", ") => {
    const seen = new Set<string>();
    return items
      .filter((item) => {
        const key = item.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .join(separator);
  };

  const isGenericAiDescription = (value: string) =>
    value.includes("Review the generated targeting, pain points, and use cases");

  const mergeText = (current: string, incoming?: string | null, replaceGeneric = false) => {
    const next = incoming?.trim() ?? "";
    if (!next) return current;
    if (!current.trim() || (replaceGeneric && isGenericAiDescription(current))) return next;
    if (current.trim().toLowerCase() === next.toLowerCase()) return current;
    return current;
  };

  const mergeParagraphs = (current: string, incoming?: string | null) => {
    const next = incoming?.trim() ?? "";
    if (!next) return current;
    if (!current.trim()) return next;
    if (current.trim().toLowerCase().includes(next.toLowerCase())) return current;
    return `${current.trim()}\n\n${next}`;
  };

  const mergeCsv = (current: string, incoming: string | string[] | null | undefined) =>
    uniqueJoin([...toParts(current), ...toParts(incoming)]);

  const mergeLines = (current: string, incoming: string | string[] | null | undefined) =>
    uniqueJoin([...toParts(current, true), ...toParts(incoming, true)], "\n");

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

  const aiGenerateMutation = useMutation({
    mutationFn: async ({ source, productName, url, pdfFile }: {
      source: "name" | "url" | "pdf";
      productName: string;
      url?: string;
      pdfFile?: File;
    }) => {
      let res: Response;

      if (source === "pdf" && pdfFile) {
        const form = new FormData();
        form.append("pdf_file", pdfFile);
        if (productName) form.append("product_name", productName);
        res = await apiFetch("/products/ai-generate", { method: "POST", body: form });
      } else {
        const body: Record<string, string> = {};
        if (productName) body.product_name = productName;
        if (source === "url" && url) body.reference_url = url;
        res = await apiFetch("/products/ai-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const validationMessage = body.errors
          ? Object.values(body.errors).flat().join(" ")
          : null;
        throw new Error(body.error ?? body.message ?? validationMessage ?? `Request failed (${res.status})`);
      }
      return res.json() as Promise<{ data: AiGenerateResult; ai_model: string | null; source: string }>;
    },
    onMutate: (variables) => {
      setAiSource(variables.source);
      setAiGenerated(false);
      setAiError(null);
    },
    onSuccess: ({ data: generated }, variables) => {
      setFormDesc((current) => mergeText(current, generated.description, true));
      setFormCategory((current) => mergeCsv(current, generated.category));
      setFormTargetIndustry((current) => mergeCsv(current, generated.target_industry));
      setFormTargetCompanySize((current) => mergeText(current, generated.target_company_size));
      setFormTargetPersona((current) => mergeCsv(current, generated.target_buyer_persona));
      setFormBudgetRange((current) => mergeText(current, generated.budget_range));
      setFormSupportedRegions((current) => mergeCsv(current, generated.supported_regions));
      setFormKeywords((current) => mergeCsv(current, generated.keywords));
      setFormTargetPainPoints((current) => mergeLines(current, generated.target_pain_points));
      setFormUseCases((current) => mergeCsv(current, generated.use_cases));
      setFormCompetitorNotes((current) => mergeParagraphs(current, generated.competitor_notes));
      setFormIdealCompanyProfile((current) => mergeParagraphs(current, generated.ideal_company_profile));
      setAiGenerated(true);
      setAiError(null);
    },
    onError: (err: Error) => {
      setAiError(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      setDeleteProduct(null);
    },
  });

  const resetForm = () => {
    setFormName(""); setFormDesc(""); setFormCategory("");
    setFormTargetIndustry(""); setFormTargetCompanySize(""); setFormTargetPainPoints("");
    setFormTargetPersona(""); setFormIdealCompanyProfile(""); setFormSupportedRegions("");
    setFormBudgetRange(""); setFormUseCases(""); setFormCompetitorNotes("");
    setFormKeywords(""); setFormStatus("active"); setFormTiers([]);
    setAiGenerated(false); setAiError(null); setAiSource(null);
    setRefUrl(""); setRefPdfFile(null); setRefPdfName("");
  };

  const openCreate = () => {
    setEditItem(null);
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: ProductRecord) => {
    setEditItem(item);
    setFormName(item.name || "");
    setFormDesc(item.description || "");
    setFormCategory(item.category || "");
    setFormTargetIndustry(item.target_industry || "");
    setFormTargetCompanySize(item.target_company_size || "");
    setFormTargetPainPoints(item.target_pain_points || "");
    setFormTargetPersona(item.target_buyer_persona || item.target_persona || "");
    setFormIdealCompanyProfile(item.ideal_company_profile || "");
    setFormSupportedRegions(item.supported_regions || "");
    setFormBudgetRange(item.budget_range || "");
    setFormUseCases(item.use_cases?.join(", ") || "");
    setFormCompetitorNotes(item.competitor_notes || "");
    setFormKeywords(item.keywords?.join(", ") || "");
    setFormStatus(item.status || "active");
    setFormTiers(item.tiers ?? []);
    setAiGenerated(false);
    setAiError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditItem(null);
  };

  const strToArr = (s: string) => s.split(",").map(v => v.trim()).filter(Boolean);

  const handleSave = () => {
    saveMutation.mutate({
      name:                  formName,
      description:           formDesc,
      category:              formCategory,
      target_industry:       formTargetIndustry,
      target_company_size:   formTargetCompanySize,
      target_pain_points:    formTargetPainPoints,
      target_buyer_persona:  formTargetPersona,
      ideal_company_profile: formIdealCompanyProfile,
      supported_regions:     formSupportedRegions,
      budget_range:          formBudgetRange,
      use_cases:             strToArr(formUseCases) as any,
      competitor_notes:      formCompetitorNotes,
      keywords:              strToArr(formKeywords) as any,
      status:                formStatus,
      tiers:                 formTiers as any,
    } as any);
  };

  const handleAiGenerate = (source: "name" | "url" | "pdf") => {
    setAiError(null);
    if (source === "url") {
      if (!refUrl.trim()) return;
      aiGenerateMutation.mutate({ source: "url", productName: formName.trim(), url: refUrl.trim() });
    } else if (source === "pdf") {
      if (!refPdfFile) return;
      aiGenerateMutation.mutate({ source: "pdf", productName: formName.trim(), pdfFile: refPdfFile });
    } else {
      if (!formName.trim()) return;
      aiGenerateMutation.mutate({ source: "name", productName: formName.trim() });
    }
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
          <Button onClick={openCreate} data-tour="products-add">
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
                        <p className="mt-1 text-sm">{product.target_buyer_persona || product.target_persona || "—"}</p>
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

                    {/* SaaS Product Tiers Grid */}
                    {product.tiers && product.tiers.length > 0 && (
                      <div className="mt-6 border-t border-border pt-5 space-y-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Product Tiers & Pricing Structures (SaaS)
                        </h4>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {product.tiers.map((tier) => (
                            <div
                              key={tier.id}
                              className="rounded-xl border border-border bg-[color:var(--surface-subtle)] p-4 shadow-sm flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <h5 className="font-bold text-sm truncate">{tier.name}</h5>
                                  <Badge variant={tier.status === "active" ? "success" : "neutral"} className="scale-90 transform origin-right">
                                    {tier.status || "active"}
                                  </Badge>
                                </div>
                                <div className="mt-2 text-lg font-extrabold flex items-baseline gap-1">
                                  <span>{formatCurrency(tier.price)}</span>
                                  <span className="text-xs font-normal text-muted-foreground">
                                    / {tier.billing_period}
                                  </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider font-semibold">
                                  Duration: {tier.subscription_duration_value} {tier.subscription_duration_unit}(s)
                                  {tier.pricing_type !== "flat_rate" && ` • ${tier.pricing_type.replace("_", " ")}`}
                                </p>
                              </div>
                              {tier.features && tier.features.filter(Boolean).length > 0 && (
                                <ul className="mt-3 border-t border-border/60 pt-3 space-y-1 text-xs text-muted-foreground/90">
                                  {tier.features.filter(Boolean).map((feat, fIdx) => (
                                    <li key={fIdx} className="flex items-start gap-1.5 min-w-0">
                                      <span className="text-emerald-500 font-bold select-none">✓</span>
                                      <span className="truncate">{feat}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                      <div className="flex items-center gap-2">
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
                      <ProductScrapeAndCompare product={product} />
                    </div>

                    {/* Question Guide — AI-generated requirement questions per product */}
                    <div className="mt-1 border-t border-border pt-1">
                      <QuestionGuide productId={product.id} />
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
        description="Fill in product metadata to enable AI-powered BANT + Competitor product matching."
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending || !formName.trim()}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editItem ? "Update Product" : "Create Product"}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Core */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Product Name *</label>
              <div className="flex gap-2">
                <Input
                  value={formName}
                  onChange={(e) => { setFormName(e.target.value); setAiGenerated(false); }}
                  placeholder="e.g. Google Workspace"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleAiGenerate("name")}
                  disabled={!formName.trim() || aiGenerateMutation.isPending}
                  className="shrink-0 gap-1.5 border-[color:var(--brand)] text-[color:var(--brand)] hover:bg-[color:var(--brand)]/5"
                >
                  {aiGenerateMutation.isPending && aiSource === "name" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {aiGenerateMutation.isPending && aiSource === "name" ? "Generating…" : "AI Generate"}
                </Button>
              </div>
              {aiError && aiSource === "name" && (
                <p className="text-xs text-destructive">{aiError}</p>
              )}
              {aiGenerated && !aiError && (
                <div className="flex items-center gap-1.5 text-xs text-[color:var(--brand)]">
                  <Sparkles className="h-3 w-3" />
                  <span>
                    Fields filled by AI from{" "}
                    {aiSource === "url" ? "website URL" : aiSource === "pdf" ? "PDF document" : "product name"}
                    {" "}— review and edit before saving
                  </span>
                </div>
              )}
            </div>

            {/* AI Reference Sources */}
            <div className="sm:col-span-2 rounded-2xl border border-border bg-[color:var(--surface-subtle)] p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                AI Reference Source
              </p>
              <p className="text-xs text-muted-foreground">
                Optionally provide a website URL or PDF one-pager for more accurate AI-generated metadata.
              </p>

              {/* URL Reference */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  Website URL
                </label>
                <div className="flex gap-2">
                  <Input
                    value={refUrl}
                    onChange={(e) => setRefUrl(e.target.value)}
                    placeholder="https://www.yourproduct.com"
                    className="flex-1 text-sm"
                    type="url"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAiGenerate("url")}
                    disabled={!refUrl.trim() || aiGenerateMutation.isPending}
                    className="shrink-0"
                  >
                    {aiGenerateMutation.isPending && aiSource === "url" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {aiGenerateMutation.isPending && aiSource === "url" ? "Analyzing…" : "Analyze URL"}
                  </Button>
                </div>
                {aiError && aiSource === "url" && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {aiError}
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* PDF Upload */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Product One-Pager (PDF)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setRefPdfFile(file);
                        setRefPdfName(file?.name ?? "");
                        e.target.value = "";
                      }}
                    />
                    <div className="flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm text-muted-foreground">
                      <Upload className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {refPdfName || "Choose PDF file…"}
                      </span>
                      {refPdfFile && (
                        <button
                          type="button"
                          className="ml-auto shrink-0 hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRefPdfFile(null);
                            setRefPdfName("");
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAiGenerate("pdf")}
                    disabled={!refPdfFile || aiGenerateMutation.isPending}
                    className="shrink-0"
                  >
                    {aiGenerateMutation.isPending && aiSource === "pdf" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {aiGenerateMutation.isPending && aiSource === "pdf" ? "Analyzing…" : "Analyze PDF"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Max 10 MB. Text-based PDFs only — scanned/image PDFs are not supported.
                </p>
                {aiError && aiSource === "pdf" && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {aiError}
                  </p>
                )}
              </div>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2} placeholder="What does this product do?" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Category
                <span className="ml-1 font-normal text-muted-foreground/60">(comma-separated, from DB)</span>
              </label>
              <Input value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="e.g. Enterprise Software, Manufacturing" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
          </div>

          {/* Targeting — used for Product Match */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Targeting (used in Product Match AI)</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Target Industry</label>
                <Input value={formTargetIndustry} onChange={(e) => setFormTargetIndustry(e.target.value)} placeholder="Manufacturing, Retail, Technology" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Target Company Size</label>
                <Input value={formTargetCompanySize} onChange={(e) => setFormTargetCompanySize(e.target.value)} placeholder="51-200, 201-500 employees" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Target Buyer Persona</label>
                <Input value={formTargetPersona} onChange={(e) => setFormTargetPersona(e.target.value)} placeholder="CEO, Operations Director, IT Manager" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Budget Range</label>
                <Input value={formBudgetRange} onChange={(e) => setFormBudgetRange(e.target.value)} placeholder={`${formatCurrency(50000000)} - ${formatCurrency(500000000)} / year`} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Supported Regions</label>
                <Input value={formSupportedRegions} onChange={(e) => setFormSupportedRegions(e.target.value)} placeholder="Indonesia, Malaysia, Singapore" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Keywords <span className="font-normal text-muted-foreground/60">(comma-separated)</span>
                </label>
                <Input value={formKeywords} onChange={(e) => setFormKeywords(e.target.value)} placeholder="erp, inventory, finance" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Target Pain Points</label>
                <Textarea value={formTargetPainPoints} onChange={(e) => setFormTargetPainPoints(e.target.value)} rows={2} placeholder="What problems does this product solve?" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Use Cases <span className="font-normal text-muted-foreground/60">(comma-separated)</span>
                </label>
                <Input value={formUseCases} onChange={(e) => setFormUseCases(e.target.value)} placeholder="Inventory tracking, Finance automation, HR management" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Competitor Notes</label>
                <Textarea value={formCompetitorNotes} onChange={(e) => setFormCompetitorNotes(e.target.value)} rows={2} placeholder="SAP: strong in large enterprise but expensive. Oracle: complex implementation. We offer faster ROI and local support." />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Ideal Company Profile</label>
                <Textarea value={formIdealCompanyProfile} onChange={(e) => setFormIdealCompanyProfile(e.target.value)} rows={2} placeholder="Mid-to-large manufacturers with 100+ employees struggling with manual processes" />
              </div>
            </div>
          </div>

          {/* SaaS Pricing Tiers */}
          <div className="sm:col-span-2 border-t border-border pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Product Tiers (SaaS Pricing)</p>
                <p className="text-xs text-muted-foreground">Define your SaaS tiering, billing structures, and subscription duration.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFormTiers((current) => [
                    ...current,
                    {
                      name: "",
                      price: 0,
                      pricing_type: "flat_rate",
                      billing_period: "monthly",
                      subscription_duration_value: 1,
                      subscription_duration_unit: "month",
                      features: [],
                      status: "active",
                    },
                  ]);
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Tier
              </Button>
            </div>

            {formTiers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                No pricing tiers defined. Click "Add Tier" to configure SaaS pricing.
              </div>
            ) : (
              <div className="space-y-4">
                {formTiers.map((tier, idx) => (
                  <div key={idx} className="relative rounded-xl border border-border bg-[color:var(--surface-subtle)] p-4 space-y-3">
                    <button
                      type="button"
                      onClick={() => {
                        setFormTiers((current) => current.filter((_, i) => i !== idx));
                      }}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-destructive transition-colors"
                      title="Remove Tier"
                    >
                      <X className="h-4 w-4" />
                    </button>

                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium uppercase text-muted-foreground">Tier Name *</label>
                        <Input
                          value={tier.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormTiers((current) => current.map((t, i) => i === idx ? { ...t, name: val } : t));
                          }}
                          placeholder="e.g. Starter, Pro, Enterprise"
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-medium uppercase text-muted-foreground">Price *</label>
                        <Input
                          type="number"
                          value={tier.price || ""}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormTiers((current) => current.map((t, i) => i === idx ? { ...t, price: val } : t));
                          }}
                          placeholder="e.g. 150000"
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-medium uppercase text-muted-foreground">Pricing Type</label>
                        <Select
                          value={tier.pricing_type}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setFormTiers((current) => current.map((t, i) => i === idx ? { ...t, pricing_type: val } : t));
                          }}
                          className="h-8 text-xs"
                        >
                          <option value="flat_rate">Flat Rate</option>
                          <option value="per_user">Per User</option>
                          <option value="usage_based">Usage Based</option>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-medium uppercase text-muted-foreground">Billing Period</label>
                        <Select
                          value={tier.billing_period}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setFormTiers((current) => current.map((t, i) => i === idx ? { ...t, billing_period: val } : t));
                          }}
                          className="h-8 text-xs"
                        >
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                          <option value="one_time">One Time</option>
                          <option value="custom">Custom</option>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-medium uppercase text-muted-foreground">Duration Value</label>
                        <Input
                          type="number"
                          value={tier.subscription_duration_value || ""}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormTiers((current) => current.map((t, i) => i === idx ? { ...t, subscription_duration_value: val } : t));
                          }}
                          placeholder="e.g. 1, 12"
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-medium uppercase text-muted-foreground">Duration Unit</label>
                        <Select
                          value={tier.subscription_duration_unit}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setFormTiers((current) => current.map((t, i) => i === idx ? { ...t, subscription_duration_unit: val } : t));
                          }}
                          className="h-8 text-xs"
                        >
                          <option value="day">Day(s)</option>
                          <option value="month">Month(s)</option>
                          <option value="year">Year(s)</option>
                          <option value="lifetime">Lifetime</option>
                        </Select>
                      </div>

                      <div className="sm:col-span-2 md:col-span-3 space-y-1">
                        <label className="text-[10px] font-medium uppercase text-muted-foreground flex items-center justify-between">
                          <span>Features</span>
                          <span className="font-normal normal-case text-muted-foreground/60">(One feature per line)</span>
                        </label>
                        <Textarea
                          value={tier.features?.join("\n") || ""}
                          onChange={(e) => {
                            const val = e.target.value.split("\n");
                            setFormTiers((current) => current.map((t, i) => i === idx ? { ...t, features: val } : t));
                          }}
                          placeholder="e.g.&#10;5 Admin Accounts&#10;Unlimited Contacts&#10;24/7 Phone Support"
                          rows={2}
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
