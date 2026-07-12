"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { APIProvider, AdvancedMarker, Map } from "@vis.gl/react-google-maps";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Filter,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  MapPin,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  X,
  BrainCircuit
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/store/useAuthStore";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterBar, FilterBarSearch } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
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
import { apiFetch } from "@/lib/apiFetch";
import { useNumberFormat } from "@/lib/hooks/use-number-format";
import { downloadTimestampedReport } from "@/lib/utils/download-report";
import { cn } from "@/lib/utils";
import { CreateNewModal } from "@/components/ui/CreateNewModal";

type LeadRecord = {
  id: number;
  company_name: string;
  brand?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  business_category_id?: number | null;
  company_size_estimate?: string | null;
  estimated_closing_amount?: string | number | null;
  realized_closing_amount?: string | number | null;
  meeting_link?: string | null;
  product_id?: number | null;
  industry_id?: number | null;
  sub_industry_id?: number | null;
  qualification_status?: string | null;
  lead_score?: number | null;
  funnel_stage_id?: number | null;
  funnel_stage?: { id: number; name: string } | null;
  current_funnel_stage?: { id: number; name: string } | null;
  industry?: { name: string } | null;
  product?: { id: number; name: string } | null;
  owner?: { id: number; name: string; email?: string | null } | null;
  sources?: LeadSource[];
  parent_lead_id?: number | null;
  parentLead?: { id: number; company_name: string } | null;
  subsidiaries?: { id: number; company_name: string }[] | null;
  duplicate_status?: string | null;
  lark_base_id?: string | null;
  lark_table_id?: string | null;
  external_id?: string | null;
};

type FunnelStage = { id: number; name: string; sequence: number };
type ProductOption = { id: number; name: string; category?: string | null; status?: string | null };
type LeadChannelType = {
  id: number;
  lead_source_type_id: number;
  name: string;
  slug: string;
  is_active: boolean;
};
type LeadSource = {
  id: number;
  source_type: string;
  channel_type_id?: number | null;
  source_ref?: string | null;
  confidence?: string | null;
  channel_type?: LeadChannelType | null;
};
type LeadSourceType = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  channels?: LeadChannelType[];
};
type AssignableUser = {
  id: number;
  name: string;
  email?: string | null;
  role?: { name: string; display_name?: string | null } | null;
};

type LeadFormState = {
  company_name: string;
  brand: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  lat: string;
  lng: string;
  industry_id: string;
  sub_industry_id: string;
  company_size_estimate: string;
  meeting_link: string;
  lead_score: string;
  business_category_id: string;
  product_id: string;
  estimated_closing_amount: string;
  realized_closing_amount: string;
  source_type: string;
  channel_type_id: string;
  funnel_stage_id: string;
  qualification_status: string;
  parent_lead_id: string;
};

type ImportContact = {
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  confidence?: "high" | "medium" | "low";
  is_primary?: boolean;
  do_not_contact?: boolean;
};

type ImportLead = {
  company_name: string;
  brand?: string;
  address?: string;
  lat?: number;
  lng?: number;
  website?: string;
  phone?: string;
  email?: string;
  industry_id?: number;
  sub_industry_id?: number;
  business_category_id?: string;
  company_size_estimate?: string;
  branch_count?: number;
  operating_hours?: string;
  lead_score?: number;
  qualification_status?: "pending" | "eligible" | "potential" | "not_eligible";
  external_place_id?: string;
  funnel_stage_id?: number;
  owner_id?: number;
  territory_id?: number;
  product_id?: number;
  estimated_closing_amount?: number;
  realized_closing_amount?: number;
  source_type?: string;
  channel_type_id?: number;
  contacts?: ImportContact[];
};

type ImportMappingTarget = {
  key: string;
  label: string;
  group: "Lead" | "PIC 1" | "PIC 2" | "PIC 3";
  required?: boolean;
  aliases: string[];
  example: string | number;
  note?: string;
};

const emptyForm: LeadFormState = {
  company_name: "",
  brand: "",
  address: "",
  email: "",
  phone: "",
  website: "",
  lat: "",
  lng: "",
  industry_id: "",
  sub_industry_id: "",
  company_size_estimate: "",
  meeting_link: "",
  lead_score: "",
  business_category_id: "",
  product_id: "",
  estimated_closing_amount: "",
  realized_closing_amount: "",
  source_type: "",
  channel_type_id: "",
  funnel_stage_id: "",
  qualification_status: "pending",
  parent_lead_id: "",
};

const importHeaderAliases: Record<keyof Omit<ImportLead, "contacts">, string[]> = {
  company_name: ["company_name", "company", "company name", "nama perusahaan", "perusahaan", "nama lead", "lead"],
  brand: ["brand", "merek", "merk"],
  address: ["address", "alamat", "company address", "alamat perusahaan"],
  lat: ["lat", "latitude"],
  lng: ["lng", "long", "longitude"],
  website: ["website", "site", "url", "web"],
  phone: ["phone", "telepon", "telp", "company phone", "no telepon", "nomor telepon"],
  email: ["email", "company email", "email perusahaan"],
  industry_id: ["industry_id", "industry id"],
  sub_industry_id: ["sub_industry_id", "sub industry id", "subindustry_id"],
  business_category_id: ["business_category", "business category", "kategori bisnis", "category", "kategori"],
  company_size_estimate: ["company_size_estimate", "company size", "jumlah karyawan", "size"],
  branch_count: ["branch_count", "branch count", "jumlah cabang", "cabang"],
  operating_hours: ["operating_hours", "operating hours", "jam operasional"],
  lead_score: ["lead_score", "lead score", "score", "skor"],
  qualification_status: ["qualification_status", "qualification", "status kualifikasi", "status"],
  external_place_id: ["external_place_id", "place id", "google place id"],
  funnel_stage_id: ["funnel_stage_id", "funnel stage id", "stage_id"],
  owner_id: ["owner_id", "owner id", "sales id"],
  territory_id: ["territory_id", "territory id"],
  product_id: ["product_id", "product id"],
  estimated_closing_amount: ["estimated_closing_amount", "estimated closing amount", "estimasi closing", "nilai estimasi"],
  realized_closing_amount: ["realized_closing_amount", "realized closing amount", "realisasi closing", "nilai realisasi"],
  source_type: ["source_type", "lead source", "source", "sumber"],
  channel_type_id: ["channel_type_id", "channel type id", "channel id"],
};

const contactHeaderAliases = {
  name: ["pic name", "nama pic", "contact name", "nama contact", "nama kontak", "pic", "contact"],
  title: ["pic title", "jabatan pic", "contact title", "position", "jabatan"],
  email: ["pic email", "contact email", "email pic", "email kontak"],
  phone: ["pic phone", "contact phone", "phone pic", "telepon pic", "hp pic", "nomor pic"],
  linkedin_url: ["pic linkedin", "contact linkedin", "linkedin"],
};

const leadImportTargets: ImportMappingTarget[] = [
  { key: "company_name", label: "company_name", group: "Lead", required: true, aliases: importHeaderAliases.company_name, example: "PT Artha Solusi Global", note: "Required" },
  { key: "brand", label: "brand", group: "Lead", aliases: importHeaderAliases.brand, example: "Artha" },
  { key: "address", label: "address", group: "Lead", aliases: importHeaderAliases.address, example: "Jl. Sudirman No. 1, Jakarta" },
  { key: "lat", label: "lat", group: "Lead", aliases: importHeaderAliases.lat, example: -6.2001 },
  { key: "lng", label: "lng", group: "Lead", aliases: importHeaderAliases.lng, example: 106.8167 },
  { key: "website", label: "website", group: "Lead", aliases: importHeaderAliases.website, example: "https://artha.example" },
  { key: "phone", label: "phone", group: "Lead", aliases: importHeaderAliases.phone, example: "0215550101" },
  { key: "email", label: "email", group: "Lead", aliases: importHeaderAliases.email, example: "info@artha.example" },
  { key: "industry_id", label: "industry_id", group: "Lead", aliases: importHeaderAliases.industry_id, example: 1, note: "Use database ID when available" },
  { key: "sub_industry_id", label: "sub_industry_id", group: "Lead", aliases: importHeaderAliases.sub_industry_id, example: 3, note: "Use database ID when available" },
  { key: "business_category_id", label: "Business Category", group: "Lead", aliases: importHeaderAliases.business_category_id, example: "Property Management" },
  { key: "company_size_estimate", label: "company_size_estimate", group: "Lead", aliases: importHeaderAliases.company_size_estimate, example: "51-200" },
  { key: "branch_count", label: "branch_count", group: "Lead", aliases: importHeaderAliases.branch_count, example: 4 },
  { key: "operating_hours", label: "operating_hours", group: "Lead", aliases: importHeaderAliases.operating_hours, example: "Mon-Fri 09:00-17:00" },
  { key: "lead_score", label: "lead_score", group: "Lead", aliases: importHeaderAliases.lead_score, example: 75 },
  { key: "qualification_status", label: "qualification_status", group: "Lead", aliases: importHeaderAliases.qualification_status, example: "potential", note: "pending, eligible, potential, not_eligible" },
  { key: "estimated_closing_amount", label: "estimated_closing_amount", group: "Lead", aliases: importHeaderAliases.estimated_closing_amount, example: 15000000 },
  { key: "realized_closing_amount", label: "realized_closing_amount", group: "Lead", aliases: importHeaderAliases.realized_closing_amount, example: 0 },
  { key: "external_place_id", label: "external_place_id", group: "Lead", aliases: importHeaderAliases.external_place_id, example: "" },
  { key: "funnel_stage_id", label: "funnel_stage_id", group: "Lead", aliases: importHeaderAliases.funnel_stage_id, example: 1 },
  { key: "owner_id", label: "owner_id", group: "Lead", aliases: importHeaderAliases.owner_id, example: "" },
  { key: "territory_id", label: "territory_id", group: "Lead", aliases: importHeaderAliases.territory_id, example: "" },
  { key: "product_id", label: "product_id", group: "Lead", aliases: importHeaderAliases.product_id, example: "" },
  { key: "source_type", label: "source_type", group: "Lead", aliases: importHeaderAliases.source_type, example: "csv_import", note: "Uses modal source when unmapped" },
  { key: "channel_type_id", label: "channel_type_id", group: "Lead", aliases: importHeaderAliases.channel_type_id, example: "", note: "Uses modal channel when unmapped" },
];

const contactImportTargets: ImportMappingTarget[] = [1, 2, 3].flatMap((index) => {
  const group = `PIC ${index}` as ImportMappingTarget["group"];
  const prefix = index === 1 ? "pic" : `pic_${index}`;

  return [
    { key: `contact_${index}_name`, label: `${prefix}_name`, group, aliases: index === 1 ? contactHeaderAliases.name : contactHeaderAliases.name.map((alias) => `${alias} ${index}`), example: index === 1 ? "Budi Santoso" : "" },
    { key: `contact_${index}_title`, label: `${prefix}_title`, group, aliases: index === 1 ? contactHeaderAliases.title : contactHeaderAliases.title.map((alias) => `${alias} ${index}`), example: index === 1 ? "Procurement Manager" : "" },
    { key: `contact_${index}_email`, label: `${prefix}_email`, group, aliases: index === 1 ? contactHeaderAliases.email : contactHeaderAliases.email.map((alias) => `${alias} ${index}`), example: index === 1 ? "budi@artha.example" : "" },
    { key: `contact_${index}_phone`, label: `${prefix}_phone`, group, aliases: index === 1 ? contactHeaderAliases.phone : contactHeaderAliases.phone.map((alias) => `${alias} ${index}`), example: index === 1 ? "6281234567890" : "" },
    { key: `contact_${index}_linkedin_url`, label: `${prefix}_linkedin_url`, group, aliases: index === 1 ? contactHeaderAliases.linkedin_url : contactHeaderAliases.linkedin_url.map((alias) => `${alias} ${index}`), example: "" },
  ];
});

