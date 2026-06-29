"use client";

import { useState, useEffect, type ComponentType, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Save, Loader2, Loader, Key, MapPin, MessageSquare, CheckCircle2, Check, X, AlertCircle, Database, Eye, RefreshCw, Share2, Video, Megaphone, Globe2, Download, Lock, Play, XCircle, Info, ExternalLink } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import { downloadTimestampedReport } from "@/lib/utils/download-report";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableShell,
} from "@/components/ui/table";

type IntegrationConfig = {
  id?: number;
  category: string;
  key: string;
  value: string;
  is_secret: boolean;
  is_active: boolean;
  value_type: "string" | "boolean" | "number" | "json";
};

type TabKey = "lead_platforms" | "maps" | "whatsapp" | "lusha" | "webhooks" | "lark" | "linkedin";
type GooglePermissionStatus = "available" | "restricted" | "not_enabled" | "invalid_key" | "not_configured" | "not_available" | "unknown";
type GooglePermission = {
  id: string;
  label: string;
  description: string;
  status: GooglePermissionStatus;
  message: string;
};
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

const Linkedin = (props: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

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
  presales_owner: "Presales",
  csm_owner: "CSM",
  am_owner: "Account Manager",
  external_place_id: "External Place ID",
  external_id: "External ID",
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
  { key: "presales_owner", label: "Presales", description: "Presales team owner" },
  { key: "csm_owner", label: "CSM", description: "Customer Success Manager" },
  { key: "am_owner", label: "Account Manager", description: "Account Manager" },
  { key: "external_place_id", label: "External Place ID", description: "Google Maps Place ID or external source ID" },
  { key: "external_id", label: "External ID", description: "External integration or source ID" },
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
  GOOGLE_SEARCH_API_KEY:          { category: "maps", key: "GOOGLE_SEARCH_API_KEY",          value: "",        is_secret: true,  is_active: true, value_type: "string"  },
  GOOGLE_SEARCH_ENGINE_ID:        { category: "maps", key: "GOOGLE_SEARCH_ENGINE_ID",        value: "",        is_secret: false, is_active: true, value_type: "string"  },
  GOOGLE_SEARCH_SAFE:             { category: "maps", key: "GOOGLE_SEARCH_SAFE",             value: "off",     is_secret: false, is_active: true, value_type: "string"  },
  GOOGLE_SEARCH_GL:               { category: "maps", key: "GOOGLE_SEARCH_GL",               value: "id",      is_secret: false, is_active: true, value_type: "string"  },
  GOOGLE_SEARCH_HL:               { category: "maps", key: "GOOGLE_SEARCH_HL",               value: "id",      is_secret: false, is_active: true, value_type: "string"  },
  GOOGLE_SEARCH_LR:               { category: "maps", key: "GOOGLE_SEARCH_LR",               value: "",        is_secret: false, is_active: true, value_type: "string"  },
  GOOGLE_SEARCH_NUM_RESULTS:      { category: "maps", key: "GOOGLE_SEARCH_NUM_RESULTS",      value: "10",      is_secret: false, is_active: true, value_type: "number"  },
  GOOGLE_SEARCH_SITE_SEARCH:      { category: "maps", key: "GOOGLE_SEARCH_SITE_SEARCH",      value: "linkedin.com/in", is_secret: false, is_active: true, value_type: "string" },
  GOOGLE_SEARCH_SITE_SEARCH_FILTER: { category: "maps", key: "GOOGLE_SEARCH_SITE_SEARCH_FILTER", value: "i",   is_secret: false, is_active: true, value_type: "string"  },
  GOOGLE_SEARCH_SERVICE_ACCOUNT_EMAIL: { category: "maps", key: "GOOGLE_SEARCH_SERVICE_ACCOUNT_EMAIL", value: "", is_secret: false, is_active: true, value_type: "string" },
  GOOGLE_SEARCH_SERVICE_ACCOUNT_PRIVATE_KEY: { category: "maps", key: "GOOGLE_SEARCH_SERVICE_ACCOUNT_PRIVATE_KEY", value: "", is_secret: true, is_active: true, value_type: "string" },
  GOOGLE_SEARCH_SERVICE_ACCOUNT_PROJECT_ID: { category: "maps", key: "GOOGLE_SEARCH_SERVICE_ACCOUNT_PROJECT_ID", value: "", is_secret: false, is_active: true, value_type: "string" },
  GOOGLE_MAPS_DEFAULT_CENTER_LAT: { category: "maps", key: "GOOGLE_MAPS_DEFAULT_CENTER_LAT", value: "-6.2088", is_secret: false, is_active: true, value_type: "number"  },
  GOOGLE_MAPS_DEFAULT_CENTER_LNG: { category: "maps", key: "GOOGLE_MAPS_DEFAULT_CENTER_LNG", value: "106.8456",is_secret: false, is_active: true, value_type: "number"  },
  VERTEX_AI_VECTOR_SEARCH_ENABLED: { category: "maps", key: "VERTEX_AI_VECTOR_SEARCH_ENABLED", value: "false", is_secret: false, is_active: true, value_type: "boolean" },
  VERTEX_AI_VECTOR_SEARCH_API_ENDPOINT: { category: "maps", key: "VERTEX_AI_VECTOR_SEARCH_API_ENDPOINT", value: "", is_secret: false, is_active: true, value_type: "string" },
  VERTEX_AI_VECTOR_SEARCH_LOCATION: { category: "maps", key: "VERTEX_AI_VECTOR_SEARCH_LOCATION", value: "", is_secret: false, is_active: true, value_type: "string" },
  VERTEX_AI_VECTOR_SEARCH_INDEX_ENDPOINT_ID: { category: "maps", key: "VERTEX_AI_VECTOR_SEARCH_INDEX_ENDPOINT_ID", value: "", is_secret: false, is_active: true, value_type: "string" },
  VERTEX_AI_VECTOR_SEARCH_DEPLOYED_INDEX_ID: { category: "maps", key: "VERTEX_AI_VECTOR_SEARCH_DEPLOYED_INDEX_ID", value: "", is_secret: false, is_active: true, value_type: "string" },
};

const googlePermissionVariant = (status: GooglePermissionStatus): "success" | "warning" | "danger" => {
  if (status === "available") return "success";
  if (status === "restricted" || status === "not_configured" || status === "unknown") return "warning";
  return "danger";
};

const googlePermissionLabel = (status: GooglePermissionStatus) => ({
  available: "Available",
  restricted: "Restricted",
  not_enabled: "Not Enabled",
  invalid_key: "Invalid Key",
  not_configured: "Not Configured",
  not_available: "Unavailable",
  unknown: "Unknown",
}[status] ?? "Unknown");

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

