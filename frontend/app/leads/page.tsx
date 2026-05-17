"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
import { cn } from "@/lib/utils";

type LeadRecord = {
  id: number;
  company_name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  business_category?: string | null;
  company_size_estimate?: string | null;
  estimated_closing_amount?: string | number | null;
  realized_closing_amount?: string | number | null;
  industry_id?: number | null;
  sub_industry_id?: number | null;
  qualification_status?: string | null;
  lead_score?: number | null;
  funnel_stage_id?: number | null;
  funnel_stage?: { id: number; name: string } | null;
  current_funnel_stage?: { id: number; name: string } | null;
  industry?: { name: string } | null;
  sources?: LeadSource[];
};

type FunnelStage = { id: number; name: string; sequence: number };
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

type LeadFormState = {
  company_name: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  industry_id: string;
  sub_industry_id: string;
  company_size_estimate: string;
  business_category: string;
  estimated_closing_amount: string;
  realized_closing_amount: string;
  source_type: string;
  channel_type_id: string;
  funnel_stage_id: string;
  qualification_status: string;
};

const emptyForm: LeadFormState = {
  company_name: "",
  address: "",
  email: "",
  phone: "",
  website: "",
  industry_id: "",
  sub_industry_id: "",
  company_size_estimate: "",
  business_category: "",
  estimated_closing_amount: "",
  realized_closing_amount: "",
  source_type: "",
  channel_type_id: "",
  funnel_stage_id: "",
  qualification_status: "pending",
};

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

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setting: numberFormatSetting, formatNumber, formatCurrency } = useNumberFormat();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [page, setPage] = useState(1);
  const [funnelStageId, setFunnelStageId] = useState(searchParams.get("funnel_stage_id") ?? "");
  const [qualificationFilter, setQualificationFilter] = useState(
    searchParams.get("qualification_status") ?? ""
  );
  const [duplicateFilter, setDuplicateFilter] = useState(searchParams.get("duplicate_status") ?? "");
  const [sourceFilter, setSourceFilter] = useState(searchParams.get("source_type") ?? "");
  const [channelFilter, setChannelFilter] = useState(searchParams.get("channel_type_id") ?? "");
  const [minScore, setMinScore] = useState(searchParams.get("min_score") ?? "");
  const [maxScore, setMaxScore] = useState(searchParams.get("max_score") ?? "");
  const [feedback, setFeedback] = useState("");
  const [formState, setFormState] = useState<LeadFormState>(emptyForm);
  const [createOpen, setCreateOpen] = useState(false);
  const [editLead, setEditLead] = useState<LeadRecord | null>(null);
  const [deleteLead, setDeleteLead] = useState<LeadRecord | null>(null);

  const normalizeAmountInput = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "";

    let normalized = trimmed;
    const thousandsSeparator = numberFormatSetting?.thousands_separator ?? ",";
    const decimalSeparator = numberFormatSetting?.decimal_separator ?? ".";

    if (thousandsSeparator) {
      normalized = normalized.replace(new RegExp(escapeRegExp(thousandsSeparator), "g"), "");
    }

    if (decimalSeparator && decimalSeparator !== ".") {
      normalized = normalized.replace(new RegExp(escapeRegExp(decimalSeparator), "g"), ".");
    }

    const sanitized = normalized.replace(/[^\d.]/g, "");
    const [integerPart, ...fractionParts] = sanitized.split(".");
    const integer = integerPart.replace(/^0+(?=\d)/, "");

    if (fractionParts.length === 0) {
      return integer;
    }

    const maxDecimalDigits = Math.max(0, numberFormatSetting?.decimal_digits ?? 2);
    const fraction = fractionParts.join("").slice(0, maxDecimalDigits);

    return maxDecimalDigits === 0 ? integer : `${integer || "0"}.${fraction}`;
  };

  const formatAmountInput = (value: string) => {
    if (!value) return "";

    const [integerPart, fractionPart] = value.split(".");
    const formattedInteger = formatNumber(integerPart || "0", { decimals: 0 });
    const decimalSeparator = numberFormatSetting?.decimal_separator ?? ".";

    if (fractionPart === undefined) {
      return formattedInteger === "—" ? "" : formattedInteger;
    }

    return `${formattedInteger === "—" ? "0" : formattedInteger}${decimalSeparator}${fractionPart}`;
  };

  const { data: stagesData } = useQuery({
    queryKey: ["funnel-stages"],
    queryFn: async () => {
      const response = await apiFetch("/funnel/stages");
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

  const { data, isLoading } = useQuery({
    queryKey: ["leads", page, search, funnelStageId, qualificationFilter, duplicateFilter, sourceFilter, channelFilter, minScore, maxScore],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set("search", search);
      if (funnelStageId) params.set("funnel_stage_id", funnelStageId);
      if (qualificationFilter) params.set("qualification_status", qualificationFilter);
      if (duplicateFilter) params.set("duplicate_status", duplicateFilter);
      if (sourceFilter) params.set("source_type", sourceFilter);
      if (channelFilter) params.set("channel_type_id", channelFilter);
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
  const filteredLeadChannels = activeLeadChannels.filter((channel) => {
    if (!sourceFilter) return true;
    return channel.source_slug === sourceFilter;
  });
  const sourceNameBySlug = new Map(leadSources.map((source) => [source.slug, source.name]));
  const channelNameById = new Map(activeLeadChannels.map((channel) => [channel.id, channel.name]));
  const total = data?.total ?? 0;
  const lastPage = data?.last_page ?? 1;

  const resetForm = () => setFormState(emptyForm);

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await apiFetch("/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `Failed to create lead (${res.status})`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setCreateOpen(false);
      resetForm();
      setFeedback("Lead created successfully.");
    },
    onError: (err: Error) => {
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
        throw new Error(body.message ?? `Failed to update lead (${res.status})`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setEditLead(null);
      resetForm();
      setFeedback("Lead updated successfully.");
    },
    onError: (err: Error) => {
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

  const openEdit = (lead: LeadRecord) => {
    setEditLead(lead);
    setFormState({
      company_name:          lead.company_name || "",
      address:               lead.address || "",
      email:                 lead.email || "",
      phone:                 lead.phone || "",
      website:               lead.website || "",
      industry_id:           lead.industry_id != null ? String(lead.industry_id) : "",
      sub_industry_id:       lead.sub_industry_id != null ? String(lead.sub_industry_id) : "",
      company_size_estimate: lead.company_size_estimate || "",
      business_category:     lead.business_category || "",
      estimated_closing_amount: lead.estimated_closing_amount != null ? String(lead.estimated_closing_amount) : "",
      realized_closing_amount:  lead.realized_closing_amount != null ? String(lead.realized_closing_amount) : "",
      source_type:           primarySourceSlug(lead),
      channel_type_id:       primaryChannelId(lead) != null ? String(primaryChannelId(lead)) : "",
      funnel_stage_id:       String(lead.funnel_stage_id ?? lead.current_funnel_stage?.id ?? ""),
      qualification_status:  lead.qualification_status || "pending",
    });
  };

  const resetFilters = () => {
    setSearch("");
    setFunnelStageId("");
    setQualificationFilter("");
    setDuplicateFilter("");
    setSourceFilter("");
    setChannelFilter("");
    setMinScore("");
    setMaxScore("");
    setPage(1);
    router.replace("/leads");
  };

  const submitCreate = () => {
    createMutation.mutate({
      company_name:          formState.company_name,
      address:               formState.address || undefined,
      email:                 formState.email || undefined,
      phone:                 formState.phone || undefined,
      website:               formState.website || undefined,
      industry_id:           formState.industry_id ? Number(formState.industry_id) : undefined,
      sub_industry_id:       formState.sub_industry_id ? Number(formState.sub_industry_id) : undefined,
      company_size_estimate: formState.company_size_estimate || undefined,
      business_category:     formState.business_category || undefined,
      estimated_closing_amount: formState.estimated_closing_amount ? Number(formState.estimated_closing_amount) : undefined,
      realized_closing_amount:  formState.realized_closing_amount ? Number(formState.realized_closing_amount) : undefined,
      source_type:           formState.source_type || undefined,
      channel_type_id:       formState.channel_type_id ? Number(formState.channel_type_id) : undefined,
    });
  };

  const submitUpdate = () => {
    if (!editLead) return;
    updateMutation.mutate({
      id: editLead.id,
      payload: {
        company_name:          formState.company_name,
        address:               formState.address || null,
        email:                 formState.email || null,
        phone:                 formState.phone || null,
        website:               formState.website || null,
        industry_id:           formState.industry_id ? Number(formState.industry_id) : null,
        sub_industry_id:       formState.sub_industry_id ? Number(formState.sub_industry_id) : null,
        company_size_estimate: formState.company_size_estimate || null,
        business_category:     formState.business_category || null,
        estimated_closing_amount: formState.estimated_closing_amount ? Number(formState.estimated_closing_amount) : null,
        realized_closing_amount:  formState.realized_closing_amount ? Number(formState.realized_closing_amount) : null,
        source_type:           formState.source_type || null,
        channel_type_id:       formState.channel_type_id ? Number(formState.channel_type_id) : null,
        funnel_stage_id:       formState.funnel_stage_id || null,
        qualification_status:  formState.qualification_status || null,
      },
    });
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

  const handleWhatsApp = (phone?: string | null) => {
    if (!phone) {
      setFeedback("This lead does not have a phone number.");
      return;
    }
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}`, "_blank");
  };

  const hasActiveFilter = Boolean(
    search || funnelStageId || qualificationFilter || duplicateFilter || sourceFilter || channelFilter || minScore || maxScore
  );

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
          <div className="flex items-center gap-2">
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
              onClick={() => {
                resetForm();
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

      <FilterBar>
        <FilterBarSearch
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search company, industry, or email"
        />
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
        {hasActiveFilter ? (
          <Button variant="ghost" onClick={resetFilters}>
            Clear Filters
          </Button>
        ) : null}
      </FilterBar>

      <TableShell>
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell className="min-w-[200px]">Company</TableHeaderCell>
              <TableHeaderCell className="min-w-[120px]">Industry</TableHeaderCell>
              <TableHeaderCell className="min-w-[120px]">Source</TableHeaderCell>
              <TableHeaderCell className="min-w-[130px]">Channel</TableHeaderCell>
              <TableHeaderCell className="min-w-[160px]">Contact</TableHeaderCell>
              <TableHeaderCell className="w-[90px]">Score</TableHeaderCell>
              <TableHeaderCell className="w-[80px]">Grade</TableHeaderCell>
              <TableHeaderCell className="w-[120px]">Qualification</TableHeaderCell>
              <TableHeaderCell className="min-w-[150px]">Est. Closing</TableHeaderCell>
              <TableHeaderCell className="min-w-[150px]">Realized</TableHeaderCell>
              <TableHeaderCell className="w-[120px]">Stage</TableHeaderCell>
              <TableHeaderCell className="w-[160px]">Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableEmpty colSpan={12}>
                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                Loading leads...
              </TableEmpty>
            ) : leads.length === 0 ? (
              <TableEmpty colSpan={12}>No leads found.</TableEmpty>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Link href={`/leads/${lead.id}`} className="block space-y-1">
                      <p className="font-medium">{lead.company_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{lead.address || "No address"}</p>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral">{lead.industry?.name ?? lead.business_category ?? "Unknown"}</Badge>
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

        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Showing page {page} of {lastPage} ({total} total)
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              tooltip="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-xs font-medium">{page}</span>
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
      </TableShell>

      <Modal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetForm();
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
          <div className="grid gap-2">
            <label className="text-sm font-medium">Company Name <span className="text-destructive">*</span></label>
            <Input
              value={formState.company_name}
              onChange={(e) => setFormState((s) => ({ ...s, company_name: e.target.value }))}
              placeholder="e.g. PT Artha Solusi Global"
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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Industry</label>
              <Select
                value={formState.industry_id}
                onChange={(e) =>
                  setFormState((s) => ({ ...s, industry_id: e.target.value, sub_industry_id: "" }))
                }
                placeholder="Select industry"
              >
                {allIndustries.map((ind) => (
                  <option key={ind.id} value={String(ind.id)}>{ind.name}</option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Sub-Industry</label>
              <Select
                value={formState.sub_industry_id}
                onChange={(e) => setFormState((s) => ({ ...s, sub_industry_id: e.target.value }))}
                placeholder="Select sub-industry"
                disabled={!formState.industry_id || selectedSubIndustries.length === 0}
              >
                {selectedSubIndustries.map((sub) => (
                  <option key={sub.id} value={String(sub.id)}>{sub.name}</option>
                ))}
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
            <Input
              value={formState.business_category}
              onChange={(e) => setFormState((s) => ({ ...s, business_category: e.target.value }))}
              placeholder="e.g. Property Management"
            />
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
              onChange={(e) => setFormState((s) => ({ ...s, source_type: e.target.value, channel_type_id: "" }))}
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
              value={formState.channel_type_id}
              onChange={(e) => setFormState((s) => ({ ...s, channel_type_id: e.target.value }))}
              placeholder="Select channel"
              disabled={!formState.source_type || selectedLeadChannels.length === 0}
            >
              {selectedLeadChannels.map((channel) => (
                <option key={channel.id} value={String(channel.id)}>{channel.name}</option>
              ))}
            </Select>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(editLead)}
        onOpenChange={(open) => {
          if (!open) {
            setEditLead(null);
            resetForm();
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
              disabled={updateMutation.isPending || !formState.company_name}
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Company Name <span className="text-destructive">*</span></label>
            <Input
              value={formState.company_name}
              onChange={(e) => setFormState((s) => ({ ...s, company_name: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Address</label>
            <Input
              value={formState.address}
              onChange={(e) => setFormState((s) => ({ ...s, address: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Industry</label>
              <Select
                value={formState.industry_id}
                onChange={(e) =>
                  setFormState((s) => ({ ...s, industry_id: e.target.value, sub_industry_id: "" }))
                }
                placeholder="Select industry"
              >
                {allIndustries.map((ind) => (
                  <option key={ind.id} value={String(ind.id)}>{ind.name}</option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Sub-Industry</label>
              <Select
                value={formState.sub_industry_id}
                onChange={(e) => setFormState((s) => ({ ...s, sub_industry_id: e.target.value }))}
                placeholder="Select sub-industry"
                disabled={!formState.industry_id || selectedSubIndustries.length === 0}
              >
                {selectedSubIndustries.map((sub) => (
                  <option key={sub.id} value={String(sub.id)}>{sub.name}</option>
                ))}
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
            <Input
              value={formState.business_category}
              onChange={(e) => setFormState((s) => ({ ...s, business_category: e.target.value }))}
              placeholder="e.g. Property Management"
            />
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
              onChange={(e) => setFormState((s) => ({ ...s, source_type: e.target.value, channel_type_id: "" }))}
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
            </Select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Channel Type</label>
            <Select
              value={formState.channel_type_id}
              onChange={(e) => setFormState((s) => ({ ...s, channel_type_id: e.target.value }))}
              placeholder="Select channel"
              disabled={!formState.source_type || selectedLeadChannels.length === 0}
            >
              {selectedLeadChannels.map((channel) => (
                <option key={channel.id} value={String(channel.id)}>{channel.name}</option>
              ))}
              {formState.channel_type_id && !selectedLeadChannels.some((channel) => String(channel.id) === formState.channel_type_id) ? (
                <option value={formState.channel_type_id}>
                  {channelNameById.get(Number(formState.channel_type_id)) ?? "Saved channel"}
                </option>
              ) : null}
            </Select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Stage</label>
              <Select
                value={formState.funnel_stage_id}
                onChange={(e) => setFormState((s) => ({ ...s, funnel_stage_id: e.target.value }))}
                placeholder="Unassigned"
              >
                {funnelStages.map((stage) => (
                  <option key={stage.id} value={String(stage.id)}>{stage.name}</option>
                ))}
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
    </div>
  );
}
