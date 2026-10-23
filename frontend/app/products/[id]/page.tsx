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
  Pencil,
  ExternalLink,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import {
  TableShell,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  TableEmpty,
} from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { TagInput } from "@/components/ui/tag-input";
import { apiFetch } from "@/lib/apiFetch";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useNumberFormat } from "@/lib/hooks/use-number-format";
import { readApiError, flattenFieldErrors } from "@/lib/apiError";

import { QuestionGuide } from "@/components/products/QuestionGuide";
import { ProductScrapeAndCompare } from "@/components/products/ProductScrapeAndCompare";

// --- Types ---
type ProductTier = {
  id?: number;
  name: string;
  price: number;
  pricing_type: string;
  billing_period: string;
  subscription_duration_value: number;
  subscription_duration_unit: "day" | "month" | "year" | "lifetime";
  differentiator?: string | null;
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
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Copy Battlecard Pitch state
  const [hasCopiedPitch, setHasCopiedPitch] = useState(false);

  // Tier Modal & Detail Popup States
  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [editingTierIndex, setEditingTierIndex] = useState<number | null>(null);
  const [tierModalForm, setTierModalForm] = useState<ProductTier>({
    name: "",
    price: 0,
    pricing_type: "flat_rate",
    billing_period: "monthly",
    subscription_duration_value: 1,
    subscription_duration_unit: "month",
    differentiator: "",
    features: [],
    status: "active",
  });

  const COMPANY_SIZE_OPTIONS = [
    "1-10 (Startup)",
    "11-50 (Small)",
    "51-200 (Medium)",
    "201-1,000 (Mid-Market)",
    "1,000+ (Enterprise)",
  ];

  const toggleCompanySize = (option: string) => {
    const rawTokens = formTargetCompanySize
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    // Key prefix e.g. "1-10", "11-50"
    const prefix = option.split(" ")[0];
    const exists = rawTokens.some((t) => t.toLowerCase().includes(prefix.toLowerCase()));

    let nextTokens: string[];
    if (exists) {
      nextTokens = rawTokens.filter((t) => !t.toLowerCase().includes(prefix.toLowerCase()));
    } else {
      nextTokens = [...rawTokens, option];
    }
    setFormTargetCompanySize(nextTokens.join(", "));
  };

  const openAddTierModal = () => {
    setEditingTierIndex(null);
    setTierModalForm({
      name: "",
      price: 0,
      pricing_type: "flat_rate",
      billing_period: "monthly",
      subscription_duration_value: 1,
      subscription_duration_unit: "month",
      differentiator: "",
      features: [],
      status: "active",
    });
    setIsTierModalOpen(true);
  };

  const openEditTierModal = (tier: ProductTier, index: number) => {
    setEditingTierIndex(index);
    setTierModalForm({
      ...tier,
      differentiator: tier.differentiator || "",
      features: Array.isArray(tier.features) ? [...tier.features] : [],
    });
    setIsTierModalOpen(true);
  };

  const handleSaveTierFromModal = () => {
    if (!tierModalForm.name.trim()) {
      toast.error("Please enter a Tier Name.");
      return;
    }
    const updated = [...formTiers];
    if (editingTierIndex !== null && editingTierIndex >= 0) {
      updated[editingTierIndex] = { ...tierModalForm };
    } else {
      updated.push({ ...tierModalForm });
    }
    setFormTiers(updated);
    setIsTierModalOpen(false);
    toast.success(editingTierIndex !== null ? "Tier updated successfully." : "Tier added successfully.");
  };

  // AI Generation State
  const [aiGenerated, setAiGenerated] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSource, setAiSource] = useState<"name" | "url" | "pdf" | null>(null);

  const [refUrl, setRefUrl] = useState("");
  const [refPdfFile, setRefPdfFile] = useState<File | null>(null);
  const [refPdfName, setRefPdfName] = useState("");

  const handleScrapeFromWebsite = () => {
    let urlToUse = (formWebsiteUrl.trim() || refUrl.trim());
    if (!urlToUse) {
      toast.error("Please enter an Official Website URL to scrape.");
      return;
    }
    // Auto-prepend https:// if protocol is omitted
    if (!/^https?:\/\//i.test(urlToUse)) {
      urlToUse = `https://${urlToUse}`;
      setFormWebsiteUrl(urlToUse);
      setRefUrl(urlToUse);
    }
    aiGenerateMutation.mutate({
      source: "url",
      productName: formName,
      url: urlToUse,
    });
  };

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
          differentiator: t.differentiator || null,
          features: Array.isArray(t.features) ? t.features : [],
        })),
      };

      const res = await apiFetch(`/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorInfo = await readApiError(res, "Failed to update product");
        const fieldErrors = flattenFieldErrors(errorInfo.fields);
        const msg = fieldErrors.length > 0 ? `${errorInfo.title} (${fieldErrors.join(", ")})` : errorInfo.title;
        throw new Error(msg);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products", productId] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product details and tiers saved successfully.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save product.");
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
        const errorInfo = await readApiError(res, "Failed to upload product logo");
        const fieldErrors = flattenFieldErrors(errorInfo.fields);
        const msg = fieldErrors.length > 0 ? `${errorInfo.title} (${fieldErrors.join(", ")})` : errorInfo.title;
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
      setLogoLoadFailed(false);
      setUploadError(null);
      toast.success("Product logo uploaded successfully.");
    },
    onError: (err: any) => {
      setUploadError(err?.message || "Failed to upload product logo");
    },
  });

  // Product logo delete mutation
  const deleteLogoMutation = useMutation({
    mutationFn: async () => {
      setUploadError(null);
      const res = await apiFetch(`/products/${productId}/logo`, { method: "DELETE" });
      if (!res.ok) {
        const errorInfo = await readApiError(res, "Failed to remove product logo");
        throw new Error(errorInfo.title);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products", productId] });
      qc.invalidateQueries({ queryKey: ["products"] });
      setLogoPath(null);
      setLogoUrl(null);
      setLogoLoadFailed(false);
      setUploadError(null);
      toast.success("Product logo removed.");
    },
    onError: (err: any) => {
      setUploadError(err?.message || "Failed to remove product logo");
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
        const errorInfo = await readApiError(res, "AI profiling failed");
        let msg = errorInfo.title;
        if (errorInfo.detail) {
          msg += ` - ${errorInfo.detail}`;
        }
        const fieldErrors = flattenFieldErrors(errorInfo.fields);
        if (fieldErrors.length > 0) {
          msg += ` (${fieldErrors.join(", ")})`;
        }
        throw new Error(msg);
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

      if (generated.name && (!formName.trim() || formName === "New Product")) {
        setFormName(generated.name);
      }
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

      if (Array.isArray(generated.tiers) && generated.tiers.length > 0) {
        setFormTiers((prev) => {
          if (prev.length === 0) return generated.tiers;
          const existingNames = new Set(prev.map((t) => t.name.toLowerCase()));
          const newTiers = generated.tiers.filter((t: ProductTier) => !existingNames.has(t.name.toLowerCase()));
          return [...prev, ...newTiers];
        });
      }

      setAiGenerated(true);
      setAiError(null);
      toast.success("AI profiling complete! Product overview, targeting parameters, and tiers updated.");
    },
    onError: (err: any) => {
      const msg =
        typeof err?.message === "string" && err.message !== "[object Object]"
          ? err.message
          : "Failed to generate AI reference. Please check the website URL and try again.";
      setAiError(msg);
      toast.error(msg);
    },
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
              {(logoUrl || logoPath) && !logoLoadFailed ? (
                <img
                  src={`/api/products/${productId}/logo?v=${encodeURIComponent(logoPath || '1')}`}
                  alt={formName}
                  className="h-full w-full object-contain"
                  onError={() => setLogoLoadFailed(true)}
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
          {formWebsiteUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleScrapeFromWebsite}
              disabled={aiGenerateMutation.isPending}
              className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
              title="Scrape and auto-profile product from website URL"
            >
              {aiGenerateMutation.isPending && aiSource === "url" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              )}
              ⚡ AI Auto-Profile URL
            </Button>
          )}
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
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground">Official Website URL</label>
                    {formWebsiteUrl && (
                      <a
                        href={formWebsiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-primary hover:underline flex items-center gap-1"
                      >
                        Visit Site <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={formWebsiteUrl}
                      onChange={(e) => {
                        setFormWebsiteUrl(e.target.value);
                        setRefUrl(e.target.value);
                      }}
                      placeholder="https://example.com/product"
                      type="url"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleScrapeFromWebsite}
                      disabled={!formWebsiteUrl.trim() || (aiGenerateMutation.isPending && aiSource === "url")}
                      className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 text-xs shrink-0"
                    >
                      {aiGenerateMutation.isPending && aiSource === "url" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Scrape & Profile
                    </Button>
                  </div>
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
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Targeting & Match AI</CardTitle>
                <CardDescription>
                  Parameters evaluated by Product Match AI to automatically rank this solution for discovered Leads.
                </CardDescription>
              </div>
              {formWebsiteUrl && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleScrapeFromWebsite}
                  disabled={aiGenerateMutation.isPending}
                  className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 text-xs shrink-0 self-start sm:self-auto"
                >
                  {aiGenerateMutation.isPending && aiSource === "url" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  ⚡ Auto-Extract from Website
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {formWebsiteUrl && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-primary/20 bg-primary/5 text-xs text-foreground">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary shrink-0" />
                    <span>
                      Profil targeting dapat di-generate otomatis dari website resmi: <strong className="text-primary">{formWebsiteUrl}</strong>
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleScrapeFromWebsite}
                    disabled={aiGenerateMutation.isPending}
                    className="text-xs text-primary font-semibold hover:bg-primary/10 h-7 px-2.5 self-end sm:self-auto"
                  >
                    Auto-Profile Website →
                  </Button>
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Target Industry</label>
                  <Input
                    value={formTargetIndustry}
                    onChange={(e) => setFormTargetIndustry(e.target.value)}
                    placeholder="e.g. Technology, Retail, Manufacturing, Finance"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground">Target Company Size</label>
                    <span className="text-[10px] text-muted-foreground">Multiple choices supported</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {COMPANY_SIZE_OPTIONS.map((opt) => {
                      const prefix = opt.split(" ")[0];
                      const isSelected = formTargetCompanySize.toLowerCase().includes(prefix.toLowerCase());
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleCompanySize(opt)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-xs"
                              : "bg-muted/30 text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
                          )}
                        >
                          {isSelected ? "✓ " : "+ "}
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  <Input
                    value={formTargetCompanySize}
                    onChange={(e) => setFormTargetCompanySize(e.target.value)}
                    placeholder="e.g. 11-50 (Small), 51-200 (Medium), Enterprise"
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
            </div>
          </CardContent>
        </Card>
        )}

        {/* 4. TIERS (LIST VIEW + DETAIL MODAL POPUP + DIFFERENTIATOR) */}
        {activeTab === "tiers" && (
          <>
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Product Commercial Tiers</CardTitle>
                  <CardDescription>
                    Manage pricing packages, billing intervals, differentiators, and bundled features.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {formWebsiteUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleScrapeFromWebsite}
                      disabled={aiGenerateMutation.isPending}
                      className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                      title="Scrape tiers & packages directly from website"
                    >
                      {aiGenerateMutation.isPending && aiSource === "url" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Scrape Tiers from URL
                    </Button>
                  )}
                  <Button onClick={openAddTierModal} size="sm">
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Tier
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {formTiers.length === 0 ? (
                  <div className="text-center p-12 border border-dashed border-border rounded-xl space-y-3">
                    <Package className="mx-auto h-8 w-8 text-muted-foreground/40" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">No pricing tiers defined</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Add tiers manually or scrape them automatically from the official website.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      {formWebsiteUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleScrapeFromWebsite}
                          disabled={aiGenerateMutation.isPending}
                          className="text-xs"
                        >
                          <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
                          Scrape from Website
                        </Button>
                      )}
                      <Button size="sm" onClick={openAddTierModal}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Create Tier Manually
                      </Button>
                    </div>
                  </div>
                ) : (
                  <TableShell>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>Tier Name</TableHeaderCell>
                          <TableHeaderCell>Pricing & Billing</TableHeaderCell>
                          <TableHeaderCell>Pricing Model</TableHeaderCell>
                          <TableHeaderCell>Differentiator / Perbedaan</TableHeaderCell>
                          <TableHeaderCell>Features</TableHeaderCell>
                          <TableHeaderCell>Status</TableHeaderCell>
                          <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {formTiers.map((tier, idx) => (
                          <TableRow
                            key={idx}
                            className="cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => openEditTierModal(tier, idx)}
                          >
                            <TableCell className="font-semibold text-foreground">
                              <div className="flex items-center gap-2">
                                <span>{tier.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <span className="font-bold text-foreground">
                                  Rp {Number(tier.price || 0).toLocaleString("id-ID")}
                                </span>
                                <span className="text-[11px] text-muted-foreground block capitalize">
                                  / {tier.billing_period}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground capitalize">
                              {tier.pricing_type?.replace(/_/g, " ") || "Flat Rate"}
                            </TableCell>
                            <TableCell className="max-w-[280px]">
                              {tier.differentiator ? (
                                <p className="text-xs text-foreground line-clamp-2" title={tier.differentiator}>
                                  {tier.differentiator}
                                </p>
                              ) : (
                                <span className="text-xs text-muted-foreground/60 italic">
                                  Belum diisi
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {tier.features && tier.features.length > 0 ? (
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="neutral" className="text-[10px] font-medium">
                                    {tier.features.length} features
                                  </Badge>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={tier.status === "inactive" ? "neutral" : "success"}
                                className="text-[10px] uppercase font-semibold"
                              >
                                {tier.status || "active"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div
                                className="flex items-center justify-end gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-muted"
                                  onClick={() => openEditTierModal(tier, idx)}
                                  title="Edit Tier Details"
                                >
                                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                  onClick={() => setFormTiers(formTiers.filter((_, i) => i !== idx))}
                                  title="Delete Tier"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableShell>
                )}
              </CardContent>
            </Card>

            {/* Modal Popup for Tier Detail & Editing */}
            <Modal
              open={isTierModalOpen}
              onOpenChange={setIsTierModalOpen}
              title={editingTierIndex !== null ? `Edit Tier: ${tierModalForm.name || "Commercial Package"}` : "Add Commercial Tier"}
              description="Configure tier pricing, billing frequency, differentiating factors, and bundled features."
              size="lg"
              footer={
                <div className="flex items-center justify-end gap-2 w-full">
                  <Button variant="outline" onClick={() => setIsTierModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveTierFromModal}>
                    {editingTierIndex !== null ? "Save Changes" : "Add Tier"}
                  </Button>
                </div>
              }
            >
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground">Tier / Package Name *</label>
                    <Input
                      value={tierModalForm.name}
                      onChange={(e) => setTierModalForm({ ...tierModalForm, name: e.target.value })}
                      placeholder="e.g. Starter, Professional, Enterprise"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Price (IDR) *</label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={formatAmountInput(String(tierModalForm.price || 0))}
                      onChange={(e) =>
                        setTierModalForm({
                          ...tierModalForm,
                          price: Number(normalizeAmountInput(e.target.value)),
                        })
                      }
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Billing Period</label>
                    <Select
                      value={tierModalForm.billing_period}
                      onChange={(e) => setTierModalForm({ ...tierModalForm, billing_period: e.target.value })}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly / Annual</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="one_time">One Time / Lifetime</option>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Pricing Model</label>
                    <Select
                      value={tierModalForm.pricing_type}
                      onChange={(e) => setTierModalForm({ ...tierModalForm, pricing_type: e.target.value })}
                    >
                      <option value="flat_rate">Flat Rate (Package Price)</option>
                      <option value="per_user">Per User / License</option>
                      <option value="usage_based">Usage Based</option>
                      <option value="custom_quote">Custom Quote</option>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Status</label>
                    <Select
                      value={tierModalForm.status || "active"}
                      onChange={(e) => setTierModalForm({ ...tierModalForm, status: e.target.value })}
                    >
                      <option value="active">Active (Available for quoting)</option>
                      <option value="inactive">Inactive</option>
                    </Select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Differentiator / Perbedaan Produk
                      </label>
                      <span className="text-[10px] text-muted-foreground">
                        Key distinction vs other tiers
                      </span>
                    </div>
                    <Textarea
                      rows={2}
                      value={tierModalForm.differentiator || ""}
                      onChange={(e) => setTierModalForm({ ...tierModalForm, differentiator: e.target.value })}
                      placeholder="Jelaskan keunggulan unik atau perbedaan tier ini dibanding tier lainnya (misal: Cocok untuk tim berkembang s.d. 50 user dengan automasi WhatsApp dan SLA prioritas)..."
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Included Features (Press Enter to add tag)
                    </label>
                    <TagInput
                      value={tierModalForm.features || []}
                      onChange={(newFeatures) => setTierModalForm({ ...tierModalForm, features: newFeatures })}
                      placeholder="Add feature (e.g. 50GB Storage, 24/7 SLA, Unlimited Chat)..."
                    />
                  </div>
                </div>
              </div>
            </Modal>
          </>
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
                onApplied={(freshProduct) => {
                  qc.invalidateQueries({ queryKey: ["products", productId] });
                  if (freshProduct) {
                    if (freshProduct.name) setFormName(freshProduct.name);
                    if (freshProduct.description) setFormDesc(freshProduct.description);
                    if (freshProduct.category) setFormCategory(freshProduct.category);
                    if (freshProduct.target_industry) setFormTargetIndustry(freshProduct.target_industry);
                    if (freshProduct.target_company_size) setFormTargetCompanySize(freshProduct.target_company_size);
                    if (freshProduct.target_buyer_persona) setFormTargetPersona(freshProduct.target_buyer_persona);
                    if (freshProduct.target_pain_points) setFormTargetPainPoints(freshProduct.target_pain_points);
                    if (freshProduct.ideal_company_profile) setFormIdealCompanyProfile(freshProduct.ideal_company_profile);
                    if (freshProduct.budget_range) setFormBudgetRange(freshProduct.budget_range);
                    if (freshProduct.competitor_notes) setFormCompetitorNotes(freshProduct.competitor_notes);
                  }
                }}
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
                    ) : (logoUrl || logoPath) && !logoLoadFailed ? (
                      <img
                        src={`/api/products/${productId}/logo?v=${encodeURIComponent(logoPath || '1')}`}
                        className="max-h-full max-w-full object-contain"
                        alt="Product Logo"
                        onError={() => setLogoLoadFailed(true)}
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
