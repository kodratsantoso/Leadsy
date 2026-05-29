"use client";

import { useState, useEffect, type ComponentType } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Save, Loader2, Loader, Key, MapPin, MessageSquare, CheckCircle2, Check, X, AlertCircle, Database, Eye, RefreshCw, Share2, Video, Megaphone, Globe2 } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import Link from "next/link";

type IntegrationConfig = {
  id?: number;
  category: string;
  key: string;
  value: string;
  is_secret: boolean;
  is_active: boolean;
  value_type: "string" | "boolean" | "number" | "json";
};

type TabKey = "lead_platforms" | "maps" | "whatsapp" | "lusha" | "webhooks" | "lark";
type LeadPlatformField = {
  suffix: string;
  label: string;
  value_type: "string" | "boolean" | "number" | "json";
  is_secret: boolean;
  defaultValue: string;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
  visibleWhen?: { suffix: string; value: string };
};

type LeadPlatformDefinition = {
  id: string;
  name: string;
  icon: ComponentType<{ className?: string }>;
  sso: boolean;
  docsUrl: string;
  fields: LeadPlatformField[];
};

const asBooleanString = (value: unknown) => (value === true || value === "true" || value === 1 || value === "1" ? "true" : "false");
const asStringValue = (value: unknown) => (value == null ? "" : String(value));

const normalizeLarkModuleValue = (value: unknown) => value === true || value === "true";
const normalizeLarkModules = (modules: Record<string, unknown> | null | undefined) => ({
  messenger: normalizeLarkModuleValue(modules?.messenger),
  meeting: normalizeLarkModuleValue(modules?.meeting),
  calendar: normalizeLarkModuleValue(modules?.calendar),
  task: normalizeLarkModuleValue(modules?.task),
  base: normalizeLarkModuleValue(modules?.base),
  sso: normalizeLarkModuleValue(modules?.sso),
});

const DEFAULT_LARK_BASE_FIELD_MAPPING = {
  leadsy_id: "Leadsy ID",
  company_name: "Company Name",
  website: "Website",
  email: "Email",
  phone: "Phone",
  address: "Address",
  business_category: "Business Category",
  lead_score: "Lead Score",
  qualification_status: "Status",
  funnel_stage: "Funnel Stage",
  owner: "Owner",
  external_place_id: "External Place ID",
};

const LEADSY_LEAD_FIELDS = [
  { key: "leadsy_id", label: "Leadsy ID", description: "Internal Leadsy lead ID" },
  { key: "company_name", label: "Company Name", description: "Lead company or account name" },
  { key: "website", label: "Website", description: "Company website" },
  { key: "email", label: "Email", description: "Primary company email" },
  { key: "phone", label: "Phone", description: "Primary phone number" },
  { key: "address", label: "Address", description: "Company address" },
  { key: "business_category", label: "Business Category", description: "Business category from discovery or manual input" },
  { key: "lead_score", label: "Lead Score", description: "Leadsy score value" },
  { key: "qualification_status", label: "Qualification Status", description: "pending, eligible, potential, or not eligible" },
  { key: "funnel_stage", label: "Funnel Stage", description: "Current funnel stage name" },
  { key: "owner", label: "Owner", description: "Lead owner display name" },
  { key: "external_place_id", label: "External Place ID", description: "Google Maps Place ID or external source ID" },
] as const;

type LeadsyLeadFieldKey = (typeof LEADSY_LEAD_FIELDS)[number]["key"];

type LarkBaseTable = {
  table_id: string;
  name?: string;
  revision?: number;
};

type LarkBaseField = {
  field_id: string;
  field_name: string;
  type?: number;
  property?: unknown;
};

type LarkBaseMapping = {
  id: number;
  app_token: string;
  table_id: string;
  table_name?: string;
  sync_direction: "leadsy_to_lark" | "lark_to_leadsy" | "two_way";
  field_mapping: Record<string, string>;
  is_active: boolean;
  record_mappings_count?: number;
  last_pull_at?: string | null;
  last_push_at?: string | null;
};

type LarkBaseSyncDirection = "push" | "pull";

type LarkBaseSyncResultItem = {
  status: "success" | "skipped" | "failed";
  action: "added" | "updated" | "deleted" | "skipped" | "failed";
  lead_id?: number | string | null;
  record_id?: string | null;
  lark_record_id?: string | null;
  company_name?: string | null;
  reason?: string | null;
};

type LarkBaseSyncResult = {
  success: boolean;
  synced_count: number;
  attempted_count: number;
  skipped_count: number;
  added_count: number;
  updated_count: number;
  deleted_count: number;
  failed_count: number;
  error_count: number;
  errors?: { message?: string; company_name?: string; record_id?: string | null; lead_id?: number | string | null }[];
  results?: LarkBaseSyncResultItem[];
};

type LarkBaseSyncDialogState = {
  open: boolean;
  status: "running" | "success" | "failed";
  direction: LarkBaseSyncDirection;
  mappingName: string;
  result?: LarkBaseSyncResult;
  error?: string;
};

const DEFAULT_MAPS: Record<string, IntegrationConfig> = {
  GOOGLE_MAPS_ENABLED:            { category: "maps", key: "GOOGLE_MAPS_ENABLED",            value: "true",    is_secret: false, is_active: true, value_type: "boolean" },
  GOOGLE_MAPS_BROWSER_API_KEY:    { category: "maps", key: "GOOGLE_MAPS_BROWSER_API_KEY",    value: "",        is_secret: false, is_active: true, value_type: "string"  },
  GOOGLE_MAPS_DEFAULT_CENTER_LAT: { category: "maps", key: "GOOGLE_MAPS_DEFAULT_CENTER_LAT", value: "-6.2088", is_secret: false, is_active: true, value_type: "number"  },
  GOOGLE_MAPS_DEFAULT_CENTER_LNG: { category: "maps", key: "GOOGLE_MAPS_DEFAULT_CENTER_LNG", value: "106.8456",is_secret: false, is_active: true, value_type: "number"  },
};

const DEFAULT_WHATSAPP: Record<string, IntegrationConfig> = {
  WHATSAPP_ENABLED:      { category: "whatsapp", key: "WHATSAPP_ENABLED",      value: "true",                  is_secret: false, is_active: true, value_type: "boolean" },
  WHATSAPP_SESSION_NAME: { category: "whatsapp", key: "WHATSAPP_SESSION_NAME", value: "leads_platform_session", is_secret: false, is_active: true, value_type: "string"  },
  WHATSAPP_WEBHOOK_URL:  { category: "whatsapp", key: "WHATSAPP_WEBHOOK_URL",  value: "",                      is_secret: false, is_active: true, value_type: "string"  },
};

const DEFAULT_LUSHA: Record<string, IntegrationConfig> = {
  LUSHA_ENABLED:              { category: "lusha", key: "LUSHA_ENABLED",              value: "false", is_secret: false, is_active: true, value_type: "boolean" },
  LUSHA_API_KEY:              { category: "lusha", key: "LUSHA_API_KEY",              value: "",      is_secret: true,  is_active: true, value_type: "string"  },
  LUSHA_MAX_DAILY_REQUESTS:   { category: "lusha", key: "LUSHA_MAX_DAILY_REQUESTS",   value: "50",    is_secret: false, is_active: true, value_type: "number"  },
  LUSHA_MAX_PER_BATCH:        { category: "lusha", key: "LUSHA_MAX_PER_BATCH",        value: "10",    is_secret: false, is_active: true, value_type: "number"  },
  LUSHA_ENRICHMENT_PRIORITY:  { category: "lusha", key: "LUSHA_ENRICHMENT_PRIORITY",  value: "1",     is_secret: false, is_active: true, value_type: "number"  },
};

const baseOauthFields: LeadPlatformField[] = [
  { suffix: "CLIENT_ID", label: "Client ID / App ID", value_type: "string", is_secret: false, defaultValue: "" },
  { suffix: "CLIENT_SECRET", label: "Client Secret / App Secret", value_type: "string", is_secret: true, defaultValue: "" },
  { suffix: "ACCESS_TOKEN", label: "Access Token", value_type: "string", is_secret: true, defaultValue: "" },
  { suffix: "REFRESH_TOKEN", label: "Refresh Token", value_type: "string", is_secret: true, defaultValue: "" },
  { suffix: "REDIRECT_URI", label: "Redirect URI", value_type: "string", is_secret: false, defaultValue: "" },
];

