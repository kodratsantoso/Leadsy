"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Filter, Download, Plus, ExternalLink, ChevronLeft, ChevronRight, ArrowUpDown, MessageSquare, ArrowRight, X, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";

const statusColors: Record<string, string> = {
  eligible: "bg-emerald-500/10 text-emerald-500",
  potential: "bg-amber-500/10 text-amber-500",
  not_eligible: "bg-red-500/10 text-red-500",
  pending: "bg-gray-500/10 text-gray-400",
};

const dupColors: Record<string, string> = {
  new: "bg-emerald-500/10 text-emerald-500",
  probable_duplicate: "bg-amber-500/10 text-amber-500",
  exact_duplicate: "bg-red-500/10 text-red-500",
};

export default function LeadsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [stageFilter, setStageFilter] = useState("");
  const [qualificationFilter, setQualificationFilter] = useState("");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formIndustry, setFormIndustry] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["leads", page, search, stageFilter, qualificationFilter, minScore, maxScore],
    queryFn: async () => {
      let url = `/leads?page=${page}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (stageFilter) url += `&stage=${stageFilter}`;
      if (qualificationFilter) url += `&qualification_status=${qualificationFilter}`;
      if (minScore) url += `&min_score=${minScore}`;
      if (maxScore) url += `&max_score=${maxScore}`;
      const r = await apiFetch(url);
      return r.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiFetch("/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); setShowCreate(false); setFormName(""); setFormAddress(""); setFormPhone(""); setFormEmail(""); setFormIndustry(""); },
  });

  const pushToFunnel = useMutation({
    mutationFn: async (id: number) => {
      return apiFetch(`/leads/${id}/push-to-funnel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: "qualified" }) });
    },
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

  const leads = data?.data || [];
  const total = data?.total || 0;
  const lastPage = data?.last_page || 1;

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

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, industry, email..." className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={stageFilter} onChange={(e) => { setStageFilter(e.target.value); setPage(1); }} className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All Stages</option>
          <option value="new">New</option>
          <option value="discovered">Discovered</option>
          <option value="qualified">Qualified</option>
          <option value="contacted">Contacted</option>
          <option value="interested">Interested</option>
          <option value="meeting_scheduled">Meeting Scheduled</option>
          <option value="negotiation">Negotiation</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
        <select value={qualificationFilter} onChange={(e) => { setQualificationFilter(e.target.value); setPage(1); }} className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All Qualifications</option>
          <option value="pending">Pending</option>
          <option value="eligible">Eligible</option>
          <option value="potential">Potential</option>
          <option value="not_eligible">Not Eligible</option>
        </select>
        <div className="flex gap-2 items-center">
          <input type="number" min="0" max="100" value={minScore} onChange={(e) => { setMinScore(e.target.value); setPage(1); }} placeholder="Min score" className="h-9 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-24" />
          <span className="text-muted-foreground">–</span>
          <input type="number" min="0" max="100" value={maxScore} onChange={(e) => { setMaxScore(e.target.value); setPage(1); }} placeholder="Max" className="h-9 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-24" />
        </div>
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
                  <td className="px-4 py-3"><span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">{lead.industry || "—"}</span></td>
                  <td className="px-4 py-3"><p className="text-xs">{lead.email || "—"}</p><p className="text-xs text-muted-foreground">{lead.phone || ""}</p></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600" style={{ width: `${lead.lead_score || 0}%` }} /></div>
                      <span className="text-xs font-bold tabular-nums">{lead.lead_score ?? "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusColors[lead.qualification_status] ?? ""}`}>{(lead.qualification_status || "pending").replace("_", " ")}</span></td>
                  <td className="px-4 py-3"><span className="text-xs">{lead.current_funnel_stage?.name || "—"}</span></td>
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
