"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Download, Plus, ExternalLink, ChevronLeft, ChevronRight, MessageSquare, ArrowRight, X, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";

const statusColors: Record<string, string> = {
  eligible: "bg-emerald-500/10 text-emerald-500",
  potential: "bg-amber-500/10 text-amber-500",
  not_eligible: "bg-red-500/10 text-red-500",
  pending: "bg-gray-500/10 text-gray-400",
};

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
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formIndustry, setFormIndustry] = useState("");

  // Fetch funnel stages for the stage dropdown
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

  // Active filter label for UI banner
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
          <button onClick={handleExport} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-2 text-xs font-medium text-white shadow-lg shadow-indigo-500/25">
            <Plus className="h-3.5 w-3.5" /> New Lead
          </button>
        </div>
      </div>

      {/* Active filter banner */}
      {filterLabel && (
        <div className="flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/5 px-4 py-2 text-xs font-medium text-indigo-400">
          <span>Filtered by: {filterLabel}</span>
          <button onClick={resetFilters} className="ml-auto rounded p-0.5 hover:text-indigo-200">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, industry, email..." className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={funnelStageId} onChange={(e) => { setFunnelStageId(e.target.value); setPage(1); }} className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All Stages</option>
          {funnelStages.map((s) => (
            <option key={s.id} value={String(s.id)}>{s.name}</option>
          ))}
        </select>
        <select value={qualificationFilter} onChange={(e) => { setQualificationFilter(e.target.value); setPage(1); }} className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All Qualifications</option>
          <option value="pending">Pending</option>
          <option value="eligible">Eligible</option>
          <option value="potential">Potential</option>
          <option value="not_eligible">Not Eligible</option>
        </select>
        <select value={duplicateFilter} onChange={(e) => { setDuplicateFilter(e.target.value); setPage(1); }} className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="probable_duplicate">Probable Duplicate</option>
          <option value="exact_duplicate">Exact Duplicate</option>
        </select>
        <div className="flex gap-2 items-center">
          <input type="number" min="0" max="100" value={minScore} onChange={(e) => { setMinScore(e.target.value); setPage(1); }} placeholder="Min score" className="h-9 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-24" />
          <span className="text-muted-foreground">–</span>
          <input type="number" min="0" max="100" value={maxScore} onChange={(e) => { setMaxScore(e.target.value); setPage(1); }} placeholder="Max" className="h-9 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-24" />
        </div>
        {hasActiveFilter && (
          <button onClick={resetFilters} className="h-9 rounded-lg border border-border px-3 text-xs text-muted-foreground hover:text-foreground">
            Clear filters
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Industry</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Qualification</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr><td colSpan={7} className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></td></tr>
              ) : leads.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-muted-foreground text-xs">No leads found. Discover or create leads to populate.</td></tr>
              ) : leads.map((lead: any) => (
                <tr key={lead.id} className="transition-colors hover:bg-accent/20">
                  <td className="px-4 py-3">
                    <Link href={`/leads/${lead.id}`} className="group">
                      <p className="text-sm font-medium group-hover:text-indigo-400 transition-colors">{lead.company_name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{lead.address}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3"><span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">{lead.industry?.name ?? lead.business_category ?? "—"}</span></td>
                  <td className="px-4 py-3"><p className="text-xs">{lead.email || "—"}</p><p className="text-xs text-muted-foreground">{lead.phone || ""}</p></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600" style={{ width: `${lead.lead_score || 0}%` }} /></div>
                      <span className="text-xs font-bold tabular-nums">{lead.lead_score ?? "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusColors[lead.qualification_status] ?? ""}`}>{(lead.qualification_status || "pending").replace("_", " ")}</span></td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setFunnelStageId(String(lead.funnel_stage_id ?? "")); setPage(1); }}
                      className="text-xs hover:text-indigo-400 transition-colors"
                      title="Filter by this stage"
                    >
                      {lead.funnel_stage?.name ?? lead.current_funnel_stage?.name ?? "—"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => pushToFunnel.mutate(lead.id)} title="Push to Funnel" className="rounded-md p-1.5 text-muted-foreground hover:bg-indigo-500/10 hover:text-indigo-500"><ArrowRight className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleWhatsApp(lead.phone)} title="WhatsApp" className="rounded-md p-1.5 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500"><MessageSquare className="h-3.5 w-3.5" /></button>
                      <Link href={`/leads/${lead.id}`} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" /></Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">Showing page {page} of {lastPage} ({total} total)</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50"><ChevronLeft className="h-3.5 w-3.5" /></button>
            <span className="px-2 text-xs font-medium">{page}</span>
            <button onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={page >= lastPage} className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50"><ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </div>

      {/* Create Lead Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Create Lead</h2>
              <button onClick={() => setShowCreate(false)} className="rounded-md p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-muted-foreground">Company Name *</label><input value={formName} onChange={e => setFormName(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Address</label><input value={formAddress} onChange={e => setFormAddress(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Industry</label><input value={formIndustry} onChange={e => setFormIndustry(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Email</label><input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Phone</label><input value={formPhone} onChange={e => setFormPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground">Cancel</button>
              <button onClick={() => createMutation.mutate({ company_name: formName, address: formAddress, business_category: formIndustry, email: formEmail, phone: formPhone })} disabled={createMutation.isPending || !formName} className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-medium text-white disabled:opacity-50">
                {createMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />} Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
