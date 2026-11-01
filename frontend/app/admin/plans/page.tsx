"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  DollarSign,
  Check,
  Users,
  Shield,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  Layers,
  Plus,
  Edit3,
  Trash2,
  HardDrive,
  Bot,
  MessageSquare,
  Building2,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/apiFetch";

interface PlanTier {
  id: number;
  code: string;
  name: string;
  description?: string;
  price_monthly: number;
  price_annual: number;
  currency: string;
  seats_limit: number;
  price_per_additional_seat: number;
  leads_limit: number;
  disk_limit_gb: number;
  ai_budget_cap_usd: number;
  whatsapp_channels_limit: number;
  features: string[];
  modules?: Record<string, boolean>;
  is_popular: boolean;
  is_public: boolean;
  status: string;
}

interface PlansData {
  mrr: number;
  arr: number;
  plan_counts: Record<string, number>;
  tiers: PlanTier[];
  total_tenants: number;
  paying_tenants: number;
}

interface PlanFormState {
  id?: number;
  code: string;
  name: string;
  description: string;
  price_monthly: string;
  price_annual: string;
  currency: string;
  seats_limit: string;
  price_per_additional_seat: string;
  leads_limit: string;
  disk_limit_gb: string;
  ai_budget_cap_usd: string;
  whatsapp_channels_limit: string;
  featuresText: string;
  modules: Record<string, boolean>;
  is_popular: boolean;
  is_public: boolean;
  status: string;
}

const availableModulesCatalog = [
  { key: "lead_management", label: "Lead Management & CRM Funnel", domain: "Core CRM" },
  { key: "activity_tracking", label: "Activity Logs & Scheduler", domain: "Core CRM" },
  { key: "whatsapp_local_gateway", label: "WhatsApp Local Gateway (Baileys)", domain: "Messaging" },
  { key: "whatsapp_qontak_cloud", label: "Qontak WhatsApp Official Cloud API", domain: "Messaging" },
  { key: "ai_qualification_scoring", label: "AI BANTC Scoring & Lead Qualification", domain: "AI" },
  { key: "ai_pre_meeting_brief", label: "AI Pre-Meeting Brief & Dossier", domain: "AI" },
  { key: "ai_meeting_summary", label: "AI Meeting Summary & Action Items", domain: "AI" },
  { key: "ai_deepsearch_enrichment", label: "AI DeepSearch Firmographic Enrichment", domain: "AI" },
  { key: "lark_bitable_sync", label: "Lark Bitable 2-Way Live Sync", domain: "Integrations" },
  { key: "ads_webhook_ingestion", label: "Ads Webhook Ingestion (Meta/TikTok)", domain: "Integrations" },
  { key: "order_to_cash", label: "Order-to-Cash PS & Client Invoicing", domain: "Enterprise" },
  { key: "dedicated_queue", label: "Dedicated Redis Queue Isolation", domain: "Enterprise" },
  { key: "custom_domain_ssl", label: "Custom Domain Branding & SSL", domain: "Enterprise" },
  { key: "immutable_audit_logs", label: "Immutable Platform Audit Trail", domain: "Enterprise" },
];

const emptyPlanForm: PlanFormState = {
  code: "",
  name: "",
  description: "",
  price_monthly: "49.00",
  price_annual: "470.00",
  currency: "USD",
  seats_limit: "5",
  price_per_additional_seat: "10.00",
  leads_limit: "1000",
  disk_limit_gb: "10",
  ai_budget_cap_usd: "50.00",
  whatsapp_channels_limit: "1",
  featuresText: "Lead Management\nBasic AI Qualification\nLocal WhatsApp Gateway",
  modules: {
    lead_management: true,
    activity_tracking: true,
    whatsapp_local_gateway: true,
    ai_qualification_scoring: true,
  },
  is_popular: false,
  is_public: true,
  status: "active",
};

