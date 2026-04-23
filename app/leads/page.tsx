"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Download, Plus, ExternalLink, ChevronLeft, ChevronRight, MessageSquare, ArrowRight, X, Loader2, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { QUALIFICATION_BADGE, FILTER_BANNER } from "@/lib/design";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { TableWrapper, Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/ui/table";

export default function LeadsPage() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [page, setPage] = useState(1);
  const [funnelStageId, setFunnelStageId] = useState(searchParams.get("funnel_stage_id") ?? "");
  const [qualificationFilter, setQualificationFilter] = useState(searchParams.get("qualification_status") ?? "");
  const [duplicateFilter, setDuplicateFilter] = useState(searchParams.get("duplicate_status") ?? "");
  const [minScore, setMinScore] = useState(searchParams.get("min_score") ?? "");
  const [maxScore, setMaxScore] = useState(searchParams.get("max_score") ?? "");
  const [showCreate, setShowCreate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formIndustry, setFormIndustry] = useState("");

  const { data: stagesData } = useQuery({
    queryKey: ["funnel-stages"],
    queryFn: async () => { const r = await apiFetch("/funnel/stages"); return r.json(); },
  });
  const funnelStages: { id: number; name: string }[] = stagesData?.data ?? stagesData ?? [];

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
      const r = await apiFetch(`/leads?${params.toString()}`);
      return r.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) =>
      apiFetch("/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      setShowCreate(false);
      setFormName(""); setFormAddress(""); setFormPhone(""); setFormEmail(""); setFormIndustry("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await apiFetch(`/leads/${id}`, { method: "DELETE" });
      if (!r.ok) { const e = await r.json(); throw new Error(e.message || "Delete failed"); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); setDeleteConfirm(null); },
  });

  const pushToFunnel = useMutation({
    mutationFn: async (id: number) =>
      apiFetch(`/leads/${id}/push-to-funnel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: "qualified" }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  const handleExport = async () => {
    try {
      const r = await apiFetch("/leads/export");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "leads_export.csv"; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error("Export failed", e); }
  };

  const handleWhatsApp = (phone: string) => {
    if (!phone) { alert("No phone number for this lead."); return; }
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}`, "_blank");
  };

  const resetFilters = () => {
    setSearch(""); setFunnelStageId(""); setQualificationFilter("");
    setDuplicateFilter(""); setMinScore(""); setMaxScore(""); setPage(1);
    router.replace("/leads");
  };

  const hasActiveFilter = !!(search || funnelStageId || qualificationFilter || duplicateFilter || minScore || maxScore);

  const leads = data?.data || [];
  const total = data?.total || 0;
  const lastPage = data?.last_page || 1;

  const filterLabel = (() => {
    if (qualificationFilter) return `Qualification: ${qualificationFilter.replace("_", " ")}`;
    if (funnelStageId) {
      const stage = funnelStages.find((s) => String(s.id) === funnelStageId);
      return `Stage: ${stage?.name ?? funnelStageId}`;
    }
    if (duplicateFilter) return `Duplicate: ${duplicateFilter.replace("_", " ")}`;
    if (minScore) return `Score ≥ ${minScore}`;
    return null;
  })();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">Discovered & enriched leads — BRD §3.5</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="soft" size="compact" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button variant="brand" size="compact" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5" /> New Lead
          </Button>
        </div>
      </div>

      {filterLabel && (
        <div className={FILTER_BANNER}>
          <span>Filtered by: {filterLabel}</span>
          <button onClick={resetFilters} className="ml-auto rounded p-0.5 hover:opacity-70">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, industry, email..." className="pl-9" />
        </div>
        <Select value={funnelStageId} onChange={(e) => { setFunnelStageId(e.target.value); setPage(1); }}>
          <option value="">All Stages</option>
          {funnelStages.map((s) => (
            <option key={s.id} value={String(s.id)}>{s.name}</option>
          ))}
        </Select>
        <Select value={qualificationFilter} onChange={(e) => { setQualificationFilter(e.target.value); setPage(1); }}>
          <option value="">All Qualifications</option>
          <option value="pending">Pending</option>
          <option value="eligible">Eligible</option>
          <option value="potential">Potential</option>
          <option value="not_eligible">Not Eligible</option>
        </Select>
        <Select value={duplicateFilter} onChange={(e) => { setDuplicateFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="probable_duplicate">Probable Duplicate</option>
          <option value="exact_duplicate">Exact Duplicate</option>
        </Select>
        <div className="flex gap-2 items-center">
          <Input type="number" min="0" max="100" value={minScore} onChange={(e) => { setMinScore(e.target.value); setPage(1); }} placeholder="Min score" className="w-24" />
          <span className="text-muted-foreground">–</span>
          <Input type="number" min="0" max="100" value={maxScore} onChange={(e) => { setMaxScore(e.target.value); setPage(1); }} placeholder="Max" className="w-24" />
        </div>
        {hasActiveFilter && (
          <button onClick={resetFilters} className="h-9 rounded-lg border border-border px-3 text-xs text-muted-foreground hover:text-foreground">
            Clear filters
          </button>
        )}
      </div>

      <TableWrapper>
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Company</TableHeaderCell>
              <TableHeaderCell>Industry</TableHeaderCell>
              <TableHeaderCell>Contact</TableHeaderCell>
              <TableHeaderCell>Score</TableHeaderCell>
              <TableHeaderCell>Qualification</TableHeaderCell>
              <TableHeaderCell>Stage</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></TableCell>
              </TableRow>
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center text-xs text-muted-foreground">No leads found. Discover or create leads to populate.</TableCell>
              </TableRow>
            ) : leads.map((lead: any) => (
              <TableRow key={lead.id}>
                <TableCell>
                  <Link href={`/leads/${lead.id}`} className="group">
                    <p className="text-sm font-medium group-hover:text-[var(--brand)] transition-colors">{lead.company_name}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{lead.address}</p>
                  </Link>
                </TableCell>
                <TableCell><span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">{lead.industry?.name ?? lead.business_category ?? "—"}</span></TableCell>
                <TableCell muted>
                  <p className="text-xs">{lead.email || "—"}</p>
                  <p className="text-xs text-muted-foreground">{lead.phone || ""}</p>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="score-bar-track w-12"><div className="score-bar-fill" style={{ width: `${Math.max(0, Math.min(100, lead.lead_score || 0))}%` }} /></div>
                    <span className="text-xs font-bold tabular-nums">{lead.lead_score ?? "—"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`capitalize ${QUALIFICATION_BADGE[lead.qualification_status] ?? QUALIFICATION_BADGE.pending}`}>
                    {(lead.qualification_status || "pending").replace("_", " ")}
                  </span>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => { setFunnelStageId(String(lead.funnel_stage_id ?? "")); setPage(1); }}
                    className="text-xs hover:text-[var(--brand)] transition-colors"
                    title="Filter by this stage"
                  >
                    {lead.funnel_stage?.name ?? lead.current_funnel_stage?.name ?? "—"}
                  </button>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <button onClick={() => pushToFunnel.mutate(lead.id)} title="Push to Funnel" className="rounded-md p-1.5 text-muted-foreground hover:bg-[var(--brand)]/10 hover:text-[var(--brand)]"><ArrowRight className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleWhatsApp(lead.phone)} title="WhatsApp" className="rounded-md p-1.5 text-muted-foreground hover:bg-[var(--status-success)]/10 hover:text-[var(--status-success)]"><MessageSquare className="h-3.5 w-3.5" /></button>
                    <Link href={`/leads/${lead.id}`} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" title="View details"><ExternalLink className="h-3.5 w-3.5" /></Link>
                    <button onClick={() => setDeleteConfirm(lead)} title="Delete lead" className="rounded-md p-1.5 text-muted-foreground hover:bg-[var(--status-danger)]/10 hover:text-[var(--status-danger)]"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">Showing page {page} of {lastPage} ({total} total)</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50"><ChevronLeft className="h-3.5 w-3.5" /></button>
            <span className="px-2 text-xs font-medium">{page}</span>
            <button onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={page >= lastPage} className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50"><ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </TableWrapper>

      {/* Delete Lead Confirmation */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Lead"
        size="sm"
        footer={
          <>
            <Button variant="soft" size="compact" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" size="compact" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleteConfirm.id)}>
              {deleteMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />} Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete <span className="font-semibold text-foreground">{deleteConfirm?.company_name}</span>?
        </p>
        <p className="text-xs text-muted-foreground">The lead will be soft-deleted and can be restored by an admin.</p>
        {deleteMutation.isError && <p className="text-xs text-[var(--status-danger)]">{(deleteMutation.error as Error)?.message}</p>}
      </Modal>

      {/* Create Lead Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Lead"
        size="md"
        footer={
          <>
            <Button variant="soft" size="compact" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              variant="brand"
              size="compact"
              disabled={createMutation.isPending || !formName}
              onClick={() => createMutation.mutate({ company_name: formName, address: formAddress, business_category: formIndustry, email: formEmail, phone: formPhone })}
            >
              {createMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />} Create
            </Button>
          </>
        }
      >
        <div><label className="text-xs font-medium text-muted-foreground">Company Name *</label><Input value={formName} onChange={e => setFormName(e.target.value)} className="mt-1" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">Address</label><Input value={formAddress} onChange={e => setFormAddress(e.target.value)} className="mt-1" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">Industry</label><Input value={formIndustry} onChange={e => setFormIndustry(e.target.value)} className="mt-1" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">Email</label><Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className="mt-1" /></div>
        <div><label className="text-xs font-medium text-muted-foreground">Phone</label><Input value={formPhone} onChange={e => setFormPhone(e.target.value)} className="mt-1" /></div>
      </Modal>
    </div>
  );
}