const LEAD_PLATFORM_DEFINITIONS: LeadPlatformDefinition[] = [
  {
    id: "facebook",
    name: "Facebook Lead Ads",
    icon: Globe2,
    sso: true,
    docsUrl: "https://developers.facebook.com/docs/marketing-api/guides/lead-ads/",
    fields: [
      { suffix: "ENABLED", label: "Enabled", value_type: "boolean", is_secret: false, defaultValue: "false" },
      { suffix: "CLIENT_ID", label: "Meta App ID", value_type: "string", is_secret: false, defaultValue: "" },
      { suffix: "CLIENT_SECRET", label: "Meta App Secret", value_type: "string", is_secret: true, defaultValue: "" },
      { suffix: "ACCESS_TOKEN", label: "Page Access Token", value_type: "string", is_secret: true, defaultValue: "" },
      { suffix: "PAGE_ID", label: "Facebook Page ID", value_type: "string", is_secret: false, defaultValue: "" },
      { suffix: "VERIFY_TOKEN", label: "Webhook Verify Token", value_type: "string", is_secret: true, defaultValue: "" },
      { suffix: "REDIRECT_URI", label: "OAuth Redirect URI", value_type: "string", is_secret: false, defaultValue: "" },
    ],
  },
  {
    id: "instagram",
    name: "Instagram Graph API",
    icon: Share2,
    sso: true,
    docsUrl: "https://developers.facebook.com/docs/instagram-api/",
    fields: [
      { suffix: "ENABLED", label: "Enabled", value_type: "boolean", is_secret: false, defaultValue: "false" },
      { suffix: "CLIENT_ID", label: "Meta App ID", value_type: "string", is_secret: false, defaultValue: "" },
      { suffix: "CLIENT_SECRET", label: "Meta App Secret", value_type: "string", is_secret: true, defaultValue: "" },
      { suffix: "ACCESS_TOKEN", label: "Page Access Token", value_type: "string", is_secret: true, defaultValue: "" },
      { suffix: "PAGE_ID", label: "Connected Facebook Page ID", value_type: "string", is_secret: false, defaultValue: "" },
      { suffix: "IG_USER_ID", label: "Instagram Business Account ID", value_type: "string", is_secret: false, defaultValue: "" },
      { suffix: "VERIFY_TOKEN", label: "Webhook Verify Token", value_type: "string", is_secret: true, defaultValue: "" },
      { suffix: "REDIRECT_URI", label: "OAuth Redirect URI", value_type: "string", is_secret: false, defaultValue: "" },
    ],
  },
  {
    id: "tiktok",
    name: "TikTok Business API",
    icon: Video,
    sso: true,
    docsUrl: "https://business-api.tiktok.com/portal/docs",
    fields: [
      { suffix: "ENABLED", label: "Enabled", value_type: "boolean", is_secret: false, defaultValue: "false" },
      { suffix: "CLIENT_ID", label: "App ID", value_type: "string", is_secret: false, defaultValue: "" },
      { suffix: "CLIENT_SECRET", label: "Secret", value_type: "string", is_secret: true, defaultValue: "" },
      { suffix: "ACCESS_TOKEN", label: "Access Token", value_type: "string", is_secret: true, defaultValue: "" },
      { suffix: "ADVERTISER_ID", label: "Advertiser ID", value_type: "string", is_secret: false, defaultValue: "" },
      { suffix: "REDIRECT_URI", label: "OAuth Redirect URI", value_type: "string", is_secret: false, defaultValue: "" },
    ],
  },
  {
    id: "youtube",
    name: "YouTube Analytics",
    icon: Video,
    sso: true,
    docsUrl: "https://developers.google.com/youtube/reporting/guides/authorization",
    fields: [
      { suffix: "ENABLED", label: "Enabled", value_type: "boolean", is_secret: false, defaultValue: "false" },
      ...baseOauthFields,
      { suffix: "CHANNEL_ID", label: "YouTube Channel ID", value_type: "string", is_secret: false, defaultValue: "" },
    ],
  },
  {
    id: "linkedin",
    name: "LinkedIn Marketing",
    icon: Share2,
    sso: true,
    docsUrl: "https://learn.microsoft.com/en-us/linkedin/marketing/lead-sync/leadsync?view=li-lms-2026-05",
    fields: [
      { suffix: "ENABLED", label: "Enabled", value_type: "boolean", is_secret: false, defaultValue: "false" },
      ...baseOauthFields,
      { suffix: "AD_ACCOUNT_ID", label: "Ad Account ID", value_type: "string", is_secret: false, defaultValue: "" },
      { suffix: "ORGANIZATION_URN", label: "Organization URN", value_type: "string", is_secret: false, defaultValue: "" },
    ],
  },
  {
    id: "google_ads",
    name: "Google Ads Lead Forms",
    icon: Megaphone,
    sso: true,
    docsUrl: "https://developers.google.com/google-ads/api/rest/auth",
    fields: [
      { suffix: "ENABLED", label: "Enabled", value_type: "boolean", is_secret: false, defaultValue: "false" },
      {
        suffix: "API_MODE",
        label: "Connection Mode",
        value_type: "string",
        is_secret: false,
        defaultValue: "api",
        help: "API OAuth validates Google Ads API access. Webhook validates Lead Form webhook delivery key.",
        options: [
          { value: "api", label: "Google Ads API OAuth" },
          { value: "webhook", label: "Lead Form Webhook" },
        ],
      },
      { suffix: "GOOGLE_KEY", label: "Webhook Google Key", value_type: "string", is_secret: true, defaultValue: "", visibleWhen: { suffix: "API_MODE", value: "webhook" } },
      { suffix: "DEVELOPER_TOKEN", label: "Google Ads Developer Token", value_type: "string", is_secret: true, defaultValue: "", visibleWhen: { suffix: "API_MODE", value: "api" } },
      { suffix: "CLIENT_CUSTOMER_ID", label: "Customer ID", value_type: "string", is_secret: false, defaultValue: "", placeholder: "520-865-3582 or 5208653582", visibleWhen: { suffix: "API_MODE", value: "api" } },
      { suffix: "LOGIN_CUSTOMER_ID", label: "Login Customer ID (MCC optional)", value_type: "string", is_secret: false, defaultValue: "", placeholder: "Manager account ID without dashes if using MCC", visibleWhen: { suffix: "API_MODE", value: "api" } },
      { suffix: "CLIENT_ID", label: "OAuth Client ID", value_type: "string", is_secret: false, defaultValue: "", visibleWhen: { suffix: "API_MODE", value: "api" } },
      { suffix: "CLIENT_SECRET", label: "OAuth Client Secret", value_type: "string", is_secret: true, defaultValue: "", visibleWhen: { suffix: "API_MODE", value: "api" } },
      { suffix: "ACCESS_TOKEN", label: "Access Token (optional)", value_type: "string", is_secret: true, defaultValue: "", help: "Optional. If empty, Leadsy will refresh it from the refresh token during Test Connection.", visibleWhen: { suffix: "API_MODE", value: "api" } },
      { suffix: "REFRESH_TOKEN", label: "Refresh Token", value_type: "string", is_secret: true, defaultValue: "", visibleWhen: { suffix: "API_MODE", value: "api" } },
      { suffix: "REDIRECT_URI", label: "Redirect URI", value_type: "string", is_secret: false, defaultValue: "", help: "Required only when starting the OAuth login flow.", visibleWhen: { suffix: "API_MODE", value: "api" } },
    ],
  },
  {
    id: "mekari_qontak",
    name: "Mekari Qontak",
    icon: MessageSquare,
    sso: false,
    docsUrl: "https://docs.qontak.com/",
    fields: [
      { suffix: "ENABLED", label: "Enabled", value_type: "boolean", is_secret: false, defaultValue: "false" },
      { suffix: "BASE_URL", label: "Base URL", value_type: "string", is_secret: false, defaultValue: "https://api.mekari.com" },
      { suffix: "ACCESS_TOKEN", label: "Bearer Access Token", value_type: "string", is_secret: true, defaultValue: "" },
      { suffix: "CHANNEL_ID", label: "WhatsApp / Omnichannel Channel ID", value_type: "string", is_secret: false, defaultValue: "" },
    ],
  },
  {
    id: "hubspot",
    name: "HubSpot CRM",
    icon: Database,
    sso: true,
    docsUrl: "https://developers.hubspot.com/docs/api/intro-to-auth",
    fields: [
      { suffix: "ENABLED", label: "Enabled", value_type: "boolean", is_secret: false, defaultValue: "false" },
      ...baseOauthFields,
      { suffix: "PORTAL_ID", label: "Hub ID / Portal ID", value_type: "string", is_secret: false, defaultValue: "" },
    ],
  },
  {
    id: "salesforce",
    name: "Salesforce",
    icon: Database,
    sso: true,
    docsUrl: "https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_flows.htm",
    fields: [
      { suffix: "ENABLED", label: "Enabled", value_type: "boolean", is_secret: false, defaultValue: "false" },
      ...baseOauthFields,
      { suffix: "INSTANCE_URL", label: "Instance URL", value_type: "string", is_secret: false, defaultValue: "", placeholder: "https://your-domain.my.salesforce.com" },
    ],
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    icon: Database,
    sso: true,
    docsUrl: "https://pipedrive.readme.io/docs/core-api-concepts-authentication",
    fields: [
      { suffix: "ENABLED", label: "Enabled", value_type: "boolean", is_secret: false, defaultValue: "false" },
      { suffix: "API_DOMAIN", label: "Company API Domain", value_type: "string", is_secret: false, defaultValue: "", placeholder: "https://companydomain.pipedrive.com" },
      { suffix: "API_TOKEN", label: "API Token", value_type: "string", is_secret: true, defaultValue: "" },
      ...baseOauthFields,
    ],
  },
  {
    id: "zapier",
    name: "Zapier Webhooks",
    icon: Share2,
    sso: false,
    docsUrl: "https://help.zapier.com/hc/en-us/articles/8496288690317-Trigger-Zaps-from-webhooks",
    fields: [
      { suffix: "ENABLED", label: "Enabled", value_type: "boolean", is_secret: false, defaultValue: "false" },
      { suffix: "WEBHOOK_URL", label: "Catch Hook URL", value_type: "string", is_secret: true, defaultValue: "" },
      { suffix: "BASIC_AUTH_USERNAME", label: "Basic Auth Username", value_type: "string", is_secret: false, defaultValue: "" },
      { suffix: "BASIC_AUTH_PASSWORD", label: "Basic Auth Password", value_type: "string", is_secret: true, defaultValue: "" },
    ],
  },
  {
    id: "make",
    name: "Make Webhooks",
    icon: Share2,
    sso: false,
    docsUrl: "https://apps.make.com/gateway",
    fields: [
      { suffix: "ENABLED", label: "Enabled", value_type: "boolean", is_secret: false, defaultValue: "false" },
      { suffix: "WEBHOOK_URL", label: "Custom Webhook URL", value_type: "string", is_secret: true, defaultValue: "" },
      { suffix: "API_KEY", label: "x-make-apikey", value_type: "string", is_secret: true, defaultValue: "" },
    ],
  },
  {
    id: "hunter",
    name: "Hunter.io",
    icon: Key,
    sso: false,
    docsUrl: "https://help.hunter.io/en/articles/1970956-hunter-api",
    fields: [
      { suffix: "ENABLED", label: "Enabled", value_type: "boolean", is_secret: false, defaultValue: "false" },
      { suffix: "API_KEY", label: "API Key", value_type: "string", is_secret: true, defaultValue: "" },
    ],
  },
];

