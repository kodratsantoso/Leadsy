"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  RefreshCw,
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
import { throwIfApiError } from "@/lib/apiError";
import { ErrorNotice } from "@/components/ui/error-notice";
import { useNumberFormat } from "@/lib/hooks/use-number-format";
import { cn } from "@/lib/utils";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type ProviderModel = {
  id: number;
  name: string;
  cost_tier?: string;
  status?: string;
  cost_per_million_input_tokens?: number | null;
  cost_per_million_output_tokens?: number | null;
  pricing_source?: string | null;
  pricing_synced_at?: string | null;
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
    /** How much of the total came from a tier guess rather than the model's own prices. */
    estimated_cost_portion_usd?: number;
    estimated_calls?: number;
    unlabelled_calls?: number;
    measured_calls?: number;
    /** Calls with no frozen rupiah conversion — re-converted at today's rate. */
    unfrozen_calls?: number;
    unfrozen_cost_usd?: number;
    legacy_fallback_rate?: number | null;
    is_converted?: boolean;
    currency_code?: string;
    success_rate: number | null;
    avg_latency_ms: number | null;
    fallback_count: number;
    total_tokens_in: number;
    total_tokens_out: number;
    total_tokens: number;
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
    total_tokens_in: number;
    total_tokens_out: number;
    total_tokens: number;
    last_used_at?: string | null;
  }[];
  daily_timeline?: {
    date: string;
    total_calls: number;
    total_cost_usd: number;
    total_cost_converted: number;
  }[];
  recent_logs?: {
    id: number;
    function_name: string;
    model_name: string;
    provider_name: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost_usd: number;
    cost_converted: number;
    latency_ms: number;
    status: string;
    error_message?: string | null;
    created_at: string;
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

/**
 * A readable name for an AI feature.
 *
 * The catalog on the server carries proper names, but every call site fell back to
 * printing the raw key when a feature was missing from it — so the settings page showed
 * "lead_icp_matching" and "ps_task_breakdown_generation" to users. Missing entries are
 * now humanised instead of leaking the variable name, and acronyms keep their case.
 */
const FEATURE_ACRONYMS: Record<string, string> = {
  ai: "AI",
  icp: "ICP",
  bantc: "BANTC",
  cs: "CS",
  ps: "PS",
  kpi: "KPI",
  idx: "IDX",
  crm: "CRM",
};

function featureLabel(key: string | null | undefined, catalog: { key: string; label: string }[]): string {
  if (!key) return "Prompt Template";

  const known = catalog.find((item) => item.key === key)?.label;
  if (known) return known;

  // A trailing "_prompt" is how these keys are written, not something a reader needs:
  // "Meeting Summary Discovery Prompt" says Prompt twice on a page of prompts.
  const trimmed = key.replace(/_prompt$/, "");

  return trimmed
    .split("_")
    .filter(Boolean)
    .map((word) => FEATURE_ACRONYMS[word] ?? word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * States plainly how much of a cost total is actually measured.
 *
 * "estimated" means the model had no per-1M-token prices configured, so the cost came
 * from a coarse guess keyed off its cost_tier — which for deepseek-v4-pro overstates
 * input cost by nearly 4x. "not labelled" are rows written before the basis was
 * recorded; we cannot tell, and pretending otherwise would be worse.
 */
function CostConfidence({
  summary,
}: {
  summary?: {
    total_calls: number;
    estimated_calls?: number;
    unlabelled_calls?: number;
    measured_calls?: number;
    unfrozen_calls?: number;
  };
}) {
  if (!summary || summary.total_calls === 0) return null;

  const estimated = summary.estimated_calls ?? 0;
  const unlabelled = summary.unlabelled_calls ?? 0;

  const unfrozen = summary.unfrozen_calls ?? 0;

  const parts: string[] = [];
  if (estimated > 0) parts.push(`${estimated} estimated from tier`);
  if (unlabelled > 0) parts.push(`${unlabelled} not labelled`);

  return (
    <>
      {parts.length === 0 ? (
        <p className="mt-2 text-xs text-[var(--status-success)]">Based on each model&apos;s configured prices.</p>
      ) : (
        <p className="mt-2 text-xs text-[var(--status-warning)]">
          {parts.join(", ")} of {summary.total_calls} calls — set per-model prices for an exact figure.
        </p>
      )}
      {unfrozen > 0 && (
        /* A call records the exchange rate in force when it ran, so old reports do not
           drift. Calls made before that was recorded are re-converted at today's rate,
           which means their share of this figure changes whenever the rupiah moves. */
        <p className="mt-1 text-xs text-muted-foreground">
          {unfrozen} of {summary.total_calls} calls predate the frozen exchange rate and are converted at
          today&apos;s rate, so that part of this total shifts as the rupiah moves.
        </p>
      )}
    </>
  );
}

/** Parse a typed price, tolerating the comma decimal separator used in Indonesia. */
function toPrice(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return null;

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

const tabs = [
  { key: "prompts", label: "Prompt Templates", icon: FileText },
  { key: "routing", label: "Feature Routing", icon: GitBranch },
  { key: "providers", label: "Providers", icon: Bot },
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
  status: "active",
  timeout_seconds: "30",
  retry_limit: "1",
  max_tokens_default: "",
  cache_ttl_minutes: "",
  cost_sensitivity: "balanced",
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

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
  const searchParams = useSearchParams();
  const { formatNumber, formatCurrency } = useNumberFormat();
  const [timelineFilter, setTimelineFilter] = useState("last_30_days");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [selectedFeatureFilter, setSelectedFeatureFilter] = useState("");
  const requestedTab = searchParams.get("tab");
  const initialTab = tabs.some((t) => t.key === requestedTab)
    ? (requestedTab as (typeof tabs)[number]["key"])
    : "prompts";
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>(initialTab);
  const [expandedProviderId, setExpandedProviderId] = useState<number | null>(null);
  const [providerForm, setProviderForm] = useState<ProviderFormState>(emptyProviderForm);
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [providerAdvancedOpen, setProviderAdvancedOpen] = useState(false);
  const [providerSlugEdited, setProviderSlugEdited] = useState(false);
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
  const [pricingModelId, setPricingModelId] = useState<number | null>(null);
  const [pricingIn, setPricingIn] = useState("");
  const [pricingOut, setPricingOut] = useState("");
  const [newModelInputPrice, setNewModelInputPrice] = useState("");
  const [newModelOutputPrice, setNewModelOutputPrice] = useState("");
  const [newModelPricingSource, setNewModelPricingSource] = useState<"manual" | "openrouter_api" | null>(null);
  const [discoveredModels, setDiscoveredModels] = useState<{ id: string; name: string; input_price_per_million: number | null; output_price_per_million: number | null }[]>([]);
  const [modelEntryMode, setModelEntryMode] = useState<"manual" | "discovered">("manual");
  const [discoveryMessage, setDiscoveryMessage] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["settings-ai-default", timelineFilter, startDateFilter, endDateFilter, selectedFeatureFilter],
    queryFn: async () => {
      let url = `/settings/ai-default?period=${timelineFilter}`;
      if (startDateFilter) url += `&start_date=${encodeURIComponent(startDateFilter)}`;
      if (endDateFilter) url += `&end_date=${encodeURIComponent(endDateFilter)}`;
      if (selectedFeatureFilter) url += `&feature_name=${encodeURIComponent(selectedFeatureFilter)}`;
      
      const response = await apiFetch(url);
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

  // Prices could only be set while ADDING a model, so the 48 models already in the
  // catalog had no way to get them — and their cost stayed a cost_tier guess. Deleting
  // and re-adding was the only route, and that cascades away the feature routing.
  const updateModelPricingMutation = useMutation({
    mutationFn: async ({ providerId, modelId, input, output }: { providerId: number; modelId: number; input: string; output: string }) => {
      const res = await apiFetch(`/settings/ai-default/providers/${providerId}/models/${modelId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // A comma decimal ("1,32") makes Number() return NaN, which JSON.stringify
          // writes as null — the price would silently clear instead of saving. Accept
          // the separator people actually type.
          cost_per_million_input_tokens: toPrice(input),
          cost_per_million_output_tokens: toPrice(output),
        }),
      });
      await throwIfApiError(res, "That price could not be saved.");
      return res.json();
    },
    onSuccess: async () => {
      await invalidate();
      setPricingModelId(null);
    },
  });

  const addModelMutation = useMutation({
    mutationFn: async ({ providerId, name, cost_tier, input_price, output_price, pricing_source }: { providerId: number; name: string; cost_tier: string; input_price?: string; output_price?: string; pricing_source?: string | null }) => {
      const response = await apiFetch(`/settings/ai-default/providers/${providerId}/models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          cost_tier,
          status: "active",
          cost_per_million_input_tokens: input_price ? Number(input_price) : undefined,
          cost_per_million_output_tokens: output_price ? Number(output_price) : undefined,
          pricing_source: pricing_source || undefined,
        }),
      });
      if (!response.ok) throw new Error("Unable to add model");
      return response.json();
    },
    onSuccess: async () => {
      await invalidate();
      setAddingModelFor(null);
      setNewModelName("");
      setNewModelTier("medium");
      setNewModelInputPrice("");
      setNewModelOutputPrice("");
      setNewModelPricingSource(null);
      setDiscoveredModels([]);
      setDiscoveryMessage("");
      setModelEntryMode("manual");
    },
  });

  const discoverModelsMutation = useMutation({
    mutationFn: async (providerId: number) => {
      const response = await apiFetch(`/settings/ai-default/providers/${providerId}/available-models`);
      return response.json();
    },
    onSuccess: (payload) => {
      if (payload?.supported && (payload.models?.length ?? 0) > 0) {
        setDiscoveredModels(payload.models);
        setModelEntryMode("discovered");
        setDiscoveryMessage(`Found ${payload.models.length} model(s) from this provider's API.`);
      } else {
        setDiscoveredModels([]);
        setModelEntryMode("manual");
        setDiscoveryMessage(payload?.message || "This provider doesn't support model auto-discovery — enter the model name manually.");
      }
    },
    onError: () => {
      setDiscoveredModels([]);
      setModelEntryMode("manual");
      setDiscoveryMessage("Could not fetch models — enter the model name manually.");
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

  const handleProviderTypeChange = (newType: string) => {
    setProviderForm((current) => {
      let updatedBaseUrl = current.base_url;
      let updatedName = current.name;
      let updatedSlug = current.slug;
      let updatedDefaultModel = current.default_model;

      if (!current.id) {
        if (newType === "byteplus") {
          if (!updatedName || updatedName === "OpenAI" || updatedName === "Anthropic" || updatedName === "Google Gemini") updatedName = "BytePlus ModelArk";
          if (!updatedSlug || updatedSlug === "openai" || updatedSlug === "anthropic" || updatedSlug === "google") updatedSlug = "byteplus";
          if (!updatedBaseUrl || updatedBaseUrl.includes("openai.com") || updatedBaseUrl.includes("anthropic.com") || updatedBaseUrl.includes("googleapis.com")) {
            updatedBaseUrl = "https://ark.ap-southeast.bytepluses.com/api/v3";
          }
          if (!updatedDefaultModel) updatedDefaultModel = "doubao-1.5-pro-32k";
        } else if (newType === "openai") {
          if (!updatedBaseUrl || updatedBaseUrl.includes("bytepluses.com")) updatedBaseUrl = "https://api.openai.com/v1";
        } else if (newType === "anthropic") {
          if (!updatedBaseUrl || updatedBaseUrl.includes("bytepluses.com")) updatedBaseUrl = "https://api.anthropic.com/v1";
        } else if (newType === "gemini") {
          if (!updatedBaseUrl || updatedBaseUrl.includes("bytepluses.com")) updatedBaseUrl = "https://generativelanguage.googleapis.com/v1beta";
        } else if (newType === "openrouter") {
          if (!updatedBaseUrl || updatedBaseUrl.includes("bytepluses.com")) updatedBaseUrl = "https://openrouter.ai/api/v1";
        }
      }

      return {
        ...current,
        provider_type: newType,
        name: updatedName,
        slug: updatedSlug,
        base_url: updatedBaseUrl,
        default_model: updatedDefaultModel,
      };
    });
  };

  const openCreateProvider = () => {
    setProviderForm(emptyProviderForm);
    setProviderError("");
    setProviderAdvancedOpen(false);
    setProviderSlugEdited(false);
    setProviderModalOpen(true);
  };

  const openEditProvider = (provider: Provider) => {
    setProviderAdvancedOpen(false);
    setProviderSlugEdited(true); // slug is fixed after creation — no need to auto-derive it
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
                              onClick={() => {
                                setAddingModelFor(addingModelFor === provider.id ? null : provider.id);
                                setNewModelName("");
                                setNewModelInputPrice("");
                                setNewModelOutputPrice("");
                                setNewModelPricingSource(null);
                                setDiscoveredModels([]);
                                setDiscoveryMessage("");
                                setModelEntryMode("manual");
                              }}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add Model
                            </Button>
                          </div>
                          <div className="mt-4 space-y-2">
                            {provider.models.map((model) => (
                              <div key={model.id} className="rounded-2xl border border-border/70 px-4 py-3 text-sm">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="font-medium">{model.name}</p>
                                    {/* Whether this model's cost is measured or guessed is
                                        the single most useful thing to know here. */}
                                    {model.cost_per_million_input_tokens != null && model.cost_per_million_output_tokens != null ? (
                                      <p className="text-xs text-muted-foreground">
                                        <span className="text-[var(--status-success)]">
                                          ${model.cost_per_million_input_tokens} in / ${model.cost_per_million_output_tokens} out
                                        </span>{" "}
                                        per 1M tokens
                                        {model.pricing_source ? ` · ${model.pricing_source === "openrouter_api" ? "auto-fetched" : "manual"}` : ""}
                                      </p>
                                    ) : (
                                      <p className="text-xs text-[var(--status-warning)]">
                                        No price set — cost is guessed from the {model.cost_tier ?? "medium"} tier
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex shrink-0 gap-2">
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setPricingModelId(pricingModelId === model.id ? null : model.id);
                                        setPricingIn(model.cost_per_million_input_tokens?.toString() ?? "");
                                        setPricingOut(model.cost_per_million_output_tokens?.toString() ?? "");
                                      }}
                                    >
                                      {pricingModelId === model.id ? "Cancel" : "Set price"}
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={() => deleteModelMutation.mutate({ providerId: provider.id, modelId: model.id })}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </div>

                                {pricingModelId === model.id && (
                                  <div className="mt-3 grid gap-3 border-t border-border/70 pt-3 md:grid-cols-[1fr_1fr_auto]">
                                    <div>
                                      <label className="mb-1 block text-xs text-muted-foreground">Input price (USD / 1M tokens)</label>
                                      <Input type="number" step="0.0001" min="0" value={pricingIn} placeholder="e.g. 1.32"
                                        onChange={(e) => setPricingIn(e.target.value)} />
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-xs text-muted-foreground">Output price (USD / 1M tokens)</label>
                                      <Input type="number" step="0.0001" min="0" value={pricingOut} placeholder="e.g. 3.96"
                                        onChange={(e) => setPricingOut(e.target.value)} />
                                    </div>
                                    <div className="flex items-end">
                                      <Button
                                        disabled={updateModelPricingMutation.isPending}
                                        onClick={() => updateModelPricingMutation.mutate({
                                          providerId: provider.id, modelId: model.id, input: pricingIn, output: pricingOut,
                                        })}
                                      >
                                        {updateModelPricingMutation.isPending ? "Saving…" : "Save price"}
                                      </Button>
                                    </div>
                                    <div className="md:col-span-3">
                                      {/* A failed save rendered nothing at all, so a rejected
                                          price was indistinguishable from a dead button. */}
                                      <ErrorNotice
                                        error={updateModelPricingMutation.error}
                                        fallbackTitle="That price could not be saved."
                                        className="mb-2"
                                      />
                                      <p className="text-[11px] text-muted-foreground">
                                        Both sides are needed for an exact cost — with only one set, the tier guess is still used.
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          {addingModelFor === provider.id && (
                            <div className="mt-4 space-y-3 rounded-2xl border border-border bg-background p-4">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-xs text-muted-foreground">
                                  {discoveryMessage || "Fetch this provider's available models instead of typing the name by hand."}
                                </p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => discoverModelsMutation.mutate(provider.id)}
                                  disabled={discoverModelsMutation.isPending}
                                >
                                  {discoverModelsMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                  Fetch Available Models
                                </Button>
                              </div>

                              <div className="grid gap-3 md:grid-cols-[1fr_140px]">
                                {modelEntryMode === "discovered" && discoveredModels.length > 0 ? (
                                  <Select
                                    value={newModelName}
                                    onChange={(e) => {
                                      const picked = discoveredModels.find((m) => m.id === e.target.value);
                                      setNewModelName(e.target.value);
                                      if (picked?.input_price_per_million != null && picked?.output_price_per_million != null) {
                                        setNewModelInputPrice(String(picked.input_price_per_million));
                                        setNewModelOutputPrice(String(picked.output_price_per_million));
                                        setNewModelPricingSource("openrouter_api");
                                      } else {
                                        setNewModelInputPrice("");
                                        setNewModelOutputPrice("");
                                        setNewModelPricingSource(null);
                                      }
                                    }}
                                    placeholder="— Select a model —"
                                  >
                                    {discoveredModels.map((m) => (
                                      <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                    <option value="__manual__">Type a model name manually…</option>
                                  </Select>
                                ) : (
                                  <Input
                                    value={newModelName}
                                    onChange={(e) => setNewModelName(e.target.value)}
                                    placeholder={provider.slug === "byteplus" ? "e.g. doubao-1.5-pro-32k, deepseek-r1, or ep-..." : "e.g. gpt-4.1-mini"}
                                  />
                                )}
                                <Select value={newModelTier} onChange={(e) => setNewModelTier(e.target.value)}>
                                  <option value="low">Low cost</option>
                                  <option value="medium">Medium cost</option>
                                  <option value="high">High cost</option>
                                </Select>
                              </div>

                              {modelEntryMode === "discovered" && newModelName === "__manual__" && (
                                <Input
                                  value={newModelName === "__manual__" ? "" : newModelName}
                                  onChange={(e) => setNewModelName(e.target.value)}
                                  placeholder="Type the model name"
                                />
                              )}

                              <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                  <label className="mb-1 block text-xs text-muted-foreground">
                                    Input price (USD / 1M tokens) {newModelPricingSource === "openrouter_api" && <span className="text-[var(--brand)]">· auto-fetched</span>}
                                  </label>
                                  <Input
                                    type="number"
                                    step="0.0001"
                                    min="0"
                                    value={newModelInputPrice}
                                    onChange={(e) => { setNewModelInputPrice(e.target.value); setNewModelPricingSource(e.target.value ? "manual" : null); }}
                                    placeholder="e.g. 2.50 — leave blank to use the cost tier estimate"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-xs text-muted-foreground">
                                    Output price (USD / 1M tokens) {newModelPricingSource === "openrouter_api" && <span className="text-[var(--brand)]">· auto-fetched</span>}
                                  </label>
                                  <Input
                                    type="number"
                                    step="0.0001"
                                    min="0"
                                    value={newModelOutputPrice}
                                    onChange={(e) => { setNewModelOutputPrice(e.target.value); setNewModelPricingSource(e.target.value ? "manual" : null); }}
                                    placeholder="e.g. 10.00 — leave blank to use the cost tier estimate"
                                  />
                                </div>
                              </div>
                              {provider.slug !== "openrouter" && (
                                <p className="text-[11px] text-muted-foreground">
                                  {provider.name} doesn't publish pricing through its API — enter it manually from the provider's pricing page. OpenRouter models fetch pricing automatically.
                                </p>
                              )}

                              <Button
                                onClick={() => addModelMutation.mutate({
                                  providerId: provider.id,
                                  name: newModelName === "__manual__" ? "" : newModelName,
                                  cost_tier: newModelTier,
                                  input_price: newModelInputPrice,
                                  output_price: newModelOutputPrice,
                                  pricing_source: newModelPricingSource,
                                })}
                                disabled={!newModelName || newModelName === "__manual__" || addModelMutation.isPending}
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
                  <p className="font-medium">{featureLabel(template.feature_name, featureCatalog)}</p>
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
                    {featureLabel(activePromptFeature, featureCatalog)}
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

      <Modal
        open={providerModalOpen}
        onOpenChange={setProviderModalOpen}
        title={providerForm.id ? "Edit Provider" : "Add Provider"}
        description="Pick a provider, paste its base URL, and drop in the API key. Everything else has a sensible default — expand Advanced only if you need to change it."
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
              <Select value={providerForm.provider_type} onChange={(e) => handleProviderTypeChange(e.target.value)}>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic / Claude</option>
                <option value="gemini">Google Gemini</option>
                <option value="byteplus">BytePlus ModelArk</option>
                <option value="openrouter">OpenRouter</option>
                <option value="custom">Custom / Local</option>
              </Select>
              <Input
                placeholder="Provider name"
                value={providerForm.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setProviderForm((current) => ({
                    ...current,
                    name,
                    slug: !providerSlugEdited && !current.id ? slugify(name) : current.slug,
                  }));
                }}
              />
              <div className="md:col-span-2 space-y-1">
                <Input placeholder="Base URL" value={providerForm.base_url} onChange={(e) => setProviderForm((current) => ({ ...current, base_url: e.target.value }))} />
                {providerForm.provider_type === "byteplus" && (
                  <p className="text-[11px] text-muted-foreground">
                    Default: <code className="text-foreground">https://ark.ap-southeast.bytepluses.com/api/v3</code> (Standard) or <code className="text-foreground">https://ark.ap-southeast.bytepluses.com/api/coding/v3</code> (Coding Plan).
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <Input placeholder={providerForm.id ? "New API key (leave blank to keep current)" : "API key"} value={providerForm.api_key} onChange={(e) => setProviderForm((current) => ({ ...current, api_key: e.target.value }))} />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setProviderAdvancedOpen((v) => !v)}
              className="mt-4 flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {providerAdvancedOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              Advanced settings
            </button>

            {providerAdvancedOpen && (
              <div className="mt-3 grid gap-4 rounded-2xl border border-border bg-[color:var(--surface-subtle)] p-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Slug (used internally, must be unique)</label>
                  <Input
                    value={providerForm.slug}
                    onChange={(e) => { setProviderSlugEdited(true); setProviderForm((current) => ({ ...current, slug: e.target.value })); }}
                    disabled={Boolean(providerForm.id)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Status</label>
                  <Select value={providerForm.status} onChange={(e) => setProviderForm((current) => ({ ...current, status: e.target.value as "active" | "inactive" }))}>
                    <option value="active">Enabled</option>
                    <option value="inactive">Disabled</option>
                  </Select>
                </div>
                <Input placeholder="Organization ID" value={providerForm.organization_id} onChange={(e) => setProviderForm((current) => ({ ...current, organization_id: e.target.value }))} />
                <Input placeholder="Project ID" value={providerForm.project_id} onChange={(e) => setProviderForm((current) => ({ ...current, project_id: e.target.value }))} />
                <Input placeholder="Default model (e.g. doubao-1.5-pro-32k or ep-...)" value={providerForm.default_model} onChange={(e) => setProviderForm((current) => ({ ...current, default_model: e.target.value }))} />
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
            )}

            {providerError && (
              <div className="mt-4"><Badge variant="danger">{providerError}</Badge></div>
            )}
      </Modal>
    </div>
  );
}
