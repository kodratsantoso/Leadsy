"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Eye,
  EyeOff,
  FileText,
  GitBranch,
  Loader2,
  Pencil,
  Plus,
  Save,
  Sparkles,
  TestTube2,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/apiFetch";
import { useNumberFormat } from "@/lib/hooks/use-number-format";
import { cn } from "@/lib/utils";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type ProviderModel = {
  id: number;
  name: string;
  cost_tier?: string;
  status?: string;
};

type Provider = {
  id: number;
  name: string;
  slug: string;
  provider_type: string;
  base_url?: string | null;
  organization_id?: string | null;
  project_id?: string | null;
  default_model?: string | null;
  status: "active" | "inactive";
  enabled: boolean;
  last_tested_at?: string | null;
  last_test_status?: string | null;
  last_used_at?: string | null;
  last_used_model?: string | null;
  api_key_masked: string;
  api_key_visibility_mode: string;
  can_reveal_key: boolean;
  timeout_seconds?: number | null;
  retry_limit?: number | null;
  max_tokens_default?: number | null;
  cache_ttl_minutes?: number | null;
  cost_sensitivity?: string | null;
  models: ProviderModel[];
};

type FeatureCatalogItem = { key: string; label: string };

type FeatureRoute = {
  id?: number;
  feature_name: string;
  priority: number;
  ai_model_id: number;
  provider_name?: string | null;
  model_name?: string | null;
  timeout_seconds?: number | null;
  max_retries?: number | null;
  cache_ttl_minutes?: number | null;
  max_tokens?: number | null;
  complexity_mode?: string | null;
  cost_sensitivity?: string | null;
  is_active?: boolean;
};

type FeatureRouteGroup = {
  feature_name: string;
  routes: FeatureRoute[];
};

type PromptVersion = {
  id: number;
  feature_name?: string | null;
  version: number;
  content: string | null;
  system_prompt?: string | null;
  user_prompt?: string | null;
  output_contract_json?: any | null;
  variables_schema_json?: any | null;
  is_active: boolean;
  created_at?: string | null;
  activated_at?: string | null;
};

type PromptTemplate = {
  id: number;
  feature_name: string;
  template_name: string;
  description?: string | null;
  active_version?: PromptVersion | null;
  versions: PromptVersion[];
};

type UsageOverview = {
  summary: {
    total_calls: number;
    total_cost_usd: number;
    total_cost_converted?: number;
    is_converted?: boolean;
    currency_code?: string;
    success_rate: number | null;
    avg_latency_ms: number | null;
    fallback_count: number;
    has_data: boolean;
    last_used_provider?: string | null;
    last_used_model?: string | null;
    last_used_at?: string | null;
  };
  per_provider: {
    provider_id: number;
    provider_name: string;
    total_calls: number;
    total_cost_usd: number;
    total_cost_converted?: number;
    avg_latency_ms: number | null;
    success_rate: number | null;
    fallback_count: number;
    last_used_at?: string | null;
  }[];
  daily_timeline?: {
    date: string;
    total_calls: number;
    total_cost_usd: number;
    total_cost_converted: number;
  }[];
};

type HealthItem = {
  provider_id: number;
  provider_name: string;
  enabled: boolean;
  last_test_status?: string | null;
  last_tested_at?: string | null;
  last_used_at?: string | null;
  last_used_model?: string | null;
};

type AiSettingsResponse = {
  data: {
    providers: Provider[];
    feature_catalog: FeatureCatalogItem[];
    feature_routes: FeatureRouteGroup[];
    prompt_templates: PromptTemplate[];
    usage_overview: UsageOverview;
    provider_health: HealthItem[];
    permissions: {
      can_manage_ai: boolean;
      can_reveal_secrets: boolean;
    };
  };
};

type ProviderFormState = {
  id?: number;
  name: string;
  slug: string;
  provider_type: string;
  base_url: string;
  api_key: string;
  organization_id: string;
  project_id: string;
  default_model: string;
  status: "active" | "inactive";
  timeout_seconds: string;
  retry_limit: string;
  max_tokens_default: string;
  cache_ttl_minutes: string;
  cost_sensitivity: string;
};

type RouteDraftState = Record<
  string,
  {
    priority: number;
    ai_model_id: string;
    timeout_seconds: string;
    max_retries: string;
    cache_ttl_minutes: string;
    max_tokens: string;
    complexity_mode: string;
    cost_sensitivity: string;
    is_active: boolean;
  }[]
>;

const tabs = [
  { key: "providers", label: "Providers", icon: Bot },
  { key: "routing", label: "Feature Routing", icon: GitBranch },
  { key: "prompts", label: "Prompt Templates", icon: FileText },
  { key: "usage", label: "Usage & Health", icon: Activity },
] as const;

const emptyProviderForm: ProviderFormState = {
  name: "",
  slug: "",
  provider_type: "openai",
  base_url: "",
  api_key: "",
  organization_id: "",
  project_id: "",
  default_model: "",
  status: "inactive",
  timeout_seconds: "30",
  retry_limit: "1",
  max_tokens_default: "",
  cache_ttl_minutes: "",
  cost_sensitivity: "balanced",
};

function fmtDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function providerBadge(status?: string | null) {
  if (status === "success") return "success";
  if (status === "failed") return "danger";
  return "neutral";
}

export default function AiDefaultsPage() {
  const queryClient = useQueryClient();
  const { formatNumber, formatCurrency } = useNumberFormat();
  const [timelineFilter, setTimelineFilter] = useState("last_30_days");
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("providers");
  const [expandedProviderId, setExpandedProviderId] = useState<number | null>(null);
  const [providerForm, setProviderForm] = useState<ProviderFormState>(emptyProviderForm);
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [providerError, setProviderError] = useState("");
  const [revealedKeys, setRevealedKeys] = useState<Record<number, string>>({});
  const [routeDrafts, setRouteDrafts] = useState<RouteDraftState>({});
  const [activePromptFeature, setActivePromptFeature] = useState("");
  const [promptEditor, setPromptEditor] = useState("");
  const [systemPromptEditor, setSystemPromptEditor] = useState("");
  const [userPromptEditor, setUserPromptEditor] = useState("");
  const [outputContractEditor, setOutputContractEditor] = useState("");
  const [variablesSchemaEditor, setVariablesSchemaEditor] = useState("");
  const [promptDescription, setPromptDescription] = useState("");
  const [sampleInput, setSampleInput] = useState("Sample lead data:\n- Company: PT Nusantara Digital\n- Industry: Manufacturing\n- Need: CRM modernization");
  const [compiledPrompt, setCompiledPrompt] = useState("");
  const [addingModelFor, setAddingModelFor] = useState<number | null>(null);
  const [newModelName, setNewModelName] = useState("");
  const [newModelTier, setNewModelTier] = useState("medium");

  const { data, isLoading, error } = useQuery({
    queryKey: ["settings-ai-default", timelineFilter],
    queryFn: async () => {
      const response = await apiFetch(`/settings/ai-default?period=${timelineFilter}`);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Unable to load AI settings");
      }
      return (await response.json()) as AiSettingsResponse;
    },
  });

  const providers = data?.data.providers ?? [];
  const featureCatalog = data?.data.feature_catalog ?? [];
  const featureRoutes = data?.data.feature_routes ?? [];
  const promptTemplates = data?.data.prompt_templates ?? [];
  const usageOverview = data?.data.usage_overview;
  const providerHealth = data?.data.provider_health ?? [];

  const modelOptions = useMemo(
    () =>
      providers.flatMap((provider) =>
        provider.models
          .filter((model) => model.status !== "deprecated")
          .map((model) => ({
            value: String(model.id),
            label: `${provider.name} — ${model.name}`,
          }))
      ),
    [providers]
  );

  useEffect(() => {
    if (!featureCatalog.length) return;

    setRouteDrafts(() => {
      const next: RouteDraftState = {};

      const existing = featureRoutes.find((item) => item.feature_name === "global")?.routes ?? [];
      next["global"] = Array.from({ length: 10 }, (_, index) => {
        const route = existing.find((item) => item.priority === index + 1);
        return {
          priority: index + 1,
          ai_model_id: route?.ai_model_id ? String(route.ai_model_id) : "",
          timeout_seconds: String(route?.timeout_seconds ?? 30),
          max_retries: String(route?.max_retries ?? 1),
          cache_ttl_minutes: route?.cache_ttl_minutes ? String(route.cache_ttl_minutes) : "",
          max_tokens: route?.max_tokens ? String(route.max_tokens) : "",
          complexity_mode: route?.complexity_mode ?? "standard",
          cost_sensitivity: route?.cost_sensitivity ?? "balanced",
          is_active: route?.is_active ?? true,
        };
      });

      return next;
    });
  }, [featureCatalog, featureRoutes]);

  useEffect(() => {
    if (!promptTemplates.length) return;
    if (!activePromptFeature) {
      const firstFeature = promptTemplates[0]?.feature_name ?? "";
      setActivePromptFeature(firstFeature);
    }
  }, [promptTemplates, activePromptFeature]);

  const selectedPromptTemplate = promptTemplates.find((item) => item.feature_name === activePromptFeature);

  useEffect(() => {
    if (activePromptFeature && promptTemplates.length) {
      const template = promptTemplates.find((t) => t.feature_name === activePromptFeature);
      if (template) {
        setPromptDescription(template.description || "");
        setPromptEditor(template.active_version?.content || "");
        setSystemPromptEditor(template.active_version?.system_prompt || "");
        setUserPromptEditor(template.active_version?.user_prompt || "");
        setOutputContractEditor(template.active_version?.output_contract_json ? JSON.stringify(template.active_version.output_contract_json, null, 2) : "");
        setVariablesSchemaEditor(template.active_version?.variables_schema_json ? JSON.stringify(template.active_version.variables_schema_json, null, 2) : "");
        setCompiledPrompt("");
      }
    }
  }, [activePromptFeature, promptTemplates]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["settings-ai-default"] });

  const saveProviderMutation = useMutation({
    mutationFn: async (payload: ProviderFormState) => {
      const isEdit = Boolean(payload.id);
      const url = isEdit ? `/settings/ai-default/providers/${payload.id}` : "/settings/ai-default/providers";
      const method = isEdit ? "PUT" : "POST";
      const response = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          slug: payload.slug,
          provider_type: payload.provider_type,
          base_url: payload.base_url || null,
          api_key: payload.api_key || undefined,
          organization_id: payload.organization_id || null,
          project_id: payload.project_id || null,
          default_model: payload.default_model || null,
          status: payload.status,
          timeout_seconds: Number(payload.timeout_seconds || 30),
          retry_limit: Number(payload.retry_limit || 1),
          max_tokens_default: payload.max_tokens_default ? Number(payload.max_tokens_default) : null,
          cache_ttl_minutes: payload.cache_ttl_minutes ? Number(payload.cache_ttl_minutes) : null,
          cost_sensitivity: payload.cost_sensitivity,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Unable to save provider");
      }
      return response.json();
    },
    onSuccess: async () => {
      await invalidate();
      setProviderModalOpen(false);
      setProviderForm(emptyProviderForm);
      setProviderError("");
    },
    onError: (err: Error) => setProviderError(err.message),
  });

  const deleteProviderMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiFetch(`/settings/ai-default/providers/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to delete provider");
    },
    onSuccess: invalidate,
  });

  const testProviderMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiFetch(`/settings/ai-default/providers/${id}/test`, { method: "POST" });
      if (!response.ok) throw new Error("Connection test failed");
      return response.json();
    },
    onSuccess: invalidate,
  });

  const revealKeyMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiFetch(`/settings/ai-default/providers/${id}/reveal-key`, { method: "POST" });
      if (!response.ok) throw new Error("Unable to reveal key");
      return response.json() as Promise<{ data: { provider_id: number; api_key: string } }>;
    },
    onSuccess: (payload) => {
      setRevealedKeys((current) => ({ ...current, [payload.data.provider_id]: payload.data.api_key }));
    },
  });

  const addModelMutation = useMutation({
    mutationFn: async ({ providerId, name, cost_tier }: { providerId: number; name: string; cost_tier: string }) => {
      const response = await apiFetch(`/settings/ai-default/providers/${providerId}/models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, cost_tier, status: "active" }),
      });
      if (!response.ok) throw new Error("Unable to add model");
      return response.json();
    },
    onSuccess: async () => {
      await invalidate();
      setAddingModelFor(null);
      setNewModelName("");
      setNewModelTier("medium");
    },
  });

  const deleteModelMutation = useMutation({
    mutationFn: async ({ providerId, modelId }: { providerId: number; modelId: number }) => {
      const response = await apiFetch(`/settings/ai-default/providers/${providerId}/models/${modelId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Unable to delete model");
    },
    onSuccess: invalidate,
  });

  const saveRoutesMutation = useMutation({
    mutationFn: async ({ featureName, routes }: { featureName: string; routes: RouteDraftState[string] }) => {
      const payloadRoutes = routes
        .filter((route) => route.ai_model_id)
        .map((route) => ({
          priority: route.priority,
          ai_model_id: Number(route.ai_model_id),
          timeout_seconds: Number(route.timeout_seconds || 30),
          max_retries: Number(route.max_retries || 1),
          cache_ttl_minutes: route.cache_ttl_minutes ? Number(route.cache_ttl_minutes) : null,
          max_tokens: route.max_tokens ? Number(route.max_tokens) : null,
          complexity_mode: route.complexity_mode,
          cost_sensitivity: route.cost_sensitivity,
          is_active: route.is_active,
        }));

      const response = await apiFetch(`/settings/ai-default/feature-routes/${featureName}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routes: payloadRoutes }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Unable to save routing");
      }
      return response.json();
    },
    onSuccess: invalidate,
  });

  const savePromptVersionMutation = useMutation({
    mutationFn: async () => {
      let outputContractJson = null;
      let variablesSchemaJson = null;
      try {
        if (outputContractEditor.trim()) outputContractJson = JSON.parse(outputContractEditor);
        if (variablesSchemaEditor.trim()) variablesSchemaJson = JSON.parse(variablesSchemaEditor);
      } catch (e) {
        throw new Error("Output Contract or Variables Schema must be valid JSON.");
      }
      const response = await apiFetch("/settings/ai-default/prompt-templates/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature_name: activePromptFeature,
          template_name: promptTemplates.find((t) => t.feature_name === activePromptFeature)?.template_name ?? "Default",
          description: promptDescription,
          content: promptEditor,
          system_prompt: systemPromptEditor,
          user_prompt: userPromptEditor,
          output_contract_json: outputContractJson,
          variables_schema_json: variablesSchemaJson,
        }),
      });
      if (!response.ok) throw new Error("Unable to save prompt version");
      return response.json();
    },
    onSuccess: invalidate,
  });

  const activatePromptMutation = useMutation({
    mutationFn: async (versionId: number) => {
      const response = await apiFetch(`/settings/ai-default/prompt-templates/versions/${versionId}/activate`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Unable to activate prompt version");
      return response.json();
    },
    onSuccess: invalidate,
  });

  const previewPromptMutation = useMutation({
    mutationFn: async () => {
      const response = await apiFetch("/settings/ai-default/prompt-templates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature_name: activePromptFeature,
          sample_input: sampleInput,
          content: promptEditor,
          system_prompt: systemPromptEditor,
          user_prompt: userPromptEditor,
        }),
      });
      if (!response.ok) throw new Error("Unable to preview prompt");
      return response.json() as Promise<{ data: { compiled_prompt: string } }>;
    },
    onSuccess: (payload) => setCompiledPrompt(payload.data.compiled_prompt),
  });

  const openCreateProvider = () => {
    setProviderForm(emptyProviderForm);
    setProviderError("");
    setProviderModalOpen(true);
  };

  const openEditProvider = (provider: Provider) => {
    setProviderForm({
      id: provider.id,
      name: provider.name,
      slug: provider.slug,
      provider_type: provider.provider_type,
      base_url: provider.base_url ?? "",
      api_key: "",
      organization_id: provider.organization_id ?? "",
      project_id: provider.project_id ?? "",
      default_model: provider.default_model ?? "",
      status: provider.status,
      timeout_seconds: String(provider.timeout_seconds ?? 30),
      retry_limit: String(provider.retry_limit ?? 1),
      max_tokens_default: provider.max_tokens_default ? String(provider.max_tokens_default) : "",
      cache_ttl_minutes: provider.cache_ttl_minutes ? String(provider.cache_ttl_minutes) : "",
      cost_sensitivity: provider.cost_sensitivity ?? "balanced",
    });
    setProviderError("");
    setProviderModalOpen(true);
  };

  const copyKey = async (providerId: number) => {
    const value = revealedKeys[providerId];
    if (!value) return;
    await apiFetch(`/settings/ai-default/providers/${providerId}/copy-key-audit`, { method: "POST" });
    await navigator.clipboard.writeText(value);
  };

  const updateRouteDraft = (featureName: string, priority: number, field: string, value: string | boolean) => {
    setRouteDrafts((current) => ({
      ...current,
      [featureName]: (current[featureName] ?? []).map((route) =>
        route.priority === priority ? { ...route, [field]: value } : route
      ),
    }));
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4 p-6">
        <BackToSettings />
        <div className="rounded-3xl border border-[var(--status-danger)]/20 bg-[color-mix(in_oklch,var(--status-danger)_5%,transparent)] p-6">
          <p className="font-semibold text-[var(--status-danger)]">Unable to load AI Defaults</p>
          <p className="mt-2 text-sm text-muted-foreground">{(error as Error)?.message ?? "Unknown error"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="space-y-1">
            <BackToSettings />
            <CardTitle>AI Default</CardTitle>
            <CardDescription>
              One standardized control center for providers, routing, prompts, and usage health.
            </CardDescription>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-[color:var(--surface-subtle)] p-4">
              <p className="text-xs font-medium text-muted-foreground">Providers</p>
              <p className="mt-2 text-2xl font-semibold">{providers.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-[color:var(--surface-subtle)] p-4">
              <p className="text-xs font-medium text-muted-foreground">Fallback Events</p>
              <p className="mt-2 text-2xl font-semibold">{usageOverview?.summary.fallback_count ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-border bg-[color:var(--surface-subtle)] p-4">
              <p className="text-xs font-medium text-muted-foreground">Last Used Route</p>
              <p className="mt-2 text-sm font-semibold">
                {usageOverview?.summary.last_used_provider ?? "—"}
                {usageOverview?.summary.last_used_model ? ` / ${usageOverview.summary.last_used_model}` : ""}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs
            value={tab}
            onValueChange={setTab}
            items={tabs.map((item) => ({ key: item.key, label: item.label, icon: item.icon }))}
          />
        </CardContent>
      </Card>

      {tab === "providers" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Provider Registry</CardTitle>
                <CardDescription>
                  Add providers, manage credentials, reveal masked keys when authorized, and test connection health.
                </CardDescription>
              </div>
              <Button onClick={openCreateProvider}>
                <Plus className="h-4 w-4" />
                Add Provider
              </Button>
            </CardHeader>
          </Card>

          {providers.map((provider) => {
            const expanded = expandedProviderId === provider.id;
            const revealed = revealedKeys[provider.id];
            return (
              <Card key={provider.id} className="overflow-hidden">
                <button
                  onClick={() => setExpandedProviderId(expanded ? null : provider.id)}
                  className="flex w-full items-start justify-between gap-4 p-5 text-left"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--surface-subtle)] text-[color:var(--brand)]">
                        <Bot className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold">{provider.name}</h3>
                          <Badge variant={provider.enabled ? "success" : "neutral"}>
                            {provider.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                          <Badge variant={providerBadge(provider.last_test_status) as any}>
                            {provider.last_test_status ? `Last test: ${provider.last_test_status}` : "Not tested"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                          {provider.provider_type} • Default model: {provider.default_model || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                      <div>Masked key: <span className="font-mono text-foreground">{revealed ? `${revealed.slice(0, 6)}...` : provider.api_key_masked}</span></div>
                      <div>Last used: <span className="text-foreground">{fmtDate(provider.last_used_at)}</span></div>
                      <div>Last used model: <span className="text-foreground">{provider.last_used_model || "—"}</span></div>
                      <div>Base URL: <span className="text-foreground">{provider.base_url || "—"}</span></div>
                    </div>
                  </div>
                  {expanded ? <ChevronUp className="mt-1 h-5 w-5 text-muted-foreground" /> : <ChevronDown className="mt-1 h-5 w-5 text-muted-foreground" />}
                </button>

                {expanded && (
                  <div className="border-t border-border/70 p-5">
                    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <Card className="bg-[color:var(--surface-subtle)] shadow-none">
                            <CardContent className="p-4 pt-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Credential Management</p>
                            <div className="mt-3 space-y-2 text-sm">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Visibility</span>
                                <span>{provider.api_key_visibility_mode === "masked_with_reveal" ? "Masked + reveal" : "Masked only"}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">API key</span>
                                <span className="font-mono">{revealed || provider.api_key_masked}</span>
                              </div>
                              <div className="flex flex-wrap gap-2 pt-2">
                                {provider.can_reveal_key && (
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      revealed
                                        ? setRevealedKeys((current) => ({ ...current, [provider.id]: "" }))
                                        : revealKeyMutation.mutate(provider.id)
                                    }
                                  >
                                    {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                    {revealed ? "Hide key" : "Reveal key"}
                                  </Button>
                                )}
                                {provider.can_reveal_key && revealed && (
                                  <Button
                                    variant="outline"
                                    onClick={() => copyKey(provider.id)}
                                  >
                                    <Clipboard className="h-3.5 w-3.5" />
                                    Copy key
                                  </Button>
                                )}
                              </div>
                              {!provider.can_reveal_key && (
                                <div>
                                  <Badge variant="warning">
                                  Full reveal is limited to admin-authorized roles and every reveal or copy is audit logged.
                                  </Badge>
                                </div>
                              )}
                            </div>
                            </CardContent>
                          </Card>

                          <Card className="bg-[color:var(--surface-subtle)] shadow-none">
                            <CardContent className="p-4 pt-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Execution Controls</p>
                            <div className="mt-3 space-y-2 text-sm">
                              <div className="flex items-center justify-between"><span className="text-muted-foreground">Timeout</span><span>{provider.timeout_seconds ?? 30}s</span></div>
                              <div className="flex items-center justify-between"><span className="text-muted-foreground">Retry limit</span><span>{provider.retry_limit ?? 1}</span></div>
                              <div className="flex items-center justify-between"><span className="text-muted-foreground">Cache TTL</span><span>{provider.cache_ttl_minutes ? `${provider.cache_ttl_minutes} min` : "—"}</span></div>
                              <div className="flex items-center justify-between"><span className="text-muted-foreground">Cost sensitivity</span><span>{provider.cost_sensitivity ?? "balanced"}</span></div>
                              <div className="flex items-center justify-between"><span className="text-muted-foreground">Last tested</span><span>{fmtDate(provider.last_tested_at)}</span></div>
                            </div>
                            </CardContent>
                          </Card>
                        </div>

                        <Card className="bg-[color:var(--surface-subtle)] shadow-none">
                          <CardContent className="p-4 pt-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Models</p>
                              <p className="mt-1 text-sm text-muted-foreground">Default model, available routing targets, and cost profile.</p>
                            </div>
                            <Button
                              variant="outline"
                              onClick={() => setAddingModelFor(addingModelFor === provider.id ? null : provider.id)}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add Model
                            </Button>
                          </div>
                          <div className="mt-4 space-y-2">
                            {provider.models.map((model) => (
                              <div key={model.id} className="flex items-center justify-between rounded-2xl border border-border/70 px-4 py-3 text-sm">
                                <div>
                                  <p className="font-medium">{model.name}</p>
                                  <p className="text-xs text-muted-foreground">{model.cost_tier ?? "medium"} tier</p>
                                </div>
                                <Button
                                  variant="destructive"
                                  onClick={() => deleteModelMutation.mutate({ providerId: provider.id, modelId: model.id })}
                                >
                                  Delete
                                </Button>
                              </div>
                            ))}
                          </div>
                          {addingModelFor === provider.id && (
                            <div className="mt-4 grid gap-3 rounded-2xl border border-border bg-background p-4 md:grid-cols-[1fr_180px_auto]">
                              <Input value={newModelName} onChange={(e) => setNewModelName(e.target.value)} placeholder="e.g. gpt-4.1-mini" />
                              <Select value={newModelTier} onChange={(e) => setNewModelTier(e.target.value)}>
                                <option value="low">Low cost</option>
                                <option value="medium">Medium cost</option>
                                <option value="high">High cost</option>
                              </Select>
                              <Button
                                onClick={() => addModelMutation.mutate({ providerId: provider.id, name: newModelName, cost_tier: newModelTier })}
                                disabled={!newModelName || addModelMutation.isPending}
                              >
                                {addModelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                Save
                              </Button>
                            </div>
                          )}
                          </CardContent>
                        </Card>
                      </div>

                      <div className="space-y-4">
                        <Card className="bg-[color:var(--surface-subtle)] shadow-none">
                          <CardContent className="p-4 pt-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Provider Actions</p>
                          <div className="mt-4 grid gap-2">
                            <Button
                              variant="outline"
                              onClick={() => testProviderMutation.mutate(provider.id)}
                            >
                              {testProviderMutation.isPending && testProviderMutation.variables === provider.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}
                              Test connection
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => openEditProvider(provider)}
                            >
                              <Pencil className="h-4 w-4" />
                              Edit provider
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => deleteProviderMutation.mutate(provider.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete provider
                            </Button>
                          </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-[color:var(--surface-subtle)] shadow-none">
                          <CardContent className="p-4 pt-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Audit Notes</p>
                          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                            <li>API keys are masked by default in every list and detail view.</li>
                            <li>Reveal and copy actions are permission checked and audit logged.</li>
                            <li>Connection tests store status, latency, and timestamp for provider health.</li>
                          </ul>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {tab === "routing" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Feature Routing</CardTitle>
                <CardDescription>
                  Configure up to 10 ordered providers and models for all AI features. Only one executes per request, and lower priorities run only on failure.
                </CardDescription>
              </div>
            </CardHeader>
          </Card>

          {(() => {
            const draft = routeDrafts["global"] ?? [];
            return (
              <Card>
                <CardContent className="p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Global AI Routing</h3>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">Applies to all AI features</p>
                  </div>
                  <Button
                    onClick={() => saveRoutesMutation.mutate({ featureName: "global", routes: draft })}
                  >
                    {saveRoutesMutation.isPending && saveRoutesMutation.variables?.featureName === "global" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save routing
                  </Button>
                </div>

                <div className="mt-4 grid gap-4">
                  {draft.map((route) => (
                    <div key={`global-${route.priority}`} className="grid gap-3 rounded-2xl border border-border bg-background/80 p-4 lg:grid-cols-[90px_1.2fr_repeat(5,140px)_110px]">
                      <div className="rounded-2xl bg-muted px-3 py-2 text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Priority</p>
                        <p className="mt-1 text-xl font-semibold">{route.priority}</p>
                      </div>
                      <Select value={route.ai_model_id} onChange={(e) => updateRouteDraft("global", route.priority, "ai_model_id", e.target.value)}>
                        <option value="">Unassigned</option>
                        {modelOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </Select>
                      <Input value={route.timeout_seconds} onChange={(e) => updateRouteDraft("global", route.priority, "timeout_seconds", e.target.value)} placeholder="Timeout" />
                      <Input value={route.max_retries} onChange={(e) => updateRouteDraft("global", route.priority, "max_retries", e.target.value)} placeholder="Retry" />
                      <Input value={route.cache_ttl_minutes} onChange={(e) => updateRouteDraft("global", route.priority, "cache_ttl_minutes", e.target.value)} placeholder="Cache TTL" />
                      <Input value={route.max_tokens} onChange={(e) => updateRouteDraft("global", route.priority, "max_tokens", e.target.value)} placeholder="Max tokens" />
                      <Select value={route.complexity_mode} onChange={(e) => updateRouteDraft("global", route.priority, "complexity_mode", e.target.value)}>
                        <option value="standard">Standard</option>
                        <option value="lightweight">Lightweight</option>
                        <option value="deep_reasoning">Deep reasoning</option>
                      </Select>
                      <label className="flex items-center justify-center gap-2 rounded-2xl border border-border px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={route.is_active}
                          onChange={(e) => updateRouteDraft("global", route.priority, "is_active", e.target.checked)}
                        />
                        Enabled
                      </label>
                    </div>
                  ))}
                </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      )}

      {tab === "prompts" && (
        <div className="grid gap-4 xl:grid-cols-[300px_1fr] items-start">
          <Card className="sticky top-6">
            <CardContent className="p-4 pt-4">
            <h2 className="text-lg font-semibold">Prompt Templates</h2>
            <p className="mt-1 text-sm text-muted-foreground">Versioned prompt control per feature with activation history.</p>
            <div className="mt-4 space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
              {promptTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setActivePromptFeature(template.feature_name)}
                  className={cn(
                    "w-full rounded-2xl border px-4 py-3 text-left transition",
                    activePromptFeature === template.feature_name
                      ? "border-[var(--brand)] bg-[var(--brand)]/5"
                      : "border-border bg-background/70 hover:border-[var(--brand)]/30"
                  )}
                >
                  <p className="font-medium">{featureCatalog.find((item) => item.key === template.feature_name)?.label ?? template.feature_name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Active v{template.active_version?.version ?? "—"}
                  </p>
                </button>
              ))}
            </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardContent className="p-5">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-xl font-semibold">
                    {featureCatalog.find((item) => item.key === activePromptFeature)?.label ?? "Prompt Template"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Prompt edits create a new version. Nothing is overwritten silently, and activation is explicit.
                  </p>
                </div>
                <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  Active version: {selectedPromptTemplate?.active_version?.version ?? "—"}
                </div>
              </div>

              <div className="mt-4 grid gap-4">
                <Input value={promptDescription} onChange={(e) => setPromptDescription(e.target.value)} placeholder="Template description" />
                <div className="grid gap-2">
                  <label className="text-sm font-medium">System Prompt</label>
                  <Textarea rows={4} value={systemPromptEditor} onChange={(e) => setSystemPromptEditor(e.target.value)} placeholder="System instructions" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">User Prompt</label>
                  <Textarea rows={6} value={userPromptEditor} onChange={(e) => setUserPromptEditor(e.target.value)} placeholder="User instructions and variables" />
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Output Contract (JSON schema/format)</label>
                    <Textarea className="font-mono text-xs" rows={8} value={outputContractEditor} onChange={(e) => setOutputContractEditor(e.target.value)} placeholder="{}" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Variables Schema (JSON array of keys)</label>
                    <Textarea className="font-mono text-xs" rows={8} value={variablesSchemaEditor} onChange={(e) => setVariablesSchemaEditor(e.target.value)} placeholder="[]" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Legacy Content (Fallback if System/User empty)</label>
                  <Textarea rows={8} value={promptEditor} onChange={(e) => setPromptEditor(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => savePromptVersionMutation.mutate()}
                  >
                    {savePromptVersionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save as new version
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => previewPromptMutation.mutate()}
                  >
                    {previewPromptMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Preview compiled prompt
                  </Button>
                </div>
              </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <Card>
                <CardContent className="p-5">
                <h4 className="text-lg font-semibold">Version History</h4>
                <div className="mt-4 space-y-3">
                  {selectedPromptTemplate?.versions.map((version) => (
                    <div key={version.id} className="rounded-2xl border border-border bg-[color:var(--surface-subtle)] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">Version {version.version}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Created {fmtDate(version.created_at)}{version.activated_at ? ` • Activated ${fmtDate(version.activated_at)}` : ""}
                          </p>
                        </div>
                        {version.is_active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => activatePromptMutation.mutate(version.id)}
                          >
                            Activate
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                <h4 className="text-lg font-semibold">Prompt Preview</h4>
                <Textarea rows={6} value={sampleInput} onChange={(e) => setSampleInput(e.target.value)} />
                <Textarea className="mt-4 font-mono text-xs" rows={14} value={compiledPrompt} readOnly placeholder="Compiled prompt preview will appear here." />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {tab === "usage" && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card><CardContent className="p-5 pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Total Calls</p>
              <p className="mt-3 text-3xl font-semibold">{formatNumber(usageOverview?.summary.total_calls ?? 0, { decimals: 0 })}</p>
            </CardContent></Card>
            <Card><CardContent className="p-5 pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Total Cost ({usageOverview?.summary.is_converted ? usageOverview.summary.currency_code : 'USD'})</p>
              <p className="mt-3 text-3xl font-semibold">{formatCurrency(usageOverview?.summary.total_cost_converted ?? usageOverview?.summary.total_cost_usd ?? 0, { decimals: 4 })}</p>
            </CardContent></Card>
            <Card><CardContent className="p-5 pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Success Rate</p>
              <p className="mt-3 text-3xl font-semibold">{formatNumber(usageOverview?.summary.success_rate ?? 0, { decimals: 0 })}%</p>
            </CardContent></Card>
            <Card><CardContent className="p-5 pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Fallback Count</p>
              <p className="mt-3 text-3xl font-semibold">{formatNumber(usageOverview?.summary.fallback_count ?? 0, { decimals: 0 })}</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xl font-semibold">Usage Timeline</h2>
                <div className="w-40">
                  <Select value={timelineFilter} onChange={(e) => setTimelineFilter(e.target.value)}>
                    <option value="today">Today</option>
                    <option value="last_7_days">Last 7 Days</option>
                    <option value="last_30_days">Last 30 Days</option>
                    <option value="last_90_days">Last 90 Days</option>
                    <option value="this_year">This Year</option>
                  </Select>
                </div>
              </div>
              <div className="mt-4 h-[300px] w-full min-w-0">
                {usageOverview?.daily_timeline && usageOverview.daily_timeline.length > 0 ? (
                  <Chart
                    type="area"
                    height={300}
                    width="100%"
                    options={{
                      chart: {
                        toolbar: { show: false },
                        background: 'transparent',
                        fontFamily: 'inherit',
                      },
                      colors: ['#3b82f6', '#10b981'],
                      fill: {
                        type: 'gradient',
                        gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] }
                      },
                      dataLabels: { enabled: false },
                      stroke: { curve: 'smooth', width: 2 },
                      xaxis: {
                        type: 'datetime',
                        categories: usageOverview.daily_timeline.map((d: any) => d.date),
                        labels: { style: { colors: '#9ca3af' } },
                        axisBorder: { show: false },
                        axisTicks: { show: false },
                      },
                      yaxis: [
                        {
                          title: { text: 'Calls', style: { color: '#9ca3af', fontWeight: 500 } },
                          labels: { style: { colors: '#9ca3af' } }
                        },
                        {
                          opposite: true,
                          title: { text: `Cost (${usageOverview.summary.is_converted ? usageOverview.summary.currency_code : 'USD'})`, style: { color: '#9ca3af', fontWeight: 500 } },
                          labels: { style: { colors: '#9ca3af' } }
                        }
                      ],
                      grid: { borderColor: '#374151', strokeDashArray: 4 },
                      tooltip: { theme: 'dark' },
                    }}
                    series={[
                      {
                        name: 'Total Calls',
                        data: usageOverview.daily_timeline.map((d: any) => d.total_calls)
                      },
                      {
                        name: 'Cost',
                        data: usageOverview.daily_timeline.map((d: any) => usageOverview.summary.is_converted ? d.total_cost_converted : d.total_cost_usd)
                      }
                    ]}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                    No timeline data available for the last 30 days.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card><CardContent className="p-5">
              <h2 className="text-xl font-semibold">Usage Overview</h2>
              <div className="mt-4 space-y-3">
                {usageOverview?.per_provider.map((item) => (
                  <div key={item.provider_id} className="rounded-2xl border border-border bg-[color:var(--surface-subtle)] p-4">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-medium">{item.provider_name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatNumber(item.total_calls, { decimals: 0 })} calls • {formatNumber(item.fallback_count, { decimals: 0 })} fallbacks • Last used {fmtDate(item.last_used_at)}
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(item.total_cost_converted ?? item.total_cost_usd ?? 0, { decimals: 4 })} • {formatNumber(item.success_rate ?? 0, { decimals: 0 })}% success • {formatNumber(item.avg_latency_ms ?? 0, { decimals: 0 })}ms avg
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent></Card>

            <Card><CardContent className="p-5">
              <h2 className="text-xl font-semibold">Health Snapshot</h2>
              <div className="mt-4 space-y-3">
                {providerHealth.map((item) => (
                  <div key={item.provider_id} className="rounded-2xl border border-border bg-[color:var(--surface-subtle)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.provider_name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Last tested {fmtDate(item.last_tested_at)} • Last used {fmtDate(item.last_used_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={item.enabled ? "success" : "neutral"}>
                          {item.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                        <p className="mt-2 text-xs text-muted-foreground">{item.last_test_status ?? "No test recorded"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent></Card>
          </div>
        </div>
      )}

      <Modal
        open={providerModalOpen}
        onOpenChange={setProviderModalOpen}
        title={providerForm.id ? "Edit Provider" : "Add Provider"}
        description="This provider form now uses the same modal and field system as the rest of settings."
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setProviderModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveProviderMutation.mutate(providerForm)}>
              {saveProviderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save Provider
            </Button>
          </>
        }
      >
            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Provider name" value={providerForm.name} onChange={(e) => setProviderForm((current) => ({ ...current, name: e.target.value }))} />
              <Input placeholder="Slug" value={providerForm.slug} onChange={(e) => setProviderForm((current) => ({ ...current, slug: e.target.value }))} disabled={Boolean(providerForm.id)} />
              <Select value={providerForm.provider_type} onChange={(e) => setProviderForm((current) => ({ ...current, provider_type: e.target.value }))}>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic / Claude</option>
                <option value="gemini">Google Gemini</option>
                <option value="openrouter">OpenRouter</option>
                <option value="custom">Custom / Local</option>
              </Select>
              <Select value={providerForm.status} onChange={(e) => setProviderForm((current) => ({ ...current, status: e.target.value as "active" | "inactive" }))}>
                <option value="active">Enabled</option>
                <option value="inactive">Disabled</option>
              </Select>
              <Input placeholder="Base URL" value={providerForm.base_url} onChange={(e) => setProviderForm((current) => ({ ...current, base_url: e.target.value }))} />
              <Input placeholder={providerForm.id ? "New API key (leave blank to keep current)" : "API key"} value={providerForm.api_key} onChange={(e) => setProviderForm((current) => ({ ...current, api_key: e.target.value }))} />
              <Input placeholder="Organization ID" value={providerForm.organization_id} onChange={(e) => setProviderForm((current) => ({ ...current, organization_id: e.target.value }))} />
              <Input placeholder="Project ID" value={providerForm.project_id} onChange={(e) => setProviderForm((current) => ({ ...current, project_id: e.target.value }))} />
              <Input placeholder="Default model" value={providerForm.default_model} onChange={(e) => setProviderForm((current) => ({ ...current, default_model: e.target.value }))} />
              <Select value={providerForm.cost_sensitivity} onChange={(e) => setProviderForm((current) => ({ ...current, cost_sensitivity: e.target.value }))}>
                <option value="balanced">Balanced</option>
                <option value="cost_first">Cost first</option>
                <option value="quality_first">Quality first</option>
              </Select>
              <Input placeholder="Timeout seconds" value={providerForm.timeout_seconds} onChange={(e) => setProviderForm((current) => ({ ...current, timeout_seconds: e.target.value }))} />
              <Input placeholder="Retry limit" value={providerForm.retry_limit} onChange={(e) => setProviderForm((current) => ({ ...current, retry_limit: e.target.value }))} />
              <Input placeholder="Max tokens default" value={providerForm.max_tokens_default} onChange={(e) => setProviderForm((current) => ({ ...current, max_tokens_default: e.target.value }))} />
              <Input placeholder="Cache TTL minutes" value={providerForm.cache_ttl_minutes} onChange={(e) => setProviderForm((current) => ({ ...current, cache_ttl_minutes: e.target.value }))} />
            </div>

            {providerError && (
              <div className="mt-4"><Badge variant="danger">{providerError}</Badge></div>
            )}
      </Modal>
    </div>
  );
}
