"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  Building2, Shield, Users, Layers, Activity, HardDrive, Key, RefreshCw,
  RotateCcw, AlertTriangle, CheckCircle2, ChevronRight, ArrowLeft, ArrowUpRight,
  Copy, Check, Lock, Unlock, Download, Sparkles, SlidersHorizontal, UserCheck,
  Calendar, CreditCard, DollarSign, Bot, Radio, Globe, Terminal, FileJson,
  Trash2, Clock, Smartphone, MessageSquare, AlertCircle, Info, Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { apiFetch } from "@/lib/apiFetch";
import { useAuthStore } from "@/store/useAuthStore";
import { PlatformAdminHeader } from "@/components/platform-admin/PlatformAdminHeader";

interface TenantDeepData {
  tenant: {
    id: number;
    name: string;
    slug: string;
    status: "active" | "suspended" | "trial" | "cancelled";
    legal_name: string | null;
    brand_name: string | null;
    logo_path: string | null;
    address: string | null;
    tax_number: string | null;
    signatory_name: string | null;
    signatory_position: string | null;
    billing_cycle: "monthly" | "annual";
    trial_ends_at: string | null;
    subscription_ends_at: string | null;
    created_at: string;
  };
  plan: {
    id: number;
    code: string;
    name: string;
    price_monthly: number;
    price_annual: number;
    seats_limit: number;
    leads_limit: number;
    disk_limit_gb: number;
    ai_budget_cap_usd: number;
    whatsapp_channels_limit: number;
    features: Record<string, boolean>;
  } | null;
  quotas: {
    users: { used: number; max: number; percent: number };
    leads: { used: number; max: number; percent: number };
    disk: { used_gb: number; max_gb: number; percent: number };
    ai: {
      spend_usd: number;
      tokens_consumed: number;
      budget_cap_usd: number;
      percent: number;
    };
  };
  users: Array<{
    id: number;
    name: string;
    email: string;
    phone: string | null;
    role_name: string;
    is_active: boolean;
    created_at: string;
  }>;
  modules: Record<string, boolean>;
  integrations: {
    lark: {
      connected: boolean;
      app_id: string | null;
    };
    connections_count: number;
  };
  recent_logs: Array<{
    id: number;
    action: string;
    module: string;
    status: string;
    ip_address: string;
    created_at: string;
  }>;
}

interface PlanOption {
  id: number;
  code: string;
  name: string;
  price_monthly: number;
  price_annual: number;
  seats_limit: number;
  leads_limit: number;
  disk_limit_gb: number;
}