export default function PlatformPlansPage() {
  const [data, setData] = useState<PlansData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [formState, setFormState] = useState<PlanFormState>(emptyPlanForm);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await apiFetch("/api/platform/plans");
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (e) {
      console.error("Failed to load plans data:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleOpenCreate = () => {
    setFormState(emptyPlanForm);
    setModalOpen(true);
  };

  const handleOpenEdit = (plan: PlanTier) => {
    setFormState({
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description || "",
      price_monthly: plan.price_monthly.toString(),
      price_annual: plan.price_annual.toString(),
      currency: plan.currency || "USD",
      seats_limit: plan.seats_limit.toString(),
      price_per_additional_seat: (plan.price_per_additional_seat ?? 10).toString(),
      leads_limit: plan.leads_limit.toString(),
      disk_limit_gb: plan.disk_limit_gb.toString(),
      ai_budget_cap_usd: plan.ai_budget_cap_usd.toString(),
      whatsapp_channels_limit: (plan.whatsapp_channels_limit ?? 1).toString(),
      featuresText: Array.isArray(plan.features) ? plan.features.join("\n") : "",
      modules: plan.modules || {},
      is_popular: plan.is_popular,
      is_public: plan.is_public,
      status: plan.status || "active",
    });
    setModalOpen(true);
  };

  const handleSavePlan = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const isEdit = Boolean(formState.id);
      const url = isEdit ? `/api/platform/plans/${formState.id}` : "/api/platform/plans";
      const method = isEdit ? "PUT" : "POST";

      const features = formState.featuresText
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean);

      const payload = {
        code: formState.code,
        name: formState.name,
        description: formState.description || null,
        price_monthly: parseFloat(formState.price_monthly) || 0,
        price_annual: parseFloat(formState.price_annual) || 0,
        currency: formState.currency || "USD",
        seats_limit: parseInt(formState.seats_limit) || 5,
        price_per_additional_seat: parseFloat(formState.price_per_additional_seat) || 0,
        leads_limit: parseInt(formState.leads_limit) || 1000,
        disk_limit_gb: parseInt(formState.disk_limit_gb) || 10,
        ai_budget_cap_usd: parseFloat(formState.ai_budget_cap_usd) || 0,
        whatsapp_channels_limit: parseInt(formState.whatsapp_channels_limit) || 1,
        features,
        modules: formState.modules,
        is_popular: formState.is_popular,
        is_public: formState.is_public,
        status: formState.status,
      };

      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok) {
        setNotice({ text: json.message || "Plan saved successfully.", type: "success" });
        setModalOpen(false);
        fetchPlans();
      } else {
        setNotice({ text: json.message || "Failed to save plan.", type: "error" });
      }
    } catch (e: any) {
      setNotice({ text: e.message || "Network error while saving plan.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (plan: PlanTier) => {
    setNotice(null);
    try {
      const res = await apiFetch(`/api/platform/plans/${plan.id}`, { method: "DELETE" });
      const json = await res.json();
      if (res.ok) {
        setNotice({ text: `Plan '${plan.name}' removed.`, type: "success" });
        fetchPlans();
      } else {
        setNotice({ text: json.message || "Failed to delete plan.", type: "error" });
      }
    } catch (e: any) {
      setNotice({ text: e.message || "Network error.", type: "error" });
    }
  };

  const toggleModule = (moduleKey: string) => {
    setFormState((prev) => ({
      ...prev,
      modules: {
        ...prev.modules,
        [moduleKey]: !prev.modules[moduleKey],
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Paket Langganan & Pricing SaaS
            </h1>
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs font-semibold">
              Packaging & Monetization
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Konfigurasi tier langganan, batasan kuota sumber daya, bundling modul fitur, dan pantauan metrik MRR/ARR.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRefreshing(true);
              fetchPlans();
            }}
            disabled={refreshing}
            className="h-8 gap-1.5 rounded-lg border-border bg-card text-xs text-foreground hover:bg-muted"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
            <span>Segarkan Finansial</span>
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="h-8 gap-1.5 rounded-lg bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tambah Paket Baru</span>
          </Button>
        </div>
      </div>

      {notice && (
        <div
          className={`flex items-center justify-between rounded-xl border p-3.5 text-xs ${
            notice.type === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <span>{notice.text}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Revenue KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">Normalized MRR</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground font-mono">
                ${(data?.mrr ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Volume tagihan berulang bulanan</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">Annual Run Rate (ARR)</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <CreditCard className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground font-mono">
                ${(data?.arr ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-cyan-600 dark:text-cyan-400">Proyeksi tahunan (Annualized run-rate)</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">Workspace Aktif</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground font-mono">
                {data?.total_tenants ?? 0}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data?.paying_tenants ?? 0} Berbayar / {data?.plan_counts?.trial ?? 0} Trial
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">Katalog Tier</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Layers className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground font-mono">
                {data?.tiers.length ?? 0} Paket
              </p>
              <p className="mt-1 text-xs text-purple-600 dark:text-purple-400">Tersedia di Database Master</p>
            </div>
          </div>

          {/* Dynamic Tier Cards Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {data?.tiers.map((tier) => {
              const activeCount = data.plan_counts?.[tier.code] ?? 0;
              const discountAnnual =
                tier.price_monthly > 0
                  ? Math.round((1 - tier.price_annual / (tier.price_monthly * 12)) * 100)
                  : 0;

              return (
                <div
                  key={tier.id}
                  className={`relative flex flex-col justify-between rounded-2xl border p-6 shadow-xs transition-all duration-200 ${
                    tier.is_popular
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card"
                  }`}
                >
                  {tier.is_popular && (
                    <div className="absolute -top-3 right-6">
                      <Badge className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
                        Paling Populer
                      </Badge>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                          <span>{tier.name}</span>
                          {!tier.is_public && (
                            <Badge variant="outline" className="border-border bg-muted text-[9px] text-muted-foreground">
                              Private / Custom
                            </Badge>
                          )}
                        </h2>
                        <span className="text-[11px] font-mono text-muted-foreground">Kode: {tier.code}</span>
                      </div>
                      <Badge variant="outline" className="border-border bg-muted text-xs font-mono text-foreground">
                        {activeCount} aktif
                      </Badge>
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                      {tier.description || "Paket produksi untuk organisasi penjualan."}
                    </p>

                    {/* Pricing Display */}
                    <div className="mt-4 flex items-baseline gap-2 border-b border-border pb-4">
                      <span className="text-3xl font-extrabold text-foreground font-mono">
                        ${tier.price_monthly}
                      </span>
                      <span className="text-xs text-muted-foreground">/ bulan</span>
                      {tier.price_annual > 0 && (
                        <span className="text-xs text-muted-foreground ml-auto font-mono">
                          ${tier.price_annual} / thn {discountAnnual > 0 && <span className="text-emerald-600 dark:text-emerald-400">(-{discountAnnual}%)</span>}
                        </span>
                      )}
                    </div>

                    {/* Ceilings & Quotas */}
                    <div className="mt-4 space-y-2.5 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-primary" /> Kuota User (Seats):
                        </span>
                        <span className="font-semibold text-foreground font-mono">
                          {tier.seats_limit} seats{" "}
                          {tier.price_per_additional_seat > 0 && (
                            <span className="text-[10px] text-muted-foreground">(+${tier.price_per_additional_seat}/seat)</span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Layers className="h-3.5 w-3.5 text-cyan-500" /> Kapasitas Leads:
                        </span>
                        <span className="font-semibold text-foreground font-mono">
                          {tier.leads_limit.toLocaleString()} leads
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <HardDrive className="h-3.5 w-3.5 text-amber-500" /> Kuota Disk:
                        </span>
                        <span className="font-semibold text-foreground font-mono">
                          {tier.disk_limit_gb} GB
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Bot className="h-3.5 w-3.5 text-purple-500" /> Anggaran AI:
                        </span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                          ${tier.ai_budget_cap_usd} / bln
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <MessageSquare className="h-3.5 w-3.5 text-emerald-500" /> Kanal WhatsApp:
                        </span>
                        <span className="font-semibold text-foreground font-mono">
                          {tier.whatsapp_channels_limit ?? 1} channel
                        </span>
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="mt-5 border-t border-border pt-4">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block mb-2">
                        Fitur & Entitlement Termasuk:
                      </span>
                      <ul className="space-y-1.5 text-xs text-foreground">
                        {Array.isArray(tier.features) &&
                          tier.features.slice(0, 5).map((feat, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span className="truncate">{feat}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex items-center justify-between gap-2 border-t border-border pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(tier)}
                      className="w-full gap-1.5 border-border bg-card text-xs text-foreground hover:bg-muted"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit Paket</span>
                    </Button>

                    {activeCount === 0 && tier.code !== "enterprise" && tier.code !== "starter" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePlan(tier)}
                        className="border-destructive/30 bg-destructive/10 text-xs text-destructive hover:bg-destructive/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* PLAN BUILDER MODAL */}
      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={formState.id ? `Edit Paket: ${formState.name}` : "Buat Paket SaaS Baru"}
        description="Konfigurasi harga tier, batasan kuota sumber daya, poin fitur, dan bundling modul entitlement."
        size="xl"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={saving}
              onClick={handleSavePlan}
              className="bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
            >
              {saving ? "Menyimpan Paket..." : "Simpan Paket Tier"}
            </Button>
          </div>
        }
      >
        <div className="space-y-5 py-2">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground">Nama Tampilan Paket</label>
              <Input
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                placeholder="Contoh: Scale Growth Tier"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Kode Paket (Identifier Unik)</label>
              <Input
                value={formState.code}
                onChange={(e) => setFormState({ ...formState, code: e.target.value })}
                placeholder="Contoh: scale_growth"
                className="mt-1 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground">Deskripsi Paket</label>
            <Input
              value={formState.description}
              onChange={(e) => setFormState({ ...formState, description: e.target.value })}
              placeholder="Ringkasan segmen target pelanggan dan proposisi nilai."
              className="mt-1"
            />
          </div>

          {/* Pricing & Billing */}
          <div className="grid grid-cols-3 gap-4 border-t border-border pt-4">
            <div>
              <label className="text-xs font-semibold text-foreground">Harga Bulanan ($)</label>
              <Input
                type="number"
                step="1"
                value={formState.price_monthly}
                onChange={(e) => setFormState({ ...formState, price_monthly: e.target.value })}
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Harga Tahunan ($)</label>
              <Input
                type="number"
                step="1"
                value={formState.price_annual}
                onChange={(e) => setFormState({ ...formState, price_annual: e.target.value })}
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Harga / Extra Seat ($/bln)</label>
              <Input
                type="number"
                step="1"
                value={formState.price_per_additional_seat}
                onChange={(e) => setFormState({ ...formState, price_per_additional_seat: e.target.value })}
                className="mt-1 font-mono"
              />
            </div>
          </div>

          {/* Resource Quotas */}
          <div className="grid grid-cols-4 gap-4 border-t border-border pt-4">
            <div>
              <label className="text-xs font-semibold text-foreground">Termasuk User (Seats)</label>
              <Input
                type="number"
                value={formState.seats_limit}
                onChange={(e) => setFormState({ ...formState, seats_limit: e.target.value })}
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Maksimal Leads</label>
              <Input
                type="number"
                value={formState.leads_limit}
                onChange={(e) => setFormState({ ...formState, leads_limit: e.target.value })}
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Kuota Disk (GB)</label>
              <Input
                type="number"
                value={formState.disk_limit_gb}
                onChange={(e) => setFormState({ ...formState, disk_limit_gb: e.target.value })}
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Limit AI ($/bln)</label>
              <Input
                type="number"
                value={formState.ai_budget_cap_usd}
                onChange={(e) => setFormState({ ...formState, ai_budget_cap_usd: e.target.value })}
                className="mt-1 font-mono"
              />
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="border-t border-border pt-4">
            <label className="text-xs font-semibold text-foreground">Poin Keunggulan Fitur (Satu per baris)</label>
            <textarea
              rows={4}
              value={formState.featuresText}
              onChange={(e) => setFormState({ ...formState, featuresText: e.target.value })}
              className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans placeholder:text-muted-foreground"
              placeholder="Lead Management&#10;Lark 2-Way Sync&#10;Dedicated Redis Queue"
            />
          </div>

          {/* Module Entitlements Checklist */}
          <div className="border-t border-border pt-4">
            <label className="text-xs font-semibold text-foreground block mb-2">
              Modul Fitur yang Termasuk dalam Tier Ini
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-xl border border-border bg-muted/30 p-3">
              {availableModulesCatalog.map((mod) => {
                const isChecked = Boolean(formState.modules[mod.key]);
                return (
                  <label
                    key={mod.key}
                    onClick={() => toggleModule(mod.key)}
                    className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-muted cursor-pointer text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="rounded border-border text-primary focus:ring-0"
                    />
                    <div className="truncate">
                      <span className="text-foreground font-medium block truncate">{mod.label}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{mod.key}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-6 border-t border-border pt-4 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-foreground">
              <input
                type="checkbox"
                checked={formState.is_popular}
                onChange={(e) => setFormState({ ...formState, is_popular: e.target.checked })}
                className="rounded border-border text-primary"
              />
              <span>Tandai sebagai "Paling Populer"</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-foreground">
              <input
                type="checkbox"
                checked={formState.is_public}
                onChange={(e) => setFormState({ ...formState, is_public: e.target.checked })}
                className="rounded border-border text-primary"
              />
              <span>Paket Publik (Tampil di self-serve pricing)</span>
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