const importMappingTargets = [...leadImportTargets, ...contactImportTargets];
const importTemplateHeaders = importMappingTargets.map((target) => target.label);
const defaultMapCenter = { lat: -6.2088, lng: 106.8456 };

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeImportValue(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

function readAliasedValue(row: Record<string, unknown>, aliases: string[]) {
  const normalizedEntries = Object.entries(row).map(([key, value]) => [normalizeHeader(key), value] as const);
  const normalizedAliases = aliases.map(normalizeHeader);
  const match = normalizedEntries.find(([key]) => normalizedAliases.includes(key));
  return normalizeImportValue(match?.[1]);
}

function readContactValue(row: Record<string, unknown>, index: number, aliases: string[]) {
  const prefixes = index === 1
    ? ["", "1 ", "pic ", "contact "]
    : [`${index} `, `pic ${index} `, `contact ${index} `, `${index}. `];
  const expandedAliases = aliases.flatMap((alias) => prefixes.map((prefix) => `${prefix}${alias}`));
  return readAliasedValue(row, expandedAliases);
}

function detectImportMapping(headers: string[]) {
  return importMappingTargets.reduce<Record<string, string>>((mapping, target) => {
    const aliases = [target.label, ...target.aliases].map(normalizeHeader);
    const matchedHeader = headers.find((header) => aliases.includes(normalizeHeader(header)));
    if (matchedHeader) {
      mapping[target.key] = matchedHeader;
    }
    return mapping;
  }, {});
}

function readMappedValue(row: Record<string, unknown>, mapping: Record<string, string>, key: string) {
  const header = mapping[key];
  if (!header) return "";
  return normalizeImportValue(row[header]);
}

function rowToMappedImportLead(row: Record<string, unknown>, mapping: Record<string, string>): ImportLead | null {
  const companyName = readMappedValue(row, mapping, "company_name");
  if (!companyName) return null;

  const lead: ImportLead = { company_name: companyName };
  const textFields: (keyof Pick<
    ImportLead,
    "brand" | "address" | "phone" | "email" | "business_category_id" | "company_size_estimate" | "operating_hours" | "external_place_id" | "source_type"
  >)[] = [
    "brand",
    "address",
    "phone",
    "email",
    "business_category_id",
    "company_size_estimate",
    "operating_hours",
    "external_place_id",
    "source_type",
  ];

  textFields.forEach((field) => {
    const value = readMappedValue(row, mapping, field);
    if (value) lead[field] = value;
  });

  const website = normalizeWebsite(readMappedValue(row, mapping, "website"));
  if (website) lead.website = website;

  const numberFields: (keyof Pick<ImportLead, "lat" | "lng" | "estimated_closing_amount" | "realized_closing_amount">)[] = [
    "lat",
    "lng",
    "estimated_closing_amount",
    "realized_closing_amount",
  ];
  numberFields.forEach((field) => {
    const value = parseImportNumber(readMappedValue(row, mapping, field));
    if (value != null) lead[field] = value;
  });

  const integerFields: (keyof Pick<
    ImportLead,
    "industry_id" | "sub_industry_id" | "branch_count" | "lead_score" | "funnel_stage_id" | "owner_id" | "territory_id" | "product_id" | "channel_type_id"
  >)[] = [
    "industry_id",
    "sub_industry_id",
    "branch_count",
    "lead_score",
    "funnel_stage_id",
    "owner_id",
    "territory_id",
    "product_id",
    "channel_type_id",
  ];
  integerFields.forEach((field) => {
    const value = parseImportInteger(readMappedValue(row, mapping, field));
    if (value != null) lead[field] = value;
  });

  const qualification = normalizeQualification(readMappedValue(row, mapping, "qualification_status"));
  if (qualification) lead.qualification_status = qualification;

  const contacts = [1, 2, 3]
    .map((index): ImportContact | null => {
      const name = readMappedValue(row, mapping, `contact_${index}_name`);
      if (!name) return null;

      const contact: ImportContact = {
        name,
        confidence: "medium",
        is_primary: index === 1,
      };
      const title = readMappedValue(row, mapping, `contact_${index}_title`);
      const email = readMappedValue(row, mapping, `contact_${index}_email`);
      const phone = readMappedValue(row, mapping, `contact_${index}_phone`);
      const linkedin = readMappedValue(row, mapping, `contact_${index}_linkedin_url`);

      if (title) contact.title = title;
      if (email) contact.email = email;
      if (phone) contact.phone = phone;
      if (linkedin) contact.linkedin_url = linkedin;

      return contact;
    })
    .filter(Boolean) as ImportContact[];

  if (contacts.length > 0) lead.contacts = contacts;

  return lead;
}

function mapImportRows(rows: Record<string, unknown>[], mapping: Record<string, string>) {
  return rows.map((row) => rowToMappedImportLead(row, mapping)).filter(Boolean) as ImportLead[];
}

function parseImportNumber(value: string) {
  if (!value) return undefined;
  const normalized = value.replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseImportInteger(value: string) {
  const parsed = parseImportNumber(value);
  return parsed == null ? undefined : Math.trunc(parsed);
}

function normalizeWebsite(value: string) {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function normalizeQualification(value: string): ImportLead["qualification_status"] | undefined {
  const normalized = normalizeHeader(value).replace(/\s+/g, "_");
  if (["pending", "eligible", "potential", "not_eligible"].includes(normalized)) {
    return normalized as ImportLead["qualification_status"];
  }
  return undefined;
}

function rowToImportLead(row: Record<string, unknown>): ImportLead | null {
  const companyName = readAliasedValue(row, importHeaderAliases.company_name);
  if (!companyName) return null;

  const lead: ImportLead = { company_name: companyName };
  const textFields: (keyof Pick<
    ImportLead,
    "brand" | "address" | "phone" | "email" | "business_category_id" | "company_size_estimate" | "operating_hours" | "external_place_id" | "source_type"
  >)[] = [
    "brand",
    "address",
    "phone",
    "email",
    "business_category_id",
    "company_size_estimate",
    "operating_hours",
    "external_place_id",
    "source_type",
  ];

  textFields.forEach((field) => {
    const value = readAliasedValue(row, importHeaderAliases[field]);
    if (value) {
      lead[field] = value;
    }
  });

  const website = normalizeWebsite(readAliasedValue(row, importHeaderAliases.website));
  if (website) lead.website = website;

  const numberFields: (keyof Pick<ImportLead, "lat" | "lng" | "estimated_closing_amount" | "realized_closing_amount">)[] = [
    "lat",
    "lng",
    "estimated_closing_amount",
    "realized_closing_amount",
  ];
  numberFields.forEach((field) => {
    const value = parseImportNumber(readAliasedValue(row, importHeaderAliases[field]));
    if (value != null) lead[field] = value;
  });

  const integerFields: (keyof Pick<
    ImportLead,
    "industry_id" | "sub_industry_id" | "branch_count" | "lead_score" | "funnel_stage_id" | "owner_id" | "territory_id" | "product_id" | "channel_type_id"
  >)[] = [
    "industry_id",
    "sub_industry_id",
    "branch_count",
    "lead_score",
    "funnel_stage_id",
    "owner_id",
    "territory_id",
    "product_id",
    "channel_type_id",
  ];
  integerFields.forEach((field) => {
    const value = parseImportInteger(readAliasedValue(row, importHeaderAliases[field]));
    if (value != null) lead[field] = value;
  });

  const qualification = normalizeQualification(readAliasedValue(row, importHeaderAliases.qualification_status));
  if (qualification) lead.qualification_status = qualification;

  const contacts = [1, 2, 3, 4, 5]
    .map((index): ImportContact | null => {
      const name = readContactValue(row, index, contactHeaderAliases.name);
      if (!name) return null;

      const contact: ImportContact = {
        name,
        confidence: "medium",
        is_primary: index === 1,
      };

      const title = readContactValue(row, index, contactHeaderAliases.title);
      const email = readContactValue(row, index, contactHeaderAliases.email);
      const phone = readContactValue(row, index, contactHeaderAliases.phone);
      const linkedin = readContactValue(row, index, contactHeaderAliases.linkedin_url);

      if (title) contact.title = title;
      if (email) contact.email = email;
      if (phone) contact.phone = phone;
      if (linkedin) contact.linkedin_url = linkedin;

      return contact;
    })
    .filter(Boolean) as ImportContact[];

  if (contacts.length > 0) lead.contacts = contacts;

  return lead;
}

function qualificationVariant(status?: string | null) {
  if (status === "eligible") return "success";
  if (status === "potential") return "warning";
  if (status === "not_eligible") return "danger";
  return "neutral";
}

function scoreVariant(score?: number | null) {
  if ((score ?? 0) >= 80) return "success";
  if ((score ?? 0) >= 60) return "warning";
  return "neutral";
}

function scoreGrade(score?: number | null) {
  if ((score ?? 0) >= 80) return "Hot";
  if ((score ?? 0) >= 60) return "Warm";
  return "Cold";
}

function gradeVariant(score?: number | null) {
  if ((score ?? 0) >= 80) return "success";
  if ((score ?? 0) >= 60) return "warning";
  return "neutral";
}

function pipelineWarnings(lead: LeadRecord) {
  const warnings: string[] = [];

  if (lead.lead_score == null) {
    warnings.push("Score is required before pipeline entry");
  } else if (lead.lead_score < 60) {
    warnings.push("Score below 60 is blocked from pipeline entry");
  }

  if (!["eligible", "potential"].includes(lead.qualification_status ?? "")) {
    warnings.push("Qualification is not ready for pipeline entry");
  }

  return warnings;
}

function primarySourceSlug(lead: LeadRecord) {
  return lead.sources?.[0]?.source_type ?? "";
}

function primaryChannelId(lead: LeadRecord) {
  return lead.sources?.[0]?.channel_type_id ?? lead.sources?.[0]?.channel_type?.id ?? null;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatApiError(body: unknown, fallback: string) {
  if (!body || typeof body !== "object") return fallback;

  const response = body as { message?: unknown; errors?: unknown };
  const fieldMessages = response.errors && typeof response.errors === "object"
    ? Object.values(response.errors as Record<string, unknown>)
        .flatMap((value) => Array.isArray(value) ? value : [value])
        .filter((value): value is string => typeof value === "string")
    : [];

  if (fieldMessages.length > 0) {
    return fieldMessages.slice(0, 3).join(" ");
  }

  return typeof response.message === "string" ? response.message : fallback;
}

function normalizeWebsiteInput(value: string) {
  const website = value.trim();
  if (!website) return "";

  return /^[a-z][a-z0-9+.-]*:\/\//i.test(website) ? website : `https://${website}`;
}

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setting: numberFormatSetting, formatNumber, formatCurrency, normalizeAmountInput, formatAmountInput } = useNumberFormat();
  const [createNewModalConfig, setCreateNewModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    endpoint: string;
    payloadKey?: string;
    additionalPayload?: Record<string, any>;
    onSuccess: (item: any) => void;
  } | null>(null);

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [funnelStageId, setFunnelStageId] = useState(searchParams.get("funnel_stage_id") ?? "");
  const funnelMinSequence = searchParams.get("funnel_min_sequence") ?? "";
  const [qualificationFilter, setQualificationFilter] = useState(
    searchParams.get("qualification_status") ?? ""
  );
  const [duplicateFilter, setDuplicateFilter] = useState(searchParams.get("duplicate_status") ?? "");
  const [sourceFilter, setSourceFilter] = useState(searchParams.get("source_type") ?? "");
  const [channelFilter, setChannelFilter] = useState(searchParams.get("channel_type_id") ?? "");
  const [productFilter] = useState(searchParams.get("product_id") ?? "");
  const [ownerFilter, setOwnerFilter] = useState(searchParams.get("owner_id") ?? "");
  const [ownerRoleFilter, setOwnerRoleFilter] = useState("owner_id");
  const [showFilters, setShowFilters] = useState(false);
  const [minScore, setMinScore] = useState(searchParams.get("min_score") ?? "");
  const [maxScore, setMaxScore] = useState(searchParams.get("max_score") ?? "");
  const [feedback, setFeedback] = useState("");
  const [formError, setFormError] = useState("");
  const [formState, setFormState] = useState<LeadFormState>(emptyForm);
  const [createOpen, setCreateOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [locationFeedback, setLocationFeedback] = useState("");
  const [mapsApiKey, setMapsApiKey] = useState("");
  const [mapsEnabled, setMapsEnabled] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [importLeads, setImportLeads] = useState<ImportLead[]>([]);
  const [importRows, setImportRows] = useState<Record<string, unknown>[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importMapping, setImportMapping] = useState<Record<string, string>>({});
  const [importFileName, setImportFileName] = useState("");
  const [importSourceType, setImportSourceType] = useState("csv_import");
  const [importChannelTypeId, setImportChannelTypeId] = useState("");
  const [importResult, setImportResult] = useState<{
    created: number;
    contacts_created: number;
    skipped: { company_name: string; reason: string }[];
    leads: { id: number; company_name: string; duplicate_status: string }[];
  } | null>(null);
  const [editLead, setEditLead] = useState<LeadRecord | null>(null);
  const [deleteLead, setDeleteLead] = useState<LeadRecord | null>(null);
  const [assignLead, setAssignLead] = useState<LeadRecord | null>(null);
  const [assignOwnerId, setAssignOwnerId] = useState("");
  const [parentLeadSearch, setParentLeadSearch] = useState("");
  const [parentLeadResults, setParentLeadResults] = useState<{ id: number; company_name: string }[]>([]);
  const [parentLeadSearching, setParentLeadSearching] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  const user = useAuthStore((s) => s.user);



  const { data: stagesData } = useQuery({
    queryKey: ["funnel-stages"],
    queryFn: async () => {
      const response = await apiFetch("/funnel/stages");
      return response.json();
    },
  });

  const { data: publicSettingsData } = useQuery({
    queryKey: ["public-settings"],
    queryFn: async () => {
      const response = await apiFetch("/settings/public");
      return response.json();
    },
  });

  const { data: industriesData } = useQuery({
    queryKey: ["industries"],
    queryFn: async () => {
      const response = await apiFetch("/industries");
      return response.json();
    },
  });

  const { data: leadSourcesData } = useQuery({
    queryKey: ["lead-source-types"],
    queryFn: async () => {
      const response = await apiFetch("/settings/lead-sources");
      return response.json();
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await apiFetch("/products");
      return response.json();
    },
  });

  const { data: assignableUsersData } = useQuery({
    queryKey: ["lead-assignable-users"],
    queryFn: async () => {
      const response = await apiFetch("/leads/assignable-users");
      return response.ok ? response.json() : [];
    }
  });

  const { data: businessCategories = [] } = useQuery({
    queryKey: ["business-categories"],
    queryFn: async () => {
      const response = await apiFetch("/business-categories");
      const json = await response.json();
      return json.data || json;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["leads", page, perPage, search, funnelStageId, funnelMinSequence, qualificationFilter, duplicateFilter, sourceFilter, channelFilter, productFilter, ownerFilter, ownerRoleFilter, minScore, maxScore],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
      if (search) params.set("search", search);
      if (funnelStageId) params.set("funnel_stage_id", funnelStageId);
      if (funnelMinSequence) params.set("funnel_min_sequence", funnelMinSequence);
      if (qualificationFilter) params.set("qualification_status", qualificationFilter);
      if (duplicateFilter) params.set("duplicate_status", duplicateFilter);
      if (sourceFilter) params.set("source_type", sourceFilter);
      if (channelFilter) params.set("channel_type_id", channelFilter);
      if (productFilter) params.set("product_id", productFilter);
      if (ownerFilter) params.set(ownerRoleFilter || "owner_id", ownerFilter);
      if (minScore) params.set("min_score", minScore);
      if (maxScore) params.set("max_score", maxScore);
      const response = await apiFetch(`/leads?${params.toString()}`);
      return response.json();
    },
  });

  const funnelStages: FunnelStage[] = stagesData?.data ?? stagesData ?? [];
  const allIndustries: { id: number; name: string; sub_industries: { id: number; name: string }[] }[] =
    industriesData?.data ?? [];
  const selectedSubIndustries =
    allIndustries.find((i) => String(i.id) === formState.industry_id)?.sub_industries ?? [];
  const leads: LeadRecord[] = data?.data ?? [];
  const products: ProductOption[] = productsData?.data ?? [];
  const assignableUsers: AssignableUser[] = assignableUsersData?.data ?? [];
  const leadSources: LeadSourceType[] = leadSourcesData?.data ?? [];
  const activeLeadSources = leadSources.filter((source) => source.is_active);
  const activeLeadChannels = activeLeadSources.flatMap((source) =>
    (source.channels ?? [])
      .filter((channel) => channel.is_active)
      .map((channel) => ({ ...channel, source_name: source.name, source_slug: source.slug }))
  );
  const selectedLeadChannels = activeLeadChannels.filter((channel) => {
    if (!formState.source_type) return true;
    return channel.source_slug === formState.source_type;
  });
  const selectedImportChannels = activeLeadChannels.filter((channel) => {
    if (!importSourceType) return true;
    return channel.source_slug === importSourceType;
  });
  const filteredLeadChannels = activeLeadChannels.filter((channel) => {
    if (!sourceFilter) return true;
    return channel.source_slug === sourceFilter;
  });
  const sourceNameBySlug = new globalThis.Map(leadSources.map((source) => [source.slug, source.name]));
  const channelNameById = new globalThis.Map(activeLeadChannels.map((channel) => [channel.id, channel.name]));

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;
    if (lastPage <= maxVisible) {
      for (let i = 1; i <= lastPage; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (page <= 4) {
        pages.push(2, 3, 4, 5, "...", lastPage);
      } else if (page >= lastPage - 3) {
        pages.push("...", lastPage - 4, lastPage - 3, lastPage - 2, lastPage - 1, lastPage);
      } else {
        pages.push("...", page - 1, page, page + 1, "...", lastPage);
      }
    }
    return pages;
  };

  const total = data?.total ?? 0;
  const lastPage = data?.last_page ?? 1;
  const locationCenter = formState.lat && formState.lng
    ? { lat: Number(formState.lat), lng: Number(formState.lng) }
    : defaultMapCenter;

  useEffect(() => {
    if (!publicSettingsData?.data) return;
    const settings = publicSettingsData.data;
    setMapsApiKey(settings.GOOGLE_MAPS_BROWSER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "");
    setMapsEnabled(settings.GOOGLE_MAPS_ENABLED === undefined || settings.GOOGLE_MAPS_ENABLED === true || settings.GOOGLE_MAPS_ENABLED === "true");
  }, [publicSettingsData]);

  const resetForm = () => {
    setFormState(emptyForm);
    setLocationSearch("");
    setLocationFeedback("");
  };

  const resetImport = () => {
    setImportLeads([]);
    setImportRows([]);
    setImportHeaders([]);
    setImportMapping({});
    setImportFileName("");
    setImportSourceType(activeLeadSources.some((source) => source.slug === "csv_import") ? "csv_import" : activeLeadSources[0]?.slug ?? "");
    setImportChannelTypeId("");
    setImportResult(null);
  };

  const applyImportMapping = (mapping: Record<string, string>, rows = importRows) => {
    setImportMapping(mapping);
    setImportLeads(mapImportRows(rows, mapping));
  };

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await apiFetch("/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(formatApiError(body, `Failed to create lead (${res.status})`));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setCreateOpen(false);
      setFormError("");
      resetForm();
      setFeedback("Lead created successfully.");
    },
    onError: (err: Error) => {
      setFormError(err.message);
      setFeedback(err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Record<string, unknown> }) => {
      const res = await apiFetch(`/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(formatApiError(body, `Failed to update lead (${res.status})`));
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setEditLead(null);
      setFormError("");
      resetForm();
      setFeedback("Lead updated successfully.");
    },
    onError: (err: Error) => {
      setFormError(err.message);
      setFeedback(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiFetch(`/leads/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setDeleteLead(null);
      setFeedback("Lead deleted successfully.");
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/leads/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: importLeads,
          source_type: importSourceType || undefined,
          channel_type_id: importChannelTypeId ? Number(importChannelTypeId) : undefined,
          ai_mode: "manual",
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `Failed to import leads (${res.status})`);
      }

      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      // Store the result so the modal can display the report — don't auto-close.
      setImportResult(result);
      setFeedback(
        `Import completed: ${result.created ?? 0} leads and ${result.contacts_created ?? 0} PIC/contact records created.`
      );
    },
    onError: (err: Error) => {
      setFeedback(err.message);
    },
  });

  const handleDownloadImportReport = () => {
    if (!importResult) return;
    const rows = [
      // Created rows
      ...(importResult.leads ?? []).map((lead) => ({
        Status: "imported",
        "Lead ID": lead.id,
        "Company Name": lead.company_name,
        "Duplicate Status": lead.duplicate_status ?? "",
        Reason: "",
      })),
      // Skipped rows
      ...(importResult.skipped ?? []).map((item) => ({
        Status: "skipped",
        "Lead ID": "",
        "Company Name": item.company_name,
        "Duplicate Status": "",
        Reason: item.reason,
      })),
    ];
    downloadTimestampedReport(
      rows,
      "lead_import_report",
      ["Status", "Lead ID", "Company Name", "Duplicate Status", "Reason"]
    );
  };

  const pushToFunnel = useMutation({
    mutationFn: async ({ id, funnelStageId }: { id: number; funnelStageId: number }) => {
      const response = await apiFetch(`/leads/${id}/push-to-funnel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ funnel_stage_id: funnelStageId }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? "Lead could not enter the pipeline.");
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setFeedback("Lead pushed to funnel.");
    },
    onError: (error: Error) => {
      setFeedback(error.message);
    },
  });

  const claimLeadMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiFetch(`/leads/${id}/claim`, { method: "POST" });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? "Lead could not be claimed.");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setFeedback("Lead claimed successfully.");
    },
    onError: (error: Error) => {
      setFeedback(error.message);
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const response = await apiFetch("/leads/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? "Failed to delete leads.");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setFeedback("Selected leads deleted successfully.");
      setSelectedLeads([]);
      setBatchDeleteOpen(false);
    },
    onError: (error: Error) => {
      setFeedback(error.message);
      setBatchDeleteOpen(false);
    },
  });

  const batchIntelligenceMutation = useMutation({
    mutationFn: async (leadIds: number[]) => {
      const response = await apiFetch(`/leads/bulk-intelligence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_ids: leadIds }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? "Failed to run AI Intelligence.");
      }
      return response.json();
    },
    onSuccess: () => {
      setFeedback("AI Intelligence analysis is running in the background for selected leads.");
      setSelectedLeads([]);
    },
    onError: (err: any) => {
      setFeedback(err.message || "Failed to trigger AI Intelligence.");
    },
  });

  const assignLeadMutation = useMutation({
    mutationFn: async ({ id, ownerId }: { id: number; ownerId: string }) => {
      const response = await apiFetch(`/leads/${id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner_id: ownerId ? Number(ownerId) : null }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message ?? "Lead could not be assigned.");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setAssignLead(null);
      setAssignOwnerId("");
      setFeedback("Lead assignment updated.");
    },
    onError: (error: Error) => {
      setFeedback(error.message);
    },
  });

  const openEdit = (lead: LeadRecord) => {
    setEditLead(lead);
    setFormError("");
    setLocationSearch(lead.address || "");
    setLocationFeedback("");
    setFormState({
      company_name:          lead.company_name || "",
      brand:                 lead.brand || "",
      address:               lead.address || "",
      lat:                   lead.lat != null ? String(lead.lat) : "",
      lng:                   lead.lng != null ? String(lead.lng) : "",
      email:                 lead.email || "",
      phone:                 lead.phone || "",
      website:               lead.website || "",
      industry_id:           lead.industry_id != null ? String(lead.industry_id) : "",
      sub_industry_id:       lead.sub_industry_id != null ? String(lead.sub_industry_id) : "",
      company_size_estimate: lead.company_size_estimate || "",
      meeting_link:          lead.meeting_link || "",
      lead_score:            lead.lead_score != null ? String(lead.lead_score) : "",
      business_category_id:  lead.business_category_id?.toString() || "",
      product_id:            lead.product_id != null ? String(lead.product_id) : "",
      estimated_closing_amount: lead.estimated_closing_amount != null ? String(lead.estimated_closing_amount) : "",
      realized_closing_amount:  lead.realized_closing_amount != null ? String(lead.realized_closing_amount) : "",
      source_type:           primarySourceSlug(lead),
      channel_type_id:       primaryChannelId(lead) != null ? String(primaryChannelId(lead)) : "",
      funnel_stage_id:       String(lead.funnel_stage_id ?? lead.current_funnel_stage?.id ?? ""),
      qualification_status:  lead.qualification_status || "pending",
      parent_lead_id:        lead.parent_lead_id != null ? String(lead.parent_lead_id) : "",
    });
  };

  const resetFilters = () => {
    setSearch("");
    setFunnelStageId("");
    setQualificationFilter("");
    setDuplicateFilter("");
    setSourceFilter("");
    setChannelFilter("");
    setOwnerFilter("");
    setMinScore("");
    setMaxScore("");
    setPage(1);
    router.replace("/leads");
  };

  const submitCreate = () => {
    setFormError("");
    const website = normalizeWebsiteInput(formState.website);

    createMutation.mutate({
      company_name:          formState.company_name.trim(),
      brand:                 formState.brand.trim() || undefined,
      address:               formState.address.trim() || undefined,
      lat:                   formState.lat ? Number(formState.lat) : undefined,
      lng:                   formState.lng ? Number(formState.lng) : undefined,
      email:                 formState.email.trim() || undefined,
      phone:                 formState.phone.trim() || undefined,
      website:               website || undefined,
      industry_id:           formState.industry_id ? Number(formState.industry_id) : undefined,
      sub_industry_id:       formState.sub_industry_id ? Number(formState.sub_industry_id) : undefined,
      company_size_estimate: formState.company_size_estimate.trim() || undefined,
      business_category_id:  formState.business_category_id || undefined,
      product_id:            formState.product_id ? Number(formState.product_id) : undefined,
      estimated_closing_amount: formState.estimated_closing_amount ? Number(formState.estimated_closing_amount) : undefined,
      realized_closing_amount:  formState.realized_closing_amount ? Number(formState.realized_closing_amount) : undefined,
      source_type:           formState.source_type || undefined,
      channel_type_id:       formState.channel_type_id ? Number(formState.channel_type_id) : undefined,
      parent_lead_id:        formState.parent_lead_id ? Number(formState.parent_lead_id) : undefined,
    });
  };

  const submitUpdate = () => {
    if (!editLead) return;
    setFormError("");
    const website = normalizeWebsiteInput(formState.website);

    updateMutation.mutate({
      id: editLead.id,
      payload: {
        company_name:          formState.company_name.trim(),
        brand:                 formState.brand.trim() || null,
        address:               formState.address.trim() || null,
        lat:                   formState.lat ? Number(formState.lat) : null,
        lng:                   formState.lng ? Number(formState.lng) : null,
        email:                 formState.email.trim() || null,
        phone:                 formState.phone.trim() || null,
        website:               website || null,
        industry_id:           formState.industry_id ? Number(formState.industry_id) : null,
        sub_industry_id:       formState.sub_industry_id ? Number(formState.sub_industry_id) : null,
        company_size_estimate: formState.company_size_estimate.trim() || null,
        business_category_id:  formState.business_category_id || null,
        product_id:            formState.product_id ? Number(formState.product_id) : null,
        estimated_closing_amount: formState.estimated_closing_amount ? Number(formState.estimated_closing_amount) : null,
        realized_closing_amount:  formState.realized_closing_amount ? Number(formState.realized_closing_amount) : null,
        source_type:           formState.source_type || null,
        channel_type_id:       formState.channel_type_id ? Number(formState.channel_type_id) : null,
        funnel_stage_id:       formState.funnel_stage_id ? Number(formState.funnel_stage_id) : null,
        qualification_status:  formState.qualification_status || null,
        parent_lead_id:        formState.parent_lead_id ? Number(formState.parent_lead_id) : null,
      },
    });
  };

  const searchParentLead = async (query: string) => {
    if (!query.trim()) { setParentLeadResults([]); return; }
    setParentLeadSearching(true);
    try {
      const res = await apiFetch(`/leads?search=${encodeURIComponent(query)}&per_page=8`);
      const json = await res.json();
      const items = (json?.data ?? []).map((l: any) => ({ id: l.id, company_name: l.company_name }));
      setParentLeadResults(items);
    } catch { setParentLeadResults([]); }
    finally { setParentLeadSearching(false); }
  };

  const handleExport = async () => {
    try {
      const response = await apiFetch("/leads/export");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "leads_export.csv";
      link.click();
      URL.revokeObjectURL(url);
      setFeedback("Lead export downloaded.");
    } catch {
      setFeedback("Unable to export leads right now.");
    }
  };

  const renderInlineLocationPicker = () => (
    <div className="grid gap-3 rounded-xl border border-border bg-[color:var(--surface-subtle)] p-3">
      <div className="flex flex-col gap-2 md:flex-row">
        <Input
          value={locationSearch}
          onChange={(event) => setLocationSearch(event.target.value)}
          placeholder="Search address, building, or area"
        />
        <Button type="button" onClick={handleLocationSearch}>
          <MapPin className="h-4 w-4" />
          Search Location
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {locationFeedback ? <Badge variant="info">{locationFeedback}</Badge> : null}
        <span className="text-xs text-muted-foreground">
          {formState.lat && formState.lng
            ? `${formState.lat}, ${formState.lng}`
            : "No coordinates selected"}
        </span>
      </div>
      <div className="h-[260px] overflow-hidden rounded-xl border border-border bg-background">
        {mapsEnabled && mapsApiKey ? (
          <APIProvider apiKey={mapsApiKey}>
            <Map
              mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID"}
              center={locationCenter}
              defaultCenter={locationCenter}
              defaultZoom={formState.lat && formState.lng ? 15 : 11}
              gestureHandling="greedy"
            >
              {formState.lat && formState.lng ? (
                <AdvancedMarker position={locationCenter}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-[color:var(--brand)] text-white shadow-lg">
                    <MapPin className="h-4 w-4" />
                  </div>
                </AdvancedMarker>
              ) : null}
            </Map>
          </APIProvider>
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
            Maps are unavailable. Configure the public Google Maps browser key to use location selection.
          </div>
        )}
      </div>
    </div>
  );

  const handleDownloadImportTemplate = async () => {
    const XLSX = await import("xlsx");
    const exampleRow = importMappingTargets.reduce<Record<string, string | number>>((row, target) => {
      row[target.label] = target.example;
      return row;
    }, {});
    const mappingRows = importMappingTargets.map((target) => ({
      "Database Field": target.key,
      "Excel Column": target.label,
      Group: target.group,
      Required: target.required ? "Yes" : "No",
      Notes: target.note ?? "",
    }));
    const workbook = XLSX.utils.book_new();
    const dataSheet = XLSX.utils.json_to_sheet([exampleRow], { header: importTemplateHeaders });
    const mappingSheet = XLSX.utils.json_to_sheet(mappingRows);

    XLSX.utils.book_append_sheet(workbook, dataSheet, "Leads Import");
    XLSX.utils.book_append_sheet(workbook, mappingSheet, "Field Mapping");
    XLSX.writeFile(workbook, "leads_import_template.xlsx");
    setFeedback("Lead import template downloaded.");
  };

  const handleImportFile = async (file?: File | null) => {
    if (!file) return;

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: "",
        raw: false,
      });
      const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
      const mapping = detectImportMapping(headers);
      const parsed = mapImportRows(rows, mapping);

      setImportFileName(file.name);
      setImportRows(rows);
      setImportHeaders(headers);
      setImportMapping(mapping);
      setImportLeads(parsed);
      setFeedback(
        parsed.length > 0
          ? `${parsed.length} leads ready to import from ${file.name}.`
          : "No valid leads found. Make sure the sheet has a Company Name column."
      );
    } catch {
      setImportFileName(file.name);
      setImportRows([]);
      setImportHeaders([]);
      setImportMapping({});
      setImportLeads([]);
      setFeedback("Unable to read the file. Please upload .xlsx, .xls, or .csv.");
    }
  };

  const handleLocationSearch = async () => {
    const query = locationSearch.trim() || formState.address.trim() || formState.company_name.trim();
    if (!query) {
      setLocationFeedback("Enter an address or company location to search.");
      return;
    }

    setLocationFeedback("Searching location...");
    try {
      const response = await apiFetch(`/maps/geocode?query=${encodeURIComponent(query)}`);
      const json = await response.json();
      if (!response.ok || !json?.data) {
        setLocationFeedback(json?.error || "Location not found.");
        return;
      }
      setFormState((current) => ({
        ...current,
        lat: String(json.data.lat),
        lng: String(json.data.lng),
        address: current.address || json.data.formatted_address || "",
      }));
      setLocationFeedback(json.data.formatted_address || "Location selected.");
    } catch {
      setLocationFeedback("Unable to search location right now.");
    }
  };

  const handleWhatsApp = (phone?: string | null) => {
    if (!phone) {
      setFeedback("This lead does not have a phone number.");
      return;
    }
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}`, "_blank");
  };

  const hasActiveFilter = Boolean(
    search || funnelStageId || funnelMinSequence || qualificationFilter || duplicateFilter || sourceFilter || channelFilter || ownerFilter || minScore || maxScore
  );

  const openAssign = (lead: LeadRecord) => {
    setAssignLead(lead);
    setAssignOwnerId(lead.owner?.id ? String(lead.owner.id) : "");
  };

  const getNextFunnelStageId = (lead: LeadRecord) => {
    const ordered = [...funnelStages].sort((a, b) => a.sequence - b.sequence);
    const currentIndex = ordered.findIndex(
      (stage) => stage.id === (lead.funnel_stage_id ?? lead.current_funnel_stage?.id)
    );

    if (currentIndex === -1) {
      return ordered[0]?.id ?? null;
    }

    return ordered[currentIndex + 1]?.id ?? ordered[currentIndex]?.id ?? null;
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Leads</CardTitle>
            <CardDescription>Discovered and enriched leads with one standardized admin workflow.</CardDescription>
          </div>
          <div className="flex items-center gap-2" data-tour="leads-actions">
            <Link href="/qualification/reviews">
              <Button variant="outline">
                Review Queue
              </Button>
            </Link>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                resetImport();
                setImportOpen(true);
              }}
            >
              <Upload className="h-4 w-4" />
              Import
            </Button>
            {user?.role?.name === "super_admin" && selectedLeads.length > 0 && (
              <Button
                variant="destructive"
                onClick={() => setBatchDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected ({selectedLeads.length})
              </Button>
            )}
            {selectedLeads.length > 0 && (
              <Button
                variant="outline"
                className="bg-[color-mix(in_oklch,var(--brand)_15%,transparent)] text-[var(--brand)] border-[var(--brand)]/30 hover:bg-[var(--brand)] hover:text-white"
                onClick={() => batchIntelligenceMutation.mutate(selectedLeads)}
                disabled={batchIntelligenceMutation.isPending}
              >
                {batchIntelligenceMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <BrainCircuit className="h-4 w-4 mr-2" />
                )}
                Run AI Intelligence ({selectedLeads.length})
              </Button>
            )}
            <Button
              onClick={() => {
                resetForm();
                setFormError("");
                setCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              New Lead
            </Button>
          </div>
        </CardHeader>
        {feedback ? (
          <CardContent className="pt-0">
            <Badge variant="info">{feedback}</Badge>
          </CardContent>
        ) : null}
      </Card>

      <div data-tour="leads-filters" className="space-y-3">
        <FilterBar>
          <FilterBarSearch
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search company, industry, or email"
          />
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className="shrink-0"
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? "Hide Filters" : "Show Filters"}
            {hasActiveFilter && !showFilters && (
               <Badge variant="brand" className="ml-2">Active</Badge>
            )}
            {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
          </Button>
          {hasActiveFilter ? (
            <Button variant="ghost" onClick={resetFilters}>
              Clear
            </Button>
          ) : null}
        </FilterBar>

        {showFilters && (
          <FilterBar className="bg-card/50 border-dashed">
            <Select
              value={funnelStageId}
              onChange={(event) => {
                setFunnelStageId(event.target.value);
                setPage(1);
              }}
              placeholder="All stages"
            >
              {funnelStages.map((stage) => (
                <option key={stage.id} value={String(stage.id)}>
                  {stage.name}
                </option>
              ))}
            </Select>
            <Select
              value={qualificationFilter}
              onChange={(event) => {
                setQualificationFilter(event.target.value);
                setPage(1);
              }}
              placeholder="All qualifications"
            >
              <option value="pending">Pending</option>
              <option value="eligible">Eligible</option>
              <option value="potential">Potential</option>
              <option value="not_eligible">Not eligible</option>
            </Select>
            <Select
              value={duplicateFilter}
              onChange={(event) => {
                setDuplicateFilter(event.target.value);
                setPage(1);
              }}
              placeholder="All duplicate states"
            >
              <option value="new">New</option>
              <option value="probable_duplicate">Probable duplicate</option>
              <option value="exact_duplicate">Exact duplicate</option>
            </Select>
            <div className="flex items-center gap-2 border border-input rounded-xl bg-background pr-1 focus-within:border-[var(--brand)] focus-within:ring-3 focus-within:ring-[color:var(--brand)]/15">
              <Select
                value={ownerRoleFilter}
                onChange={(event) => {
                  setOwnerRoleFilter(event.target.value);
                  setPage(1);
                }}
                className="w-32 border-0 focus-visible:ring-0 shadow-none bg-transparent"
              >
                <option value="owner_id">Sales</option>
                <option value="presales_owner_id">Presales</option>
                <option value="am_owner_id">Account Mgr</option>
                <option value="csm_owner_id">CSM</option>
              </Select>
              <div className="w-px h-5 bg-border"></div>
              <Select
                value={ownerFilter}
                onChange={(event) => {
                  setOwnerFilter(event.target.value);
                  setPage(1);
                }}
                className="border-0 focus-visible:ring-0 shadow-none bg-transparent min-w-[140px]"
                placeholder="All members"
              >
                <option value="unassigned">Lead Pool</option>
                {assignableUsers.map((user) => (
                  <option key={user.id} value={String(user.id)}>
                    {user.name}
                  </option>
                ))}
              </Select>
            </div>
            <Select
              value={sourceFilter}
              onChange={(event) => {
                const nextSource = event.target.value;
                setSourceFilter(nextSource);
                setChannelFilter("");
                setPage(1);
              }}
              placeholder="All sources"
            >
              {leadSources.map((source) => (
                <option key={source.id} value={source.slug}>
                  {source.name}
                </option>
              ))}
            </Select>
            <Select
              value={channelFilter}
              onChange={(event) => {
                setChannelFilter(event.target.value);
                setPage(1);
              }}
              placeholder="All channels"
              disabled={filteredLeadChannels.length === 0}
            >
              {filteredLeadChannels.map((channel) => (
                <option key={channel.id} value={String(channel.id)}>
                  {channel.name}
                </option>
              ))}
            </Select>
            <Input
              className="w-24"
              inputMode="numeric"
              value={minScore}
              onChange={(event) => {
                setMinScore(event.target.value);
                setPage(1);
              }}
              placeholder="Min score"
            />
            <Input
              className="w-24"
              inputMode="numeric"
              value={maxScore}
              onChange={(event) => {
                setMaxScore(event.target.value);
                setPage(1);
              }}
              placeholder="Max score"
            />
          </FilterBar>
        )}
      </div>

      <div data-tour="leads-table" className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <tr>
                {user?.role?.name === "super_admin" && (
                  <TableHeaderCell className="w-[40px]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                      checked={leads.length > 0 && selectedLeads.length === leads.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLeads(leads.map((l) => l.id));
                        } else {
                          setSelectedLeads([]);
                        }
                      }}
                    />
                  </TableHeaderCell>
                )}
                <TableHeaderCell className="min-w-[200px]">Company</TableHeaderCell>
                <TableHeaderCell className="min-w-[120px]">Industry</TableHeaderCell>
                <TableHeaderCell className="min-w-[140px]">Product</TableHeaderCell>
                <TableHeaderCell className="min-w-[120px]">Source</TableHeaderCell>
                <TableHeaderCell className="min-w-[130px]">Channel</TableHeaderCell>
                <TableHeaderCell className="min-w-[150px]">Lark Sync</TableHeaderCell>
                <TableHeaderCell className="min-w-[160px]">Contact</TableHeaderCell>
                <TableHeaderCell className="w-[90px]">Score</TableHeaderCell>
                <TableHeaderCell className="w-[80px]">Grade</TableHeaderCell>
                <TableHeaderCell className="w-[120px]">Qualification</TableHeaderCell>
                <TableHeaderCell className="min-w-[150px]">Est. Closing</TableHeaderCell>
                <TableHeaderCell className="min-w-[150px]">Realized</TableHeaderCell>
                <TableHeaderCell className="min-w-[140px]">Owner</TableHeaderCell>
                <TableHeaderCell className="w-[120px]">Stage</TableHeaderCell>
                <TableHeaderCell className="w-[160px]">Actions</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableEmpty colSpan={14}>
                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                  Loading leads...
                </TableEmpty>
              ) : leads.length === 0 ? (
                <TableEmpty colSpan={user?.role?.name === "super_admin" ? 15 : 14}>No leads found.</TableEmpty>
              ) : (
                leads.map((lead) => (
                  <TableRow key={lead.id}>
                    {user?.role?.name === "super_admin" && (
                      <TableCell>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                          checked={selectedLeads.includes(lead.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLeads((prev) => [...prev, lead.id]);
                            } else {
                              setSelectedLeads((prev) => prev.filter((id) => id !== lead.id));
                            }
                          }}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <Link href={`/leads/${lead.id}`} className="block space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{lead.company_name}</p>
                          {lead.brand && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 bg-slate-100 text-slate-800 border-slate-300">
                              {lead.brand}
                            </Badge>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{lead.address || "No address"}</p>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral">{lead.industry?.name ?? (businessCategories.find((bc: any) => bc.id === lead.business_category_id)?.name) ?? "Unknown"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={lead.product ? "info" : "neutral"}>
                        {lead.product?.name ?? "Unassigned"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {primarySourceSlug(lead) ? (
                        <Badge variant="brand">
                          {sourceNameBySlug.get(primarySourceSlug(lead)) ?? primarySourceSlug(lead)}
                        </Badge>
                      ) : (
                        <Badge variant="neutral">Unclassified</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {primaryChannelId(lead) ? (
                        <Badge variant="info">
                          {channelNameById.get(primaryChannelId(lead) as number) ?? lead.sources?.[0]?.channel_type?.name ?? "Channel"}
                        </Badge>
                      ) : (
                        <Badge variant="neutral">Unclassified</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {lead.lark_base_id ? (
                        <div className="space-y-1 text-xs">
                          <p className="truncate w-[120px] font-mono text-muted-foreground" title={`Base: ${lead.lark_base_id}`}>B: {lead.lark_base_id.substring(0, 8)}...</p>
                          <p className="truncate w-[120px] font-mono text-muted-foreground" title={`Table: ${lead.lark_table_id}`}>T: {lead.lark_table_id?.substring(0, 8)}...</p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        <p>{lead.email || "—"}</p>
                        <p className="text-muted-foreground">{lead.phone || "No phone"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={scoreVariant(lead.lead_score)}>{lead.lead_score ?? "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={gradeVariant(lead.lead_score)}>{scoreGrade(lead.lead_score)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={qualificationVariant(lead.qualification_status)}>
                        {(lead.qualification_status || "pending").replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{formatCurrency(lead.estimated_closing_amount)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{formatCurrency(lead.realized_closing_amount)}</span>
                    </TableCell>
                    <TableCell>
                      {lead.owner ? (
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{lead.owner.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{lead.owner.email ?? "Assigned"}</p>
                        </div>
                      ) : (
                        <Badge variant="warning">Lead Pool</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => {
                          setFunnelStageId(String(lead.funnel_stage_id ?? ""));
                          setPage(1);
                        }}
                        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {lead.funnel_stage?.name ?? lead.current_funnel_stage?.name ?? "—"}
                      </button>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const warnings = pipelineWarnings(lead);
                        const blocked = warnings.length > 0;
                        const nextStageId = getNextFunnelStageId(lead);

                        return (
                          <div className="flex items-center gap-1 whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                if (lead.owner) {
                                  openAssign(lead);
                                  return;
                                }
                                claimLeadMutation.mutate(lead.id);
                              }}
                              disabled={claimLeadMutation.isPending || assignLeadMutation.isPending}
                              tooltip={lead.owner ? "Reassign owner" : "Claim lead"}
                            >
                              {lead.owner ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                if (!nextStageId) {
                                  setFeedback("No funnel stage is available for this lead.");
                                  return;
                                }
                                pushToFunnel.mutate({ id: lead.id, funnelStageId: nextStageId });
                              }}
                              disabled={blocked || pushToFunnel.isPending || !nextStageId}
                              tooltip={blocked ? warnings.join(" · ") : "Push to funnel"}
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEdit(lead)}
                              tooltip="Edit lead"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeleteLead(lead)}
                              tooltip="Delete lead"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleWhatsApp(lead.phone)}
                              tooltip="Open WhatsApp"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                            <Link
                              href={`/leads/${lead.id}`}
                              className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
                              title="View details"
                              aria-label="View details"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </div>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border px-5 py-3 gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <p className="text-xs text-muted-foreground">
              Showing page {page} of {lastPage} ({total} total)
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page:</span>
              <Select
                value={String(perPage)}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="w-20 h-8 py-0 px-2 text-xs rounded-lg animate-none"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="30">30</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              tooltip="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Page Buttons */}
            {getPageNumbers().map((p, idx) => {
              if (p === "...") {
                return (
                  <span key={`dots-${idx}`} className="px-1 text-xs text-muted-foreground font-medium select-none">
                    ...
                  </span>
                );
              }
              return (
                <Button
                  key={`page-${p}`}
                  variant={p === page ? "default" : "ghost"}
                  size="sm"
                  className="h-8 w-8 px-0 text-xs font-semibold rounded-lg"
                  onClick={() => setPage(Number(p))}
                >
                  {p}
                </Button>
              );
            })}

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
              disabled={page >= lastPage}
              tooltip="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Modal
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open);
          if (!open) resetImport();
        }}
        title="Import Leads"
        description="Upload an Excel or CSV file and migrate lead companies with related PIC/contact rows."
        size="xl"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setImportOpen(false);
                resetImport();
              }}
            >
              {importResult ? "Close" : "Cancel"}
            </Button>
            {importResult ? (
              <Button variant="outline" onClick={handleDownloadImportReport}>
                <Download className="h-4 w-4" />
                Download Report (.csv)
              </Button>
            ) : null}
            {!importResult ? (
              <Button
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending || importLeads.length === 0}
              >
                {importMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Import {importLeads.length || ""} Leads
              </Button>
            ) : null}
          </>
        }
      >
        <div className="grid gap-5">
          {/* ── Import Result Report ─────────────────────────────── */}
          {importResult ? (
            <div className="grid gap-4">
              {/* Summary pills */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Imported", value: importResult.created, variant: "success" as const },
                  { label: "PIC / Contacts", value: importResult.contacts_created, variant: "info" as const },
                  { label: "Skipped", value: importResult.skipped.length, variant: importResult.skipped.length > 0 ? "warning" as const : "neutral" as const },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="flex flex-col items-center justify-center rounded-lg border border-border bg-[var(--background)] py-3 px-4"
                  >
                    <span className="text-2xl font-semibold">{stat.value}</span>
                    <span className="mt-0.5 text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                ))}
              </div>

              {/* Success banner */}
              <div className="flex items-center gap-2 rounded-lg border border-[var(--success)]/30 bg-[var(--success)]/10 px-4 py-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--success)]" />
                <p className="text-sm font-medium text-[var(--success)]">
                  Import complete — {importResult.created} lead{importResult.created !== 1 ? "s" : ""} added.
                  {importResult.contacts_created > 0
                    ? ` ${importResult.contacts_created} PIC / contact record${importResult.contacts_created !== 1 ? "s" : ""} also created.`
                    : ""}
                </p>
              </div>

              {/* Skipped table */}
              {importResult.skipped.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-border">
                  <div className="border-b border-border bg-[var(--background)] px-3 py-2 text-sm font-semibold">
                    Skipped Rows ({importResult.skipped.length})
                  </div>
                  <div className="max-h-56 overflow-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-card">
                        <tr>
                          <th className="border-b border-border px-3 py-2">Company Name</th>
                          <th className="border-b border-border px-3 py-2">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.skipped.map((item, idx) => (
                          <tr key={idx} className="border-b border-border/60">
                            <td className="max-w-48 truncate px-3 py-2 font-medium">{item.company_name}</td>
                            <td className="px-3 py-2 text-muted-foreground">{item.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No rows were skipped — all leads imported successfully.</p>
              )}

              {/* Imported leads compact list */}
              {(importResult.leads ?? []).length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-border">
                  <div className="border-b border-border bg-[var(--background)] px-3 py-2 text-sm font-semibold">
                    Imported Leads ({importResult.leads.length})
                  </div>
                  <div className="max-h-48 overflow-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-card">
                        <tr>
                          <th className="border-b border-border px-3 py-2">ID</th>
                          <th className="border-b border-border px-3 py-2">Company Name</th>
                          <th className="border-b border-border px-3 py-2">Duplicate Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.leads.map((lead) => (
                          <tr key={lead.id} className="border-b border-border/60">
                            <td className="px-3 py-2 font-mono text-muted-foreground">{lead.id}</td>
                            <td className="max-w-56 truncate px-3 py-2 font-medium">{lead.company_name}</td>
                            <td className="px-3 py-2">
                              <Badge variant={lead.duplicate_status === "unique" ? "success" : "warning"}>
                                {lead.duplicate_status ?? "—"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* ── Upload form (hidden after result is shown) ─── */}
          {!importResult ? (
            <>
              <div className="grid gap-4 md:grid-cols-[180px_1fr_180px_220px]">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Template</label>
                  <Button variant="outline" onClick={handleDownloadImportTemplate}>
                    <Download className="h-4 w-4" />
                    Template
                  </Button>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Excel or CSV File</label>
                  <Input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(event) => handleImportFile(event.target.files?.[0])}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Lead Source</label>
                  <Select
                    value={importSourceType}
                    onChange={(event) => {
                      setImportSourceType(event.target.value);
                      setImportChannelTypeId("");
                    }}
                    placeholder="Select source"
                  >
                    {activeLeadSources.map((source) => (
                      <option key={source.id} value={source.slug}>{source.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Channel Type</label>
                  <Select
                    value={importChannelTypeId}
                    onChange={(event) => setImportChannelTypeId(event.target.value)}
                    placeholder="Select channel"
                    disabled={!importSourceType || selectedImportChannels.length === 0}
                  >
                    {selectedImportChannels.map((channel) => (
                      <option key={channel.id} value={String(channel.id)}>{channel.name}</option>
                    ))}
                  </Select>
                </div>
              </div>
    
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle className="text-base">Column Mapping</CardTitle>
                    <CardDescription>
                      Match each database field with a column from the uploaded file before importing.
                    </CardDescription>
                  </div>
                  {importHeaders.length > 0 ? (
                    <Badge variant="info">{importHeaders.length} columns detected</Badge>
                  ) : null}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-3 md:grid-cols-2">
                    {importMappingTargets.map((target) => (
                      <div key={target.key} className="grid gap-2">
                        <label className="text-sm font-medium">
                          {target.group} · {target.label}
                          {target.required ? <span className="text-destructive"> *</span> : null}
                        </label>
                        <Select
                          value={importMapping[target.key] ?? ""}
                          onChange={(event) => {
                            const nextMapping = { ...importMapping };
                            if (event.target.value) {
                              nextMapping[target.key] = event.target.value;
                            } else {
                              delete nextMapping[target.key];
                            }
                            applyImportMapping(nextMapping);
                          }}
                          placeholder="Not mapped"
                          disabled={importHeaders.length === 0}
                        >
                          {importHeaders.map((header) => (
                            <option key={`${target.key}-${header}`} value={header}>
                              {header}
                            </option>
                          ))}
                        </Select>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
    
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileSpreadsheet className="h-4 w-4" />
                      Import Preview
                    </CardTitle>
                    <CardDescription>
                      {importFileName || "No file selected"} · {importLeads.length} valid lead rows detected
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <TableShell>
                    <Table>
                      <TableHead>
                        <tr>
                          <th className="border-b border-border px-3 py-2">Company</th>
                          <th className="border-b border-border px-3 py-2">Contact</th>
                          <th className="border-b border-border px-3 py-2">Email</th>
                          <th className="border-b border-border px-3 py-2">Phone</th>
                          <th className="border-b border-border px-3 py-2">PIC Count</th>
                        </tr>
                      </TableHead>
                      <TableBody>
                        {importLeads.length === 0 ? (
                          <TableEmpty colSpan={5}>
                            Upload a sheet with columns such as Company Name, Address, Email, Phone, PIC Name, PIC Email, and PIC Phone.
                          </TableEmpty>
                        ) : (
                          importLeads.slice(0, 10).map((lead, index) => (
                            <TableRow key={`${lead.company_name}-${index}`}>
                              <TableCell>
                                <div className="space-y-1">
                                  <p className="font-medium">{lead.company_name}</p>
                                  <p className="truncate text-xs text-muted-foreground">{lead.address || "No address"}</p>
                                </div>
                              </TableCell>
                              <TableCell>{lead.contacts?.[0]?.name ?? "—"}</TableCell>
                              <TableCell>{lead.email ?? lead.contacts?.[0]?.email ?? "—"}</TableCell>
                              <TableCell>{lead.phone ?? lead.contacts?.[0]?.phone ?? "—"}</TableCell>
                              <TableCell>
                                <Badge variant={lead.contacts?.length ? "info" : "neutral"}>
                                  {lead.contacts?.length ?? 0}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableShell>
                  {importLeads.length > 10 ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Showing the first 10 rows. All {importLeads.length} valid rows will be imported.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            resetForm();
            setFormError("");
          }
        }}
        title="Create Lead"
        description="Add a new lead company to the platform."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitCreate}
              disabled={createMutation.isPending || !formState.company_name.trim()}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create Lead
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          {formError ? (
            <Badge variant="danger" className="justify-start rounded-lg px-3 py-2 text-left">
              {formError}
            </Badge>
          ) : null}
          <div className="grid gap-2">
            <label className="text-sm font-medium">Company Name <span className="text-destructive">*</span></label>
            <Input
              value={formState.company_name}
              onChange={(e) => setFormState((s) => ({ ...s, company_name: e.target.value }))}
              placeholder="e.g. PT Artha Solusi Global"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Brand</label>
            <Input
              value={formState.brand}
              onChange={(e) => setFormState((s) => ({ ...s, brand: e.target.value }))}
              placeholder="e.g. Artha"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Address</label>
            <Input
              value={formState.address}
              onChange={(e) => setFormState((s) => ({ ...s, address: e.target.value }))}
              placeholder="Full company address"
            />
          </div>
          {renderInlineLocationPicker()}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Industry</label>
              <Select
                value={formState.industry_id}
                onChange={(e) => {
                  if (e.target.value === '__CREATE_NEW__') {
                    setCreateNewModalConfig({
                      isOpen: true,
                      title: 'Create New Industry',
                      endpoint: '/industries',
                      onSuccess: (newItem) => {
                        queryClient.invalidateQueries({ queryKey: ['industries'] });
                        setFormState((s) => ({ ...s, industry_id: String(newItem.id), sub_industry_id: "" }));
                      }
                    });
                  } else {
                    setFormState((s) => ({ ...s, industry_id: e.target.value, sub_industry_id: "" }));
                  }
                }}
                placeholder="Select industry"
              >
                {allIndustries.map((ind) => (
                  <option key={ind.id} value={String(ind.id)}>{ind.name}</option>
                ))}
                <option value="__CREATE_NEW__" className="font-bold text-[var(--brand)]">+ Create New...</option>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Sub-Industry</label>
              <Select
                value={formState.sub_industry_id}
                onChange={(e) => {
                  if (e.target.value === '__CREATE_NEW__') {
                    setCreateNewModalConfig({
                      isOpen: true,
                      title: 'Create New Sub-Industry',
                      endpoint: `/industries/${formState.industry_id}/sub-industries`,
                      onSuccess: (newItem) => {
                        queryClient.invalidateQueries({ queryKey: ['industries'] });
                        setFormState((s) => ({ ...s, sub_industry_id: String(newItem.id) }));
                      }
                    });
                  } else {
                    setFormState((s) => ({ ...s, sub_industry_id: e.target.value }));
                  }
                }}
                placeholder="Select sub-industry"
                disabled={!formState.industry_id}
              >
                {selectedSubIndustries.map((sub) => (
                  <option key={sub.id} value={String(sub.id)}>{sub.name}</option>
                ))}
                {formState.industry_id && (
                  <option value="__CREATE_NEW__" className="font-bold text-[var(--brand)]">+ Create New...</option>
                )}
              </Select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={formState.phone}
                onChange={(e) => setFormState((s) => ({ ...s, phone: e.target.value }))}
                placeholder="e.g. 6281234567890"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formState.email}
                onChange={(e) => setFormState((s) => ({ ...s, email: e.target.value }))}
                placeholder="info@company.com"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Website</label>
              <Input
                value={formState.website}
                onChange={(e) => setFormState((s) => ({ ...s, website: e.target.value }))}
                placeholder="https://www.company.com"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Meeting Link (Lark)</label>
              <Input
                value={formState.meeting_link}
                onChange={(e) => setFormState((s) => ({ ...s, meeting_link: e.target.value }))}
                placeholder="https://vc.larksuite.com/minutes/..."
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Company Size</label>
              <Select
                value={formState.company_size_estimate}
                onChange={(e) => setFormState((s) => ({ ...s, company_size_estimate: e.target.value }))}
                placeholder="Select size"
              >
                <option value="1-10">1–10 employees</option>
                <option value="11-50">11–50 employees</option>
                <option value="51-200">51–200 employees</option>
                <option value="201-500">201–500 employees</option>
                <option value="501-1000">501–1,000 employees</option>
                <option value="1000+">1,000+ employees</option>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Business Category</label>
            <Select
              value={formState.business_category_id}
              onChange={(e) => {
                if (e.target.value === '__CREATE_NEW__') {
                  setCreateNewModalConfig({
                    isOpen: true,
                    title: 'Create New Business Category',
                    endpoint: '/business-categories',
                    onSuccess: (newItem) => {
                      queryClient.invalidateQueries({ queryKey: ['business-categories'] });
                      setFormState((s) => ({ ...s, business_category_id: String(newItem.id) }));
                    }
                  });
                } else {
                  setFormState((s) => ({ ...s, business_category_id: e.target.value }));
                }
              }}
            >
              <option value="">Select Business Category</option>
              {businessCategories.map((bc: any) => (
                <option key={bc.id} value={bc.id.toString()}>{bc.code ? `[${bc.code}] ` : ''}{bc.name}</option>
              ))}
              <option value="__CREATE_NEW__" className="font-bold text-[var(--brand)]">+ Create New...</option>
            </Select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Initial Product</label>
            <Select
              value={formState.product_id}
              onChange={(e) => {
                if (e.target.value === '__CREATE_NEW__') {
                  setCreateNewModalConfig({
                    isOpen: true,
                    title: 'Create New Product',
                    endpoint: '/products',
                    onSuccess: (newItem) => {
                      queryClient.invalidateQueries({ queryKey: ['products'] });
                      setFormState((s) => ({ ...s, product_id: String(newItem.id) }));
                    }
                  });
                } else {
                  setFormState((s) => ({ ...s, product_id: e.target.value }));
                }
              }}
              placeholder="Select product"
            >
              {products.map((product) => (
                <option key={product.id} value={String(product.id)}>
                  {product.name}
                </option>
              ))}
              <option value="__CREATE_NEW__" className="font-bold text-[var(--brand)]">+ Create New...</option>
            </Select>
            <p className="text-xs text-muted-foreground">
              Use this for the first product interest. Additional products are recorded from Revenue → Record Outcome.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Estimated Closing Amount</label>
              <Input
                type="text"
                inputMode="decimal"
                value={formatAmountInput(formState.estimated_closing_amount)}
                onChange={(e) => setFormState((s) => ({ ...s, estimated_closing_amount: normalizeAmountInput(e.target.value) }))}
                placeholder={`e.g. ${formatAmountInput("15000000")}`}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Realized Closing Amount</label>
              <Input
                type="text"
                inputMode="decimal"
                value={formatAmountInput(formState.realized_closing_amount)}
                onChange={(e) => setFormState((s) => ({ ...s, realized_closing_amount: normalizeAmountInput(e.target.value) }))}
                placeholder={`e.g. ${formatAmountInput("12000000")}`}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Lead Source</label>
            <Select
              value={formState.source_type}
              onChange={(e) => {
                if (e.target.value === '__CREATE_NEW__') {
                  setCreateNewModalConfig({
                    isOpen: true,
                    title: 'Create New Lead Source',
                    endpoint: '/settings/lead-sources',
                    onSuccess: (newItem) => {
                      queryClient.invalidateQueries({ queryKey: ['lead-sources'] });
                      setFormState((s) => ({ ...s, source_type: newItem.slug, channel_type_id: "" }));
                    }
                  });
                } else {
                  setFormState((s) => ({ ...s, source_type: e.target.value, channel_type_id: "" }));
                }
              }}
              placeholder="Select source"
            >
              {activeLeadSources.map((source) => (
                <option key={source.id} value={source.slug}>{source.name}</option>
              ))}
              <option value="__CREATE_NEW__" className="font-bold text-[var(--brand)]">+ Create New...</option>
            </Select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Channel Type</label>
            <Select
              value={formState.channel_type_id}
              onChange={(e) => {
                if (e.target.value === '__CREATE_NEW__') {
                  const selectedSourceObj = activeLeadSources.find((s) => s.slug === formState.source_type);
                  if (selectedSourceObj) {
                    setCreateNewModalConfig({
                      isOpen: true,
                      title: 'Create New Channel Type',
                      endpoint: '/settings/lead-channels',
                      additionalPayload: { lead_source_type_id: selectedSourceObj.id },
                      onSuccess: (newItem) => {
                        queryClient.invalidateQueries({ queryKey: ['lead-channels'] });
                        setFormState((s) => ({ ...s, channel_type_id: String(newItem.id) }));
                      }
                    });
                  }
                } else {
                  setFormState((s) => ({ ...s, channel_type_id: e.target.value }));
                }
              }}
              placeholder="Select channel"
              disabled={!formState.source_type}
            >
              {selectedLeadChannels.map((channel) => (
                <option key={channel.id} value={String(channel.id)}>{channel.name}</option>
              ))}
              {formState.source_type && (
                <option value="__CREATE_NEW__" className="font-bold text-[var(--brand)]">+ Create New...</option>
              )}
            </Select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Subsidiary of (Parent Company)</label>
            {formState.parent_lead_id ? (
              <div className="flex items-center gap-2 rounded-lg border border-[var(--brand)]/30 bg-[color-mix(in_oklch,var(--brand)_8%,transparent)] px-3 py-2">
                <Building2 className="h-4 w-4 shrink-0 text-[var(--brand)]" />
                <span className="flex-1 text-sm font-medium">
                  {parentLeadResults.find(r => String(r.id) === formState.parent_lead_id)?.company_name ?? `Lead #${formState.parent_lead_id}`}
                </span>
                <button
                  type="button"
                  onClick={() => { setFormState(s => ({ ...s, parent_lead_id: "" })); setParentLeadSearch(""); setParentLeadResults([]); }}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  value={parentLeadSearch}
                  onChange={(e) => { setParentLeadSearch(e.target.value); searchParentLead(e.target.value); }}
                  placeholder="Search company name…"
                />
                {parentLeadSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  </div>
                )}
                {parentLeadResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
                    {parentLeadResults.map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => { setFormState(s => ({ ...s, parent_lead_id: String(r.id) })); setParentLeadSearch(""); setParentLeadResults([]); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {r.company_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Tandai lead ini sebagai anak perusahaan (subsidiary) dari perusahaan lain.</p>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(editLead)}
        onOpenChange={(open) => {
          if (!open) {
            setEditLead(null);
            resetForm();
            setFormError("");
          }
        }}
        title="Edit Lead"
        description="The edit workflow now uses the same modal, form, and button primitives as the rest of admin."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setEditLead(null);
                resetForm();
                setFormError("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => setDeleteLead(editLead)}
              disabled={!editLead}
            >
              Delete
            </Button>
            <Button
              onClick={submitUpdate}
              disabled={updateMutation.isPending || !formState.company_name.trim()}
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          {formError ? (
            <Badge variant="danger" className="justify-start rounded-lg px-3 py-2 text-left">
              {formError}
            </Badge>
          ) : null}
          <div className="grid gap-2">
            <label className="text-sm font-medium">Company Name <span className="text-destructive">*</span></label>
            <Input
              value={formState.company_name}
              onChange={(e) => setFormState((s) => ({ ...s, company_name: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Brand</label>
            <Input
              value={formState.brand}
              onChange={(e) => setFormState((s) => ({ ...s, brand: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Address</label>
            <Input
              value={formState.address}
              onChange={(e) => setFormState((s) => ({ ...s, address: e.target.value }))}
            />
          </div>
          {renderInlineLocationPicker()}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Industry</label>
              <Select
                value={formState.industry_id}
                onChange={(e) => {
                  if (e.target.value === '__CREATE_NEW__') {
                    setCreateNewModalConfig({
                      isOpen: true,
                      title: 'Create New Industry',
                      endpoint: '/industries',
                      onSuccess: (newItem) => {
                        queryClient.invalidateQueries({ queryKey: ['industries'] });
                        setFormState((s) => ({ ...s, industry_id: String(newItem.id), sub_industry_id: "" }));
                      }
                    });
                  } else {
                    setFormState((s) => ({ ...s, industry_id: e.target.value, sub_industry_id: "" }));
                  }
                }}
                placeholder="Select industry"
              >
                {allIndustries.map((ind) => (
                  <option key={ind.id} value={String(ind.id)}>{ind.name}</option>
                ))}
                <option value="__CREATE_NEW__" className="font-bold text-[var(--brand)]">+ Create New...</option>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Sub-Industry</label>
              <Select
                value={formState.sub_industry_id}
                onChange={(e) => {
                  if (e.target.value === '__CREATE_NEW__') {
                    setCreateNewModalConfig({
                      isOpen: true,
                      title: 'Create New Sub-Industry',
                      endpoint: `/industries/${formState.industry_id}/sub-industries`,
                      onSuccess: (newItem) => {
                        queryClient.invalidateQueries({ queryKey: ['industries'] });
                        setFormState((s) => ({ ...s, sub_industry_id: String(newItem.id) }));
                      }
                    });
                  } else {
                    setFormState((s) => ({ ...s, sub_industry_id: e.target.value }));
                  }
                }}
                placeholder="Select sub-industry"
                disabled={!formState.industry_id}
              >
                {selectedSubIndustries.map((sub) => (
                  <option key={sub.id} value={String(sub.id)}>{sub.name}</option>
                ))}
                {formState.industry_id && (
                  <option value="__CREATE_NEW__" className="font-bold text-[var(--brand)]">+ Create New...</option>
                )}
              </Select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={formState.phone}
                onChange={(e) => setFormState((s) => ({ ...s, phone: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formState.email}
                onChange={(e) => setFormState((s) => ({ ...s, email: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Website</label>
              <Input
                value={formState.website}
                onChange={(e) => setFormState((s) => ({ ...s, website: e.target.value }))}
                placeholder="https://www.company.com"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Company Size</label>
              <Select
                value={formState.company_size_estimate}
                onChange={(e) => setFormState((s) => ({ ...s, company_size_estimate: e.target.value }))}
                placeholder="Select size"
              >
                <option value="1-10">1–10 employees</option>
                <option value="11-50">11–50 employees</option>
                <option value="51-200">51–200 employees</option>
                <option value="201-500">201–500 employees</option>
                <option value="501-1000">501–1,000 employees</option>
                <option value="1000+">1,000+ employees</option>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Business Category</label>
            <Select
              value={formState.business_category_id}
              onChange={(e) => {
                if (e.target.value === '__CREATE_NEW__') {
                  setCreateNewModalConfig({
                    isOpen: true,
                    title: 'Create New Business Category',
                    endpoint: '/business-categories',
                    onSuccess: (newItem) => {
                      queryClient.invalidateQueries({ queryKey: ['business-categories'] });
                      setFormState((s) => ({ ...s, business_category_id: String(newItem.id) }));
                    }
                  });
                } else {
                  setFormState((s) => ({ ...s, business_category_id: e.target.value }));
                }
              }}
            >
              <option value="">Select Business Category</option>
              {businessCategories.map((bc: any) => (
                <option key={bc.id} value={bc.id.toString()}>{bc.code ? `[${bc.code}] ` : ''}{bc.name}</option>
              ))}
              <option value="__CREATE_NEW__" className="font-bold text-[var(--brand)]">+ Create New...</option>
            </Select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Initial Product</label>
            <Select
              value={formState.product_id}
              onChange={(e) => {
                if (e.target.value === '__CREATE_NEW__') {
                  setCreateNewModalConfig({
                    isOpen: true,
                    title: 'Create New Product',
                    endpoint: '/products',
                    onSuccess: (newItem) => {
                      queryClient.invalidateQueries({ queryKey: ['products'] });
                      setFormState((s) => ({ ...s, product_id: String(newItem.id) }));
                    }
                  });
                } else {
                  setFormState((s) => ({ ...s, product_id: e.target.value }));
                }
              }}
              placeholder="Select product"
            >
              {products.map((product) => (
                <option key={product.id} value={String(product.id)}>
                  {product.name}
                </option>
              ))}
              <option value="__CREATE_NEW__" className="font-bold text-[var(--brand)]">+ Create New...</option>
            </Select>
            <p className="text-xs text-muted-foreground">
              Use this for the first product interest. Additional products are recorded from Revenue → Record Outcome.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Estimated Closing Amount</label>
              <Input
                type="text"
                inputMode="decimal"
                value={formatAmountInput(formState.estimated_closing_amount)}
                onChange={(e) => setFormState((s) => ({ ...s, estimated_closing_amount: normalizeAmountInput(e.target.value) }))}
                placeholder={`e.g. ${formatAmountInput("15000000")}`}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Realized Closing Amount</label>
              <Input
                type="text"
                inputMode="decimal"
                value={formatAmountInput(formState.realized_closing_amount)}
                onChange={(e) => setFormState((s) => ({ ...s, realized_closing_amount: normalizeAmountInput(e.target.value) }))}
                placeholder={`e.g. ${formatAmountInput("12000000")}`}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Lead Source</label>
            <Select
              value={formState.source_type}
              onChange={(e) => {
                if (e.target.value === '__CREATE_NEW__') {
                  setCreateNewModalConfig({
                    isOpen: true,
                    title: 'Create New Lead Source',
                    endpoint: '/settings/lead-sources',
                    onSuccess: (newItem) => {
                      queryClient.invalidateQueries({ queryKey: ['lead-sources'] });
                      setFormState((s) => ({ ...s, source_type: newItem.slug, channel_type_id: "" }));
                    }
                  });
                } else {
                  setFormState((s) => ({ ...s, source_type: e.target.value, channel_type_id: "" }));
                }
              }}
              placeholder="Select source"
            >
              {activeLeadSources.map((source) => (
                <option key={source.id} value={source.slug}>{source.name}</option>
              ))}
              {formState.source_type && !activeLeadSources.some((source) => source.slug === formState.source_type) ? (
                <option value={formState.source_type}>
                  {sourceNameBySlug.get(formState.source_type) ?? formState.source_type}
                </option>
              ) : null}
              <option value="__CREATE_NEW__" className="font-bold text-[var(--brand)]">+ Create New...</option>
            </Select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Channel Type</label>
            <Select
              value={formState.channel_type_id}
              onChange={(e) => {
                if (e.target.value === '__CREATE_NEW__') {
                  const selectedSourceObj = activeLeadSources.find((s) => s.slug === formState.source_type);
                  if (selectedSourceObj) {
                    setCreateNewModalConfig({
                      isOpen: true,
                      title: 'Create New Channel Type',
                      endpoint: '/settings/lead-channels',
                      additionalPayload: { lead_source_type_id: selectedSourceObj.id },
                      onSuccess: (newItem) => {
                        queryClient.invalidateQueries({ queryKey: ['lead-channels'] });
                        setFormState((s) => ({ ...s, channel_type_id: String(newItem.id) }));
                      }
                    });
                  }
                } else {
                  setFormState((s) => ({ ...s, channel_type_id: e.target.value }));
                }
              }}
              placeholder="Select channel"
              disabled={!formState.source_type}
            >
              {selectedLeadChannels.map((channel) => (
                <option key={channel.id} value={String(channel.id)}>{channel.name}</option>
              ))}
              {formState.channel_type_id && !selectedLeadChannels.some((channel) => String(channel.id) === formState.channel_type_id) ? (
                <option value={formState.channel_type_id}>
                  {channelNameById.get(Number(formState.channel_type_id)) ?? "Saved channel"}
                </option>
              ) : null}
              {formState.source_type && (
                <option value="__CREATE_NEW__" className="font-bold text-[var(--brand)]">+ Create New...</option>
              )}
            </Select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Stage</label>
              <Select
                value={formState.funnel_stage_id}
                onChange={(e) => {
                  if (e.target.value === '__CREATE_NEW__') {
                    setCreateNewModalConfig({
                      isOpen: true,
                      title: 'Create New Stage',
                      endpoint: '/funnel/stages',
                      onSuccess: (newItem) => {
                        queryClient.invalidateQueries({ queryKey: ['funnel-stages'] });
                        setFormState((s) => ({ ...s, funnel_stage_id: String(newItem.id) }));
                      }
                    });
                  } else {
                    setFormState((s) => ({ ...s, funnel_stage_id: e.target.value }));
                  }
                }}
                placeholder="Unassigned"
              >
                {funnelStages.map((stage) => (
                  <option key={stage.id} value={String(stage.id)}>{stage.name}</option>
                ))}
                <option value="__CREATE_NEW__" className="font-bold text-[var(--brand)]">+ Create New...</option>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Qualification</label>
              <Select
                value={formState.qualification_status}
                onChange={(e) => setFormState((s) => ({ ...s, qualification_status: e.target.value }))}
              >
                <option value="pending">Pending</option>
                <option value="eligible">Eligible</option>
                <option value="potential">Potential</option>
                <option value="not_eligible">Not eligible</option>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Subsidiary of (Parent Company)</label>
            {formState.parent_lead_id ? (
              <div className="flex items-center gap-2 rounded-lg border border-[var(--brand)]/30 bg-[color-mix(in_oklch,var(--brand)_8%,transparent)] px-3 py-2">
                <Building2 className="h-4 w-4 shrink-0 text-[var(--brand)]" />
                <span className="flex-1 text-sm font-medium">
                  {parentLeadResults.find(r => String(r.id) === formState.parent_lead_id)?.company_name
                    ?? editLead?.parentLead?.company_name
                    ?? `Lead #${formState.parent_lead_id}`}
                </span>
                <button
                  type="button"
                  onClick={() => { setFormState(s => ({ ...s, parent_lead_id: "" })); setParentLeadSearch(""); setParentLeadResults([]); }}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  value={parentLeadSearch}
                  onChange={(e) => {
                    setParentLeadSearch(e.target.value);
                    searchParentLead(e.target.value);
                  }}
                  placeholder="Search company name…"
                />
                {parentLeadSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  </div>
                )}
                {parentLeadResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
                    {parentLeadResults
                      .filter(r => String(r.id) !== String(editLead?.id))
                      .map(r => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setFormState(s => ({ ...s, parent_lead_id: String(r.id) }));
                            setParentLeadSearch("");
                            setParentLeadResults([]);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                        >
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          {r.company_name}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Tandai lead ini sebagai anak perusahaan (subsidiary) dari perusahaan lain.</p>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(assignLead)}
        onOpenChange={(open) => {
          if (!open) {
            setAssignLead(null);
            setAssignOwnerId("");
          }
        }}
        title="Assign Lead"
        description={assignLead ? `Update owner for ${assignLead.company_name}.` : undefined}
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setAssignLead(null);
                setAssignOwnerId("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => assignLead && assignLeadMutation.mutate({ id: assignLead.id, ownerId: assignOwnerId })}
              disabled={assignLeadMutation.isPending || !assignLead}
            >
              {assignLeadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Assignment
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <label className="text-sm font-medium">Owner</label>
          <Select
            value={assignOwnerId}
            onChange={(event) => setAssignOwnerId(event.target.value)}
            placeholder="Lead Pool"
          >
            {assignableUsers.map((user) => (
              <option key={user.id} value={String(user.id)}>
                {user.name}
                {user.role?.display_name ? ` · ${user.role.display_name}` : ""}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            Leaving owner empty returns this record to the Lead Pool for later assignment.
          </p>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteLead)}
        onOpenChange={(open) => {
          if (!open) setDeleteLead(null);
        }}
        title="Delete Lead"
        description="Delete confirmation now uses the shared modal system instead of browser dialogs."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteLead(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteLead && deleteMutation.mutate(deleteLead.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete Lead
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          This will permanently remove{" "}
          <span className="font-medium text-foreground">{deleteLead?.company_name}</span>.
        </p>
      </Modal>

      <Modal
        open={batchDeleteOpen}
        onOpenChange={setBatchDeleteOpen}
        title="Batch Delete Leads"
        description="Are you sure you want to delete the selected leads?"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setBatchDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => batchDeleteMutation.mutate(selectedLeads)}
              disabled={batchDeleteMutation.isPending}
            >
              {batchDeleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete {selectedLeads.length} Leads
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          This will permanently remove <span className="font-medium text-foreground">{selectedLeads.length}</span> selected lead{selectedLeads.length === 1 ? "" : "s"}.
        </p>
      </Modal>

      {createNewModalConfig && (
        <CreateNewModal
          isOpen={createNewModalConfig.isOpen}
          onClose={() => setCreateNewModalConfig(null)}
          title={createNewModalConfig.title}
          endpoint={createNewModalConfig.endpoint}
          payloadKey={createNewModalConfig.payloadKey}
          additionalPayload={createNewModalConfig.additionalPayload}
          onSuccess={createNewModalConfig.onSuccess}
        />
      )}
    </div>
  );
}