export default function TenantDeepConsolePage() {
  const params = useParams();
  const tenantId = params?.id ? parseInt(params.id as string, 10) : 1;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "subscription" | "modules" | "integrations" | "audit" | "danger"
  >("overview");

  const [data, setData] = useState<TenantDeepData | null>(null);
  const [availablePlans, setAvailablePlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Password reset modal state
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

  // Subscription update state
  const [selectedPlanId, setSelectedPlanId] = useState<number>(1);
  const [selectedCycle, setSelectedCycle] = useState<"monthly" | "annual">("monthly");
  const [selectedStatus, setSelectedStatus] = useState<string>("active");
  const [savingSub, setSavingSub] = useState(false);

  // Modules local override state
  const [modulesState, setModulesState] = useState<Record<string, boolean>>({});
  const [savingModules, setSavingModules] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 5000);
  };

  const fetchTenantData = useCallback(async () => {
    try {
      const [deepRes, plansRes] = await Promise.all([
        apiFetch(`/api/platform/tenants/${tenantId}/deep`),
        apiFetch(`/api/platform/plans`),
      ]);

      if (deepRes.ok) {
        const json = await deepRes.json();
        const payload = json.data as TenantDeepData;
        setData(payload);
        if (payload.plan?.id) {
          setSelectedPlanId(payload.plan.id);
        }
        setSelectedCycle(payload.tenant.billing_cycle || "monthly");
        setSelectedStatus(payload.tenant.status || "active");
        setModulesState(payload.modules || {});
      } else {
        showToast("Failed to load tenant 360 data.", "error");
      }

      if (plansRes.ok) {
        const pJson = await plansRes.json();
        const tiers = Array.isArray(pJson.data)
          ? pJson.data
          : Array.isArray(pJson.data?.tiers)
          ? pJson.data.tiers
          : [];
        setAvailablePlans(tiers);
      }
    } catch (e) {
      console.error("Error fetching tenant 360:", e);
      showToast("Error connecting to platform API.", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchTenantData();
  }, [fetchTenantData]);

  // Actions
  const handleResetPassword = async (userId: number) => {
    try {
      const res = await apiFetch(`/api/platform/tenants/${tenantId}/users/${userId}/reset-password`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setResetResult({
          email: json.data.email,
          password: json.data.temporary_password,
        });
        showToast(`Temporary password generated for ${json.data.email}`);
      } else {
        showToast(json.message || "Failed to reset password", "error");
      }
    } catch (e) {
      showToast("Network error during password reset", "error");
    }
  };

  const handleToggleUserActive = async (userId: number) => {
    try {
      const res = await apiFetch(`/api/platform/tenants/${tenantId}/users/${userId}/toggle-active`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok) {
        showToast(json.message || "User status updated");
        fetchTenantData();
      } else {
        showToast(json.message || "Failed to update user status", "error");
      }
    } catch (e) {
      showToast("Network error updating user", "error");
    }
  };

  const handleSaveSubscription = async (trialExtensionDays?: number) => {
    setSavingSub(true);
    try {
      const body: any = {
        plan_id: selectedPlanId,
        billing_cycle: selectedCycle,
        status: selectedStatus,
      };
      if (trialExtensionDays) {
        body.trial_days_extension = trialExtensionDays;
      }

      const res = await apiFetch(`/api/platform/tenants/${tenantId}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok) {
        showToast(json.message || "Subscription successfully updated");
        fetchTenantData();
      } else {
        showToast(json.message || "Failed to update subscription", "error");
      }
    } catch (e) {
      showToast("Network error saving subscription", "error");
    } finally {
      setSavingSub(false);
    }
  };

  const handleToggleModule = async (key: string) => {
    const nextState = { ...modulesState, [key]: !modulesState[key] };
    setModulesState(nextState);
    setSavingModules(true);
    try {
      const res = await apiFetch(`/api/platform/tenants/${tenantId}/features`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules: nextState }),
      });
      const json = await res.json();
      if (res.ok) {
        showToast(`Feature module '${key}' updated`);
      } else {
        showToast(json.message || "Failed to update module entitlement", "error");
      }
    } catch (e) {
      showToast("Error updating module", "error");
    } finally {
      setSavingModules(false);
    }
  };

  const handleFlushCache = async () => {
    try {
      const res = await apiFetch(`/api/platform/tenants/${tenantId}/flush-cache`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok) {
        showToast(json.message || "Tenant cache memory flushed");
      } else {
        showToast("Failed to flush cache", "error");
      }
    } catch (e) {
      showToast("Network error flushing cache", "error");
    }
  };

  const handleExportData = async () => {
    try {
      const res = await apiFetch(`/api/platform/tenants/${tenantId}/export`);
      if (res.ok) {
        const json = await res.json();
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tenant-${data?.tenant.slug || tenantId}-export.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Tenant export downloaded successfully");
      }
    } catch (e) {
      showToast("Failed to export tenant data", "error");
    }
  };

  const handleImpersonate = async () => {
    if (!data?.tenant) return;
    try {
      const res = await apiFetch(`/api/platform/tenants/${tenantId}/impersonate`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok && json.data?.token) {
        const currentToken = useAuthStore.getState().token;
        const currentUser = useAuthStore.getState().user;
        if (currentToken && currentUser) {
          localStorage.setItem(
            "leadsy_impersonation_meta",
            JSON.stringify({
              original_token: currentToken,
              original_user: currentUser,
              tenant_name: data.tenant.name,
              tenant_id: data.tenant.id,
              started_at: new Date().toISOString(),
            })
          );
        }
        if (json.data.user) {
          useAuthStore.getState().setAuth(json.data.token, json.data.user);
        }
        window.location.href = "/dashboard";
      }
    } catch (e) {
      showToast("Failed to impersonate tenant admin", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-mono">Loading Tenant 360° telemetry...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-xl font-bold">Tenant Workspace Not Found</h2>
        <p className="text-sm text-muted-foreground mt-2 mb-6">
          The requested tenant ID #{tenantId} does not exist or has been deleted.
        </p>
        <Button onClick={() => router.push("/admin/tenants")}>Return to Tenants</Button>
      </div>
    );
  }

  const { tenant, plan, quotas, users, modules, integrations, recent_logs } = data;

  const featureCatalog = [
    { key: "ai_profiling", label: "AI Screening & Smart Profiling", desc: "Automated B2B lead enrichment & AI scoring models" },
    { key: "whatsapp_crm", label: "WhatsApp Multi-Device CRM", desc: "Full Baileys socket sidecar messaging & templates" },
    { key: "map_territory", label: "Map Territory & Radius Routing", desc: "Google Maps territory boundaries & nearby lead radar" },
    { key: "export_leads", label: "Excel & CSV Bulk Export", desc: "Permission to download enterprise contact records" },
    { key: "api_access", label: "Developer REST API & Webhooks", desc: "Programmatic API keys for external CRM integrations" },
    { key: "custom_branding", label: "White-label & Custom Invoices", desc: "Custom corporate logo on quotes, receipts & letters" },
    { key: "lark_sync", label: "Lark Base 2-Way Sync Engine", desc: "Bidirectional table synchronization with Lark Open API" },
  ];

  return (
    <div className="space-y-6 pb-16">
      <PlatformAdminHeader
        onRefresh={() => {
          setRefreshing(true);
          fetchTenantData();
        }}
        isRefreshing={refreshing}
      />

      {/* Toast Notice */}
      {notice && (
        <div
          className={`flex items-center gap-3 rounded-2xl border p-4 shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
            notice.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {notice.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span className="text-sm font-medium">{notice.message}</span>
        </div>
      )}

      {/* Top Breadcrumb & Action Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin/tenants")}
            className="h-9 w-9 rounded-xl p-0 hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Workspace 360° Console
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] uppercase font-bold ${
                  tenant.status === "active"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    : tenant.status === "trial"
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                    : "border-destructive/40 bg-destructive/10 text-destructive"
                }`}
              >
                {tenant.status}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              {tenant.name}
              <span className="font-mono text-sm font-normal text-muted-foreground">#{tenant.id}</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportData}
            className="rounded-xl border-border hover:bg-muted text-xs gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Export JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleFlushCache}
            className="rounded-xl border-border hover:bg-muted text-xs gap-1.5 text-cyan-400 hover:text-cyan-300"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Flush Cache
          </Button>
          <Button
            size="sm"
            onClick={handleImpersonate}
            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs gap-1.5 shadow-md shadow-primary/20"
          >
            <UserCheck className="h-3.5 w-3.5" />
            Assist / Impersonate
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto border-b border-border/60 scrollbar-none gap-2 pb-1">
        {[
          { id: "overview", label: "Overview & Quotas", icon: Activity },
          { id: "users", label: `Users (${users.length})`, icon: Users },
          { id: "subscription", label: "Subscription & Plan", icon: CreditCard },
          { id: "modules", label: "Modules & Features", icon: Layers },
          { id: "integrations", label: "Integrations Health", icon: Radio },
          { id: "audit", label: "Audit Logs", icon: Shield },
          { id: "danger", label: "Danger Zone", icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & RESOURCE QUOTAS */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Resource Gauges */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Seats Gauge */}
            <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-primary" /> Seats Allocation
                </span>
                <span className="font-mono">{quotas.users.percent}%</span>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold tracking-tight text-foreground">{quotas.users.used}</span>
                  <span className="text-xs text-muted-foreground">/ {quotas.users.max} seats</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      quotas.users.percent > 90
                        ? "bg-destructive"
                        : quotas.users.percent > 75
                        ? "bg-amber-500"
                        : "bg-primary"
                    }`}
                    style={{ width: `${quotas.users.percent}%` }}
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Active team members provisioned in this tenant workspace.
              </p>
            </div>

            {/* Leads Quota */}
            <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-blue-500" /> Leads Database
                </span>
                <span className="font-mono">{quotas.leads.percent}%</span>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold tracking-tight text-foreground">
                    {quotas.leads.used.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground">/ {quotas.leads.max.toLocaleString()}</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      quotas.leads.percent > 90
                        ? "bg-destructive"
                        : quotas.leads.percent > 75
                        ? "bg-amber-500"
                        : "bg-blue-500"
                    }`}
                    style={{ width: `${quotas.leads.percent}%` }}
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Customer records & B2B pipeline entities currently stored.
              </p>
            </div>

            {/* Storage Quota */}
            <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <HardDrive className="h-4 w-4 text-emerald-500" /> Disk Storage
                </span>
                <span className="font-mono">{quotas.disk.percent}%</span>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold tracking-tight text-foreground">{quotas.disk.used_gb}</span>
                  <span className="text-xs text-muted-foreground">/ {quotas.disk.max_gb} GB</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${quotas.disk.percent}%` }}
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Database records, document attachments, and media logs.
              </p>
            </div>

            {/* AI Spend Budget */}
            <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Bot className="h-4 w-4 text-purple-400" /> AI Budget Cap
                </span>
                <span className="font-mono">{quotas.ai.percent}%</span>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold tracking-tight text-foreground">
                    ${quotas.ai.spend_usd}
                  </span>
                  <span className="text-xs text-muted-foreground">/ ${quotas.ai.budget_cap_usd} cap</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      quotas.ai.percent > 90
                        ? "bg-destructive"
                        : quotas.ai.percent > 75
                        ? "bg-amber-500"
                        : "bg-purple-500"
                    }`}
                    style={{ width: `${quotas.ai.percent}%` }}
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Tokens consumed: <span className="font-mono font-medium text-foreground">{quotas.ai.tokens_consumed.toLocaleString()}</span>
              </p>
            </div>
          </div>

          {/* Corporate Metadata & Identity Details */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> Corporate Identity & Legal Records
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Legal Name (PT/CV):</span>
                  <p className="font-medium text-foreground mt-0.5">{tenant.legal_name || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Brand / Commercial Name:</span>
                  <p className="font-medium text-foreground mt-0.5">{tenant.brand_name || tenant.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">NPWP / Tax Number:</span>
                  <p className="font-mono font-medium text-foreground mt-0.5">{tenant.tax_number || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Workspace Slug:</span>
                  <p className="font-mono font-medium text-primary mt-0.5">/{tenant.slug}</p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Corporate Registered Address:</span>
                  <p className="font-medium text-foreground mt-0.5 leading-relaxed">{tenant.address || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Authorized Signatory:</span>
                  <p className="font-medium text-foreground mt-0.5">{tenant.signatory_name || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Signatory Position:</span>
                  <p className="font-medium text-foreground mt-0.5">{tenant.signatory_position || "—"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Platform Contract & Lifecycle
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Active Plan Tier:</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-bold text-foreground capitalize">{plan?.name || "Trial"}</span>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {plan?.code || "trial"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Billing Cycle:</span>
                  <p className="font-medium text-foreground capitalize mt-0.5">{tenant.billing_cycle || "monthly"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Trial Expiration:</span>
                  <p className="font-medium text-foreground mt-0.5">
                    {tenant.trial_ends_at ? new Date(tenant.trial_ends_at).toLocaleDateString() : "No active trial"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Contract Renewal Date:</span>
                  <p className="font-medium text-foreground mt-0.5">
                    {tenant.subscription_ends_at ? new Date(tenant.subscription_ends_at).toLocaleDateString() : "Rolling auto-renew"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Account Provisioned:</span>
                  <p className="font-medium text-foreground mt-0.5">{new Date(tenant.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">WhatsApp Channel Limit:</span>
                  <p className="font-medium text-foreground mt-0.5">{plan?.whatsapp_channels_limit ?? 1} numbers</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USERS & TEAM ROSTER */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Workspace Team Members</h3>
              <p className="text-xs text-muted-foreground">
                Manage credentials, access rights, and active account status for team members in this tenant.
              </p>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {users.length} of {quotas.users.max} seats occupied
            </Badge>
          </div>

          <div className="rounded-3xl border border-border/60 bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border/60 bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3.5">User</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5">Phone</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Created</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {(users || []).map((u) => (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xs">
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-xs">{u.name}</p>
                            <p className="font-mono text-[11px] text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {u.role_name}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                        {u.phone || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold capitalize ${
                            u.is_active
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                              : "border-destructive/30 bg-destructive/10 text-destructive"
                          }`}
                        >
                          {u.is_active ? "Active" : "Suspended"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground font-mono">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResetPassword(u.id)}
                            className="h-8 rounded-lg px-2.5 text-xs border-border hover:bg-muted gap-1"
                            title="Generate one-time reset password"
                          >
                            <Key className="h-3 w-3 text-amber-500" />
                            Reset Password
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleUserActive(u.id)}
                            className={`h-8 rounded-lg px-2 text-xs hover:bg-muted ${
                              u.is_active ? "text-amber-500 hover:text-amber-600" : "text-emerald-500 hover:text-emerald-600"
                            }`}
                            title={u.is_active ? "Suspend User Access" : "Activate User"}
                          >
                            {u.is_active ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUBSCRIPTION & PLAN */}
      {activeTab === "subscription" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Active Contract Info */}
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm space-y-6 lg:col-span-1">
            <div className="space-y-1">
              <span className="font-mono text-xs uppercase tracking-wider text-primary font-bold">
                Contract Summary
              </span>
              <h3 className="text-xl font-bold text-foreground">
                {plan?.name || "Custom Contract"}
              </h3>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-muted-foreground">Subscription Rate</span>
                <div className="text-right">
                  <span className="text-2xl font-bold font-mono text-primary">
                    ${tenant.billing_cycle === "annual" ? (plan?.price_annual ?? 0) : (plan?.price_monthly ?? 0)}
                  </span>
                  <span className="text-xs text-muted-foreground">/{tenant.billing_cycle === "annual" ? "yr" : "mo"}</span>
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground flex justify-between border-t border-border/40 pt-2">
                <span>Seats included:</span>
                <span className="font-mono font-medium text-foreground">{plan?.seats_limit ?? 25}</span>
              </div>
              <div className="text-[11px] text-muted-foreground flex justify-between">
                <span>Leads quota:</span>
                <span className="font-mono font-medium text-foreground">{(plan?.leads_limit ?? 10000).toLocaleString()}</span>
              </div>
              <div className="text-[11px] text-muted-foreground flex justify-between">
                <span>AI Budget cap:</span>
                <span className="font-mono font-medium text-foreground">${plan?.ai_budget_cap_usd ?? 150}/mo</span>
              </div>
            </div>

            {/* Trial Quick Extensions */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-amber-500" /> Extend Trial Window
              </span>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSaveSubscription(7)}
                  disabled={savingSub}
                  className="rounded-xl border-border hover:bg-muted text-xs"
                >
                  +7 Days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSaveSubscription(14)}
                  disabled={savingSub}
                  className="rounded-xl border-border hover:bg-muted text-xs"
                >
                  +14 Days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSaveSubscription(30)}
                  disabled={savingSub}
                  className="rounded-xl border-border hover:bg-muted text-xs"
                >
                  +30 Days
                </Button>
              </div>
            </div>
          </div>

          {/* Plan Re-assignment & Packaging Form */}
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm space-y-6 lg:col-span-2">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">Modify Workspace Subscription & Packaging</h3>
              <p className="text-xs text-muted-foreground">
                Re-assign workspace to a new dynamic pricing tier or toggle account operational status.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                  Select Product Tier Plan
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(Array.isArray(availablePlans) ? availablePlans : []).map((p) => {
                    const isSelected = selectedPlanId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPlanId(p.id)}
                        className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border/60 bg-muted/20 hover:border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground text-sm">{p.name}</span>
                          <span className="font-mono text-xs font-semibold text-primary">${p.price_monthly}/mo</span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground space-y-1">
                          <p>• Seats: {p.seats_limit} users</p>
                          <p>• Leads: {p.leads_limit.toLocaleString()} records</p>
                          <p>• Storage: {p.disk_limit_gb} GB</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                    Billing Cycle
                  </label>
                  <select
                    value={selectedCycle}
                    onChange={(e) => setSelectedCycle(e.target.value as any)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  >
                    <option value="monthly">Monthly Recurring</option>
                    <option value="annual">Annual Prepaid (Discounted)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                    Lifecycle Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  >
                    <option value="active">Active (Normal Operations)</option>
                    <option value="trial">Trial Period</option>
                    <option value="suspended">Suspended (Locked)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-border/40 flex justify-end">
                <Button
                  onClick={() => handleSaveSubscription()}
                  disabled={savingSub}
                  className="rounded-xl px-6 gap-2"
                >
                  {savingSub ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Save Subscription Parameters
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MODULES & FEATURES */}
      {activeTab === "modules" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Feature Modules & Entitlements Matrix</h3>
              <p className="text-xs text-muted-foreground">
                Control individual feature flags for this tenant. Overrides take precedence over default plan entitlements.
              </p>
            </div>
            {savingModules && (
              <span className="flex items-center gap-1.5 text-xs text-primary font-mono">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Saving overrides...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featureCatalog.map((feat) => {
              const isEnabled = Boolean(modulesState[feat.key]);
              const planDefault = Boolean(plan?.features?.[feat.key]);
              const isOverride = isEnabled !== planDefault;

              return (
                <div
                  key={feat.key}
                  className={`rounded-2xl border p-5 transition-all flex items-start justify-between gap-4 ${
                    isEnabled
                      ? "border-primary/30 bg-primary/5"
                      : "border-border/60 bg-card"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground">{feat.label}</h4>
                      {isOverride && (
                        <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-400">
                          Override
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{feat.desc}</p>
                    <div className="pt-2 flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                      <span>Plan default: {planDefault ? "Enabled" : "Disabled"}</span>
                    </div>
                  </div>

                  <Button
                    variant={isEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToggleModule(feat.key)}
                    className="rounded-xl text-xs h-8 px-3 shrink-0"
                  >
                    {isEnabled ? "Enabled" : "Disabled"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: INTEGRATIONS HEALTH */}
      {activeTab === "integrations" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lark Bitable */}
            <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 font-bold">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Lark Open Platform Base</h3>
                    <p className="text-xs text-muted-foreground">Automated bidirectional 2-way sync</p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold ${
                    integrations.lark.connected
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-muted text-muted-foreground"
                  }`}
                >
                  {integrations.lark.connected ? "Connected" : "Disconnected"}
                </Badge>
              </div>

              <div className="space-y-2 rounded-2xl border border-border/40 bg-muted/20 p-4 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lark App ID:</span>
                  <span className="text-foreground">{integrations.lark.app_id || "Not configured"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Webhook Target:</span>
                  <span className="text-foreground">/api/webhooks/lark</span>
                </div>
              </div>
            </div>

            {/* WhatsApp Sidecar */}
            <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 font-bold">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">WhatsApp Multi-Device Gateway</h3>
                    <p className="text-xs text-muted-foreground">Baileys WebSocket Sidecar Service</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                  Operational
                </Badge>
              </div>

              <div className="space-y-2 rounded-2xl border border-border/40 bg-muted/20 p-4 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Channel Limits:</span>
                  <span className="text-foreground">{plan?.whatsapp_channels_limit ?? 1} devices permitted</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">External Connections:</span>
                  <span className="text-foreground">{integrations.connections_count} active webhook pipelines</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT LOGS */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Workspace Audit Trail</h3>
              <p className="text-xs text-muted-foreground">
                Tamper-evident activity log of changes, logins, and administrative actions performed on this tenant.
              </p>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              Latest {recent_logs.length} entries
            </Badge>
          </div>

          <div className="rounded-3xl border border-border/60 bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border/60 bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3.5">Timestamp</th>
                    <th className="px-6 py-3.5">Action</th>
                    <th className="px-6 py-3.5">Module</th>
                    <th className="px-6 py-3.5">IP Address</th>
                    <th className="px-6 py-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {(!recent_logs || recent_logs.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-xs text-muted-foreground">
                        No audit records found for this workspace.
                      </td>
                    </tr>
                  ) : (
                    (recent_logs || []).map((log) => (
                      <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-3.5 font-mono text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-3.5 font-semibold text-foreground text-xs font-mono">
                          {log.action}
                        </td>
                        <td className="px-6 py-3.5">
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {log.module}
                          </Badge>
                        </td>
                        <td className="px-6 py-3.5 font-mono text-xs text-muted-foreground">
                          {log.ip_address || "127.0.0.1"}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase font-bold ${
                              log.status === "success"
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                : "border-destructive/30 bg-destructive/10 text-destructive"
                            }`}
                          >
                            {log.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: DANGER ZONE */}
      {activeTab === "danger" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-destructive/20 text-destructive font-bold">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-destructive">Administrative Danger Zone</h3>
                <p className="text-xs text-muted-foreground">
                  High-impact platform actions affecting tenant accessibility and workspace persistence.
                </p>
              </div>
            </div>

            <div className="space-y-4 divide-y divide-destructive/20">
              {/* Export Snapshot */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Complete Data Dump Export</h4>
                  <p className="text-xs text-muted-foreground">
                    Download an immutable JSON snapshot of all tenant configurations, users, and bank credentials.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportData}
                  className="rounded-xl border-border hover:bg-muted text-xs shrink-0 gap-1.5"
                >
                  <Download className="h-4 w-4" /> Download JSON Dump
                </Button>
              </div>

              {/* Flush Cache */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Flush Redis / Query Cache Memory</h4>
                  <p className="text-xs text-muted-foreground">
                    Clear cached session data and query aggregates for this tenant workspace.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFlushCache}
                  className="rounded-xl border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 text-xs shrink-0 gap-1.5"
                >
                  <RotateCcw className="h-4 w-4" /> Flush Workspace Cache
                </Button>
              </div>

              {/* Suspend / Lock Workspace */}
              {tenant.id !== 1 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4">
                  <div>
                    <h4 className="text-sm font-semibold text-destructive">
                      {tenant.status === "active" ? "Lock Workspace (Suspension)" : "Re-activate Workspace"}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {tenant.status === "active"
                        ? "Prevent all users of this organization from logging in or making API requests."
                        : "Restore full read-write access to all users of this organization."}
                    </p>
                  </div>
                  <Button
                    variant={tenant.status === "active" ? "destructive" : "default"}
                    size="sm"
                    onClick={() => {
                      setSelectedStatus(tenant.status === "active" ? "suspended" : "active");
                      handleSaveSubscription();
                    }}
                    className="rounded-xl text-xs shrink-0 gap-1.5"
                  >
                    {tenant.status === "active" ? (
                      <>
                        <Lock className="h-4 w-4" /> Suspend Workspace
                      </>
                    ) : (
                      <>
                        <Unlock className="h-4 w-4" /> Activate Workspace
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      <Modal
        open={Boolean(resetResult)}
        onOpenChange={(open) => !open && setResetResult(null)}
        title="Temporary Credentials Generated"
        description="A secure one-time password has been assigned to this account. Share it safely with the user."
        size="md"
      >
        {resetResult && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-2">
              <span className="text-xs text-muted-foreground">Target Account:</span>
              <p className="font-mono font-bold text-foreground text-sm">{resetResult.email}</p>
            </div>

            <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 space-y-2">
              <span className="text-xs text-primary font-semibold uppercase tracking-wider">
                Temporary Password
              </span>
              <div className="flex items-center justify-between">
                <code className="font-mono text-base font-bold text-foreground select-all">
                  {resetResult.password}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(resetResult.password);
                    setCopiedPass(true);
                    setTimeout(() => setCopiedPass(false), 3000);
                  }}
                  className="h-8 rounded-lg px-2.5 text-xs gap-1 border-primary/30"
                >
                  {copiedPass ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedPass ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Advise the user to immediately navigate to their profile settings and update their password upon login.
            </p>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setResetResult(null)} className="rounded-xl">
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
