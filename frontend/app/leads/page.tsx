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
import { cn } from "@/lib/utils";

type LeadRecord = {
  id: number;
  company_name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  business_category?: string | null;
  qualification_status?: string | null;
  lead_score?: number | null;
  funnel_stage_id?: number | null;
  funnel_stage?: { id: number; name: string } | null;
  current_funnel_stage?: { id: number; name: string } | null;
  industry?: { name: string } | null;
};

type FunnelStage = { id: number; name: string; sequence: number };

type LeadFormState = {
  company_name: string;
  address: string;
  business_category: string;
  email: string;
  phone: string;
  funnel_stage_id: string;
  qualification_status: string;
};

const emptyForm: LeadFormState = {
  company_name: "",
  address: "",
  business_category: "",
  email: "",
  phone: "",
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

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [page, setPage] = useState(1);
  const [funnelStageId, setFunnelStageId] = useState(searchParams.get("funnel_stage_id") ?? "");
  const [qualificationFilter, setQualificationFilter] = useState(
    searchParams.get("qualification_status") ?? ""
  );
  const [duplicateFilter, setDuplicateFilter] = useState(searchParams.get("duplicate_status") ?? "");
  const [minScore, setMinScore] = useState(searchParams.get("min_score") ?? "");
  const [maxScore, setMaxScore] = useState(searchParams.get("max_score") ?? "");
  const [feedback, setFeedback] = useState("");
  const [formState, setFormState] = useState<LeadFormState>(emptyForm);
  const [createOpen, setCreateOpen] = useState(false);
  const [editLead, setEditLead] = useState<LeadRecord | null>(null);
  const [deleteLead, setDeleteLead] = useState<LeadRecord | null>(null);

  const { data: stagesData } = useQuery({
    queryKey: ["funnel-stages"],
    queryFn: async () => {
      const response = await apiFetch("/funnel/stages");
      return response.json();
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["leads", page, search, funnelStageId, qualificationFilter, duplicateFilter, minScore, maxScore],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set("search", search);
      if (funnelStageId) params.set("funnel_stage_id", funnelStageId);
      if (qualificationFilter) params.set("qualification_status", qualificationFilter);
      if (duplicateFilter) params.set("duplicate_status", duplicateFilter);
      if (minScore) params.set("min_score", minScore);
      if (maxScore) params.set("max_score", maxScore);
      const response = await apiFetch(`/leads?${params.toString()}`);
      return response.json();
    },
  });

  const funnelStages: FunnelStage[] = stagesData?.data ?? stagesData ?? [];
  const leads: LeadRecord[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const lastPage = data?.last_page ?? 1;

  const resetForm = () => setFormState(emptyForm);

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      apiFetch("/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setCreateOpen(false);
      resetForm();
      setFeedback("Lead created successfully.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      apiFetch(`/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setEditLead(null);
      resetForm();
      setFeedback("Lead updated successfully.");
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
      company_name: lead.company_name || "",
      address: lead.address || "",
      business_category: lead.business_category || lead.industry?.name || "",
      email: lead.email || "",
      phone: lead.phone || "",
      funnel_stage_id: String(lead.funnel_stage_id ?? lead.current_funnel_stage?.id ?? ""),
      qualification_status: lead.qualification_status || "pending",
    });
  };

  const resetFilters = () => {
    setSearch("");
    setFunnelStageId("");
    setQualificationFilter("");
    setDuplicateFilter("");
    setMinScore("");
    setMaxScore("");
    setPage(1);
    router.replace("/leads");
  };

  const submitCreate = () => {
    createMutation.mutate({
      company_name: formState.company_name,
      address: formState.address,
      business_category: formState.business_category,
      email: formState.email,
      phone: formState.phone,
    });
  };

  const submitUpdate = () => {
    if (!editLead) return;
    updateMutation.mutate({
      id: editLead.id,
      payload: {
        company_name: formState.company_name,
        address: formState.address,
        business_category: formState.business_category,
        email: formState.email,
        phone: formState.phone,
        funnel_stage_id: formState.funnel_stage_id || null,
        qualification_status: formState.qualification_status || null,
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
    search || funnelStageId || qualificationFilter || duplicateFilter || minScore || maxScore
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
              <TableHeaderCell>Company</TableHeaderCell>
              <TableHeaderCell>Industry</TableHeaderCell>
              <TableHeaderCell>Contact</TableHeaderCell>
              <TableHeaderCell>Score</TableHeaderCell>
              <TableHeaderCell>Grade</TableHeaderCell>
              <TableHeaderCell>Qualification</TableHeaderCell>
              <TableHeaderCell>Stage</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableEmpty colSpan={8}>
                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                Loading leads...
              </TableEmpty>
            ) : leads.length === 0 ? (
              <TableEmpty colSpan={8}>No leads found.</TableEmpty>
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
                    <div className="space-y-1 text-xs">
                      <p>{lead.email || "—"}</p>
                      <p className="text-muted-foreground">{lead.phone || "No phone"}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant={scoreVariant(lead.lead_score)}>{lead.lead_score ?? "—"}</Badge>
                      <p className="text-[11px] text-muted-foreground">Weighted deterministic score</p>
                    </div>
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
                        <div className="space-y-2">
                          {warnings.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {warnings.map((warning) => (
                                <Badge key={warning} variant="warning">
                                  {warning}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">
                              Review approval is still required before pipeline push.
                            </p>
                          )}
                          <div className="flex items-center gap-1">
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
                        tooltip={blocked ? warnings.join(". ") : "Push to funnel"}
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
        description="Use the shared admin modal and form styles for new lead records."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitCreate}
              disabled={createMutation.isPending || !formState.company_name}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create Lead
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Company Name</label>
            <Input
              value={formState.company_name}
              onChange={(event) =>
                setFormState((current) => ({ ...current, company_name: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Address</label>
            <Input
              value={formState.address}
              onChange={(event) =>
                setFormState((current) => ({ ...current, address: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Industry / Category</label>
            <Input
              value={formState.business_category}
              onChange={(event) =>
                setFormState((current) => ({ ...current, business_category: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formState.email}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, email: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={formState.phone}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, phone: event.target.value }))
                }
              />
            </div>
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
            <label className="text-sm font-medium">Company Name</label>
            <Input
              value={formState.company_name}
              onChange={(event) =>
                setFormState((current) => ({ ...current, company_name: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Address</label>
            <Input
              value={formState.address}
              onChange={(event) =>
                setFormState((current) => ({ ...current, address: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Industry / Category</label>
            <Input
              value={formState.business_category}
              onChange={(event) =>
                setFormState((current) => ({ ...current, business_category: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={formState.email}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, email: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={formState.phone}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, phone: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Stage</label>
              <Select
                value={formState.funnel_stage_id}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, funnel_stage_id: event.target.value }))
                }
                placeholder="Unassigned"
              >
                {funnelStages.map((stage) => (
                  <option key={stage.id} value={String(stage.id)}>
                    {stage.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Qualification</label>
              <Select
                value={formState.qualification_status}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    qualification_status: event.target.value,
                  }))
                }
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
