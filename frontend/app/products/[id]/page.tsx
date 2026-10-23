"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  FileText,
  Globe,
  Link as LinkIcon,
  Loader2,
  Package,
  Sparkles,
  Upload,
  X,
  Plus,
  Trash2,
  Copy,
  CheckCheck,
  Swords,
  Target,
  DollarSign,
  ShieldCheck,
  Building2,
  Users,
  Layers,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { TagInput } from "@/components/ui/tag-input";
import { apiFetch } from "@/lib/apiFetch";
import { useToast } from "@/components/ui/toast";
import { useNumberFormat } from "@/lib/hooks/use-number-format";

import { QuestionGuide } from "@/components/products/QuestionGuide";
import { ProductScrapeAndCompare } from "@/components/products/ProductScrapeAndCompare";

// --- Types ---
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
  website_url?: string | null;
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
  default_terms_conditions?: string | null;
  quotation_terms_conditions?: string | null;
  sales_order_terms_conditions?: string | null;
  logo_path?: string | null;
  logo_url?: string | null;
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const { formatAmountInput, normalizeAmountInput } = useNumberFormat();
  const productId = Number(params.id);

  const [activeTab, setActiveTab] = useState("overview");

  // Form State
  const [formName, setFormName] = useState("");
  const [formWebsiteUrl, setFormWebsiteUrl] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formStatus, setFormStatus] = useState("active");

  const [formTargetIndustry, setFormTargetIndustry] = useState("");
  const [formTargetCompanySize, setFormTargetCompanySize] = useState("");
  const [formTargetPainPoints, setFormTargetPainPoints] = useState("");
  const [formTargetPersona, setFormTargetPersona] = useState("");
  const [formIdealCompanyProfile, setFormIdealCompanyProfile] = useState("");
  const [formSupportedRegions, setFormSupportedRegions] = useState<string[]>([]);
  const [formBudgetRange, setFormBudgetRange] = useState("");
  const [formUseCases, setFormUseCases] = useState<string[]>([]);
  const [formCompetitorNotes, setFormCompetitorNotes] = useState("");
  const [formKeywords, setFormKeywords] = useState<string[]>([]);

  const [formTiers, setFormTiers] = useState<ProductTier[]>([]);

  // T&C Branding States
  const [formDefaultTerms, setFormDefaultTerms] = useState("");
  const [formQtTerms, setFormQtTerms] = useState("");
  const [formSoTerms, setFormSoTerms] = useState("");
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Copy Battlecard Pitch state
  const [hasCopiedPitch, setHasCopiedPitch] = useState(false);

  // AI Generation State
  const [aiGenerated, setAiGenerated] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSource, setAiSource] = useState<"name" | "url" | "pdf" | null>(null);

  const [refUrl, setRefUrl] = useState("");
  const [refPdfFile, setRefPdfFile] = useState<File | null>(null);
  const [refPdfName, setRefPdfName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["products", productId],
    queryFn: async () => {
      const response = await apiFetch(`/products/${productId}`);
      if (!response.ok) throw new Error("Not found");
      return response.json();
    },
  });

  const { data: currencyData } = useQuery({
    queryKey: ["currency-settings"],
    queryFn: async () => {
      const response = await apiFetch("/settings/currency");
      return response.json();
    },
  });
  const currencies = currencyData?.data?.currencies ?? [];
  const idrRate = Number(currencies.find((c: any) => c.code === "IDR")?.exchange_rate || 1);
  const usdRate = Number(currencies.find((c: any) => c.code === "USD")?.exchange_rate || 1);

  const product = data?.data as ProductRecord | undefined;

  useEffect(() => {
    if (product) {
      setFormName(product.name || "");
      setFormWebsiteUrl(product.website_url || "");
      setFormDesc(product.description || "");
      setFormCategory(product.category || "");
      setFormStatus(product.status || "active");

      setFormTargetIndustry(product.target_industry || "");
      setFormTargetCompanySize(product.target_company_size || "");
      setFormTargetPainPoints(product.target_pain_points || "");
      setFormTargetPersona(product.target_buyer_persona || product.target_persona || "");
      setFormIdealCompanyProfile(product.ideal_company_profile || "");

      // Normalize array or comma-separated string to string[]
      const parseToArray = (val: any): string[] => {
        if (!val) return [];
        if (Array.isArray(val)) return val.map((s) => String(s).trim()).filter(Boolean);
        return String(val)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      };

      setFormSupportedRegions(parseToArray(product.supported_regions));
      setFormBudgetRange(product.budget_range || "");
      setFormUseCases(parseToArray(product.use_cases));
      setFormCompetitorNotes(product.competitor_notes || "");
      setFormKeywords(parseToArray(product.keywords));

      setFormTiers(product.tiers ?? []);

      setFormDefaultTerms(product.default_terms_conditions || "");
      setFormQtTerms(product.quotation_terms_conditions || "");
      setFormSoTerms(product.sales_order_terms_conditions || "");
      setLogoPath(product.logo_path || null);
      setLogoUrl(product.logo_url || null);
    }
  }, [product]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formName,
        website_url: formWebsiteUrl,
        description: formDesc,
        category: formCategory,
        status: formStatus,
        target_industry: formTargetIndustry,
        target_company_size: formTargetCompanySize,
        target_pain_points: formTargetPainPoints,
        target_buyer_persona: formTargetPersona,
        ideal_company_profile: formIdealCompanyProfile,
        supported_regions: formSupportedRegions.join(", "),
        budget_range: formBudgetRange,
        use_cases: formUseCases,
        competitor_notes: formCompetitorNotes,
        keywords: formKeywords,
        default_terms_conditions: formDefaultTerms,
        quotation_terms_conditions: formQtTerms,
        sales_order_terms_conditions: formSoTerms,
        tiers: formTiers.map((t) => ({
          ...t,
          features: Array.isArray(t.features) ? t.features : [],
        })),
      };

      const res = await apiFetch(`/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to update product");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products", productId] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product details and tiers saved successfully.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save product.");
    },
  });

  // Product logo upload mutation
  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadError(null);
      const fd = new FormData();
      fd.append("logo", file);
      const res = await apiFetch(`/products/${productId}/logo`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg =
          err.errors?.logo?.[0] || err.message || err.error || "Failed to upload product logo";
        throw new Error(msg);
      }
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["products", productId] });
      qc.invalidateQueries({ queryKey: ["products"] });
      if (data?.data?.logo_path) {
        setLogoPath(data.data.logo_path);
      }
      if (data?.logo_url) {
        setLogoUrl(data.logo_url);
      }
      setUploadError(null);
      toast.success("Product logo uploaded successfully.");
    },
    onError: (err: any) => {
      setUploadError(err.message || "Failed to upload product logo");
    },
  });

  // Product logo delete mutation
  const deleteLogoMutation = useMutation({
    mutationFn: async () => {
      setUploadError(null);
      const res = await apiFetch(`/products/${productId}/logo`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to remove product logo");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products", productId] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setLogoPath(null);
      setLogoUrl(null);
      setUploadError(null);
      toast.success("Product logo removed.");
    },
    onError: (err: any) => {
      setUploadError(err.message || "Failed to remove product logo");
    },
  });

  const aiGenerateMutation = useMutation({
    mutationFn: async ({
      source,
      productName,
      url,
      pdfFile,
    }: {
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
        throw new Error(body.error ?? body.message ?? `Request failed (${res.status})`);
      }
      return res.json();
    },
    onMutate: (variables) => {
      setAiSource(variables.source);
      setAiGenerated(false);
      setAiError(null);
    },
    onSuccess: ({ data: generated }) => {
      const mergeArray = (current: string[], incoming: any): string[] => {
        const incArr = Array.isArray(incoming)
          ? incoming
          : String(incoming || "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
        return Array.from(new Set([...current, ...incArr]));
      };

      if (generated.description) setFormDesc(generated.description);
      if (generated.category) setFormCategory(generated.category);
      if (generated.target_industry) setFormTargetIndustry(generated.target_industry);
      if (generated.target_company_size) setFormTargetCompanySize(generated.target_company_size);
      if (generated.target_buyer_persona) setFormTargetPersona(generated.target_buyer_persona);
      if (generated.budget_range) setFormBudgetRange(generated.budget_range);
      if (generated.target_pain_points) setFormTargetPainPoints(generated.target_pain_points);
      if (generated.competitor_notes) setFormCompetitorNotes(generated.competitor_notes);
      if (generated.ideal_company_profile) setFormIdealCompanyProfile(generated.ideal_company_profile);

      setFormSupportedRegions(mergeArray(formSupportedRegions, generated.supported_regions));
      setFormKeywords(mergeArray(formKeywords, generated.keywords));
      setFormUseCases(mergeArray(formUseCases, generated.use_cases));

      setAiGenerated(true);
      setAiError(null);
      toast.success("AI metadata generated! Review the fields and click Save Changes.");
    },
    onError: (err: Error) => setAiError(err.message),
  });

  const handleSave = () => saveMutation.mutate();

  const handleCopyBattlecardPitch = () => {
    const pitch = `*${formName}* ${formCategory ? `(${formCategory})` : ""}\n\n` +
      `💡 *Overview:*\n${formDesc || "Solusi terintegrasi untuk bisnis Anda."}\n\n` +
      `🎯 *Cocok Untuk:*\n- Industri: ${formTargetIndustry || "Semua Sektor"}\n- Buyer Persona: ${formTargetPersona || "Decision Makers & Management"}\n- Ukuran Perusahaan: ${formTargetCompanySize || "SMB - Enterprise"}\n\n` +
      `🔥 *Solusi Masalah (Pain Points):*\n${formTargetPainPoints || "Efisiensi operasional dan automasi alur kerja."}\n\n` +
      `✨ *Keunggulan Utama (Use Cases):*\n${formUseCases.map((u) => `• ${u}`).join("\n") || "• Automasi proses bisnis\n• Kolaborasi real-time"}\n\n` +
      (formTiers.length > 0
        ? `💰 *Estimasi Investasi:* Mulai dari Rp ${Math.min(...formTiers.map((t) => t.price || 0)).toLocaleString("id-ID")} / bulan\n`
        : "") +
      (formWebsiteUrl ? `\n🌐 Info lengkap: ${formWebsiteUrl}` : "");

    navigator.clipboard.writeText(pitch);
    setHasCopiedPitch(true);
    toast.success("Sales pitch copied to clipboard!");
    setTimeout(() => setHasCopiedPitch(false), 2500);
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-muted-foreground mb-2" />
        <span className="text-sm text-muted-foreground">Loading product details...</span>
      </div>
    );
  }

  if (!product) {
    return <div className="p-6">Product not found.</div>;
  }

  const activeTiers = formTiers.filter((t) => t.status !== "inactive");
  const startingPrice =
    activeTiers.length > 0 ? Math.min(...activeTiers.map((t) => t.price || 0)) : null;

  return (
    <div className="space-y-6 p-6 pb-24">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push("/products")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted/60 border border-border overflow-hidden p-1">
              {logoUrl || logoPath ? (
                <img
                  src={logoUrl || `/storage/${logoPath}`}
                  alt={formName}
                  className="h-full w-full object-contain"
                />
              ) : (
                <Package className="h-6 w-6 text-primary" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{formName || "Product Detail"}</h1>
                <Badge
                  variant={formStatus === "active" ? "success" : "neutral"}
                  className="text-[10px] uppercase font-semibold"
                >
                  {formStatus}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {formCategory ? `${formCategory} • ` : ""}Manage product specification, pricing matrix, and AI battlecards.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            onClick={handleCopyBattlecardPitch}
            className="text-xs"
          >
            {hasCopiedPitch ? <CheckCheck className="h-3.5 w-3.5 mr-1.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
            {hasCopiedPitch ? "Pitch Copied!" : "Copy Pitch"}
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        items={[
          { key: "overview", label: "Product Overview" },
          { key: "battlecard", label: "⚡ Sales Battlecard" },
          { key: "targeting", label: "Targeting & Match AI" },
          { key: "tiers", label: `Product Tiers (${formTiers.length})` },
          { key: "questions", label: "Question Guide" },
          { key: "history", label: "Comparison & Scraping" },
          { key: "branding", label: "Document Branding" },
        ]}
      />

      <div className="mt-6">
        {/* 1. OVERVIEW */}
        {activeTab === "overview" && (
          <Card>
            <CardHeader>
              <CardTitle>Core Overview</CardTitle>
              <CardDescription>General product identification and AI reference ingestion.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Product Name *</label>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Category</label>
                  <Input
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g. Collaboration, ERP, Cloud, Security"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Elevator Pitch & Description</label>
                  <Textarea
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    rows={3}
                    placeholder="Concise summary of what value this product delivers..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Official Website URL</label>
                  <Input
                    value={formWebsiteUrl}
                    onChange={(e) => setFormWebsiteUrl(e.target.value)}
                    placeholder="https://example.com/product"
                    type="url"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">CRM Status</label>
                  <Select value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
                    <option value="active">Active (Visible in Lead Matching)</option>
                    <option value="inactive">Inactive</option>
                  </Select>
                </div>
              </div>

              {/* AI Reference Tooling */}
              <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Reference Generation
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-populate targeting personas, ICP, pain points, and use cases by analyzing the product website or PDF brochure.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* URL */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                      <Globe className="h-3.5 w-3.5" /> Analyze Website URL
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={refUrl}
                        onChange={(e) => setRefUrl(e.target.value)}
                        placeholder="https://..."
                        className="flex-1 text-sm"
                      />
                      <Button
                        variant="outline"
                        onClick={() =>
                          aiGenerateMutation.mutate({
                            source: "url",
                            productName: formName,
                            url: refUrl,
                          })
                        }
                        disabled={!refUrl.trim() || aiGenerateMutation.isPending}
                      >
                        {aiGenerateMutation.isPending && aiSource === "url" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Analyze"
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* PDF */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" /> Analyze PDF Brochure
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="file"
                          accept=".pdf"
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
                          <span className="truncate">{refPdfName || "Choose PDF..."}</span>
                          {refPdfFile && (
                            <button
                              type="button"
                              className="ml-auto hover:text-foreground"
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
                        variant="outline"
                        onClick={() =>
                          aiGenerateMutation.mutate({
                            source: "pdf",
                            productName: formName,
                            pdfFile: refPdfFile!,
                          })
                        }
                        disabled={!refPdfFile || aiGenerateMutation.isPending}
                      >
                        {aiGenerateMutation.isPending && aiSource === "pdf" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Analyze"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {aiError && (
                  <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <p>{aiError}</p>
                  </div>
                )}

                {aiGenerated && !aiError && (
                  <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm rounded-lg flex items-center gap-2 font-medium">
                    <Check className="h-4 w-4" /> AI Generated metadata applied successfully. Review the other tabs and click Save Changes.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 2. SALES BATTLECARD (NEW DEDICATED VIEW) */}
        {activeTab === "battlecard" && (
          <div className="space-y-6">
            {/* Top Pitch Card */}
            <Card className="border-primary/40 bg-gradient-to-br from-primary/5 via-background to-background">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Swords className="h-5 w-5 text-primary" />
                      <h2 className="text-xl font-bold tracking-tight text-foreground">Sales Battlecard & Quick Pitch</h2>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use this strategic cheatsheet during discovery calls and pre-meeting preparation.
                    </p>
                  </div>
                  <Button onClick={handleCopyBattlecardPitch} size="sm">
                    {hasCopiedPitch ? <CheckCheck className="h-4 w-4 mr-2 text-white" /> : <Copy className="h-4 w-4 mr-2" />}
                    {hasCopiedPitch ? "Pitch Copied to Clipboard!" : "Copy Quick Pitch (WA / Email)"}
                  </Button>
                </div>

                {/* Pitch Box */}
                <div className="mt-4 p-4 rounded-xl bg-background border border-border/70 space-y-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Elevator Pitch
                  </span>
                  <p className="text-sm text-foreground leading-relaxed">
                    {formDesc || "No elevator pitch defined. Add a description in the Overview tab or generate one using AI."}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Matrix Grid: ICP, Pain Points, Objections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Target Audience & ICP */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Target Audience & ICP
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3.5 text-xs">
                  <div>
                    <span className="text-muted-foreground font-medium block mb-1">Target Industry:</span>
                    <span className="font-semibold text-foreground text-sm">
                      {formTargetIndustry || "All Industries"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                    <div>
                      <span className="text-muted-foreground font-medium block mb-1">Company Size:</span>
                      <span className="font-semibold text-foreground">
                        {formTargetCompanySize || "SMB / Mid-Market / Enterprise"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-medium block mb-1">Buyer Persona:</span>
                      <span className="font-semibold text-foreground">
                        {formTargetPersona || "Decision Maker / IT Head"}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <span className="text-muted-foreground font-medium block mb-1">Ideal Company Profile (ICP):</span>
                    <p className="text-foreground leading-relaxed">
                      {formIdealCompanyProfile || "Perusahaan berkembang yang ingin mengoptimalkan efisiensi dan kolaborasi internal."}
                    </p>
                  </div>
                  {formSupportedRegions.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <span className="text-muted-foreground font-medium block mb-1">Regions:</span>
                      <div className="flex flex-wrap gap-1">
                        {formSupportedRegions.map((reg, i) => (
                          <Badge key={i} variant="neutral" className="text-[10px]">
                            {reg}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pain Points & Use Cases */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    Pain Points & Solusi (Use Cases)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div>
                    <span className="text-muted-foreground font-medium block mb-1">Target Pain Points:</span>
                    <p className="text-foreground leading-relaxed bg-destructive/5 p-3 rounded-lg border border-destructive/15">
                      {formTargetPainPoints || "Komunikasi terfragmentasi, alur persetujuan lambat, dan kehilangan riwayat dokumen bisnis."}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-medium block mb-1.5">Key Use Cases:</span>
                    {formUseCases.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {formUseCases.map((uc, i) => (
                          <Badge key={i} variant="neutral" className="bg-muted text-foreground text-xs font-normal">
                            ✓ {uc}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">Belum ada use case spesifik.</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Competitive Strategy */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Swords className="h-4 w-4 text-amber-500" />
                    Competitor Notes & Objection Handling
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="p-3.5 rounded-lg bg-muted/40 border border-border">
                    <span className="text-muted-foreground font-medium block mb-1">Catatan Pesaing & Keunggulan Komparatif:</span>
                    <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                      {formCompetitorNotes || "Lark Suite mengintegrasikan Chat, Calendar, Docs, Video Meeting, dan Approval dalam 1 aplikasi terpadu, menghilangkan biaya terpisah untuk Slack + Zoom + Google Workspace."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pricing Cheatsheet */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Pricing Matrix Cheatsheet
                </CardTitle>
                <CardDescription>Quick pricing reference to quote on sales calls.</CardDescription>
              </CardHeader>
              <CardContent>
                {activeTiers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Belum ada tier harga yang dikonfigurasi.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {activeTiers.map((t, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                        <div className="font-semibold text-sm text-foreground">{t.name}</div>
                        <div className="text-lg font-bold text-primary">
                          Rp {t.price.toLocaleString("id-ID")}
                          <span className="text-[11px] font-normal text-muted-foreground">
                            {" "}/ {t.pricing_type === "per_user" ? "user / " : ""}{t.billing_period}
                          </span>
                        </div>
                        {t.features && t.features.length > 0 && (
                          <div className="pt-2 border-t border-border space-y-1">
                            {t.features.slice(0, 3).map((f, fi) => (
                              <div key={fi} className="text-[11px] text-muted-foreground truncate">
                                • {f}
                              </div>
                            ))}
                            {t.features.length > 3 && (
                              <span className="text-[10px] text-primary">+{t.features.length - 3} fitur lainnya</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 3. TARGETING & MATCH AI (WITH MODERN TAG INPUTS) */}
        {activeTab === "targeting" && (
          <Card>
            <CardHeader>
              <CardTitle>Targeting & Match AI</CardTitle>
              <CardDescription>
                Parameters evaluated by Product Match AI to automatically rank this solution for discovered Leads.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Target Industry</label>
                <Input
                  value={formTargetIndustry}
                  onChange={(e) => setFormTargetIndustry(e.target.value)}
                  placeholder="e.g. Technology, Retail, Manufacturing, Finance"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Target Company Size</label>
                <Input
                  value={formTargetCompanySize}
                  onChange={(e) => setFormTargetCompanySize(e.target.value)}
                  placeholder="e.g. 50-500 employees, Enterprise"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Target Buyer Persona</label>
                <Input
                  value={formTargetPersona}
                  onChange={(e) => setFormTargetPersona(e.target.value)}
                  placeholder="e.g. Chief Technology Officer, HR Director, Operations Head"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Budget Range</label>
                <Input
                  value={formBudgetRange}
                  onChange={(e) => setFormBudgetRange(e.target.value)}
                  placeholder="e.g. Rp 50jt - Rp 200jt / tahun"
                />
              </div>

              {/* Supported Regions as TagInput */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Supported Regions (Press Enter to add tag)
                </label>
                <TagInput
                  value={formSupportedRegions}
                  onChange={setFormSupportedRegions}
                  placeholder="Type region (e.g. Jabodetabek, Jawa Barat, Nationwide) and press Enter..."
                />
              </div>

              {/* Keywords as TagInput */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Product Keywords & Tags (For AI Discovery & Search)
                </label>
                <TagInput
                  value={formKeywords}
                  onChange={setFormKeywords}
                  placeholder="Type keyword (e.g. chat, video conference, workflow) and press Enter..."
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground">Target Pain Points</label>
                <Textarea
                  value={formTargetPainPoints}
                  onChange={(e) => setFormTargetPainPoints(e.target.value)}
                  rows={3}
                  placeholder="Describe the operational bottlenecks and frustrations your customers face..."
                />
              </div>

              {/* Use Cases as TagInput */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Use Cases & Implementation Scenarios (Press Enter to add)
                </label>
                <TagInput
                  value={formUseCases}
                  onChange={setFormUseCases}
                  placeholder="Type use case (e.g. Hybrid Workforce Collaboration, Automated Approvals) and press Enter..."
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground">Ideal Company Profile (ICP)</label>
                <Textarea
                  value={formIdealCompanyProfile}
                  onChange={(e) => setFormIdealCompanyProfile(e.target.value)}
                  rows={2}
                  placeholder="Profile of the account most likely to experience high ROI from this product..."
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground">Competitor Notes & Differentiators</label>
                <Textarea
                  value={formCompetitorNotes}
                  onChange={(e) => setFormCompetitorNotes(e.target.value)}
                  rows={2}
                  placeholder="Key differentiators compared to main competitors..."
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* 4. TIERS (WITH TAGINPUT FOR FEATURES) */}
        {activeTab === "tiers" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>SaaS Pricing Tiers</CardTitle>
                <CardDescription>
                  Manage commercial packages, billing intervals, and included features.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  setFormTiers([
                    ...formTiers,
                    {
                      name: "New Tier",
                      price: 0,
                      pricing_type: "flat_rate",
                      billing_period: "monthly",
                      subscription_duration_value: 1,
                      subscription_duration_unit: "month",
                      features: [],
                      status: "active",
                    },
                  ])
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Tier
              </Button>
            </CardHeader>
            <CardContent>
              {formTiers.length === 0 ? (
                <div className="text-center p-12 border border-dashed border-border rounded-xl space-y-2">
                  <Package className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-foreground">No pricing tiers defined</p>
                  <p className="text-xs text-muted-foreground">Add tiers to calculate proposals and quotations.</p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {formTiers.map((tier, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-border bg-card shadow-xs flex flex-col overflow-hidden relative group transition-all hover:border-primary/50 hover:shadow-md"
                    >
                      <div className="flex items-center justify-between gap-3 p-4 bg-muted/20 border-b border-border">
                        <Input
                          className="flex-1 h-9 bg-background font-semibold"
                          value={tier.name}
                          onChange={(e) => {
                            const nt = [...formTiers];
                            nt[idx].name = e.target.value;
                            setFormTiers(nt);
                          }}
                          placeholder="Tier Name (e.g. Starter, Pro)"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-destructive h-9 w-9 shrink-0 bg-background hover:bg-destructive/10"
                          onClick={() => setFormTiers(formTiers.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                              Price (IDR)
                            </label>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={formatAmountInput(String(tier.price || 0))}
                              onChange={(e) => {
                                const nt = [...formTiers];
                                nt[idx].price = Number(normalizeAmountInput(e.target.value));
                                setFormTiers(nt);
                              }}
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                              Billing Period
                            </label>
                            <Select
                              value={tier.billing_period}
                              onChange={(e) => {
                                const nt = [...formTiers];
                                nt[idx].billing_period = e.target.value as any;
                                setFormTiers(nt);
                              }}
                            >
                              <option value="monthly">Monthly</option>
                              <option value="yearly">Yearly</option>
                              <option value="one_time">One Time</option>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-muted-foreground">Pricing Model</label>
                          <Select
                            value={tier.pricing_type}
                            onChange={(e) => {
                              const nt = [...formTiers];
                              nt[idx].pricing_type = e.target.value as any;
                              setFormTiers(nt);
                            }}
                          >
                            <option value="flat_rate">Flat Rate (Package Price)</option>
                            <option value="per_user">Per User / License</option>
                            <option value="usage_based">Usage Based</option>
                          </Select>
                        </div>

                        {/* Features using TagInput - NO MORE COMMA SPLIT BUG! */}
                        <div className="pt-2 border-t border-border space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground block">
                            Included Features (Press Enter to add)
                          </label>
                          <TagInput
                            value={tier.features || []}
                            onChange={(newFeatures) => {
                              const nt = [...formTiers];
                              nt[idx].features = newFeatures;
                              setFormTiers(nt);
                            }}
                            placeholder="Add feature (e.g. 50GB Storage, 24/7 SLA)..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 5. QUESTION GUIDE */}
        {activeTab === "questions" && (
          <Card>
            <CardHeader>
              <CardTitle>Sales Question Guide (BANT & Discovery)</CardTitle>
              <CardDescription>
                Consultative discovery questions used by sales reps to qualify needs for this product.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QuestionGuide productId={productId} />
            </CardContent>
          </Card>
        )}

        {/* 6. COMPARISON & SCRAPING */}
        {activeTab === "history" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Feature History & Web Scraping</CardTitle>
                <CardDescription>
                  Periodically crawl the official product website to detect new features or pricing changes.
                </CardDescription>
              </div>
              <ProductScrapeAndCompare
                product={{ ...product, website_url: formWebsiteUrl || product?.website_url }}
              />
            </CardHeader>
            <CardContent>
              {!formWebsiteUrl && !product?.website_url ? (
                <div className="p-8 text-center text-sm text-muted-foreground border border-dashed rounded-xl">
                  Please configure a Website URL in the Overview tab to enable feature scraping.
                </div>
              ) : (
                <div className="text-sm text-muted-foreground p-8 text-center bg-muted/20 rounded-xl border border-border">
                  Click the "Scrape & Compare" button above to fetch the latest website content and compare it against the current product metadata.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 7. DOCUMENT BRANDING (DARK MODE COMPLIANT) */}
        {activeTab === "branding" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Document Terms & Conditions</CardTitle>
                  <CardDescription>
                    Configure legal terms printed on generated PDF Quotations and Sales Orders for this product.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Default Terms & Conditions</label>
                    <Textarea
                      value={formDefaultTerms}
                      onChange={(e) => setFormDefaultTerms(e.target.value)}
                      rows={6}
                      placeholder="Standard terms when no quotation/sales order overrides are set..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Quotation Terms & Conditions Override
                    </label>
                    <Textarea
                      value={formQtTerms}
                      onChange={(e) => setFormQtTerms(e.target.value)}
                      rows={6}
                      placeholder="These terms will override default terms on Quotations..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Sales Order Terms & Conditions Override
                    </label>
                    <Textarea
                      value={formSoTerms}
                      onChange={(e) => setFormSoTerms(e.target.value)}
                      rows={6}
                      placeholder="These terms will override default terms on Sales Orders..."
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Logo Upload Card (Clean tokens & dark-mode compliant) */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Product Brand Logo</CardTitle>
                  <CardDescription>
                    Logo displayed in the catalog and printed on PDF documents.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center space-y-4">
                  <div className="h-32 w-full border border-dashed border-border/80 rounded-xl flex items-center justify-center overflow-hidden bg-muted/30 relative p-4 transition-colors">
                    {uploadLogoMutation.isPending || deleteLogoMutation.isPending ? (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Updating logo...</span>
                      </div>
                    ) : logoUrl || logoPath ? (
                      <img
                        src={logoUrl || `/storage/${logoPath}`}
                        className="max-h-full max-w-full object-contain"
                        alt="Product Logo"
                      />
                    ) : (
                      <div className="text-center space-y-1">
                        <Package className="mx-auto h-8 w-8 text-muted-foreground/40" />
                        <div className="text-xs text-muted-foreground">No Logo Uploaded</div>
                      </div>
                    )}
                  </div>

                  {uploadError && (
                    <div className="w-full text-xs text-destructive font-medium text-center border border-destructive/20 bg-destructive/10 rounded-lg p-2.5">
                      {uploadError}
                    </div>
                  )}

                  <div className="flex gap-2 w-full">
                    <label className="flex-1">
                      <span className="w-full inline-flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 h-9 rounded-md text-sm font-medium cursor-pointer transition-colors">
                        <Upload className="h-4 w-4 mr-2" /> Upload Logo
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadLogoMutation.mutate(file);
                        }}
                        disabled={uploadLogoMutation.isPending || deleteLogoMutation.isPending}
                      />
                    </label>
                    {(logoUrl || logoPath) && (
                      <Button
                        variant="outline"
                        onClick={() => deleteLogoMutation.mutate()}
                        disabled={uploadLogoMutation.isPending || deleteLogoMutation.isPending}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