function leadPlatformKey(platformId: string, suffix: string) {
  return `${platformId.toUpperCase()}_${suffix}`;
}

function isLeadPlatformFieldVisible(
  platformId: string,
  field: LeadPlatformField,
  configs: Record<string, IntegrationConfig>
) {
  if (!field.visibleWhen) return true;

  const controllerKey = leadPlatformKey(platformId, field.visibleWhen.suffix);
  return (configs[controllerKey]?.value || "") === field.visibleWhen.value;
}

function createDefaultLeadPlatforms(): Record<string, IntegrationConfig> {
  return Object.fromEntries(
    LEAD_PLATFORM_DEFINITIONS.flatMap((platform) =>
      platform.fields.map((field) => {
        const key = leadPlatformKey(platform.id, field.suffix);
        return [
          key,
          {
            category: "lead_platforms",
            key,
            value: field.defaultValue,
            is_secret: field.is_secret,
            is_active: true,
            value_type: field.value_type,
          },
        ];
      })
    )
  ) as Record<string, IntegrationConfig>;
}

export default function IntegrationsSettingsPage() {
  const [tab, setTab] = useState<TabKey>("lead_platforms");
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg]   = useState("");
  const [platformStatus, setPlatformStatus] = useState<Record<string, string>>({});
  const [platformPreview, setPlatformPreview] = useState<Record<string, unknown[]>>({});
  const [baseSyncDialog, setBaseSyncDialog] = useState<LarkBaseSyncDialogState>({
    open: false,
    status: "running",
    direction: "push",
    mappingName: "",
  });

  const [mapsConfig, setMapsConfig]         = useState<Record<string, IntegrationConfig>>(DEFAULT_MAPS);
  const [whatsappConfig, setWhatsappConfig] = useState<Record<string, IntegrationConfig>>(DEFAULT_WHATSAPP);
  const [lushaConfig, setLushaConfig]       = useState<Record<string, IntegrationConfig>>(DEFAULT_LUSHA);
  const [leadPlatformsConfig, setLeadPlatformsConfig] = useState<Record<string, IntegrationConfig>>(createDefaultLeadPlatforms);
  const [larkConfig, setLarkConfig] = useState({
    app_id: '',
    app_secret: '',
    verification_token: '',
    encrypt_key: '',
    base_url: '',
  });
  const [larkModules, setLarkModules] = useState({
    messenger: false,
    meeting: false,
    calendar: false,
    task: false,
    base: false,
    sso: false,
  });
  const [baseAppToken, setBaseAppToken] = useState("");
  const [selectedBaseTable, setSelectedBaseTable] = useState<LarkBaseTable | null>(null);
  const [baseSyncDirection, setBaseSyncDirection] = useState<"leadsy_to_lark" | "lark_to_leadsy" | "two_way">("two_way");
  const [baseFieldMapping, setBaseFieldMapping] = useState<Record<LeadsyLeadFieldKey, string>>({ ...DEFAULT_LARK_BASE_FIELD_MAPPING });

  // ── Load saved configs from DB (authenticated) ──────────────────────────────
  useEffect(() => {
    apiFetch("/settings/integrations")
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => {
        if (!json?.data) return;

        if (json.data.maps) {
          const next = { ...DEFAULT_MAPS };
          (json.data.maps as IntegrationConfig[]).forEach((c) => {
            next[c.key] = {
              ...c,
              value: c.value_type === "boolean" ? asBooleanString(c.value) : asStringValue(c.value),
            };
          });
          setMapsConfig(next);
        }

        if (json.data.whatsapp) {
          const next = { ...DEFAULT_WHATSAPP };
          (json.data.whatsapp as IntegrationConfig[]).forEach((c) => {
            next[c.key] = {
              ...c,
              value: c.value_type === "boolean" ? asBooleanString(c.value) : asStringValue(c.value),
            };
          });
          setWhatsappConfig(next);
        }

        if (json.data.lusha) {
          const next = { ...DEFAULT_LUSHA };
          (json.data.lusha as IntegrationConfig[]).forEach((c) => {
            next[c.key] = {
              ...c,
              value: c.value_type === "boolean" ? asBooleanString(c.value) : asStringValue(c.value),
            };
          });
          setLushaConfig(next);
        }

        if (json.data.lead_platforms) {
          const next = createDefaultLeadPlatforms();
          (json.data.lead_platforms as IntegrationConfig[]).forEach((c) => {
            next[c.key] = {
              ...c,
              value: c.value_type === "boolean" ? asBooleanString(c.value) : asStringValue(c.value),
            };
          });
          setLeadPlatformsConfig(next);
        }
      })
      .catch(err => console.warn("Integration config load:", err))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: larkConfigData, refetch: refetchLarkConfig } = useQuery({
    queryKey: ['lark-config'],
    queryFn: async () => {
      const res = await apiFetch('/api/lark/config');
      return res.json();
    },
  });

  const { data: larkStatusData } = useQuery({
    queryKey: ['lark-status'],
    queryFn: async () => {
      const res = await apiFetch('/api/lark/status');
      return res.json();
    },
    refetchInterval: 5000,
  });

  const { data: baseMappingsData, refetch: refetchBaseMappings } = useQuery({
    queryKey: ['lark-base-mappings'],
    queryFn: async () => {
      const res = await apiFetch('/api/lark/base/mappings');
      return res.json();
    },
  });

  const baseMappings: LarkBaseMapping[] = baseMappingsData?.data || [];

  const saveLarkConfigMutation = useMutation({
    mutationFn: async (data: typeof larkConfig) => {
      const res = await apiFetch('/api/lark/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          enabled_modules: larkModules,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to save Lark configuration');
      }
      return json;
    },
    onSuccess: () => {
      refetchLarkConfig();
      setSuccessMsg('Lark integration configured successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (error: any) => {
      setErrorMsg(error?.message || 'Failed to save Lark configuration');
      setTimeout(() => setErrorMsg(''), 5000);
    },
  });

  const testLarkConnectionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/api/lark/test-connection', {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to verify Lark connection');
      }
      return json;
    },
    onError: (error: any) => {
      setErrorMsg(error?.message || 'Failed to verify Lark connection');
      setTimeout(() => setErrorMsg(''), 5000);
    },
  });

  const toggleLarkModuleMutation = useMutation({
    mutationFn: async ({ module, enabled }: { module: string; enabled: boolean }) => {
      const res = await apiFetch('/api/lark/toggle-module', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module, enabled }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to update Lark module state');
      }
      return json;
    },
    onSuccess: (data) => {
      setLarkModules(data.enabled_modules || larkModules);
      refetchLarkConfig();
    },
    onError: (error: any) => {
      setErrorMsg(error?.message || 'Failed to update Lark module state');
      setTimeout(() => setErrorMsg(''), 5000);
    },
  });

  const listBaseTablesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/lark/base/tables?app_token=${encodeURIComponent(baseAppToken)}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to load Lark Base tables');
      }
      return json;
    },
    onError: (error: any) => {
      setErrorMsg(error?.message || 'Failed to load Lark Base tables');
      setTimeout(() => setErrorMsg(''), 5000);
    },
  });

  const listBaseFieldsMutation = useMutation({
    mutationFn: async ({ appToken, tableId }: { appToken: string; tableId: string }) => {
      const res = await apiFetch(`/api/lark/base/fields?app_token=${encodeURIComponent(appToken)}&table_id=${encodeURIComponent(tableId)}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to load Lark Base fields');
      }
      return json;
    },
    onSuccess: (data) => {
      const count = Array.isArray(data?.items) ? data.items.length : 0;
      setSuccessMsg(`Loaded ${count} Lark Base fields`);
      setTimeout(() => setSuccessMsg(''), 3000);
    },
    onError: (error: any) => {
      setErrorMsg(error?.message || 'Failed to load Lark Base fields');
      setTimeout(() => setErrorMsg(''), 5000);
    },
  });

  const previewBaseRecordsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBaseTable) throw new Error('Select a Base table first');
      const res = await apiFetch(`/api/lark/base/records/preview?app_token=${encodeURIComponent(baseAppToken)}&table_id=${encodeURIComponent(selectedBaseTable.table_id)}&page_size=10`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to preview Lark Base records');
      }
      return json;
    },
    onError: (error: any) => {
      setErrorMsg(error?.message || 'Failed to preview Lark Base records');
      setTimeout(() => setErrorMsg(''), 5000);
    },
  });

  const larkBaseFields: LarkBaseField[] = listBaseFieldsMutation.data?.items || [];
  const previewFieldNames = Object.keys(previewBaseRecordsMutation.data?.items?.[0]?.fields || {});
  const larkBaseFieldNames = larkBaseFields.length > 0
    ? larkBaseFields.map((field) => field.field_name)
    : previewFieldNames;

  const saveBaseMappingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBaseTable) throw new Error('Select a Base table first');
      const fieldMapping = Object.fromEntries(
        Object.entries(baseFieldMapping).filter(([, larkField]) => larkField.trim() !== "")
      );

      const res = await apiFetch('/api/lark/base/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app_token: baseAppToken,
          table_id: selectedBaseTable.table_id,
          table_name: selectedBaseTable.name,
          sync_direction: baseSyncDirection,
          field_mapping: fieldMapping,
          is_active: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to save Lark Base mapping');
      }
      return json;
    },
    onSuccess: () => {
      refetchBaseMappings();
      setSuccessMsg('Lark Base mapping saved');
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (error: any) => {
      setErrorMsg(error?.message || 'Failed to save Lark Base mapping');
      setTimeout(() => setErrorMsg(''), 5000);
    },
  });

  const syncBaseMappingMutation = useMutation({
    mutationFn: async ({ mappingId, direction }: { mappingId: number; direction: LarkBaseSyncDirection; mappingName: string }) => {
      const res = await apiFetch(`/api/lark/base/mappings/${mappingId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction, limit: 100 }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to sync Lark Base mapping');
      }
      return json;
    },
    onSuccess: (data: LarkBaseSyncResult, variables) => {
      refetchBaseMappings();
      setBaseSyncDialog({
        open: true,
        status: data.success === false ? "failed" : "success",
        direction: variables.direction,
        mappingName: variables.mappingName,
        result: data,
      });

      if (data.success === false) {
        const firstError = data.errors?.[0]?.message ? ` First error: ${data.errors[0].message}` : "";
        setErrorMsg(`Sync completed with ${data.error_count || 0} errors. ${data.synced_count || 0}/${data.attempted_count || 0} records synced.${firstError}`);
        setTimeout(() => setErrorMsg(''), 8000);
        return;
      }

      setSuccessMsg(`Sync complete: ${data.synced_count || 0}/${data.attempted_count || 0} records`);
      setTimeout(() => setSuccessMsg(''), 4000);
    },
    onError: (error: any, variables) => {
      setBaseSyncDialog({
        open: true,
        status: "failed",
        direction: variables.direction,
        mappingName: variables.mappingName,
        error: error?.message || "Failed to sync Lark Base mapping",
      });
      setErrorMsg(error?.message || 'Failed to sync Lark Base mapping');
      setTimeout(() => setErrorMsg(''), 5000);
    },
  });

  const startBaseSync = (mapping: LarkBaseMapping, direction: LarkBaseSyncDirection) => {
    const mappingName = mapping.table_name || mapping.table_id;

    setBaseSyncDialog({
      open: true,
      status: "running",
      direction,
      mappingName,
    });
    syncBaseMappingMutation.mutate({ mappingId: mapping.id, direction, mappingName });
  };

  useEffect(() => {
    if (larkConfigData?.configured) {
      setLarkConfig({
        app_id: larkConfigData.app_id || '',
        app_secret: '',
        verification_token: '',
        encrypt_key: '',
        base_url: larkConfigData.base_url || '',
      });
      setLarkModules(normalizeLarkModules(larkConfigData.enabled_modules));
    }
  }, [larkConfigData]);

  useEffect(() => {
    const firstMapping = baseMappings[0];
    if (!firstMapping || baseAppToken) {
      return;
    }

    setBaseAppToken(firstMapping.app_token);
    setSelectedBaseTable({
      table_id: firstMapping.table_id,
      name: firstMapping.table_name,
    });
    setBaseSyncDirection(firstMapping.sync_direction);
    setBaseFieldMapping({ ...DEFAULT_LARK_BASE_FIELD_MAPPING, ...(firstMapping.field_mapping || {}) });
  }, [baseMappings, baseAppToken]);

  const handleSelectBaseTable = (table: LarkBaseTable) => {
    setSelectedBaseTable(table);
    const saved = baseMappings.find((mapping) => mapping.app_token === baseAppToken && mapping.table_id === table.table_id);
    if (saved) {
      setBaseSyncDirection(saved.sync_direction);
      setBaseFieldMapping({ ...DEFAULT_LARK_BASE_FIELD_MAPPING, ...(saved.field_mapping || {}) });
    }

    if (baseAppToken && larkModules.base) {
      listBaseFieldsMutation.mutate({ appToken: baseAppToken, tableId: table.table_id });
    }
  };

  const updateBaseFieldMapping = (leadsyField: LeadsyLeadFieldKey, larkField: string) => {
    setBaseFieldMapping((current) => ({
      ...current,
      [leadsyField]: larkField,
    }));
  };

  const applyAutoMapping = (fieldNames: string[]) => {
    let matchCount = 0;

    setBaseFieldMapping((current) => {
      const next = { ...current };
      LEADSY_LEAD_FIELDS.forEach((field) => {
        const preferred = DEFAULT_LARK_BASE_FIELD_MAPPING[field.key];
        const matched = fieldNames.find((name) => normalizeFieldName(name) === normalizeFieldName(preferred))
          || fieldNames.find((name) => normalizeFieldName(name) === normalizeFieldName(field.label))
          || fieldNames.find((name) => normalizeFieldName(name) === normalizeFieldName(field.key))
          || fieldNames.find((name) => normalizeFieldName(name).includes(normalizeFieldName(field.key)))
          || fieldNames.find((name) => normalizeFieldName(field.key).includes(normalizeFieldName(name)));
        if (matched) {
          next[field.key] = matched;
          matchCount++;
        }
      });
      return next;
    });

    return matchCount;
  };

  const autoMapBaseFields = async () => {
    let fieldNames = larkBaseFieldNames;

    if (fieldNames.length === 0) {
      if (!baseAppToken || !selectedBaseTable) {
        setErrorMsg('Select a Lark Base table before running Auto Match');
        setTimeout(() => setErrorMsg(''), 5000);
        return;
      }

      try {
        const data = await listBaseFieldsMutation.mutateAsync({
          appToken: baseAppToken,
          tableId: selectedBaseTable.table_id,
        });
        fieldNames = (data?.items || []).map((field: LarkBaseField) => field.field_name);
      } catch {
        return;
      }
    }

    const matchCount = applyAutoMapping(fieldNames);
    if (matchCount > 0) {
      setSuccessMsg(`Auto matched ${matchCount} Leadsy fields`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg('No matching Lark Base field names found. Please map the fields manually.');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  };

  // ── Save configs to DB (authenticated) ──────────────────────────────────────
  const handleSave = async (category: string, configs: Record<string, IntegrationConfig>) => {
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");
    try {
      const payload = {
        category,
        configs: Object.values(configs).map((c) => ({
          key:        c.key,
          value:      c.value,
          is_secret:  c.is_secret,
          value_type: c.value_type,
          is_active:  c.is_active,
        })),
      };

      const res = await apiFetch("/settings/integrations", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccessMsg("Settings saved successfully!");
        setTimeout(() => setSuccessMsg(""), 4000);
        return true;
      } else {
        const body = await res.json().catch(() => ({}));
        setErrorMsg(body?.message || `Save failed (HTTP ${res.status})`);
        setTimeout(() => setErrorMsg(""), 5000);
        return false;
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Network error");
      setTimeout(() => setErrorMsg(""), 5000);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const runPlatformAction = async (platformId: string, action: "test" | "preview" | "oauth-url") => {
    setErrorMsg("");
    setSuccessMsg("");
    setPlatformStatus((current) => ({ ...current, [platformId]: "Running..." }));

    try {
      const res = await apiFetch(`/settings/integration-platforms/${platformId}/${action}`, {
        method: action === "preview" ? "GET" : "POST",
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.message || `Platform action failed (HTTP ${res.status})`);
      }

      if (action === "oauth-url") {
        const url = json?.data?.authorization_url;
        if (url) {
          window.open(url, "_blank", "noopener,noreferrer");
          setPlatformStatus((current) => ({ ...current, [platformId]: "OAuth authorization opened" }));
        } else {
          setPlatformStatus((current) => ({ ...current, [platformId]: "OAuth URL unavailable" }));
        }
        return;
      }

      if (action === "preview") {
        const items = Array.isArray(json?.data?.items) ? json.data.items : [];
        setPlatformPreview((current) => ({ ...current, [platformId]: items }));
      }

      setPlatformStatus((current) => ({
        ...current,
        [platformId]: json?.data?.message || "Action completed",
      }));
    } catch (err: any) {
      setPlatformStatus((current) => ({
        ...current,
        [platformId]: err?.message || "Action failed",
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <div className="space-y-1">
        <BackToSettings />
        <h1 className="text-3xl font-bold tracking-tight">Integration Setting</h1>
        <p className="text-sm text-muted-foreground">
          Manage social media, ad platform, CRM, event, SSO, and non-AI integration credentials.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--brand)]/20 bg-[var(--brand)]/5 p-4">
        <p className="text-sm font-medium text-foreground">AI providers and AI API keys now live in one place.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Use <Link href="/settings/ai-defaults" className="font-medium text-[var(--brand)] hover:underline">Settings → AI Default</Link> for AI providers, model routing, prompt templates, fallback order, and secure key visibility.
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          { key: "lead_platforms", label: "Lead Platforms", icon: Share2 },
          { key: "maps", label: "Google Maps", icon: MapPin },
          { key: "whatsapp", label: "WhatsApp", icon: MessageSquare },
          { key: "lusha", label: "Lusha", icon: Key },
          { key: "lark", label: "Lark", icon: Key },
          { key: "webhooks", label: "Webhooks", icon: Key },
        ]}
      />

      {tab === "lead_platforms" && (
        <div className="space-y-4">
          <Card className="p-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Social Media & Platform Credentials</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Prepare credentials for inbound lead generators, OAuth login starts, connection checks, and supported data previews. Secrets are saved through the encrypted integration settings store; provider OAuth callback token exchange remains a backend phase.
                </p>
              </div>
              <Badge variant="warning">OAuth exchange pending</Badge>
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            {LEAD_PLATFORM_DEFINITIONS.map((platform) => {
              const enabledKey = leadPlatformKey(platform.id, "ENABLED");
              const Icon = platform.icon;
              const previewItems = platformPreview[platform.id] || [];
              const googleAdsMode = leadPlatformsConfig[leadPlatformKey("google_ads", "API_MODE")]?.value || "api";
              const oauthAvailable = platform.sso && (platform.id !== "google_ads" || googleAdsMode === "api");
              return (
                <Card key={platform.id} className="p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--surface-strong)]">
                        <Icon className="h-5 w-5 text-[color:var(--brand)]" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">{platform.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {platform.sso ? "OAuth/SSO + manual credentials" : "Manual token or webhook credentials"}
                        </p>
                      </div>
                    </div>
                    <Badge variant={leadPlatformsConfig[enabledKey]?.value === "true" ? "success" : "neutral"}>
                      {leadPlatformsConfig[enabledKey]?.value === "true" ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center justify-between rounded-xl border border-border bg-[color:var(--surface-subtle)] px-3 py-2">
                      <span className="text-sm font-medium">Enable {platform.name}</span>
                      <input
                        type="checkbox"
                        checked={leadPlatformsConfig[enabledKey]?.value === "true"}
                        onChange={(e) => setLeadPlatformsConfig((current) => ({
                          ...current,
                          [enabledKey]: {
                            ...current[enabledKey],
                            value: e.target.checked ? "true" : "false",
                          },
                        }))}
                        className="h-4 w-4 rounded border-border"
                      />
                    </label>

                    {platform.fields
                      .filter((field) => field.suffix !== "ENABLED")
                      .filter((field) => isLeadPlatformFieldVisible(platform.id, field, leadPlatformsConfig))
                      .map((field) => {
                      const key = leadPlatformKey(platform.id, field.suffix);
                      return (
                        <div key={key}>
                          <label className="text-xs font-medium">{field.label}</label>
                          {field.options ? (
                            <Select
                              className="mt-1"
                              value={leadPlatformsConfig[key]?.value ?? field.defaultValue}
                              onChange={(e) => setLeadPlatformsConfig((current) => ({
                                ...current,
                                [key]: {
                                  ...current[key],
                                  value: e.target.value,
                                },
                              }))}
                            >
                              {field.options.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </Select>
                          ) : (
                            <Input
                              className="mt-1"
                              type={field.is_secret ? "password" : "text"}
                              value={leadPlatformsConfig[key]?.value ?? ""}
                              placeholder={field.placeholder || (field.is_secret ? "Encrypted after save" : `${platform.name} ${field.label}`)}
                              autoComplete="off"
                              spellCheck={false}
                              onChange={(e) => setLeadPlatformsConfig((current) => ({
                                ...current,
                                [key]: {
                                  ...current[key],
                                  value: e.target.value,
                                },
                              }))}
                            />
                          )}
                          {field.help ? <p className="mt-1 text-xs text-muted-foreground">{field.help}</p> : null}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={!oauthAvailable}
                      onClick={async () => {
                        if (await handleSave("lead_platforms", leadPlatformsConfig)) {
                          await runPlatformAction(platform.id, "oauth-url");
                        }
                      }}
                    >
                      Login with {platform.name}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        if (await handleSave("lead_platforms", leadPlatformsConfig)) {
                          await runPlatformAction(platform.id, "test");
                        }
                      }}
                    >
                      Test Connection
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        if (await handleSave("lead_platforms", leadPlatformsConfig)) {
                          await runPlatformAction(platform.id, "preview");
                        }
                      }}
                    >
                      View Data
                    </Button>
                    <a href={platform.docsUrl} target="_blank" rel="noreferrer">
                      <Button variant="link">Docs</Button>
                    </a>
                  </div>
                  {platformStatus[platform.id] ? (
                    <p className="mt-3 rounded-xl border border-border bg-[color:var(--surface-subtle)] px-3 py-2 text-xs text-muted-foreground">
                      {platformStatus[platform.id]}
                    </p>
                  ) : null}
                  {previewItems.length > 0 ? (
                    <pre className="mt-3 max-h-48 overflow-auto rounded-xl border border-border bg-[color:var(--surface-subtle)] p-3 text-xs text-muted-foreground">
                      {JSON.stringify(previewItems.slice(0, 3), null, 2)}
                    </pre>
                  ) : null}
                </Card>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => handleSave("lead_platforms", leadPlatformsConfig)}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Platform Credentials
            </Button>
            {successMsg && (
              <span className="flex items-center gap-1 text-sm font-medium text-[color:var(--success)]">
                <CheckCircle2 className="h-4 w-4" /> {successMsg}
              </span>
            )}
            {errorMsg && (
              <span className="flex items-center gap-1 text-sm font-medium text-[color:var(--danger)]">
                <AlertCircle className="h-4 w-4" /> {errorMsg}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Google Maps ── */}
      {tab === "maps" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-1">Google Maps Configuration</h2>
            <p className="text-xs text-muted-foreground mb-6">
              Configure the Google Maps API key for the Map & Territory page.
              Get a key from{" "}
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-indigo-400 underline">
                Google Cloud Console
              </a>
              .
            </p>

            <div className="space-y-5">
              {/* Enable toggle */}
              <div className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3">
                <div>
                  <label className="text-sm font-medium">Enable Maps Integration</label>
                  <p className="text-xs text-muted-foreground">Toggle the map interface across the entire application.</p>
                </div>
                <input
                  type="checkbox"
                  checked={mapsConfig.GOOGLE_MAPS_ENABLED.value === "true"}
                  onChange={(e) => setMapsConfig({
                    ...mapsConfig,
                    GOOGLE_MAPS_ENABLED: { ...mapsConfig.GOOGLE_MAPS_ENABLED, value: e.target.checked ? "true" : "false" },
                  })}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
              </div>

              {/* Browser API Key */}
              <div>
                <label className="text-sm font-semibold">Browser API Key (Public)</label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Key used for client-side map rendering. Must be restricted by HTTP referrer in Google Cloud Console.
                </p>
                <input
                  type="text"
                  placeholder="AIzaSy..."
                  value={mapsConfig.GOOGLE_MAPS_BROWSER_API_KEY.value}
                  onChange={(e) => setMapsConfig({
                    ...mapsConfig,
                    GOOGLE_MAPS_BROWSER_API_KEY: { ...mapsConfig.GOOGLE_MAPS_BROWSER_API_KEY, value: e.target.value },
                  })}
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground/40"
                  autoComplete="off"
                  spellCheck={false}
                />
                {mapsConfig.GOOGLE_MAPS_BROWSER_API_KEY.value && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-emerald-500">
                    <CheckCircle2 className="h-3 w-3" /> API key entered — save to apply
                  </p>
                )}
                {!mapsConfig.GOOGLE_MAPS_BROWSER_API_KEY.value && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-amber-500">
                    <AlertCircle className="h-3 w-3" /> No key configured — map runs in preview mode
                  </p>
                )}
              </div>

              {/* Lat / Lng */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Default Center Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={mapsConfig.GOOGLE_MAPS_DEFAULT_CENTER_LAT.value}
                    onChange={(e) => setMapsConfig({
                      ...mapsConfig,
                      GOOGLE_MAPS_DEFAULT_CENTER_LAT: { ...mapsConfig.GOOGLE_MAPS_DEFAULT_CENTER_LAT, value: e.target.value },
                    })}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Default Center Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={mapsConfig.GOOGLE_MAPS_DEFAULT_CENTER_LNG.value}
                    onChange={(e) => setMapsConfig({
                      ...mapsConfig,
                      GOOGLE_MAPS_DEFAULT_CENTER_LNG: { ...mapsConfig.GOOGLE_MAPS_DEFAULT_CENTER_LNG, value: e.target.value },
                    })}
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => handleSave("maps", mapsConfig)}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Maps Config
              </button>
              {successMsg && (
                <span className="flex items-center gap-1 text-sm font-medium text-emerald-500">
                  <CheckCircle2 className="h-4 w-4" /> {successMsg}
                </span>
              )}
              {errorMsg && (
                <span className="flex items-center gap-1 text-sm font-medium text-red-500">
                  <AlertCircle className="h-4 w-4" /> {errorMsg}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── WhatsApp ── */}
      {tab === "whatsapp" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-1">WhatsApp Integration</h2>
            <p className="text-xs text-muted-foreground mb-6">
              Configure the WhatsApp session and webhook settings for the messaging module.
            </p>

            <div className="space-y-5">
              <div className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3">
                <div>
                  <label className="text-sm font-medium">Enable WhatsApp Features</label>
                  <p className="text-xs text-muted-foreground">Allows users to scan a QR code and sync session for direct messaging.</p>
                </div>
                <input
                  type="checkbox"
                  checked={whatsappConfig.WHATSAPP_ENABLED.value === "true"}
                  onChange={(e) => setWhatsappConfig({
                    ...whatsappConfig,
                    WHATSAPP_ENABLED: { ...whatsappConfig.WHATSAPP_ENABLED, value: e.target.checked ? "true" : "false" },
                  })}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Session Name</label>
                <p className="text-xs text-muted-foreground mt-0.5">Identifies this WhatsApp session in the sidecar service.</p>
                <input
                  value={whatsappConfig.WHATSAPP_SESSION_NAME.value}
                  onChange={(e) => setWhatsappConfig({
                    ...whatsappConfig,
                    WHATSAPP_SESSION_NAME: { ...whatsappConfig.WHATSAPP_SESSION_NAME, value: e.target.value },
                  })}
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Webhook URL</label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  URL the WhatsApp sidecar service sends events to (must be reachable from the sidecar container).
                </p>
                <input
                  placeholder="http://backend:8000/api/webhooks/whatsapp"
                  value={whatsappConfig.WHATSAPP_WEBHOOK_URL.value}
                  onChange={(e) => setWhatsappConfig({
                    ...whatsappConfig,
                    WHATSAPP_WEBHOOK_URL: { ...whatsappConfig.WHATSAPP_WEBHOOK_URL, value: e.target.value },
                  })}
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground/40"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => handleSave("whatsapp", whatsappConfig)}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save WhatsApp Config
              </button>
              {successMsg && (
                <span className="flex items-center gap-1 text-sm font-medium text-emerald-500">
                  <CheckCircle2 className="h-4 w-4" /> {successMsg}
                </span>
              )}
              {errorMsg && (
                <span className="flex items-center gap-1 text-sm font-medium text-red-500">
                  <AlertCircle className="h-4 w-4" /> {errorMsg}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Lusha ── */}
      {tab === "lusha" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-1">Lusha Extension (Contact Enrichment)</h2>
            <p className="text-xs text-muted-foreground mb-6">
              Configure Lusha API Key and rate-limiting policies for the Contact Discovery Engine.
            </p>

            <div className="space-y-5">
              <div className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3">
                <div>
                  <label className="text-sm font-medium">Enable Lusha Contact Discovery</label>
                  <p className="text-xs text-muted-foreground">Allows automatic contact discovery during the lead ingestion process.</p>
                </div>
                <input
                  type="checkbox"
                  checked={lushaConfig.LUSHA_ENABLED.value === "true"}
                  onChange={(e) => setLushaConfig({
                    ...lushaConfig,
                    LUSHA_ENABLED: { ...lushaConfig.LUSHA_ENABLED, value: e.target.checked ? "true" : "false" },
                  })}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Lusha API Key</label>
                <input
                  type="password"
                  placeholder="Secret Key..."
                  value={lushaConfig.LUSHA_API_KEY.value}
                  onChange={(e) => setLushaConfig({
                    ...lushaConfig,
                    LUSHA_API_KEY: { ...lushaConfig.LUSHA_API_KEY, value: e.target.value },
                  })}
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Max Daily Requests</label>
                <p className="text-xs text-muted-foreground mt-0.5">Total Lusha API calls allowed per calendar day across all batches.</p>
                <input
                  type="number"
                  min="1"
                  value={lushaConfig.LUSHA_MAX_DAILY_REQUESTS.value}
                  onChange={(e) => setLushaConfig({
                    ...lushaConfig,
                    LUSHA_MAX_DAILY_REQUESTS: { ...lushaConfig.LUSHA_MAX_DAILY_REQUESTS, value: e.target.value },
                  })}
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Max Enrichments per Batch</label>
                <p className="text-xs text-muted-foreground mt-0.5">Maximum number of leads to enrich in a single queue batch run.</p>
                <input
                  type="number"
                  min="1"
                  value={lushaConfig.LUSHA_MAX_PER_BATCH.value}
                  onChange={(e) => setLushaConfig({
                    ...lushaConfig,
                    LUSHA_MAX_PER_BATCH: { ...lushaConfig.LUSHA_MAX_PER_BATCH, value: e.target.value },
                  })}
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Enrichment Priority</label>
                <p className="text-xs text-muted-foreground mt-0.5">Provider order when multiple enrichment sources are configured (lower = higher priority).</p>
                <input
                  type="number"
                  min="1"
                  value={lushaConfig.LUSHA_ENRICHMENT_PRIORITY.value}
                  onChange={(e) => setLushaConfig({
                    ...lushaConfig,
                    LUSHA_ENRICHMENT_PRIORITY: { ...lushaConfig.LUSHA_ENRICHMENT_PRIORITY, value: e.target.value },
                  })}
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => handleSave("lusha", lushaConfig)}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Lusha Config
              </button>
              {successMsg && (
                <span className="flex items-center gap-1 text-sm font-medium text-emerald-500">
                  <CheckCircle2 className="h-4 w-4" /> {successMsg}
                </span>
              )}
              {errorMsg && (
                <span className="flex items-center gap-1 text-sm font-medium text-red-500">
                  <AlertCircle className="h-4 w-4" /> {errorMsg}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Webhooks tab — redirect to Settings → Webhooks ── */}
      {tab === "lark" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-2">
              <div>
                <h2 className="text-xl font-semibold mb-1">Lark Integration</h2>
                <p className="text-xs text-muted-foreground mb-4">
                  Configure your Lark App ID, App Secret, and enable SSO from the Integration Settings page.
                </p>
              </div>
              <div className="rounded-xl border border-border/50 bg-[var(--background)] p-4">
                <p className="text-sm font-semibold">Integration Status</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {larkStatusData?.configured ? (
                    <span className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      Configured and {larkStatusData?.is_active ? 'Active' : 'Inactive'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <X className="w-4 h-4 text-red-600" />
                      Not Configured
                    </span>
                  )}
                </p>
                {larkStatusData?.last_sync_at && (
                  <p className="text-xs text-muted-foreground mt-1">Last sync: {new Date(larkStatusData.last_sync_at).toLocaleString()}</p>
                )}
              </div>
            </div>
          </div>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Lark SSO Credentials</h3>
            <div className="rounded-xl border border-border/50 bg-[var(--background)] p-4 mb-4">
              <p className="text-sm font-medium">Redirect URL for Lark Custom App</p>
              <p className="text-xs text-muted-foreground mt-1">
                Daftarkan URL ini di Lark App → Redirect URLs. Leadsy akan menggunakan URL ini untuk menerima authorization code dari Lark.
              </p>
              <code className="mt-2 block rounded bg-slate-950/5 px-2 py-1 text-xs">
                {typeof window !== 'undefined' ? `${window.location.origin}/auth/lark/callback` : 'https://your-domain.com/auth/lark/callback'}
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Jangan tambahkan query string atau parameter tambahan. Tenant dipilih lewat state internal Leadsy.
              </p>
            </div>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">App ID</label>
                <Input
                  type="text"
                  name="app_id"
                  value={larkConfig.app_id}
                  onChange={(e) => setLarkConfig({ ...larkConfig, app_id: e.target.value })}
                  placeholder="Your Lark App ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">App Secret</label>
                <Input
                  type="password"
                  name="app_secret"
                  value={larkConfig.app_secret}
                  onChange={(e) => setLarkConfig({ ...larkConfig, app_secret: e.target.value })}
                  placeholder="Your Lark App Secret"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Verification Token (Optional)</label>
                <Input
                  type="password"
                  name="verification_token"
                  value={larkConfig.verification_token}
                  onChange={(e) => setLarkConfig({ ...larkConfig, verification_token: e.target.value })}
                  placeholder="For webhook verification"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Encrypt Key (Optional)</label>
                <Input
                  type="password"
                  name="encrypt_key"
                  value={larkConfig.encrypt_key}
                  onChange={(e) => setLarkConfig({ ...larkConfig, encrypt_key: e.target.value })}
                  placeholder="For encrypting webhook data"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Base URL (Optional)</label>
                <Input
                  type="url"
                  name="base_url"
                  value={larkConfig.base_url}
                  onChange={(e) => setLarkConfig({ ...larkConfig, base_url: e.target.value })}
                  placeholder="For Lark Base integration"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={() => saveLarkConfigMutation.mutate(larkConfig)} disabled={saveLarkConfigMutation.isPending}>
                  {saveLarkConfigMutation.isPending ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Configuration'
                  )}
                </Button>
                <Button variant="outline" onClick={() => testLarkConnectionMutation.mutate()} disabled={testLarkConnectionMutation.isPending || !larkConfig.app_id}>
                  {testLarkConnectionMutation.isPending ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </Button>
              </div>
              {successMsg && (
                <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
                  {errorMsg}
                </div>
              )}
              {testLarkConnectionMutation.data && (
                <div className={`mt-3 p-3 rounded-lg ${testLarkConnectionMutation.data.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  {testLarkConnectionMutation.data.success ? '✓ Connection successful!' : '✗ Connection failed: ' + testLarkConnectionMutation.data.error}
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Enabled Lark Modules</h3>
            <p className="text-sm text-muted-foreground mb-4">Enable Lark services by module, including SSO.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(larkModules).map(([module, enabled]) => (
                <button
                  key={module}
                  type="button"
                  onClick={() => toggleLarkModuleMutation.mutate({ module, enabled: !enabled })}
                  className={`text-left p-4 rounded-lg border transition ${enabled ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-gray-50 border-border hover:border-gray-300'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-semibold capitalize">{module}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{getLarkModuleDescription(module)}</p>
                    </div>
                    <div className={`h-5 w-5 rounded border-2 flex items-center justify-center ${enabled ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                      {enabled && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Database className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">Lark Base Two-Way Sync</h3>
                <p className="text-sm text-muted-foreground">Connect a specific Base table, preview its records, then sync Leads in both directions.</p>
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Base App Token</label>
                <Input
                  value={baseAppToken}
                  onChange={(e) => {
                    setBaseAppToken(e.target.value);
                    setSelectedBaseTable(null);
                  }}
                  placeholder="Example: appbcbWCzen6D8dezhoCH2RpMAh"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => listBaseTablesMutation.mutate()}
                  disabled={!baseAppToken || listBaseTablesMutation.isPending || !larkModules.base}
                >
                  {listBaseTablesMutation.isPending ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Load Tables
                </Button>
                <Button
                  variant="outline"
                  onClick={() => previewBaseRecordsMutation.mutate()}
                  disabled={!baseAppToken || !selectedBaseTable || previewBaseRecordsMutation.isPending}
                >
                  {previewBaseRecordsMutation.isPending ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                  Preview Selected Table
                </Button>
                <Button
                  variant="outline"
                  onClick={() => selectedBaseTable && listBaseFieldsMutation.mutate({ appToken: baseAppToken, tableId: selectedBaseTable.table_id })}
                  disabled={!baseAppToken || !selectedBaseTable || listBaseFieldsMutation.isPending}
                >
                  {listBaseFieldsMutation.isPending ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Load Fields
                </Button>
                <Button
                  onClick={() => saveBaseMappingMutation.mutate()}
                  disabled={!baseAppToken || !selectedBaseTable || saveBaseMappingMutation.isPending}
                >
                  {saveBaseMappingMutation.isPending ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Base Mapping
                </Button>
              </div>

              {!larkModules.base && (
                <div className="rounded-lg border border-border bg-[var(--background)] p-3 text-sm text-muted-foreground">
                  Enable the Base module above before loading tables or syncing records.
                </div>
              )}

              {listBaseTablesMutation.data?.items?.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {(listBaseTablesMutation.data.items as LarkBaseTable[]).map((table) => (
                    <button
                  key={table.table_id}
                  type="button"
                      onClick={() => handleSelectBaseTable(table)}
                      className={`rounded-lg border p-3 text-left transition ${selectedBaseTable?.table_id === table.table_id ? 'border-[var(--brand)] bg-[var(--brand)]/10' : 'border-border bg-[var(--background)] hover:border-[var(--brand)]/50'}`}
                    >
                      <p className="text-sm font-semibold">{table.name || table.table_id}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{table.table_id}</p>
                    </button>
                  ))}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                <div>
                  <label className="block text-sm font-medium mb-1">Sync Direction</label>
                  <select
                    value={baseSyncDirection}
                    onChange={(e) => setBaseSyncDirection(e.target.value as typeof baseSyncDirection)}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    <option value="two_way">Two-way</option>
                    <option value="leadsy_to_lark">Leadsy to Lark</option>
                    <option value="lark_to_leadsy">Lark to Leadsy</option>
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <label className="block text-sm font-medium">Manual Lead Field Mapping</label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={autoMapBaseFields}
                      disabled={!baseAppToken || !selectedBaseTable || listBaseFieldsMutation.isPending}
                    >
                      {listBaseFieldsMutation.isPending ? 'Matching...' : 'Auto Match Fields'}
                    </Button>
                  </div>
                  <div className="mt-2 overflow-hidden rounded-lg border border-border">
                    <div className="grid grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)] border-b border-border bg-[var(--background)] px-3 py-2 text-xs font-semibold text-muted-foreground">
                      <span>Leadsy Leads Field</span>
                      <span>Lark Base Field</span>
                    </div>
                    <div className="divide-y divide-border/70">
                      {LEADSY_LEAD_FIELDS.map((field) => (
                        <div key={field.key} className="grid gap-3 px-3 py-3 md:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)] md:items-center">
                          <div>
                            <p className="text-sm font-semibold">{field.label}</p>
                            <p className="text-xs text-muted-foreground">{field.key} · {field.description}</p>
                          </div>
                          <div className="flex gap-2">
                            <select
                              value={baseFieldMapping[field.key] || ""}
                              onChange={(e) => updateBaseFieldMapping(field.key, e.target.value)}
                              className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
                            >
                              <option value="">Do not sync</option>
                              {larkBaseFieldNames.map((name) => (
                                <option key={`${field.key}-${name}`} value={name}>{name}</option>
                              ))}
                            </select>
                            {baseFieldMapping[field.key] && !larkBaseFieldNames.includes(baseFieldMapping[field.key]) && (
                              <Input
                                value={baseFieldMapping[field.key]}
                                onChange={(e) => updateBaseFieldMapping(field.key, e.target.value)}
                                className="w-44"
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{Object.values(baseFieldMapping).filter(Boolean).length} mapped</Badge>
                    <span className="text-xs text-muted-foreground">
                      Load fields or preview records to populate the dropdown from the selected Lark Base table.
                    </span>
                  </div>
                </div>
              </div>

              {previewBaseRecordsMutation.data?.items?.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-border">
                  <div className="border-b border-border bg-[var(--background)] px-3 py-2 text-sm font-semibold">
                    Preview: {selectedBaseTable?.name || selectedBaseTable?.table_id}
                  </div>
                  <div className="max-h-80 overflow-auto">
                    <table className="w-full min-w-[720px] text-left text-xs">
                      <thead className="sticky top-0 bg-card">
                        <tr>
                          <th className="border-b border-border px-3 py-2">Record ID</th>
                          {Object.keys(previewBaseRecordsMutation.data.items[0]?.fields || {}).slice(0, 8).map((field) => (
                            <th key={field} className="border-b border-border px-3 py-2">{field}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewBaseRecordsMutation.data.items.map((record: any) => (
                          <tr key={record.record_id} className="border-b border-border/60">
                            <td className="px-3 py-2 font-mono text-muted-foreground">{record.record_id}</td>
                            {Object.keys(previewBaseRecordsMutation.data.items[0]?.fields || {}).slice(0, 8).map((field) => (
                              <td key={field} className="max-w-48 truncate px-3 py-2">
                                {formatLarkBaseValue(record.fields?.[field])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {baseMappings.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Saved Base Mappings</p>
                  {baseMappings.map((mapping) => (
                    <div key={mapping.id} className="flex flex-col gap-3 rounded-lg border border-border bg-[var(--background)] p-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold">{mapping.table_name || mapping.table_id}</p>
                        <p className="text-xs text-muted-foreground">{mapping.app_token} · {mapping.table_id} · {mapping.sync_direction} · {mapping.record_mappings_count || 0} linked records</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startBaseSync(mapping, 'pull')}
                          disabled={syncBaseMappingMutation.isPending || mapping.sync_direction === 'leadsy_to_lark'}
                        >
                          Pull from Lark
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startBaseSync(mapping, 'push')}
                          disabled={syncBaseMappingMutation.isPending || mapping.sync_direction === 'lark_to_leadsy'}
                        >
                          Push to Lark
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {tab === "webhooks" && (
        <div className="rounded-xl border border-border bg-card p-10 text-center shadow-sm">
          <Key className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">Webhook URLs are managed in</p>
          <a href="/settings/webhooks" className="mt-1 inline-block text-sm text-indigo-400 underline underline-offset-2 hover:text-indigo-300">
            Settings → Webhooks →
          </a>
        </div>
      )}

      <Modal
        open={baseSyncDialog.open}
        onOpenChange={(open) => setBaseSyncDialog((current) => ({ ...current, open }))}
        title={`${baseSyncDialog.direction === "push" ? "Push to Lark" : "Pull from Lark"} Progress`}
        description={baseSyncDialog.mappingName ? `Mapping: ${baseSyncDialog.mappingName}` : undefined}
        size="lg"
        footer={
          <Button
            variant="outline"
            onClick={() => setBaseSyncDialog((current) => ({ ...current, open: false }))}
            disabled={baseSyncDialog.status === "running"}
          >
            Close
          </Button>
        }
      >
        <div className="space-y-5">
          {baseSyncDialog.status === "running" ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-[var(--background)] p-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Sync is running</p>
                <p className="text-xs text-muted-foreground">Please keep this page open while Leadsy talks to Lark Base.</p>
              </div>
            </div>
          ) : null}

          {baseSyncDialog.status !== "running" && baseSyncDialog.result ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  { label: "Attempted", value: baseSyncDialog.result.attempted_count || 0 },
                  { label: "Added", value: baseSyncDialog.result.added_count || 0 },
                  { label: "Updated", value: baseSyncDialog.result.updated_count || 0 },
                  { label: "Deleted", value: baseSyncDialog.result.deleted_count || 0 },
                  { label: "Failed", value: baseSyncDialog.result.failed_count || baseSyncDialog.result.error_count || 0 },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-border bg-[var(--background)] p-3">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-2xl font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>

              {baseSyncDialog.result.deleted_count === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Delete sync is not enabled for manual Lark Base sync yet, so deleted records are reported as 0.
                </p>
              ) : null}

              <div className="overflow-hidden rounded-lg border border-border">
                <div className="border-b border-border bg-[var(--background)] px-3 py-2 text-sm font-semibold">
                  Record Results
                </div>
                <div className="max-h-80 overflow-auto">
                  <table className="w-full min-w-[720px] text-left text-xs">
                    <thead className="sticky top-0 bg-card">
                      <tr>
                        <th className="border-b border-border px-3 py-2">Status</th>
                        <th className="border-b border-border px-3 py-2">Action</th>
                        <th className="border-b border-border px-3 py-2">Lead / Record</th>
                        <th className="border-b border-border px-3 py-2">Company</th>
                        <th className="border-b border-border px-3 py-2">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(baseSyncDialog.result.results || []).length > 0 ? (
                        baseSyncDialog.result.results?.map((item, index) => (
                          <tr key={`${item.lead_id || item.record_id || item.lark_record_id || index}`} className="border-b border-border/60">
                            <td className="px-3 py-2">
                              <Badge variant={item.status === "success" ? "success" : item.status === "failed" ? "danger" : "neutral"}>
                                {item.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 capitalize">{item.action}</td>
                            <td className="px-3 py-2 font-mono text-muted-foreground">
                              {item.lead_id || item.record_id || item.lark_record_id || "—"}
                            </td>
                            <td className="max-w-48 truncate px-3 py-2">{item.company_name || "—"}</td>
                            <td className="max-w-72 truncate px-3 py-2 text-muted-foreground">{item.reason || "—"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-3 py-4 text-muted-foreground" colSpan={5}>
                            No per-record result was returned.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}

          {baseSyncDialog.status === "failed" && baseSyncDialog.error ? (
            <div className="rounded-lg border border-border bg-[var(--background)] p-4">
              <p className="text-sm font-semibold">Sync failed</p>
              <p className="mt-1 text-xs text-muted-foreground">{baseSyncDialog.error}</p>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}

function getLarkModuleDescription(module: string): string {
  const descriptions: Record<string, string> = {
    messenger: 'Send notifications and messages via Lark',
    meeting: 'Capture meeting transcripts and details',
    calendar: 'Create follow-up calendar events',
    task: 'Create and manage tasks for leads',
    base: 'Sync leads with Lark Base tables',
    sso: 'Log in users via Lark SSO',
  };
  return descriptions[module] || '';
}

function formatLarkBaseValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "text" in item) return String((item as { text: unknown }).text);
        if (item && typeof item === "object" && "name" in item) return String((item as { name: unknown }).name);
        return JSON.stringify(item);
      })
      .join(", ");
  }
  return JSON.stringify(value);
}

function normalizeFieldName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}
