"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bot,
  Zap,
  DollarSign,
  Activity,
  RefreshCw,
  BarChart2,
  Cpu,
  Key,
  Eye,
  EyeOff,
  Settings,
  Plus,
  Trash2,
  Edit3,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Sliders,
  Copy,
  ExternalLink,
  ShieldCheck,
  Check,
  Building2,
  Server,
  Layers,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/apiFetch";

interface ProviderModel {
  id: number;
  name: string;
  cost_tier?: string;
  cost_per_million_input_tokens?: number | null;
  cost_per_million_output_tokens?: number | null;
  pricing_source?: string | null;
  status?: string;
}

interface Provider {
  id: number;
  name: string;
  slug: string;
  provider_type: string;
  base_url?: string;
  status: "active" | "inactive";
  default_model?: string;
  api_key_masked: string;
  last_tested_at?: string | null;
  last_test_status?: string | null;
  last_test_message?: string | null;
  last_used_at?: string | null;
  last_used_model?: string | null;
  timeout_seconds?: number;
  models: ProviderModel[];
}

interface FeatureRoute {
  id?: number;
  feature_name: string;
  feature_label?: string;
  priority: number;
  ai_model_id: number;
  model_name?: string;
  provider_id?: number;
  provider_name?: string;
  timeout_seconds?: number;
  max_tokens?: number;
  is_active?: boolean;
}

interface FeatureRouteGroup {
  feature_name: string;
  feature_label: string;
  routes: FeatureRoute[];
}

interface AiTelemetryData {
  summary: {
    total_tokens_consumed: number;
    prompt_tokens: number;
    completion_tokens: number;
    total_cost_usd: number;
    total_cost_idr: number;
    total_requests: number;
    avg_latency_ms: number;
    success_rate: number;
    active_providers_count: number;
    active_models: string[];
  };
  providers: Provider[];
  models_distribution: Array<{
    model: string;
    provider: string;
    percentage: number;
    tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
    total_calls: number;
    cost_usd: number;
    input_price: number;
    output_price: number;
  }>;
  features_breakdown: Array<{
    function_name: string;
    total_calls: number;
    total_tokens: number;
    total_cost_usd: number;
    avg_latency: number;
  }>;
  tenants: Array<{
    tenant_id: number;
    tenant_name: string;
    plan: string;
    leads_analyzed: number;
    tokens_consumed: number;
    estimated_cost_usd: number;
    budget_cap_usd: number;
    budget_utilization_percent: number;
  }>;
  recent_logs: Array<{
    id: number;
    function_name: string;
    model_name: string;
    provider_name: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost_usd: number;
    cost_converted: number;
    currency_code: string;
    latency_ms: number;
    status: string;
    error_message?: string | null;
    created_at: string;
  }>;
}

interface ProviderFormData {
  id?: number;
  name: string;
  slug: string;
  provider_type: string;
  base_url: string;
  api_key: string;
  default_model: string;
  status: "active" | "inactive";
  timeout_seconds: number;
  retry_limit: number;
}

interface ModelFormData {
  id?: number;
  provider_id: number;
  name: string;
  cost_tier: string;
  cost_per_million_input_tokens: string;
  cost_per_million_output_tokens: string;
  status: string;
}

const emptyProviderForm: ProviderFormData = {
  name: "",
  slug: "",
  provider_type: "byteplus",
  base_url: "https://ark.ap-southeast.bytepluses.com/api/v3",
  api_key: "",
  default_model: "deepseek-v4-1-flash-260910",
  status: "active",
  timeout_seconds: 30,
  retry_limit: 1,
};

const emptyModelForm: ModelFormData = {
  provider_id: 0,
  name: "",
  cost_tier: "medium",
  cost_per_million_input_tokens: "0.10",
  cost_per_million_output_tokens: "0.60",
  status: "active",
};

