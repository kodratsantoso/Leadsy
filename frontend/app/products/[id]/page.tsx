"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle, ArrowLeft, Check, FileText, Globe, Link as LinkIcon, Loader2, Package, Sparkles, Upload, X, Plus, Trash2
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/apiFetch";
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

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const { formatCurrency } = useNumberFormat();
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
  const [formSupportedRegions, setFormSupportedRegions] = useState("");
  const [formBudgetRange, setFormBudgetRange] = useState("");
  const [formUseCases, setFormUseCases] = useState("");      
  const [formCompetitorNotes, setFormCompetitorNotes] = useState("");
  const [formKeywords, setFormKeywords] = useState("");       

  const [formTiers, setFormTiers] = useState<ProductTier[]>([]);

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
      setFormSupportedRegions(product.supported_regions || "");
      setFormBudgetRange(product.budget_range || "");
      setFormUseCases(product.use_cases?.join(", ") || "");
      setFormCompetitorNotes(product.competitor_notes || "");
      setFormKeywords(product.keywords?.join(", ") || "");

      setFormTiers(product.tiers ?? []);
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
        supported_regions: formSupportedRegions,
        budget_range: formBudgetRange,
        use_cases: formUseCases.split(",").map(v => v.trim()).filter(Boolean),
        competitor_notes: formCompetitorNotes,
        keywords: formKeywords.split(",").map(v => v.trim()).filter(Boolean),
        tiers: formTiers,
      };

      return apiFetch(`/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products", productId] });
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
      // Merge logic (simplified)
      const mergeCsv = (current: string, incoming: any) => {
        const arr = [...(current ? current.split(",") : []), ...(Array.isArray(incoming) ? incoming : [incoming])];
        return Array.from(new Set(arr.map(s => s?.trim()).filter(Boolean))).join(", ");
      };

      setFormDesc(generated.description || formDesc);
      setFormCategory(mergeCsv(formCategory, generated.category));
      setFormTargetIndustry(mergeCsv(formTargetIndustry, generated.target_industry));
      setFormTargetCompanySize(generated.target_company_size || formTargetCompanySize);
      setFormTargetPersona(mergeCsv(formTargetPersona, generated.target_buyer_persona));
      setFormBudgetRange(generated.budget_range || formBudgetRange);
      setFormSupportedRegions(mergeCsv(formSupportedRegions, generated.supported_regions));
      setFormKeywords(mergeCsv(formKeywords, generated.keywords));
      setFormTargetPainPoints(generated.target_pain_points || formTargetPainPoints);
      setFormUseCases(mergeCsv(formUseCases, generated.use_cases));
      setFormCompetitorNotes(generated.competitor_notes || formCompetitorNotes);
      setFormIdealCompanyProfile(generated.ideal_company_profile || formIdealCompanyProfile);
      setAiGenerated(true);
      setAiError(null);
    },
    onError: (err: Error) => setAiError(err.message),
  });

  const handleSave = () => saveMutation.mutate();

  if (isLoading) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) {
    return <div className="p-6">Product not found.</div>;
  }

  return (
    <div className="space-y-6 p-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push("/products")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <p className="text-sm text-muted-foreground">Manage product details and AI matching config.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        items={[
          { key: "overview", label: "Product Overview" },
          { key: "targeting", label: "Targeting & Match AI" },
          { key: "tiers", label: "Product Tiers (SaaS)" },
          { key: "questions", label: "Question Guide" },
          { key: "history", label: "Comparison & Scraping" },
        ]}
      />

      <div className="mt-6">
        {/* 1. OVERVIEW */}
        {activeTab === "overview" && (
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>Core details and AI reference material for generating metadata.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Product Name *</label>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Category</label>
                  <Input value={formCategory} onChange={(e) => setFormCategory(e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Description</label>
                  <Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={3} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Website URL (For Scraping)</label>
                  <Input value={formWebsiteUrl} onChange={(e) => setFormWebsiteUrl(e.target.value)} placeholder="https://example.com/product" type="url" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Select value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Select>
                </div>
              </div>

              {/* AI Reference Tooling */}
              <div className="rounded-xl border border-border bg-[color:var(--surface-subtle)] p-5 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[color:var(--brand)]" />
                    AI Reference Generation
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Generate missing targeting and use case metadata by analyzing a URL or PDF.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* URL */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> URL Reference</label>
                    <div className="flex gap-2">
                      <Input value={refUrl} onChange={(e) => setRefUrl(e.target.value)} placeholder="https://..." className="flex-1 text-sm" />
                      <Button variant="outline" onClick={() => aiGenerateMutation.mutate({ source: "url", productName: formName, url: refUrl })} disabled={!refUrl.trim() || aiGenerateMutation.isPending}>
                        {aiGenerateMutation.isPending && aiSource === "url" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Analyze"}
                      </Button>
                    </div>
                  </div>

                  {/* PDF */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> PDF Reference</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input type="file" accept=".pdf" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          setRefPdfFile(file);
                          setRefPdfName(file?.name ?? "");
                          e.target.value = "";
                        }} />
                        <div className="flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm text-muted-foreground">
                          <Upload className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{refPdfName || "Choose PDF..."}</span>
                          {refPdfFile && <button type="button" className="ml-auto" onClick={(e) => { e.stopPropagation(); setRefPdfFile(null); setRefPdfName(""); }}><X className="h-3.5 w-3.5" /></button>}
                        </div>
                      </div>
                      <Button variant="outline" onClick={() => aiGenerateMutation.mutate({ source: "pdf", productName: formName, pdfFile: refPdfFile! })} disabled={!refPdfFile || aiGenerateMutation.isPending}>
                        {aiGenerateMutation.isPending && aiSource === "pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Analyze"}
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
                  <div className="p-3 bg-brand/10 text-brand text-sm rounded-lg flex items-center gap-2 font-medium">
                    <Check className="h-4 w-4" /> AI Generated metadata applied successfully. Review the other tabs and save changes.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 2. TARGETING */}
        {activeTab === "targeting" && (
          <Card>
            <CardHeader>
              <CardTitle>Targeting & Matching</CardTitle>
              <CardDescription>Configure parameters used by Product Match AI to suggest this product.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Target Industry</label>
                <Input value={formTargetIndustry} onChange={(e) => setFormTargetIndustry(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Target Company Size</label>
                <Input value={formTargetCompanySize} onChange={(e) => setFormTargetCompanySize(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Target Buyer Persona</label>
                <Input value={formTargetPersona} onChange={(e) => setFormTargetPersona(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Budget Range</label>
                <Input value={formBudgetRange} onChange={(e) => setFormBudgetRange(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Supported Regions</label>
                <Input value={formSupportedRegions} onChange={(e) => setFormSupportedRegions(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Keywords (comma-separated)</label>
                <Input value={formKeywords} onChange={(e) => setFormKeywords(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Target Pain Points</label>
                <Textarea value={formTargetPainPoints} onChange={(e) => setFormTargetPainPoints(e.target.value)} rows={3} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Use Cases (comma-separated)</label>
                <Input value={formUseCases} onChange={(e) => setFormUseCases(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Ideal Company Profile</label>
                <Textarea value={formIdealCompanyProfile} onChange={(e) => setFormIdealCompanyProfile(e.target.value)} rows={2} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Competitor Notes</label>
                <Textarea value={formCompetitorNotes} onChange={(e) => setFormCompetitorNotes(e.target.value)} rows={2} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3. TIERS */}
        {activeTab === "tiers" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>SaaS Pricing Tiers</CardTitle>
                <CardDescription>Manage packages and subscription features.</CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => setFormTiers([...formTiers, {
                  name: "New Tier",
                  price: 0,
                  pricing_type: "flat_rate",
                  billing_period: "monthly",
                  subscription_duration_value: 1,
                  subscription_duration_unit: "month",
                  features: [],
                  status: "active"
                }])}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Tier
              </Button>
            </CardHeader>
            <CardContent>
              {formTiers.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-border rounded-xl">
                  <p className="text-sm text-muted-foreground">No pricing tiers defined.</p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {formTiers.map((tier, idx) => (
                    <div key={idx} className="rounded-xl border border-border bg-background shadow-sm flex flex-col overflow-hidden relative group transition-all hover:border-[var(--brand)]/40 hover:shadow-md">
                      <div className="flex items-center justify-between gap-3 p-4 bg-muted/10 border-b border-border">
                        <Input className="flex-1 h-9 bg-background font-semibold" value={tier.name} onChange={(e) => {
                          const nt = [...formTiers]; nt[idx].name = e.target.value; setFormTiers(nt);
                        }} placeholder="Tier Name (e.g. Pro)" />
                        <Button variant="outline" size="icon" className="text-destructive h-9 w-9 shrink-0 bg-background" onClick={() => setFormTiers(formTiers.filter((_, i) => i !== idx))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <Input type="number" value={tier.price} onChange={(e) => {
                            const nt = [...formTiers]; nt[idx].price = Number(e.target.value); setFormTiers(nt);
                          }} placeholder="Price" />
                          <Select value={tier.billing_period} onChange={(e) => {
                            const nt = [...formTiers]; nt[idx].billing_period = e.target.value as any; setFormTiers(nt);
                          }}>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                            <option value="one_time">One Time</option>
                          </Select>
                        </div>
                        
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground">Pricing Model</label>
                          <Select value={tier.pricing_type} onChange={(e) => {
                            const nt = [...formTiers]; nt[idx].pricing_type = e.target.value as any; setFormTiers(nt);
                          }}>
                          <option value="flat_rate">Flat Rate</option>
                          <option value="per_user">Per User</option>
                          <option value="usage_based">Usage Based</option>
                        </Select>

                        </div>

                        <div className="pt-2 border-t border-border">
                          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Features (Comma Separated)</label>
                          <Textarea 
                            rows={3}
                            value={tier.features?.join(", ") || ""} 
                            onChange={(e) => {
                              const nt = [...formTiers]; nt[idx].features = e.target.value.split(",").map(v=>v.trim()).filter(Boolean); setFormTiers(nt);
                            }} 
                            placeholder="Feature 1, Feature 2" 
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

        {/* 4. QUESTIONS */}
        {activeTab === "questions" && (
          <Card>
            <CardHeader>
              <CardTitle>Question Guide</CardTitle>
              <CardDescription>Sales qualification and BANT questions for this product.</CardDescription>
            </CardHeader>
            <CardContent>
              <QuestionGuide productId={productId} />
            </CardContent>
          </Card>
        )}

        {/* 5. HISTORY */}
        {activeTab === "history" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Feature History & Scraping</CardTitle>
                <CardDescription>Track product specification changes from its website over time.</CardDescription>
              </div>
              <ProductScrapeAndCompare product={{ ...product, website_url: formWebsiteUrl || product?.website_url }} />
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
      </div>
    </div>
  );
}