const DEFAULT_LINKEDIN: Record<string, IntegrationConfig> = {
  LINKEDIN_ENABLED:       { category: "linkedin", key: "LINKEDIN_ENABLED",       value: "false", is_secret: false, is_active: true, value_type: "boolean" },
  LINKEDIN_CLIENT_ID:     { category: "linkedin", key: "LINKEDIN_CLIENT_ID",     value: "",      is_secret: false, is_active: true, value_type: "string"  },
  LINKEDIN_CLIENT_SECRET: { category: "linkedin", key: "LINKEDIN_CLIENT_SECRET", value: "",      is_secret: false, is_active: true, value_type: "string"  },
  LINKEDIN_REDIRECT_URI:  { category: "linkedin", key: "LINKEDIN_REDIRECT_URI",  value: "",      is_secret: false, is_active: true, value_type: "string"  },
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
      { suffix: "BASE_URL", label: "Base URL", value_type: "string", is_secret: false, defaultValue: "https://api.mekari.com", help: "Use https://api.mekari.com for modern production, https://sandbox-api.mekari.com for sandbox, or https://service-chat.qontak.com for legacy Qontak." },
      { suffix: "ACCESS_TOKEN", label: "Bearer Access Token", value_type: "string", is_secret: true, defaultValue: "", help: "Optional. Bearer access token generated from Qontak Omnichannel settings." },
      { suffix: "CLIENT_ID", label: "Client ID", value_type: "string", is_secret: false, defaultValue: "", help: "Generate from developers.mekari.com → Applications → Create Application." },
      { suffix: "CLIENT_SECRET", label: "Client Secret", value_type: "string", is_secret: true, defaultValue: "", help: "HMAC secret from your Mekari Developer application." },
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
  const [linkedinConfig, setLinkedinConfig] = useState<Record<string, IntegrationConfig>>(DEFAULT_LINKEDIN);
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

  const [configuringPlatform, setConfiguringPlatform] = useState<LeadPlatformDefinition | null>(null);

  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ status: string; message: string } | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);

  const reloadConfigs = async () => {
    setLoadingConfig(true);
    try {
      const res = await apiFetch("/settings/integrations");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json?.data?.lead_platforms) {
        const next = createDefaultLeadPlatforms();
        (json.data.lead_platforms as IntegrationConfig[]).forEach((c) => {
          next[c.key] = {
            ...c,
            value: c.value_type === "boolean" ? asBooleanString(c.value) : asStringValue(c.value),
          };
        });
        setLeadPlatformsConfig(next);
      }
    } catch (err) {
      console.warn("Failed to reload integrations:", err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const res = await apiFetch("/settings/integration-platforms/mekari_qontak/test", {
        method: "POST"
      });
      const json = await res.json();
      setConnectionResult(json.data || { status: "error", message: "Verification failed." });
    } catch (err: any) {
      setConnectionResult({ status: "error", message: err.message || "Connection test failed." });
    } finally {
      setTestingConnection(false);
    }
  };

  const checklistItems = useMemo(() => {
    const enabled = leadPlatformsConfig["MEKARI_QONTAK_ENABLED"]?.value === "true";
    const clientId = leadPlatformsConfig["MEKARI_QONTAK_CLIENT_ID"]?.value;
    const clientSecret = leadPlatformsConfig["MEKARI_QONTAK_CLIENT_SECRET"]?.value;
    const baseUrl = leadPlatformsConfig["MEKARI_QONTAK_BASE_URL"]?.value || "https://api.mekari.com";
    const channelId = leadPlatformsConfig["MEKARI_QONTAK_CHANNEL_ID"]?.value;

    const hasHmac = !!clientId && !!clientSecret;
    const validBaseUrl = baseUrl.includes("api.mekari.com") || baseUrl.includes("api.mekari.io") || baseUrl.includes("sandbox-api");

    return [
      {
        id: "enabled",
        name: "Integration Status",
        description: "Enables Mekari Qontak lead sync in your workspace.",
        status: enabled ? "success" : "danger",
        value: enabled ? "Enabled" : "Disabled",
        help: "Toggle this integration to 'Enabled' inside the main settings configuration modal."
      },
      {
        id: "hmac",
        name: "HMAC Authentication",
        description: "HMAC signatures securely authenticate Leadsy requests with Mekari API v1.0.",
        status: hasHmac ? "success" : "danger",
        value: hasHmac ? "Configured" : "Missing Client Key",
        help: "Requires Client ID & Client Secret from developers.mekari.com -> Create Application."
      },
      {
        id: "gateway",
        name: "API Base URL Gateway",
        description: "Endpoint pointing directly to the Mekari API Gateway.",
        status: validBaseUrl ? "success" : "warning",
        value: validBaseUrl ? "Valid URL Structure" : "Generic / Incorrect Host",
        help: "Should point to https://api.mekari.com or https://sandbox-api.mekari.com, not the developer portal website."
      },
      {
        id: "channel",
        name: "Omnichannel Channel subscription ID",
        description: "Allows Leadsy to ingest active rooms mapped to the specific messaging channel ID.",
        status: !!channelId ? "success" : "warning",
        value: channelId ? `ID: ${channelId}` : "Not Subscribed",
        help: "Required to sync specific WhatsApp numbers or omnichannel configurations."
      },
      {
        id: "sync_job",
        name: "Background Synchronization Task",
        description: "Scheduled job fetching active chat rooms in the background (every 30 seconds).",
        status: enabled && hasHmac ? "success" : "neutral",
        value: enabled && hasHmac ? "Active / Dispatching" : "Paused",
        help: "Triggered automatically when conversations list is requested and integration is healthy."
      },
      {
        id: "ai_score",
        name: "Gemini AI Lead Eligibility Scoring",
        description: "Evaluates synced room feeds using AI agents to determine business qualifications.",
        status: "success",
        value: "Active & Configured",
        help: "Uses the default Gemini model and instructions configured in Settings -> AI Defaults."
      }
    ];
  }, [leadPlatformsConfig]);

  const { data: activeWaUsersData, refetch: refetchActiveWaUsers, isLoading: loadingActiveWaUsers } = useQuery({
    queryKey: ["active-whatsapp-users"],
    queryFn: async () => {
      const res = await apiFetch("/settings/whatsapp/active-users");
      if (!res.ok) throw new Error("Failed to load active WhatsApp users");
      return res.json() as Promise<{ data: any[] }>;
    },
    enabled: tab === "whatsapp",
    refetchInterval: 10000,
  });

  const disconnectWaUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiFetch(`/settings/whatsapp/active-users/${userId}/disconnect`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to disconnect user session");
      return res.json();
    },
    onSuccess: () => {
      refetchActiveWaUsers();
      setSuccessMsg("Session disconnect request sent successfully");
      setTimeout(() => setSuccessMsg(""), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err?.message || "Failed to disconnect user session");
      setTimeout(() => setErrorMsg(""), 5000);
    }
  });

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

        if (json.data.linkedin) {
          const next = { ...DEFAULT_LINKEDIN };
          (json.data.linkedin as IntegrationConfig[]).forEach((c) => {
            next[c.key] = {
              ...c,
              value: c.value_type === "boolean" ? asBooleanString(c.value) : asStringValue(c.value),
            };
          });
          setLinkedinConfig(next);
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

  const googlePermissionsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/settings/integrations/google/permissions");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || `Google permission check failed (HTTP ${res.status})`);
      }
      return json as {
        data: {
          api_key_present: boolean;
          search_engine_id_present: boolean;
          checked_at: string;
          permissions: GooglePermission[];
        };
      };
    },
    onError: (error: any) => {
      setErrorMsg(error?.message || "Failed to check Google permissions");
      setTimeout(() => setErrorMsg(""), 5000);
    },
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
        body: JSON.stringify({ direction, limit: 3000 }),
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

  const handleDownloadSyncReport = () => {
    if (!baseSyncDialog.result) return;

    const rows = (baseSyncDialog.result?.results || []).map((item) => ({
      Status: item.status,
      Action: item.action,
      "Lead ID": item.lead_id || "",
      "Record ID": item.record_id || item.lark_record_id || "",
      "Company Name": item.company_name || "",
      Reason: item.reason || "",
    }));

    downloadTimestampedReport(
      rows,
      `lark_sync_${baseSyncDialog.direction}_report`,
      ["Status", "Action", "Lead ID", "Record ID", "Company Name", "Reason"]
    );
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
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="space-y-1">
            <BackToSettings />
            <CardTitle>Integration Setting</CardTitle>
            <CardDescription>
              Manage social media, ad platform, CRM, event, SSO, and non-AI integration credentials.
            </CardDescription>
          </div>
          <Share2 className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
      </Card>

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
          { key: "maps", label: "Google", icon: MapPin },
          { key: "whatsapp", label: "WhatsApp", icon: MessageSquare },
          { key: "lusha", label: "Lusha", icon: Key },
          { key: "linkedin", label: "LinkedIn", icon: Linkedin },
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
              return (
                <Card key={platform.id} className="p-5 flex flex-col justify-between">
                  <div>
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--surface-strong)]">
                          <Icon className="h-5 w-5 text-[color:var(--brand)]" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">{platform.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {platform.sso ? "OAuth/SSO Integration" : "Manual token or webhook API"}
                          </p>
                        </div>
                      </div>
                      <Badge variant={leadPlatformsConfig[enabledKey]?.value === "true" ? "success" : "neutral"}>
                        {leadPlatformsConfig[enabledKey]?.value === "true" ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">
                      {leadPlatformsConfig[enabledKey]?.value === "true"
                        ? `Integration is enabled and actively receiving leads from ${platform.name}.`
                        : `${platform.name} is currently inactive. Configure credentials to enable.`}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/50 pt-4 mt-auto">
                    <a href={platform.docsUrl} target="_blank" rel="noreferrer" className="text-xs text-[color:var(--brand)] hover:underline">
                      Documentation
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setConfiguringPlatform(platform);
                      }}
                      id={`configure-${platform.id}`}
                    >
                      Configure
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          <Modal
            open={Boolean(configuringPlatform)}
            onOpenChange={(open) => {
              if (!open) setConfiguringPlatform(null);
            }}
            title={configuringPlatform ? `Configure ${configuringPlatform.name}` : "Configure Platform"}
            description={configuringPlatform ? `Set up your credentials and connection options for ${configuringPlatform.name}.` : ""}
            size={configuringPlatform?.id === "mekari_qontak" ? "xl" : "lg"}
            footer={
              configuringPlatform?.id === "mekari_qontak" ? (
                <Button variant="outline" onClick={() => setConfiguringPlatform(null)}>
                  Close
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setConfiguringPlatform(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (await handleSave("lead_platforms", leadPlatformsConfig)) {
                        setConfiguringPlatform(null);
                      }
                    }}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Save Configuration
                  </Button>
                </>
              )
            }
          >
            {configuringPlatform && (
              configuringPlatform.id === "mekari_qontak" ? (
                <div className="grid gap-6 md:grid-cols-2 text-left">
                  {/* Column 1: Configuration Form */}
                  <div className="space-y-4">
                    <label className="flex items-center justify-between rounded-xl border border-border bg-[color:var(--surface-subtle)] px-3 py-2">
                      <span className="text-sm font-medium">Enable Mekari Qontak Integration</span>
                      <input
                        type="checkbox"
                        checked={leadPlatformsConfig["MEKARI_QONTAK_ENABLED"]?.value === "true"}
                        onChange={(e) => setLeadPlatformsConfig((current) => ({
                          ...current,
                          MEKARI_QONTAK_ENABLED: {
                            ...current["MEKARI_QONTAK_ENABLED"],
                            value: e.target.checked ? "true" : "false",
                          },
                        }))}
                        className="h-4 w-4 rounded border-border"
                      />
                    </label>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium">Base URL</label>
                        <Input
                          className="mt-1"
                          type="text"
                          value={leadPlatformsConfig["MEKARI_QONTAK_BASE_URL"]?.value ?? ""}
                          placeholder="https://api.mekari.com"
                          onChange={(e) => setLeadPlatformsConfig((current) => ({
                            ...current,
                            MEKARI_QONTAK_BASE_URL: {
                              ...current["MEKARI_QONTAK_BASE_URL"],
                              value: e.target.value,
                            },
                          }))}
                        />
                        <p className="mt-1 text-[11px] text-muted-foreground leading-normal">
                          Use https://api.mekari.com for modern production, or https://sandbox-api.mekari.com for sandbox.
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-medium">Client ID</label>
                        <Input
                          className="mt-1"
                          type="text"
                          value={leadPlatformsConfig["MEKARI_QONTAK_CLIENT_ID"]?.value ?? ""}
                          placeholder="Client ID"
                          onChange={(e) => setLeadPlatformsConfig((current) => ({
                            ...current,
                            MEKARI_QONTAK_CLIENT_ID: {
                              ...current["MEKARI_QONTAK_CLIENT_ID"],
                              value: e.target.value,
                            },
                          }))}
                        />
                        <p className="mt-1 text-[11px] text-muted-foreground leading-normal">
                          Generate from developers.mekari.com → Applications → Create Application.
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-medium">Client Secret</label>
                        <Input
                          className="mt-1"
                          type="password"
                          value={leadPlatformsConfig["MEKARI_QONTAK_CLIENT_SECRET"]?.value ?? ""}
                          placeholder={leadPlatformsConfig["MEKARI_QONTAK_CLIENT_SECRET"]?.value ? "••••••••" : "Client Secret"}
                          autoComplete="off"
                          spellCheck={false}
                          onChange={(e) => setLeadPlatformsConfig((current) => ({
                            ...current,
                            MEKARI_QONTAK_CLIENT_SECRET: {
                              ...current["MEKARI_QONTAK_CLIENT_SECRET"],
                              value: e.target.value,
                            },
                          }))}
                        />
                        <p className="mt-1 text-[11px] text-muted-foreground leading-normal">
                          HMAC secret from your Mekari Developer application.
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-medium">Bearer Access Token (Optional)</label>
                        <Input
                          className="mt-1"
                          type="password"
                          value={leadPlatformsConfig["MEKARI_QONTAK_ACCESS_TOKEN"]?.value ?? ""}
                          placeholder={leadPlatformsConfig["MEKARI_QONTAK_ACCESS_TOKEN"]?.value ? "••••••••" : "Bearer Access Token"}
                          autoComplete="off"
                          spellCheck={false}
                          onChange={(e) => setLeadPlatformsConfig((current) => ({
                            ...current,
                            MEKARI_QONTAK_ACCESS_TOKEN: {
                              ...current["MEKARI_QONTAK_ACCESS_TOKEN"],
                              value: e.target.value,
                            },
                          }))}
                        />
                        <p className="mt-1 text-[11px] text-muted-foreground leading-normal">
                          Optional. Bearer access token generated from Qontak Omnichannel settings.
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-medium">WhatsApp / Omnichannel Channel ID</label>
                        <Input
                          className="mt-1"
                          type="text"
                          value={leadPlatformsConfig["MEKARI_QONTAK_CHANNEL_ID"]?.value ?? ""}
                          placeholder="WhatsApp Channel ID"
                          onChange={(e) => setLeadPlatformsConfig((current) => ({
                            ...current,
                            MEKARI_QONTAK_CHANNEL_ID: {
                              ...current["MEKARI_QONTAK_CHANNEL_ID"],
                              value: e.target.value,
                            },
                          }))}
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        onClick={async () => {
                          if (await handleSave("lead_platforms", leadPlatformsConfig)) {
                            reloadConfigs();
                          }
                        }}
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-2"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Mekari Qontak Configuration
                      </Button>
                    </div>
                  </div>

                  {/* Column 2: Checklist & Verification */}
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
                      <div className="flex items-center justify-between border-b border-border/80 pb-3 mb-3">
                        <div>
                          <h3 className="text-sm font-bold">Setup Checklist</h3>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Verify permissions and activity status.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={reloadConfigs}
                          disabled={loadingConfig}
                          className="flex items-center gap-1 h-7 text-xs px-2"
                        >
                          <RefreshCw className={cn("h-3 w-3", loadingConfig && "animate-spin")} />
                          <span>Reload configs</span>
                        </Button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 mb-4">
                        <div className="rounded-xl border border-border bg-muted/10 p-3 flex flex-col justify-between">
                          <div>
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">HMAC Auth</h4>
                            <p className="text-[9px] text-muted-foreground leading-normal mt-0.5">
                              Client credentials authentication.
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] pt-2 border-t border-border/10 mt-2">
                            <Lock className="h-3 w-3 text-muted-foreground" />
                            <Badge variant={leadPlatformsConfig["MEKARI_QONTAK_CLIENT_ID"]?.value ? "success" : "danger"} className="text-[8px] font-extrabold uppercase px-1.5 py-0.2">
                              {leadPlatformsConfig["MEKARI_QONTAK_CLIENT_ID"]?.value ? "Loaded" : "Missing"}
                            </Badge>
                          </div>
                        </div>

                        <div className="rounded-xl border border-border bg-muted/10 p-3 flex flex-col justify-between">
                          <div>
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Connection Test</h4>
                            <p className="text-[9px] text-muted-foreground leading-normal mt-0.5">
                              Test HTTP request to gateway.
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 pt-2 border-t border-border/10 mt-2 justify-between">
                            <Button
                              size="xs"
                              onClick={handleTestConnection}
                              disabled={testingConnection}
                              className="h-6 px-2 text-[10px] flex items-center gap-1"
                            >
                              {testingConnection ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Play className="h-2.5 w-2.5" />}
                              <span>Test API</span>
                            </Button>
                            <div>
                              {connectionResult ? (
                                <Badge variant={connectionResult.status === "connected" ? "success" : "danger"} className="text-[8px] font-extrabold uppercase px-1.5 py-0.2">
                                  {connectionResult.status}
                                </Badge>
                              ) : (
                                <span className="text-[9px] text-muted-foreground italic font-semibold">Not Tested</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {connectionResult && (
                        <div className={cn(
                          "rounded-xl border p-3 text-[11px] leading-relaxed flex items-start gap-2 mb-4",
                          connectionResult.status === "connected"
                            ? "border-[color:var(--success)]/20 bg-[color:var(--success-soft)]/20 text-[color:var(--success)]"
                            : "border-[color:var(--danger)]/20 bg-[color:var(--danger-soft)]/20 text-[color:var(--danger)]"
                        )}>
                          {connectionResult.status === "connected" ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="font-bold">Test connection results:</p>
                            <p className="font-medium text-foreground/80 mt-0.5">{connectionResult.message}</p>
                          </div>
                        </div>
                      )}

                      <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <div className="px-3 py-2 border-b border-border bg-muted/10">
                          <h4 className="text-xs font-bold">Checklist Table</h4>
                        </div>
                        <div className="divide-y divide-border/60 max-h-48 overflow-y-auto">
                          {checklistItems.map((item) => (
                            <div key={item.id} className="p-3 flex flex-col justify-between gap-1 hover:bg-muted/5 transition-colors">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <h5 className="text-[11px] font-bold text-foreground">{item.name}</h5>
                                  <Badge variant={
                                    item.status === "success" ? "success" :
                                    item.status === "warning" ? "warning" :
                                    item.status === "danger" ? "danger" :
                                    "neutral"
                                  } className="text-[8px] font-extrabold uppercase px-1 py-0.1">
                                    {item.value}
                                  </Badge>
                                </div>
                                <p className="text-[9px] text-muted-foreground leading-normal">{item.description}</p>
                                <p className="text-[8px] text-muted-foreground/60 italic flex items-center gap-0.5 pt-0.5 font-semibold">
                                  <Info className="h-2.5 w-2.5 shrink-0" /> {item.help}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="flex items-center justify-between rounded-xl border border-border bg-[color:var(--surface-subtle)] px-3 py-2">
                    <span className="text-sm font-medium">Enable {configuringPlatform.name}</span>
                    <input
                      type="checkbox"
                      checked={leadPlatformsConfig[leadPlatformKey(configuringPlatform.id, "ENABLED")]?.value === "true"}
                      onChange={(e) => setLeadPlatformsConfig((current) => ({
                        ...current,
                        [leadPlatformKey(configuringPlatform.id, "ENABLED")]: {
                          ...current[leadPlatformKey(configuringPlatform.id, "ENABLED")],
                          value: e.target.checked ? "true" : "false",
                        },
                      }))}
                      className="h-4 w-4 rounded border-border"
                    />
                  </label>

                  <div className="space-y-3">
                    {configuringPlatform.fields
                      .filter((field) => field.suffix !== "ENABLED")
                      .filter((field) => isLeadPlatformFieldVisible(configuringPlatform.id, field, leadPlatformsConfig))
                      .map((field) => {
                        const key = leadPlatformKey(configuringPlatform.id, field.suffix);
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
                                placeholder={field.placeholder || (field.is_secret ? "Encrypted after save" : `${configuringPlatform.name} ${field.label}`)}
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

                  <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                    <Button
                      variant="outline"
                      disabled={!(configuringPlatform.sso && (configuringPlatform.id !== "google_ads" || (leadPlatformsConfig[leadPlatformKey("google_ads", "API_MODE")]?.value || "api") === "api"))}
                      onClick={async () => {
                        if (await handleSave("lead_platforms", leadPlatformsConfig)) {
                          await runPlatformAction(configuringPlatform.id, "oauth-url");
                        }
                      }}
                    >
                      Login with {configuringPlatform.name}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        if (await handleSave("lead_platforms", leadPlatformsConfig)) {
                          await runPlatformAction(configuringPlatform.id, "test");
                        }
                      }}
                    >
                      Test Connection
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        if (await handleSave("lead_platforms", leadPlatformsConfig)) {
                          await runPlatformAction(configuringPlatform.id, "preview");
                        }
                      }}
                    >
                      View Data
                    </Button>
                  </div>

                  {platformStatus[configuringPlatform.id] ? (
                    <p className="mt-3 rounded-xl border border-border bg-[color:var(--surface-subtle)] px-3 py-2 text-xs text-muted-foreground">
                      {platformStatus[configuringPlatform.id]}
                    </p>
                  ) : null}

                  {platformPreview[configuringPlatform.id] && platformPreview[configuringPlatform.id].length > 0 ? (
                    <pre className="mt-3 max-h-48 overflow-auto rounded-xl border border-border bg-[color:var(--surface-subtle)] p-3 text-xs text-muted-foreground">
                      {JSON.stringify(platformPreview[configuringPlatform.id].slice(0, 3), null, 2)}
                    </pre>
                  ) : null}
                </div>
              )
            )}
          </Modal>

          <div className="flex items-center gap-3">
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

      {/* ── Google ── */}
      {tab === "maps" && (
        <div className="space-y-4">
          {/* Card 1: Google Maps & Places */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-1">Google Maps & Places</h2>
            <p className="text-xs text-muted-foreground mb-6">
              Configure the Google Cloud API key used by browser Maps, Lead Discovery place search, and Geocoding APIs.
              Get a key from{" "}
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-indigo-400 underline">
                Google Cloud Console
              </a>
              .
            </p>

            <div className="space-y-5">
              <div className="rounded-xl border border-border p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Google Cloud Project</h3>
                    <p className="text-xs text-muted-foreground">Shared browser key for Maps JavaScript, Places, and Geocoding.</p>
                  </div>
                  <Badge variant="info">API key</Badge>
                </div>
                <label className="text-sm font-semibold">Google API Key</label>
                <Input
                  className="mt-2 font-mono"
                  type="text"
                  placeholder="AIzaSy..."
                  value={mapsConfig.GOOGLE_MAPS_BROWSER_API_KEY.value}
                  onChange={(e) => setMapsConfig({
                    ...mapsConfig,
                    GOOGLE_MAPS_BROWSER_API_KEY: { ...mapsConfig.GOOGLE_MAPS_BROWSER_API_KEY, value: e.target.value },
                  })}
                  autoComplete="off"
                  spellCheck={false}
                />
                {mapsConfig.GOOGLE_MAPS_BROWSER_API_KEY.value ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-[color:var(--success)]">
                    <CheckCircle2 className="h-3 w-3" /> API key entered - save to apply
                  </p>
                ) : (
                  <p className="mt-1 flex items-center gap-1 text-xs text-[color:var(--warning)]">
                    <AlertCircle className="h-3 w-3" /> No key configured - map runs in preview mode
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-border p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Maps JavaScript API</h3>
                    <p className="text-xs text-muted-foreground">Controls browser map rendering and default map center.</p>
                  </div>
                  <Badge variant={mapsConfig.GOOGLE_MAPS_ENABLED.value === "true" ? "success" : "neutral"}>
                    {mapsConfig.GOOGLE_MAPS_ENABLED.value === "true" ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <label className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3">
                  <span>
                    <span className="block text-sm font-medium">Enable Google Maps Interface</span>
                    <span className="block text-xs text-muted-foreground">Toggle the map interface across the entire application.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={mapsConfig.GOOGLE_MAPS_ENABLED.value === "true"}
                    onChange={(e) => setMapsConfig({
                      ...mapsConfig,
                      GOOGLE_MAPS_ENABLED: { ...mapsConfig.GOOGLE_MAPS_ENABLED, value: e.target.checked ? "true" : "false" },
                    })}
                    className="h-4 w-4 rounded border-border"
                  />
                </label>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Default Center Latitude</label>
                    <Input
                      className="mt-1"
                      type="number"
                      step="any"
                      value={mapsConfig.GOOGLE_MAPS_DEFAULT_CENTER_LAT.value}
                      onChange={(e) => setMapsConfig({
                        ...mapsConfig,
                        GOOGLE_MAPS_DEFAULT_CENTER_LAT: { ...mapsConfig.GOOGLE_MAPS_DEFAULT_CENTER_LAT, value: e.target.value },
                      })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Default Center Longitude</label>
                    <Input
                      className="mt-1"
                      type="number"
                      step="any"
                      value={mapsConfig.GOOGLE_MAPS_DEFAULT_CENTER_LNG.value}
                      onChange={(e) => setMapsConfig({
                        ...mapsConfig,
                        GOOGLE_MAPS_DEFAULT_CENTER_LNG: { ...mapsConfig.GOOGLE_MAPS_DEFAULT_CENTER_LNG, value: e.target.value },
                      })}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Places & Geocoding APIs</h3>
                    <p className="text-xs text-muted-foreground">Used by Lead Discovery for area geocoding, place search, and place details.</p>
                  </div>
                  <Badge variant="neutral">Uses shared key</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enable Geocoding API and Places API in the same Google Cloud project as the key above.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                onClick={() => handleSave("maps", mapsConfig)}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Maps Config
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  if (await handleSave("maps", mapsConfig)) {
                    googlePermissionsMutation.mutate();
                  }
                }}
                disabled={saving || googlePermissionsMutation.isPending}
              >
                {googlePermissionsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Check Google Permissions
              </Button>
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

          {/* Card 2: Google Custom Search */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-1">Google Custom Search</h2>
            <p className="text-xs text-muted-foreground mb-6">
              Configure the Custom Search JSON API and Programmable Search Engine for LinkedIn profile finding.
            </p>

            <div className="space-y-5">
              <div className="rounded-xl border border-border p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Custom Search API & Service Account</h3>
                    <p className="text-xs text-muted-foreground">Used by Contact Search to find public LinkedIn profile candidates.</p>
                  </div>
                  <Badge variant="warning">key + cx required</Badge>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold">Custom Search API Key Override</label>
                    <p className="mt-0.5 text-xs text-muted-foreground">Optional. Leave blank to use the shared Google API key.</p>
                    <Input
                      className="mt-2 font-mono"
                      type="text"
                      placeholder="Uses shared key when empty"
                      value={mapsConfig.GOOGLE_SEARCH_API_KEY.value}
                      onChange={(e) => setMapsConfig({
                        ...mapsConfig,
                        GOOGLE_SEARCH_API_KEY: { ...mapsConfig.GOOGLE_SEARCH_API_KEY, value: e.target.value },
                      })}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Programmable Search Engine ID</label>
                    <p className="mt-0.5 text-xs text-muted-foreground">Required `cx` value from Programmable Search Engine.</p>
                    <Input
                      className="mt-2 font-mono"
                      type="text"
                      placeholder="cx / search engine ID"
                      value={mapsConfig.GOOGLE_SEARCH_ENGINE_ID.value}
                      onChange={(e) => setMapsConfig({
                        ...mapsConfig,
                        GOOGLE_SEARCH_ENGINE_ID: { ...mapsConfig.GOOGLE_SEARCH_ENGINE_ID, value: e.target.value },
                      })}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Service Account Email</label>
                    <p className="mt-0.5 text-xs text-muted-foreground">Google Cloud Service Account Client Email.</p>
                    <Input
                      className="mt-2 font-mono"
                      type="text"
                      placeholder="e.g. search-service@project-id.iam.gserviceaccount.com"
                      value={mapsConfig.GOOGLE_SEARCH_SERVICE_ACCOUNT_EMAIL.value}
                      onChange={(e) => setMapsConfig({
                        ...mapsConfig,
                        GOOGLE_SEARCH_SERVICE_ACCOUNT_EMAIL: { ...mapsConfig.GOOGLE_SEARCH_SERVICE_ACCOUNT_EMAIL, value: e.target.value },
                      })}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Service Account Private Key</label>
                    <p className="mt-0.5 text-xs text-muted-foreground">PEM private key file content or JSON credentials key.</p>
                    <Input
                      className="mt-2 font-mono"
                      type="text"
                      placeholder="-----BEGIN PRIVATE KEY-----..."
                      value={mapsConfig.GOOGLE_SEARCH_SERVICE_ACCOUNT_PRIVATE_KEY.value}
                      onChange={(e) => setMapsConfig({
                        ...mapsConfig,
                        GOOGLE_SEARCH_SERVICE_ACCOUNT_PRIVATE_KEY: { ...mapsConfig.GOOGLE_SEARCH_SERVICE_ACCOUNT_PRIVATE_KEY, value: e.target.value },
                      })}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Google Cloud Project ID</label>
                    <p className="mt-0.5 text-xs text-muted-foreground">The project ID for Google Cloud Service Account.</p>
                    <Input
                      className="mt-2 font-mono"
                      type="text"
                      placeholder="e.g. leadsy-search-project"
                      value={mapsConfig.GOOGLE_SEARCH_SERVICE_ACCOUNT_PROJECT_ID.value}
                      onChange={(e) => setMapsConfig({
                        ...mapsConfig,
                        GOOGLE_SEARCH_SERVICE_ACCOUNT_PROJECT_ID: { ...mapsConfig.GOOGLE_SEARCH_SERVICE_ACCOUNT_PROJECT_ID, value: e.target.value },
                      })}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Search Result Count</label>
                    <Input
                      className="mt-1"
                      type="number"
                      min="1"
                      max="10"
                      value={mapsConfig.GOOGLE_SEARCH_NUM_RESULTS.value}
                      onChange={(e) => setMapsConfig({
                        ...mapsConfig,
                        GOOGLE_SEARCH_NUM_RESULTS: { ...mapsConfig.GOOGLE_SEARCH_NUM_RESULTS, value: e.target.value },
                      })}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Custom Search supports 1-10 results per request.</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Safe Search</label>
                    <Select
                      className="mt-1"
                      value={mapsConfig.GOOGLE_SEARCH_SAFE.value}
                      onChange={(e) => setMapsConfig({
                        ...mapsConfig,
                        GOOGLE_SEARCH_SAFE: { ...mapsConfig.GOOGLE_SEARCH_SAFE, value: e.target.value },
                      })}
                    >
                      <option value="off">Off</option>
                      <option value="active">Active</option>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Country Boost (`gl`)</label>
                    <Input
                      className="mt-1"
                      value={mapsConfig.GOOGLE_SEARCH_GL.value}
                      onChange={(e) => setMapsConfig({
                        ...mapsConfig,
                        GOOGLE_SEARCH_GL: { ...mapsConfig.GOOGLE_SEARCH_GL, value: e.target.value },
                      })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Interface Language (`hl`)</label>
                    <Input
                      className="mt-1"
                      value={mapsConfig.GOOGLE_SEARCH_HL.value}
                      onChange={(e) => setMapsConfig({
                        ...mapsConfig,
                        GOOGLE_SEARCH_HL: { ...mapsConfig.GOOGLE_SEARCH_HL, value: e.target.value },
                      })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Language Restriction (`lr`)</label>
                    <Input
                      className="mt-1"
                      placeholder="Example: lang_id"
                      value={mapsConfig.GOOGLE_SEARCH_LR.value}
                      onChange={(e) => setMapsConfig({
                        ...mapsConfig,
                        GOOGLE_SEARCH_LR: { ...mapsConfig.GOOGLE_SEARCH_LR, value: e.target.value },
                      })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Site Search</label>
                    <Input
                      className="mt-1"
                      value={mapsConfig.GOOGLE_SEARCH_SITE_SEARCH.value}
                      onChange={(e) => setMapsConfig({
                        ...mapsConfig,
                        GOOGLE_SEARCH_SITE_SEARCH: { ...mapsConfig.GOOGLE_SEARCH_SITE_SEARCH, value: e.target.value },
                      })}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Vertex AI Vector Search API</h3>
                    <p className="text-xs text-muted-foreground">High-performance vector searches. Uses the Service Account credentials above.</p>
                  </div>
                  <Badge variant={mapsConfig.VERTEX_AI_VECTOR_SEARCH_ENABLED.value === "true" ? "success" : "neutral"}>
                    {mapsConfig.VERTEX_AI_VECTOR_SEARCH_ENABLED.value === "true" ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <label className="mb-4 flex items-center justify-between rounded-lg border border-border/50 px-4 py-3 bg-[color:var(--surface-subtle)]">
                  <span>
                    <span className="block text-sm font-medium">Enable Vertex AI Vector Search</span>
                    <span className="block text-xs text-muted-foreground">Use Google Vertex AI Vector Search to perform nearest neighbor queries.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={mapsConfig.VERTEX_AI_VECTOR_SEARCH_ENABLED.value === "true"}
                    onChange={(e) => setMapsConfig({
                      ...mapsConfig,
                      VERTEX_AI_VECTOR_SEARCH_ENABLED: { ...mapsConfig.VERTEX_AI_VECTOR_SEARCH_ENABLED, value: e.target.checked ? "true" : "false" },
                    })}
                    className="h-4 w-4 rounded border-border"
                  />
                </label>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold">API Endpoint / Public Domain Name</label>
                    <p className="mt-0.5 text-xs text-muted-foreground">Public domain from GCP console, e.g. `*.vdb.vertexai.goog`.</p>
                    <Input
                      className="mt-2 font-mono"
                      type="text"
                      placeholder="e.g. 123456.us-central1.vdb.vertexai.goog"
                      value={mapsConfig.VERTEX_AI_VECTOR_SEARCH_API_ENDPOINT.value}
                      onChange={(e) => setMapsConfig({
                        ...mapsConfig,
                        VERTEX_AI_VECTOR_SEARCH_API_ENDPOINT: { ...mapsConfig.VERTEX_AI_VECTOR_SEARCH_API_ENDPOINT, value: e.target.value },
                      })}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Location / Region</label>
                    <p className="mt-0.5 text-xs text-muted-foreground">GCP region hosting the index, e.g. `us-central1`.</p>
                    <Input
                      className="mt-2 font-mono"
                      type="text"
                      placeholder="e.g. us-central1"
                      value={mapsConfig.VERTEX_AI_VECTOR_SEARCH_LOCATION.value}
                      onChange={(e) => setMapsConfig({
                        ...mapsConfig,
                        VERTEX_AI_VECTOR_SEARCH_LOCATION: { ...mapsConfig.VERTEX_AI_VECTOR_SEARCH_LOCATION, value: e.target.value },
                      })}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Index Endpoint ID</label>
                    <p className="mt-0.5 text-xs text-muted-foreground">The resource ID of your Vertex AI Index Endpoint.</p>
                    <Input
                      className="mt-2 font-mono"
                      type="text"
                      placeholder="e.g. 1234567890123456789"
                      value={mapsConfig.VERTEX_AI_VECTOR_SEARCH_INDEX_ENDPOINT_ID.value}
                      onChange={(e) => setMapsConfig({
                        ...mapsConfig,
                        VERTEX_AI_VECTOR_SEARCH_INDEX_ENDPOINT_ID: { ...mapsConfig.VERTEX_AI_VECTOR_SEARCH_INDEX_ENDPOINT_ID, value: e.target.value },
                      })}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Deployed Index ID</label>
                    <p className="mt-0.5 text-xs text-muted-foreground">Unique ID of deployed index (starts with a letter).</p>
                    <Input
                      className="mt-2 font-mono"
                      type="text"
                      placeholder="e.g. my_deployed_index_id"
                      value={mapsConfig.VERTEX_AI_VECTOR_SEARCH_DEPLOYED_INDEX_ID.value}
                      onChange={(e) => setMapsConfig({
                        ...mapsConfig,
                        VERTEX_AI_VECTOR_SEARCH_DEPLOYED_INDEX_ID: { ...mapsConfig.VERTEX_AI_VECTOR_SEARCH_DEPLOYED_INDEX_ID, value: e.target.value },
                      })}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                onClick={() => handleSave("maps", mapsConfig)}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Search Config
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  if (await handleSave("maps", mapsConfig)) {
                    googlePermissionsMutation.mutate();
                  }
                }}
                disabled={saving || googlePermissionsMutation.isPending}
              >
                {googlePermissionsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Check Google Permissions
              </Button>
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

          <Card className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-base font-semibold">Google Project Permissions</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Leadsy checks the registered API key against the Google APIs used in this app. Google does not expose the full Cloud project permission list from an API key, so this shows verified availability per API.
                </p>
              </div>
              {googlePermissionsMutation.data?.data?.checked_at ? (
                <Badge variant="neutral">
                  Checked {new Date(googlePermissionsMutation.data.data.checked_at).toLocaleString()}
                </Badge>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {(googlePermissionsMutation.data?.data?.permissions || []).map((permission) => (
                <div key={permission.id} className="rounded-xl border border-border bg-[color:var(--surface-subtle)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{permission.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{permission.description}</p>
                    </div>
                    <Badge variant={googlePermissionVariant(permission.status)}>
                      {googlePermissionLabel(permission.status)}
                    </Badge>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">{permission.message}</p>
                </div>
              ))}
            </div>

            {!googlePermissionsMutation.data && !googlePermissionsMutation.isPending ? (
              <div className="mt-4 rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
                Save the Google config, then run Check Google Permissions to see Maps JavaScript, Geocoding, Places, and Custom Search status.
              </div>
            ) : null}
          </Card>
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

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Active Local WhatsApp Users</h2>
                <p className="text-xs text-muted-foreground">
                  View and manage users currently connected to the local WhatsApp service.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchActiveWaUsers()}
                disabled={loadingActiveWaUsers}
                id="refresh-active-wa-users"
              >
                {loadingActiveWaUsers ? <Loader className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>

            {loadingActiveWaUsers && !activeWaUsersData ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !activeWaUsersData?.data || activeWaUsersData.data.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-xl bg-[color:var(--surface-subtle)]">
                No active connected users.
              </div>
            ) : (
              <TableShell>
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>User</TableHeaderCell>
                      <TableHeaderCell>WhatsApp Number</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>Action</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {activeWaUsersData.data.map((sess: any) => (
                      <TableRow key={sess.user_id}>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-medium text-sm">{sess.user_name}</p>
                            <p className="text-xs text-muted-foreground">{sess.user_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono">{sess.number || "—"}</span>
                          {sess.name ? <span className="text-xs text-muted-foreground ml-1">({sess.name})</span> : null}
                        </TableCell>
                        <TableCell>
                          <Badge variant={sess.status === "connected" ? "success" : "warning"}>
                            {sess.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={disconnectWaUserMutation.isPending}
                            onClick={() => disconnectWaUserMutation.mutate(sess.user_id)}
                            id={`disconnect-user-${sess.user_id}`}
                          >
                            Disconnect
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableShell>
            )}
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
                  type="text"
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

      {/* ── LinkedIn Developer Integration ── */}
      {tab === "linkedin" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-1">LinkedIn Developer Integration</h2>
            <p className="text-xs text-muted-foreground mb-6">
              Configure LinkedIn App ID, App Secret, and Redirect URI to manage integration settings.
            </p>

            <div className="space-y-5">
              <div className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3">
                <div>
                  <label className="text-sm font-medium">Enable LinkedIn Features</label>
                  <p className="text-xs text-muted-foreground">Allows searching and discovering contacts via LinkedIn provider.</p>
                </div>
                <input
                  type="checkbox"
                  checked={linkedinConfig.LINKEDIN_ENABLED.value === "true"}
                  onChange={(e) => setLinkedinConfig({
                    ...linkedinConfig,
                    LINKEDIN_ENABLED: { ...linkedinConfig.LINKEDIN_ENABLED, value: e.target.checked ? "true" : "false" },
                  })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Client ID / App ID</label>
                <p className="text-xs text-muted-foreground mt-0.5">Your LinkedIn Developer application Client ID.</p>
                <input
                  value={linkedinConfig.LINKEDIN_CLIENT_ID.value}
                  onChange={(e) => setLinkedinConfig({
                    ...linkedinConfig,
                    LINKEDIN_CLIENT_ID: { ...linkedinConfig.LINKEDIN_CLIENT_ID, value: e.target.value },
                  })}
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Enter Client ID"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Client Secret / App Secret</label>
                <p className="text-xs text-muted-foreground mt-0.5">Your LinkedIn Developer application Client Secret.</p>
                <input
                  type="text"
                  value={linkedinConfig.LINKEDIN_CLIENT_SECRET.value}
                  onChange={(e) => setLinkedinConfig({
                    ...linkedinConfig,
                    LINKEDIN_CLIENT_SECRET: { ...linkedinConfig.LINKEDIN_CLIENT_SECRET, value: e.target.value },
                  })}
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Enter Client Secret"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Redirect URI</label>
                <p className="text-xs text-muted-foreground mt-0.5">Authorized Redirect URL registered in LinkedIn Developer portal.</p>
                <input
                  value={linkedinConfig.LINKEDIN_REDIRECT_URI.value}
                  onChange={(e) => setLinkedinConfig({
                    ...linkedinConfig,
                    LINKEDIN_REDIRECT_URI: { ...linkedinConfig.LINKEDIN_REDIRECT_URI, value: e.target.value },
                  })}
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="http://localhost:3000/auth/linkedin/callback"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => handleSave("linkedin", linkedinConfig)}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save LinkedIn Config
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
              <code className="mt-2 block rounded bg-secondary/50 px-2 py-1 text-xs">
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
                  className={`text-left p-4 rounded-lg border transition ${enabled ? 'bg-blue-500/10 border-blue-500/30 ring-1 ring-blue-500/30' : 'bg-secondary/20 border-border hover:border-gray-500/30'}`}
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Database className="h-6 w-6 text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">Lark Base Two-Way Sync</h3>
                  <p className="text-sm text-muted-foreground mt-1">Connect and sync multiple Lark Bases and Tables.</p>
                </div>
              </div>
              <Link href="/settings/integrations/lark-base">
                <Button type="button">Manage Lark Base Sync</Button>
              </Link>
            </div>
          </Card>

          {/* Legacy Lark Base UI moved to /settings/integrations/lark-base */}
          {false && (
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
                {(() => {
                  const savedTokens = Array.from(new Set(baseMappings.map(m => m.app_token))).filter(Boolean);
                  if (savedTokens.length === 0) return null;
                  return (
                    <div className="mt-2 flex flex-wrap gap-2 items-center">
                      <span className="text-xs text-muted-foreground">Saved Bases:</span>
                      {savedTokens.map(token => (
                        <Badge 
                          key={token} 
                          variant={baseAppToken === token ? "brand" : "outline"} 
                          className="cursor-pointer"
                          onClick={() => {
                            setBaseAppToken(token);
                            setSelectedBaseTable(null);
                          }}
                        >
                          {token.substring(0, 8)}...
                        </Badge>
                      ))}
                    </div>
                  );
                })()}
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
          )}
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

      {false && (
      <Modal
        open={baseSyncDialog.open}
        onOpenChange={(open) => setBaseSyncDialog((current) => ({ ...current, open }))}
        title={`${baseSyncDialog.direction === "push" ? "Push to Lark" : "Pull from Lark"} Progress`}
        description={baseSyncDialog.mappingName ? `Mapping: ${baseSyncDialog.mappingName}` : undefined}
        size="lg"
        footer={
          <>
            {baseSyncDialog.status !== "running" && baseSyncDialog.result ? (
              <Button
                variant="outline"
                onClick={handleDownloadSyncReport}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Report (.csv)
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={() => setBaseSyncDialog((current) => ({ ...current, open: false }))}
              disabled={baseSyncDialog.status === "running"}
            >
              Close
            </Button>
          </>
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
                  { label: "Attempted", value: baseSyncDialog.result?.attempted_count || 0 },
                  { label: "Added", value: baseSyncDialog.result?.added_count || 0 },
                  { label: "Updated", value: baseSyncDialog.result?.updated_count || 0 },
                  { label: "Deleted", value: baseSyncDialog.result?.deleted_count || 0 },
                  { label: "Failed", value: baseSyncDialog.result?.failed_count || baseSyncDialog.result?.error_count || 0 },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-border bg-[var(--background)] p-3">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-2xl font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>

              {baseSyncDialog.result?.deleted_count === 0 ? (
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
                      {(baseSyncDialog.result?.results || []).length > 0 ? (
                        baseSyncDialog.result?.results?.map((item, index) => (
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
      )}
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