export default function PlatformAiAccountingPage() {
  const [data, setData] = useState<AiTelemetryData | null>(null);
  const [featureRoutes, setFeatureRoutes] = useState<FeatureRouteGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"telemetry" | "providers" | "routing" | "matrix" | "logs">("telemetry");

  // Modals & form state
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [providerForm, setProviderForm] = useState<ProviderFormData>(emptyProviderForm);
  const [savingProvider, setSavingProvider] = useState(false);

  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [modelForm, setModelForm] = useState<ModelFormData>(emptyModelForm);
  const [savingModel, setSavingModel] = useState(false);

  // Key reveal state
  const [revealedKey, setRevealedKey] = useState<{ providerId: number; key: string } | null>(null);
  const [revealingKeyId, setRevealingKeyId] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Connection test state
  const [testingProviderId, setTestingProviderId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ providerId: number; success: boolean; message: string; latency_ms?: number } | null>(null);

  // Confirm dialogs & toast
  const toast = useToast();
  const [deleteProviderConfirm, setDeleteProviderConfirm] = useState<{ open: boolean; id: number | null; name?: string }>({ open: false, id: null });
  const [deleteModelConfirm, setDeleteModelConfirm] = useState<{ open: boolean; providerId: number | null; modelId: number | null; name?: string }>({ open: false, providerId: null, modelId: null });
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch telemetry & settings
  const fetchAll = useCallback(async () => {
    try {
      const [resTel, resSet] = await Promise.all([
        apiFetch("/api/platform/ai-telemetry"),
        apiFetch("/api/platform/ai-settings"),
      ]);

      if (resTel.ok) {
        const json = await resTel.json();
        setData(json.data);
      }

      if (resSet.ok) {
        const json = await resSet.json();
        if (json.data?.feature_routes) {
          setFeatureRoutes(json.data.feature_routes);
        }
      }
    } catch (e) {
      console.error("Failed to load AI platform telemetry/settings:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Provider Actions
  const handleSaveProvider = async () => {
    setSavingProvider(true);
    try {
      const isEdit = Boolean(providerForm.id);
      const url = isEdit
        ? `/api/platform/ai-settings/providers/${providerForm.id}`
        : "/api/platform/ai-settings/providers";
      const method = isEdit ? "PUT" : "POST";

      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(providerForm),
      });

      if (res.ok) {
        setProviderModalOpen(false);
        setProviderForm(emptyProviderForm);
        toast.success(isEdit ? "AI provider updated successfully." : "AI provider created successfully.");
        fetchAll();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to save AI provider.");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error saving provider.");
    } finally {
      setSavingProvider(false);
    }
  };

  const handleDeleteProvider = (id: number, name?: string) => {
    setDeleteProviderConfirm({ open: true, id, name });
  };

  const confirmDeleteProvider = async () => {
    if (!deleteProviderConfirm.id) return;
    setIsDeleting(true);
    try {
      const res = await apiFetch(`/api/platform/ai-settings/providers/${deleteProviderConfirm.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("AI provider deleted successfully.");
        setDeleteProviderConfirm({ open: false, id: null });
        fetchAll();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to delete AI provider.");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error deleting provider.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTestConnection = async (provider: Provider) => {
    setTestingProviderId(provider.id);
    setTestResult(null);
    try {
      const res = await apiFetch(`/api/platform/ai-settings/providers/${provider.id}/test`, { method: "POST" });
      const json = await res.json();
      setTestResult({
        providerId: provider.id,
        success: json.success ?? false,
        message: json.message || (json.success ? "Connection operational" : "Connection failed"),
        latency_ms: json.latency_ms,
      });
      fetchAll();
    } catch (e: any) {
      setTestResult({
        providerId: provider.id,
        success: false,
        message: e.message || "Failed to reach AI provider endpoint",
      });
    } finally {
      setTestingProviderId(null);
    }
  };

  const handleRevealKey = async (providerId: number) => {
    if (revealedKey?.providerId === providerId) {
      setRevealedKey(null);
      return;
    }
    setRevealingKeyId(providerId);
    try {
      const res = await apiFetch(`/api/platform/ai-settings/providers/${providerId}/reveal-key`, { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        setRevealedKey({ providerId, key: json.data?.api_key || "" });
      }
    } catch (e) {
      console.error("Failed to reveal key:", e);
    } finally {
      setRevealingKeyId(null);
    }
  };

  const handleSaveModel = async () => {
    setSavingModel(true);
    try {
      const isEdit = Boolean(modelForm.id);
      const url = isEdit
        ? `/api/platform/ai-settings/providers/${modelForm.provider_id}/models/${modelForm.id}`
        : `/api/platform/ai-settings/providers/${modelForm.provider_id}/models`;
      const method = isEdit ? "PUT" : "POST";

      const payload = {
        name: modelForm.name,
        cost_tier: modelForm.cost_tier,
        status: modelForm.status,
        cost_per_million_input_tokens: modelForm.cost_per_million_input_tokens ? parseFloat(modelForm.cost_per_million_input_tokens) : null,
        cost_per_million_output_tokens: modelForm.cost_per_million_output_tokens ? parseFloat(modelForm.cost_per_million_output_tokens) : null,
      };

      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setModelModalOpen(false);
        setModelForm(emptyModelForm);
        toast.success(isEdit ? "AI model updated successfully." : "AI model created successfully.");
        fetchAll();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to save model.");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error saving model.");
    } finally {
      setSavingModel(false);
    }
  };

  const handleDeleteModel = (providerId: number, modelId: number, name?: string) => {
    setDeleteModelConfirm({ open: true, providerId, modelId, name });
  };

  const confirmDeleteModel = async () => {
    if (!deleteModelConfirm.providerId || !deleteModelConfirm.modelId) return;
    setIsDeleting(true);
    try {
      const res = await apiFetch(`/api/platform/ai-settings/providers/${deleteModelConfirm.providerId}/models/${deleteModelConfirm.modelId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("AI model deleted successfully.");
        setDeleteModelConfirm({ open: false, providerId: null, modelId: null });
        fetchAll();
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to delete model.");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error deleting model.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper formatting
  const formatTokens = (tokens: number) => {
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2)}M`;
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
    return tokens.toLocaleString();
  };

  const primaryProvider = data?.providers?.[0];
  const primaryModel = data?.models_distribution?.[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              AI Cost Accounting & LLM Control Center
            </h1>
            <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-semibold">
              Platform Master Control
            </Badge>
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-semibold">
              Live Telemetry
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Centralized LLM unit economics, provider credentials, model token pricing rates ($/1M), and platform-wide workload routing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRefreshing(true);
              fetchAll();
            }}
            disabled={refreshing}
            className="h-8 gap-1.5 rounded-lg border-slate-700 bg-slate-900/80 text-xs text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
            <span>Sync Live Telemetry</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setProviderForm(emptyProviderForm);
              setProviderModalOpen(true);
            }}
            className="h-8 gap-1.5 rounded-lg bg-cyan-500 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Provider</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          items={[
            { key: "telemetry", label: "Accounting & Token Economics", icon: Activity },
            { key: "providers", label: "Providers & Model Pricing Rates", icon: Cpu },
            { key: "routing", label: "Capability & Model Routing", icon: Sliders },
            { key: "matrix", label: "Tenants & Quota Ceilings", icon: Building2 },
            { key: "logs", label: "Live Execution Logs", icon: Zap },
          ]}
        />
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-cyan-500" />
        </div>
      ) : (
        <>
          {/* TAB 1: TELEMETRY & UNIT ECONOMICS */}
          {activeTab === "telemetry" && (
            <div className="space-y-6">
              {/* Active Engine Card */}
              <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                        Active Production AI Engine
                      </span>
                      <Badge variant="outline" className="border-slate-700 bg-slate-800 text-[10px] text-slate-300">
                        {primaryProvider?.name ?? "BytePlus ModelArk"}
                      </Badge>
                    </div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>Model:</span>
                      <span className="font-mono text-cyan-300">
                        {primaryProvider?.default_model || primaryModel?.model || "deepseek-v4-1-flash-260910"}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Base Endpoint: <span className="font-mono text-slate-300">{primaryProvider?.base_url ?? "https://ark.ap-southeast.bytepluses.com/api/v3"}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-center">
                      <span className="text-[10px] uppercase text-slate-400">Input Token Rate</span>
                      <p className="font-mono text-sm font-bold text-emerald-400">
                        ${primaryModel?.input_price ?? 0.10} / 1M
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-center">
                      <span className="text-[10px] uppercase text-slate-400">Output Token Rate</span>
                      <p className="font-mono text-sm font-bold text-cyan-400">
                        ${primaryModel?.output_price ?? 0.60} / 1M
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-center">
                      <span className="text-[10px] uppercase text-slate-400">Connection Health</span>
                      <p className="font-mono text-sm font-bold text-emerald-400 flex items-center justify-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>{primaryProvider?.last_test_status === "success" ? "Verified" : "Active"}</span>
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab("providers")}
                      className="rounded-lg border-cyan-500/40 bg-cyan-500/10 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20"
                    >
                      <Settings className="mr-1.5 h-3.5 w-3.5" />
                      Configure Pricing & Engine
                    </Button>
                  </div>
                </div>
              </div>

              {/* Summary KPI Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-medium uppercase tracking-wider">Total Tokens Consumed</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                      <Zap className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-2xl font-bold text-white font-mono">
                    {formatTokens(data?.summary.total_tokens_consumed ?? 0)}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>In: {formatTokens(data?.summary.prompt_tokens ?? 0)}</span>
                    <span>Out: {formatTokens(data?.summary.completion_tokens ?? 0)}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-medium uppercase tracking-wider">Platform LLM Spend</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                      <DollarSign className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-2xl font-bold text-white font-mono">
                    ${data?.summary.total_cost_usd.toFixed(4) ?? "0.0000"}
                  </p>
                  <p className="mt-1 text-xs text-emerald-400 font-mono">
                    ≈ Rp {(data?.summary.total_cost_idr ?? 0).toLocaleString("id-ID")} IDR
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-medium uppercase tracking-wider">Total Invocations</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                      <Activity className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-2xl font-bold text-white font-mono">
                    {data?.summary.total_requests.toLocaleString() ?? 0} calls
                  </p>
                  <p className="mt-1 text-xs text-indigo-300 font-mono">
                    {data?.summary.success_rate ?? 100}% Success Rate
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-medium uppercase tracking-wider">Response Latency</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                      <Cpu className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="mt-3 text-2xl font-bold text-white font-mono">
                    {((data?.summary.avg_latency_ms ?? 0) / 1000).toFixed(2)}s avg
                  </p>
                  <p className="mt-1 text-xs text-purple-300">
                    {data?.providers.length ?? 1} Provider ({data?.summary.active_models.length ?? 1} Models)
                  </p>
                </div>
              </div>

              {/* Models Workload Distribution */}
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-cyan-400" />
                  LLM Model Workload & Unit Economics
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data?.models_distribution.map((m) => (
                    <div key={m.model} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-mono font-bold text-white">{m.model}</span>
                          <span className="block text-[10px] text-slate-400">{m.provider}</span>
                        </div>
                        <Badge variant="outline" className="border-cyan-500/30 text-cyan-300 text-[10px]">
                          {m.percentage}% share
                        </Badge>
                      </div>

                      <div className="mt-3 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                          style={{ width: `${Math.max(5, m.percentage)}%` }}
                        />
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 border-t border-slate-800/60 pt-2">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Tokens:</span>
                          <span className="text-slate-200 font-semibold">{formatTokens(m.tokens)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Total Spend:</span>
                          <span className="text-emerald-400 font-semibold">${m.cost_usd.toFixed(4)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">In Rate:</span>
                          <span>${m.input_price}/M</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Out Rate:</span>
                          <span>${m.output_price}/M</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feature / Capability Token Breakdown */}
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-indigo-400" />
                    Capability & System Feature Token Consumption
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Which features in Leadsy (Lead Scoring, BANTC Guide, Meeting Summary, Product Matching) consume the most LLM capacity.
                  </p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Feature Name / Action</th>
                        <th className="px-4 py-3">Total Invocations</th>
                        <th className="px-4 py-3">Tokens Consumed</th>
                        <th className="px-4 py-3">Total Spend (USD)</th>
                        <th className="px-4 py-3">Avg Latency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {data?.features_breakdown.map((f) => (
                        <tr key={f.function_name} className="hover:bg-slate-800/30">
                          <td className="px-4 py-3 font-sans">
                            <span className="font-semibold text-white">{f.function_name}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-300">{f.total_calls.toLocaleString()}</td>
                          <td className="px-4 py-3 text-cyan-300 font-semibold">{formatTokens(f.total_tokens)}</td>
                          <td className="px-4 py-3 text-emerald-400 font-semibold">${f.total_cost_usd.toFixed(4)}</td>
                          <td className="px-4 py-3 text-slate-400">{(f.avg_latency / 1000).toFixed(2)}s</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROVIDERS & MODEL PRICING RATES (SETTINGS) */}
          {activeTab === "providers" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">LLM Provider Registry & Vendor Credentials</h2>
                  <p className="text-xs text-slate-400">
                    Configure upstream API keys, base endpoints, connection testing, and exact pricing rates ($/1M tokens) to reflect vendor costs accurately.
                  </p>
                </div>

                <Button
                  onClick={() => {
                    setProviderForm(emptyProviderForm);
                    setProviderModalOpen(true);
                  }}
                  className="bg-cyan-500 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Provider
                </Button>
              </div>

              {testResult && (
                <div
                  className={`rounded-xl border p-4 text-xs flex items-center justify-between ${
                    testResult.success
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      : "border-red-500/40 bg-red-500/10 text-red-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {testResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    <span>{testResult.message}</span>
                    {testResult.latency_ms && <span className="font-mono">({testResult.latency_ms}ms)</span>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setTestResult(null)} className="h-6 text-[10px]">
                    Dismiss
                  </Button>
                </div>
              )}

              <div className="space-y-4">
                {data?.providers.map((p) => {
                  const isKeyRevealed = revealedKey?.providerId === p.id;
                  const isTesting = testingProviderId === p.id;

                  return (
                    <div key={p.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-slate-800/80 pb-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                              <Bot className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-white">{p.name}</h3>
                                <Badge variant="outline" className="border-slate-700 bg-slate-800 text-[10px] uppercase text-slate-300">
                                  {p.provider_type}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${
                                    p.status === "active"
                                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                                      : "border-slate-700 bg-slate-800 text-slate-400"
                                  }`}
                                >
                                  {p.status}
                                </Badge>
                              </div>
                              <p className="text-xs font-mono text-slate-400">{p.base_url}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isTesting}
                            onClick={() => handleTestConnection(p)}
                            className="h-8 border-slate-700 bg-slate-800/80 text-xs text-slate-200 hover:bg-slate-700 hover:text-white"
                          >
                            <Activity className={`mr-1.5 h-3.5 w-3.5 ${isTesting ? "animate-spin text-cyan-400" : ""}`} />
                            <span>{isTesting ? "Testing Ping..." : "Test Health"}</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setProviderForm({
                                id: p.id,
                                name: p.name,
                                slug: p.slug,
                                provider_type: p.provider_type,
                                base_url: p.base_url || "",
                                api_key: "",
                                default_model: p.default_model || "",
                                status: p.status,
                                timeout_seconds: p.timeout_seconds || 30,
                                retry_limit: 1,
                              });
                              setProviderModalOpen(true);
                            }}
                            className="h-8 border-slate-700 bg-slate-800/80 text-xs text-slate-200 hover:bg-slate-700 hover:text-white"
                          >
                            <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                            <span>Edit</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteProvider(p.id, p.name)}
                            className="h-8 border-red-500/30 bg-red-500/10 text-xs text-red-400 hover:bg-red-500/20"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* API Key credential banner */}
                      <div className="my-4 flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3 sm:flex-row sm:items-center sm:justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Key className="h-4 w-4 text-amber-400 shrink-0" />
                          <span className="text-slate-400">API Key:</span>
                          <span className="font-mono text-slate-200">
                            {isKeyRevealed ? revealedKey?.key : p.api_key_masked}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={revealingKeyId === p.id}
                            onClick={() => handleRevealKey(p.id)}
                            className="h-7 text-xs text-slate-300 hover:text-white"
                          >
                            {isKeyRevealed ? <EyeOff className="mr-1 h-3.5 w-3.5" /> : <Eye className="mr-1 h-3.5 w-3.5" />}
                            <span>{isKeyRevealed ? "Hide Key" : "Reveal Key"}</span>
                          </Button>

                          {isKeyRevealed && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(revealedKey?.key || "");
                                setCopiedKey(true);
                                setTimeout(() => setCopiedKey(false), 2000);
                              }}
                              className="h-7 text-xs text-cyan-400 hover:text-cyan-300"
                            >
                              {copiedKey ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
                              <span>{copiedKey ? "Copied" : "Copy"}</span>
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Models List for this provider */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                            Configured Models & Token Pricing Rates ({p.models.length})
                          </h4>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setModelForm({
                                ...emptyModelForm,
                                provider_id: p.id,
                              });
                              setModelModalOpen(true);
                            }}
                            className="h-7 border-slate-700 bg-slate-800 text-[11px] text-slate-300 hover:text-white"
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            <span>Add Model & Rate</span>
                          </Button>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-slate-800">
                          <table className="w-full text-left text-xs">
                            <thead className="border-b border-slate-800 bg-slate-950/80 text-[10px] font-semibold uppercase text-slate-400">
                              <tr>
                                <th className="px-4 py-2.5">Model Name</th>
                                <th className="px-4 py-2.5">Input Cost / 1M Tokens</th>
                                <th className="px-4 py-2.5">Output Cost / 1M Tokens</th>
                                <th className="px-4 py-2.5">Pricing Basis</th>
                                <th className="px-4 py-2.5">Status</th>
                                <th className="px-4 py-2.5 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 font-mono">
                              {p.models.map((m) => (
                                <tr key={m.id} className="hover:bg-slate-800/30">
                                  <td className="px-4 py-2.5 font-bold text-white font-sans flex items-center gap-1.5">
                                    <span>{m.name}</span>
                                    {p.default_model === m.name && (
                                      <Badge variant="outline" className="border-cyan-500/40 bg-cyan-500/10 text-[9px] text-cyan-300 font-sans">
                                        Default
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 text-emerald-400 font-semibold">
                                    ${m.cost_per_million_input_tokens ?? 0.10} / 1M
                                  </td>
                                  <td className="px-4 py-2.5 text-cyan-400 font-semibold">
                                    ${m.cost_per_million_output_tokens ?? 0.60} / 1M
                                  </td>
                                  <td className="px-4 py-2.5 text-slate-400">
                                    {m.pricing_source === "manual" ? "Operator Configured" : "Default Rate"}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400">
                                      {m.status || "active"}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-sans">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setModelForm({
                                            id: m.id,
                                            provider_id: p.id,
                                            name: m.name,
                                            cost_tier: m.cost_tier || "medium",
                                            cost_per_million_input_tokens: m.cost_per_million_input_tokens?.toString() ?? "0.10",
                                            cost_per_million_output_tokens: m.cost_per_million_output_tokens?.toString() ?? "0.60",
                                            status: m.status || "active",
                                          });
                                          setModelModalOpen(true);
                                        }}
                                        className="h-6 px-2 text-[10px] text-slate-300 hover:text-white"
                                      >
                                        Edit Price
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteModel(p.id, m.id, m.name)}
                                        className="h-6 px-2 text-[10px] text-red-400 hover:text-red-300"
                                      >
                                        Delete
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
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: CAPABILITY & MODEL ROUTING (SETTINGS) */}
          {activeTab === "routing" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-white">Capability & Model Routing Policy</h2>
                <p className="text-xs text-slate-400">
                  Assign primary and fallback AI engines to each Leadsy workflow module (Lead Qualification, Meeting Summaries, WhatsApp Auto-Reply).
                </p>
              </div>

              <div className="space-y-4">
                {featureRoutes.map((group) => (
                  <div key={group.feature_name} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-white">{group.feature_label || group.feature_name}</h4>
                        <span className="text-[10px] font-mono text-slate-400">{group.feature_name}</span>
                      </div>
                      <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-[10px]">
                        {group.routes.length} Active Route(s)
                      </Badge>
                    </div>

                    <div className="mt-3 space-y-2">
                      {group.routes.map((route, idx) => (
                        <div
                          key={route.id || idx}
                          className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 px-4 py-2.5 text-xs font-mono"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-cyan-400">
                              #{route.priority}
                            </span>
                            <div>
                              <span className="font-bold text-white">{route.model_name || "DeepSeek V4.1 Flash"}</span>
                              <span className="text-slate-400 ml-2">({route.provider_name || "BytePlus ModelArk"})</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-slate-400 font-sans">
                            <span>Timeout: {route.timeout_seconds || 30}s</span>
                            <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400">
                              Primary Engine
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: TENANTS & QUOTA MATRIX */}
          {activeTab === "matrix" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-indigo-400" />
                    Tenant Token Usage & Budget Ceiling Matrix
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Track AI expenditure per workspace to prevent budget overruns and guarantee healthy gross margins.
                  </p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Tenant Workspace</th>
                        <th className="px-4 py-3">Subscription Tier</th>
                        <th className="px-4 py-3">Leads Processed</th>
                        <th className="px-4 py-3">Tokens Consumed</th>
                        <th className="px-4 py-3">Platform Cost</th>
                        <th className="px-4 py-3">Budget Cap</th>
                        <th className="px-4 py-3">Utilization</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {data?.tenants.map((t) => (
                        <tr key={t.tenant_id} className="hover:bg-slate-800/30">
                          <td className="px-4 py-3 font-sans">
                            <div className="font-semibold text-white">{t.tenant_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">Tenant #{t.tenant_id}</div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-[10px] uppercase border-slate-700 bg-slate-800/50">
                              {t.plan}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-slate-300">{t.leads_analyzed}</td>
                          <td className="px-4 py-3 text-cyan-300 font-semibold">
                            {formatTokens(t.tokens_consumed)}
                          </td>
                          <td className="px-4 py-3 text-emerald-400 font-semibold">
                            ${t.estimated_cost_usd.toFixed(4)}
                          </td>
                          <td className="px-4 py-3 text-slate-400">
                            ${t.budget_cap_usd.toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-24 rounded-full bg-slate-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    t.budget_utilization_percent > 80
                                      ? "bg-red-500"
                                      : t.budget_utilization_percent > 50
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${Math.max(3, t.budget_utilization_percent)}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-300">
                                {t.budget_utilization_percent}%
                              </span>
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

          {/* TAB 5: LIVE LOGS STREAM */}
          {activeTab === "logs" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-cyan-400" />
                    Live AI Request Execution Stream
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Latest AI transactions executed across all tenant workspaces with exact tokens and latency.
                  </p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Action / Feature</th>
                        <th className="px-4 py-3">Model</th>
                        <th className="px-4 py-3">Tokens (In / Out)</th>
                        <th className="px-4 py-3">Latency</th>
                        <th className="px-4 py-3">Spend (USD / IDR)</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {data?.recent_logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/30">
                          <td className="px-4 py-3 text-[11px] text-slate-400 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </td>
                          <td className="px-4 py-3 font-sans">
                            <span className="font-semibold text-white block">{log.function_name}</span>
                            <span className="text-[10px] font-mono text-slate-400">{log.provider_name}</span>
                          </td>
                          <td className="px-4 py-3 text-cyan-300">{log.model_name}</td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-white">{formatTokens(log.total_tokens)}</span>
                            <span className="text-[10px] text-slate-400 block font-sans">
                              {log.prompt_tokens} in / {log.completion_tokens} out
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-300">{(log.latency_ms / 1000).toFixed(2)}s</td>
                          <td className="px-4 py-3 font-semibold text-emerald-400">
                            ${log.cost_usd.toFixed(6)}
                            <span className="block text-[10px] text-slate-400">Rp {log.cost_converted}</span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className={`text-[9px] ${
                                log.status === "success"
                                  ? "border-emerald-500/30 text-emerald-400"
                                  : "border-red-500/30 text-red-400"
                              }`}
                            >
                              {log.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL: ADD / EDIT PROVIDER */}
      <Modal
        open={providerModalOpen}
        onOpenChange={setProviderModalOpen}
        title={providerForm.id ? "Edit AI Provider" : "Add AI Provider"}
        description="Configure provider API credentials, base endpoint, and default model for platform AI operations."
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setProviderModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={savingProvider}
              onClick={handleSaveProvider}
              className="bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400"
            >
              {savingProvider ? "Saving..." : "Save Provider"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300">Provider Display Name</label>
              <Input
                value={providerForm.name}
                onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
                placeholder="e.g. BytePlus ModelArk"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300">Slug</label>
              <Input
                value={providerForm.slug}
                onChange={(e) => setProviderForm({ ...providerForm, slug: e.target.value })}
                placeholder="e.g. byteplus"
                className="mt-1 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300">Provider Engine Type</label>
              <Select
                value={providerForm.provider_type}
                onChange={(e) => setProviderForm({ ...providerForm, provider_type: e.target.value })}
                className="mt-1"
              >
                <option value="byteplus">BytePlus ModelArk (DeepSeek)</option>
                <option value="openai">OpenAI Official</option>
                <option value="anthropic">Anthropic Claude</option>
                <option value="gemini">Google Gemini</option>
                <option value="openrouter">OpenRouter AI Gateway</option>
                <option value="groq">Groq LPU</option>
                <option value="custom">Custom Compatible API</option>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Default Model</label>
              <Input
                value={providerForm.default_model}
                onChange={(e) => setProviderForm({ ...providerForm, default_model: e.target.value })}
                placeholder="e.g. deepseek-v4-1-flash-260910"
                className="mt-1 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300">Base API URL</label>
            <Input
              value={providerForm.base_url}
              onChange={(e) => setProviderForm({ ...providerForm, base_url: e.target.value })}
              placeholder="https://ark.ap-southeast.bytepluses.com/api/v3"
              className="mt-1 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300">
              API Key {providerForm.id && <span className="text-slate-400 font-normal">(Leave blank to keep unchanged)</span>}
            </label>
            <Input
              type="password"
              value={providerForm.api_key}
              onChange={(e) => setProviderForm({ ...providerForm, api_key: e.target.value })}
              placeholder="Enter vendor API secret key"
              className="mt-1 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300">Timeout (Seconds)</label>
              <Input
                type="number"
                value={providerForm.timeout_seconds}
                onChange={(e) => setProviderForm({ ...providerForm, timeout_seconds: parseInt(e.target.value) || 30 })}
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300">Operational Status</label>
              <Select
                value={providerForm.status}
                onChange={(e) => setProviderForm({ ...providerForm, status: e.target.value as any })}
                className="mt-1"
              >
                <option value="active">Active (Operational)</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL: ADD / EDIT MODEL & PRICING RATE */}
      <Modal
        open={modelModalOpen}
        onOpenChange={setModelModalOpen}
        title={modelForm.id ? "Edit Model Token Pricing" : "Add Model & Pricing Rate"}
        description="Set exact token pricing rates ($/1M tokens) so platform LLM accounting reflects your vendor invoice."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setModelModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={savingModel}
              onClick={handleSaveModel}
              className="bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400"
            >
              {savingModel ? "Saving..." : "Save Pricing Rate"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-semibold text-slate-300">Model Name / ID</label>
            <Input
              value={modelForm.name}
              onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })}
              placeholder="e.g. deepseek-v4-1-flash-260910"
              className="mt-1 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300">Input Cost ($ / 1M Tokens)</label>
              <Input
                type="number"
                step="0.01"
                value={modelForm.cost_per_million_input_tokens}
                onChange={(e) => setModelForm({ ...modelForm, cost_per_million_input_tokens: e.target.value })}
                placeholder="0.10"
                className="mt-1 font-mono"
              />
              <span className="text-[10px] text-slate-400">Prompt tokens</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Output Cost ($ / 1M Tokens)</label>
              <Input
                type="number"
                step="0.01"
                value={modelForm.cost_per_million_output_tokens}
                onChange={(e) => setModelForm({ ...modelForm, cost_per_million_output_tokens: e.target.value })}
                placeholder="0.60"
                className="mt-1 font-mono"
              />
              <span className="text-[10px] text-slate-400">Completion tokens</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300">Cost Tier</label>
              <Select
                value={modelForm.cost_tier}
                onChange={(e) => setModelForm({ ...modelForm, cost_tier: e.target.value })}
                className="mt-1"
              >
                <option value="low">Low Cost (Flash / Mini)</option>
                <option value="medium">Medium Cost (Standard)</option>
                <option value="high">High Cost (Flagship / Reasoning)</option>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Status</label>
              <Select
                value={modelForm.status}
                onChange={(e) => setModelForm({ ...modelForm, status: e.target.value })}
                className="mt-1"
              >
                <option value="active">Active</option>
                <option value="deprecated">Deprecated</option>
              </Select>
            </div>
          </div>
        </div>
      </Modal>

      {/* Confirm Provider Delete Dialog */}
      <ConfirmDialog
        open={deleteProviderConfirm.open}
        onOpenChange={(open) => setDeleteProviderConfirm((prev) => ({ ...prev, open }))}
        title="Delete AI Provider"
        description={
          <span>
            Are you sure you want to delete <strong>{deleteProviderConfirm.name || "this provider"}</strong>? Models and assigned routes may be affected. This action cannot be undone.
          </span>
        }
        confirmLabel="Delete Provider"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={confirmDeleteProvider}
      />

      {/* Confirm Model Delete Dialog */}
      <ConfirmDialog
        open={deleteModelConfirm.open}
        onOpenChange={(open) => setDeleteModelConfirm((prev) => ({ ...prev, open }))}
        title="Delete AI Model"
        description={
          <span>
            Are you sure you want to delete <strong>{deleteModelConfirm.name || "this model"}</strong>? Any routes utilizing this model will need to be reconfigured.
          </span>
        }
        confirmLabel="Delete Model"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={confirmDeleteModel}
      />
    </div>
  );
}
