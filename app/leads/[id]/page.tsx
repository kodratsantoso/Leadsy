"use client";

import { use, useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Building2, MapPin, Globe, Phone, Mail, Star, 
  MessageSquare, Clock, ChevronRight, Loader2, ArrowRight,
  Activity, FileText, CheckCircle2, Calendar, Target, BrainCircuit
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { cn } from "@/lib/utils";

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [tab, setTab] = useState<"overview" | "ai_insights" | "timeline" | "meetings" | "followups">("overview");

  const [contactModal, setContactModal] = useState<{ isOpen: boolean; mode: "add" | "edit"; data: any }>({ isOpen: false, mode: "add", data: null });

  const { data, isLoading } = useQuery({
    queryKey: ["lead", id],
    queryFn: async () => { const r = await apiFetch(`/leads/${id}`); return r.json(); },
  });

  const pushToFunnel = useMutation({
    mutationFn: async () => {
      return apiFetch(`/leads/${id}/push-to-funnel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: "qualified" }) });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead", id] }),
  });

  const rescore = useMutation({
    mutationFn: async () => {
      return apiFetch(`/leads/${id}/rescore`, { method: "POST" });
    },
    onSuccess: () => {
      alert("Rescore job dispatched. It may take a few seconds.");
      qc.invalidateQueries({ queryKey: ["lead", id] });
    },
  });

  const setPrimaryContact = useMutation({
    mutationFn: async (contactId: number) => {
      return apiFetch(`/leads/${id}/contacts/${contactId}/set-primary`, { method: "POST" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead", id] }),
  });

  const saveContact = useMutation({
    mutationFn: async (payload: any) => {
      const url = contactModal.mode === "edit" ? `/leads/${id}/contacts/${contactModal.data.id}` : `/leads/${id}/contacts`;
      const method = contactModal.mode === "edit" ? "PUT" : "POST";
      return apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead", id] });
      setContactModal({ isOpen: false, mode: "add", data: null });
    },
  });

  const addActivity = useMutation({
    mutationFn: async (desc: string) => {
      return apiFetch(`/leads/${id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity_type: "Note", description: desc }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead", id] }),
  });

  const handleWhatsApp = (phone: string) => {
    if (!phone) { alert("No phone number for this lead."); return; }
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}`, "_blank");
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const lead = data?.data || data || {};
  const currentAnalyses = lead.aiAnalyses && lead.aiAnalyses.length > 0 ? lead.aiAnalyses[lead.aiAnalyses.length - 1] : null;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border pb-6">
        <Link href="/leads" className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-accent hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{lead.company_name || `Lead #${id}`}</h1>
            {lead.qualification_status && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                lead.qualification_status === "eligible" ? "bg-emerald-500/10 text-emerald-500"
                : lead.qualification_status === "potential" ? "bg-amber-500/10 text-amber-500"
                : lead.qualification_status === "not_eligible" ? "bg-red-500/10 text-red-500"
                : "bg-gray-500/10 text-gray-500"
              }`}>{lead.qualification_status.replace("_", " ")}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{lead.address || "—"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => rescore.mutate()} disabled={rescore.isPending} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
             {rescore.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BrainCircuit className="h-3.5 w-3.5" />} Rescore
          </button>
          <button onClick={() => handleWhatsApp(lead.phone)} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
            <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
          </button>
          <button onClick={() => pushToFunnel.mutate()} disabled={pushToFunnel.isPending} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-2 text-xs font-medium text-white shadow-lg shadow-indigo-500/25 disabled:opacity-50">
            {pushToFunnel.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
            Push to Funnel
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-border overflow-x-auto">
        {[
          { id: "overview", icon: Activity, label: "Overview" },
          { id: "ai_insights", icon: BrainCircuit, label: "AI Insights & Scoring" },
          { id: "timeline", icon: Clock, label: "Activity Timeline" },
          { id: "meetings", icon: FileText, label: "Meetings & Transcripts" },
          { id: "followups", icon: Calendar, label: "Follow-ups" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.id ? "border-indigo-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {tab === "overview" && (
            <>
              {/* Company profile */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold">Company Profile</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { icon: Building2, label: "Industry", value: [lead.industry?.name, lead.subIndustry?.name].filter(Boolean).join(" / ") || "—" },
                    { icon: MapPin, label: "Address", value: lead.address || "—" },
                    { icon: Globe, label: "Website", value: lead.website || "—" },
                    { icon: Phone, label: "Phone", value: lead.phone || "—" },
                    { icon: Mail, label: "Email", value: lead.email || "—" },
                    { icon: Building2, label: "Size", value: lead.company_size_estimate || "—" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start gap-3">
                      <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div><p className="text-xs font-medium uppercase text-muted-foreground">{item.label}</p><p className="text-sm">{item.value}</p></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contacts */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Contact Persons</h2>
                  <button onClick={() => setContactModal({ isOpen: true, mode: "add", data: { name: "", title: "", email: "", phone: "" } })} className="text-xs font-medium text-indigo-500 hover:text-indigo-400 font-medium">+ Add Manual Contact</button>
                </div>
                <div className="space-y-4">
                  {(lead.contacts || []).length > 0 ? lead.contacts.map((contact: any) => (
                    <div key={contact.id} className="flex flex-col gap-3 rounded-lg border border-border/50 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 font-bold text-white shadow-sm">
                            {contact.name?.charAt(0) || "?"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">{contact.name}</p>
                              {contact.is_primary && <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-500">Primary</span>}
                            </div>
                            <p className="text-xs font-medium text-muted-foreground mt-0.5">{contact.title || contact.role || "No Title"}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", contact.confidence === 'high' ? "bg-emerald-500/10 text-emerald-500" : contact.confidence === 'low' ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500")}>
                            {contact.confidence} Confidence
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">Src: {contact.source || "Manual"}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-muted/20 p-2 rounded-md">
                         <div><strong className="text-foreground">Email: </strong>{contact.email || "—"}</div>
                         <div><strong className="text-foreground">Phone: </strong>{contact.phone || "—"}</div>
                      </div>

                      <div className="flex justify-end gap-3 mt-1">
                        <button 
                            onClick={() => setContactModal({ isOpen: true, mode: "edit", data: contact })}
                            className="text-xs text-muted-foreground hover:text-foreground font-medium"
                        >
                            Edit
                        </button>
                        {!contact.is_primary && (
                          <button 
                            onClick={() => setPrimaryContact.mutate(contact.id)}
                            disabled={setPrimaryContact.isPending}
                            className="text-xs text-indigo-500 hover:text-indigo-400 font-medium disabled:opacity-50"
                          >
                            Set as Primary
                          </button>
                        )}
                      </div>
                    </div>
                  )) : <p className="text-sm text-muted-foreground p-4 bg-muted/20 rounded-lg text-center border text-dashed border-border/50">No contacts recorded yet. Enrichment will populate this.</p>}
                </div>
              </div>
            </>
          )}

          {tab === "ai_insights" && (
            <div className="space-y-6">
              {/* Score breakdown */}
              {lead.scores && lead.scores.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                   <div className="flex items-center gap-2 mb-4"><Target className="h-5 w-5 text-indigo-500" /><h2 className="text-xl font-semibold">Lead Scoring Breakdown</h2></div>
                   <div className="space-y-3">
                     {lead.scores.map((score: any) => (
                       <div key={score.id} className="border-b border-border/50 pb-3 last:border-0 last:pb-0">
                         <div className="flex justify-between items-center mb-1">
                           <span className="font-semibold text-sm">Score: {score.score} ({score.grade})</span>
                           <span className="text-xs text-muted-foreground">{new Date(score.created_at).toLocaleString()}</span>
                         </div>
                         <p className="text-sm text-muted-foreground">{score.score_breakdown?.reasoning}</p>
                       </div>
                     ))}
                   </div>
                </div>
              )}
              
              {/* Product Match */}
              {lead.productMatches && lead.productMatches.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                   <div className="flex items-center gap-2 mb-4"><Star className="h-5 w-5 text-amber-500" /><h2 className="text-xl font-semibold">Product Recommendations</h2></div>
                   <div className="space-y-3">
                     {lead.productMatches.map((match: any) => (
                       <div key={match.id} className="rounded-lg border border-border/50 p-4">
                         <div className="flex justify-between items-center mb-2">
                           <span className="font-semibold text-sm">{match.product?.name || `Product #${match.product_id}`}</span>
                           <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", match.is_recommended ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground")}>
                             Match Score: {match.match_score}
                           </span>
                         </div>
                         <p className="text-sm text-muted-foreground">{match.match_reason}</p>
                       </div>
                     ))}
                   </div>
                </div>
              )}

              {/* Analysis */}
              {currentAnalyses ? (
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4"><BrainCircuit className="h-5 w-5 text-purple-500" /><h2 className="text-xl font-semibold">AI Opportunity Analysis</h2></div>
                  <div className="space-y-4 text-sm text-muted-foreground">
                    <div>
                      <strong className="text-foreground">Opportunity Summary:</strong>
                      <p className="mt-1">{currentAnalyses.business_opportunity_summary}</p>
                    </div>
                    <div>
                      <strong className="text-foreground">Probable Needs / Painpoints:</strong>
                      <ul className="mt-1 list-disc pl-5">
                        {(currentAnalyses.probable_needs || []).map((need: string, i: number) => <li key={i}>{need}</li>)}
                      </ul>
                    </div>
                    <div>
                      <strong className="text-foreground">Suggested Approach:</strong>
                      <p className="mt-1">{currentAnalyses.suggested_approach}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No detailed AI analysis has been generated for this lead yet. Trigger a rescore to generate.</p>
              )}
            </div>
          )}

          {tab === "timeline" && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Activity Timeline</h2>
                <button onClick={() => {
                  const desc = prompt("Enter a new note for this lead:");
                  if (desc) addActivity.mutate(desc);
                }} className="text-xs text-indigo-500 hover:text-indigo-400 font-medium">+ Add Note</button>
              </div>
              <div className="space-y-6">
                {lead.activities && lead.activities.length > 0 ? (
                  lead.activities.sort((a: any, b: any) => new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime()).map((act: any) => (
                    <div key={act.id} className="flex gap-4">
                      <div className="mt-1 shrink-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted border border-border">
                          {act.activity_type === 'Note' ? <FileText className="h-4 w-4 text-muted-foreground" /> :
                           act.activity_type === 'Meeting' ? <Calendar className="h-4 w-4 text-muted-foreground" /> :
                           act.activity_type === 'WhatsApp' ? <MessageSquare className="h-4 w-4 text-emerald-500" /> :
                           <Clock className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>
                      <div className="flex-1 pb-6 border-b border-border/50 last:border-0">
                        <div className="flex justify-between">
                          <p className="text-sm font-semibold">{act.activity_type}</p>
                          <span className="text-xs text-muted-foreground">{new Date(act.activity_date).toLocaleString()}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{act.description}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No activities recorded yet.</p>
                )}
              </div>
            </div>
          )}

          {tab === "meetings" && (
            <div className="space-y-6">
              {/* Meetings */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Meetings</h2>
                  <button className="text-xs text-indigo-500 font-medium">+ Log Meeting</button>
                </div>
                <div className="space-y-4">
                  {lead.meetings && lead.meetings.length > 0 ? lead.meetings.map((m: any) => (
                    <div key={m.id} className="rounded-lg border border-border/50 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-sm">{m.meeting_type || "Meeting"} - {new Date(m.meeting_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2"><strong className="text-foreground">Summary: </strong>{m.summary}</p>
                      {m.key_points && m.key_points.length > 0 && (
                        <div className="mt-2 text-sm text-muted-foreground">
                           <strong className="text-foreground">Key Points:</strong>
                           <ul className="list-disc pl-5 mt-1">{m.key_points.map((p: string, i: number) => <li key={i}>{p}</li>)}</ul>
                        </div>
                      )}
                    </div>
                  )) : <p className="text-sm text-muted-foreground">No meetings recorded.</p>}
                </div>
              </div>

              {/* Transcripts */}
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold">Conversation Transcripts</h2>
                <div className="space-y-4">
                  {lead.transcripts && lead.transcripts.length > 0 ? lead.transcripts.map((t: any) => (
                    <div key={t.id} className="rounded-lg border border-border/50 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Source: {t.source_type}</span>
                        <span className="text-xs text-muted-foreground">{new Date(t.recorded_at).toLocaleDateString()}</span>
                      </div>
                      <div className="mt-2 p-3 bg-muted/30 rounded text-sm text-foreground whitespace-pre-wrap font-mono relative overflow-hidden max-h-48 overflow-y-auto">
                         {t.transcript_text}
                      </div>
                    </div>
                  )) : <p className="text-sm text-muted-foreground">No transcripts recorded.</p>}
                </div>
              </div>
            </div>
          )}

          {tab === "followups" && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-semibold">Follow-ups</h2>
                 <button className="text-xs text-indigo-500 font-medium">+ Schedule Follow-up</button>
              </div>
              <div className="space-y-3">
                {lead.followUps && lead.followUps.length > 0 ? lead.followUps.map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between rounded-lg border border-border/50 p-4">
                      <div>
                        <p className="font-medium text-sm">{f.purpose || "Scheduled Follow-up"}</p>
                        <p className="text-xs text-muted-foreground mt-1 text-red-400">Due: {new Date(f.due_date).toLocaleString()}</p>
                      </div>
                      <span className="text-xs font-semibold uppercase bg-muted px-2 py-1 rounded">{f.status}</span>
                    </div>
                )) : <p className="text-sm text-muted-foreground">No follow-ups scheduled.</p>}
              </div>
            </div>
          )}

        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Score card */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm text-center">
            <p className="text-xs font-medium uppercase text-muted-foreground">Avg Score</p>
            <div className="my-3 flex items-center justify-center">
              <div className="relative h-24 w-24">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" className="text-muted/50" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="url(#scoreGradient)" strokeWidth="3" strokeDasharray={`${lead.lead_score || 0}, 100`} strokeLinecap="round" />
                  <defs><linearGradient id="scoreGradient"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#a855f7" /></linearGradient></defs>
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold">{lead.lead_score ?? "—"}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{lead.lead_score >= 80 ? "Highly qualified lead" : lead.lead_score >= 50 ? "Warm lead" : "Cold lead"}</p>
          </div>

          {/* Funnel stage */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <p className="text-xs font-medium uppercase text-muted-foreground mb-1">Current Stage</p>
            <p className="text-lg font-semibold text-indigo-400">{lead.funnelStage?.name || lead.current_funnel_stage?.name || lead.funnel_stage || "New Lead"}</p>
          </div>

          {/* AI Evaluations Summary */}
          {lead.aiEvaluations && lead.aiEvaluations.length > 0 && (
             <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
               <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Activity className="h-4 w-4" /> Latest Evaluation</h3>
               <div className="space-y-3 text-xs">
                 <div className="flex justify-between pb-2 border-b border-border/50">
                   <span className="text-muted-foreground">Intent</span>
                   <span className="font-semibold">{lead.aiEvaluations[lead.aiEvaluations.length-1].intent_level}</span>
                 </div>
                 <div className="flex justify-between pb-2 border-b border-border/50">
                   <span className="text-muted-foreground">Interest</span>
                   <span className="font-semibold">{lead.aiEvaluations[lead.aiEvaluations.length-1].interest_level}</span>
                 </div>
                 <div>
                   <span className="text-muted-foreground block mb-1">Next Best Action:</span>
                   <span className="font-medium text-indigo-400">{lead.aiEvaluations[lead.aiEvaluations.length-1].next_best_action}</span>
                 </div>
               </div>
             </div>
          )}

        </div>
      </div>

      {contactModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-lg border border-border">
            <h2 className="text-xl font-semibold mb-4">{contactModal.mode === "add" ? "Add Manual Contact" : "Edit Contact"}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <input 
                  type="text" 
                  value={contactModal.data?.name || ""} 
                  onChange={(e) => setContactModal({ ...contactModal, data: { ...contactModal.data, name: e.target.value } })}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              <div>
                <label className="text-sm font-medium">Job Title</label>
                <input 
                  type="text" 
                  value={contactModal.data?.title || ""} 
                  onChange={(e) => setContactModal({ ...contactModal, data: { ...contactModal.data, title: e.target.value } })}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input 
                  type="email" 
                  value={contactModal.data?.email || ""} 
                  onChange={(e) => setContactModal({ ...contactModal, data: { ...contactModal.data, email: e.target.value } })}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <input 
                  type="tel" 
                  value={contactModal.data?.phone || ""} 
                  onChange={(e) => setContactModal({ ...contactModal, data: { ...contactModal.data, phone: e.target.value } })}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button 
                  onClick={() => setContactModal({ isOpen: false, mode: "add", data: null })}
                  className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => saveContact.mutate(contactModal.data)}
                  disabled={saveContact.isPending || !contactModal.data?.name}
                  className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saveContact.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saveContact.isPending ? "Saving..." : "Save Contact"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
