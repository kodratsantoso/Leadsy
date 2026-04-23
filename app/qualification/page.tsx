"use client";

import type { ReactNode } from "react";
import { FormEvent, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, Loader2,
  ShieldAlert, Sparkles, Target, Plus, Pencil, Trash2, X, Zap, CheckCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

/* ── Types ───────────────────────────────────────────────────────────── */

type QualificationResult = {
  policy_version: string;
  status: "eligible" | "potential" | "need_review" | "not_eligible";
  score: number;
  reasoning: string[];
  risk_flags: string[];
  recommendation: string | null;
  hard_stops: string[];
  critical_data_gaps: string[];
  dimension_breakdown: Record<string, {
    points: number; max_points: number; summary: string;
    signals: string[]; risk_flags: string[];
  }>;
  input_snapshot: Record<string, unknown>;
};

/* ── Evaluate tab constants ──────────────────────────────────────────── */

const DEFAULT_FORM = {
  company_name: "", industry: "", company_size_band: "unknown",
  territory_fit: "unknown", target_industry_fit: "unknown",
  problem_statement: "", pain_level: "unknown", use_case_fit: "unknown",
  budget_status: "unknown", timeline_months: "", commercial_urgency: "unknown",
  decision_maker_engaged: "unknown", stakeholder_count: "0",
  contact_quality: "absent", technical_fit: "unknown",
  integration_complexity: "unknown", required_capabilities: "", notes: "",
};

const STATUS_STYLE: Record<string, string> = {
  eligible: "border-[var(--status-success)]/30 bg-[var(--status-success)]/10 text-[var(--status-success)]",
  potential: "border-[var(--status-warning)]/30 bg-[var(--status-warning)]/10 text-[var(--status-warning)]",
  need_review: "border-[var(--status-info)]/30 bg-[var(--status-info)]/10 text-[var(--status-info)]",
  not_eligible: "border-[var(--status-danger)]/30 bg-[var(--status-danger)]/10 text-[var(--status-danger)]",
};

const SET_STATUS_BADGE: Record<string, string> = {
  active: "badge-success",
  draft: "badge-neutral",
  archived: "badge-warning",
};

function meterColor(status?: string) {
  switch (status) {
    case "eligible": return "var(--status-success)";
    case "potential": return "var(--status-warning)";
    case "need_review": return "var(--status-info)";
    default: return "var(--status-danger)";
  }
}

function normalizeBoolean(value: string): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

/* ── Parameter Set CRUD helpers ──────────────────────────────────────── */

const INPUT_TYPES = ["enum", "boolean", "integer", "text"] as const;

function emptyParam() {
  return { dimension: "", parameter_key: "", label: "", input_type: "enum", max_points: 10, is_required: false, options: [] as any[] };
}
function emptyOption() {
  return { option_value: "", label: "", score: 0 };
}

/* ══════════════════════════════════════════════════════════════════════ */

export default function QualificationPage() {
  const [activeTab, setActiveTab] = useState<"evaluate" | "sets">("evaluate");

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Qualification</h1>
        <p className="text-sm text-muted-foreground">Lead eligibility engine with explainable scoring and parameter set management</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1 w-fit">
        {(["evaluate", "sets"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "evaluate" ? "Evaluate" : "Parameter Sets"}
          </button>
        ))}
      </div>

      {activeTab === "evaluate" ? <EvaluateTab /> : <ParameterSetsTab />}
    </div>
  );
}

/* ── Evaluate Tab ─────────────────────────────────────────────────────── */

function EvaluateTab() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [leadId, setLeadId] = useState("");
  const [result, setResult] = useState<QualificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMode, setLoadingMode] = useState<"manual" | "lead" | null>(null);

  const payload = useMemo(() => ({
    ...form,
    territory_fit: normalizeBoolean(form.territory_fit),
    decision_maker_engaged: normalizeBoolean(form.decision_maker_engaged),
    timeline_months: form.timeline_months ? Number(form.timeline_months) : undefined,
    stakeholder_count: Number(form.stakeholder_count || 0),
    required_capabilities: form.required_capabilities,
  }), [form]);

  async function runEvaluation(body: Record<string, unknown>, mode: "manual" | "lead") {
    setLoadingMode(mode); setError(null);
    try {
      const response = await apiFetch("/qualification/evaluate", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? data.error ?? "Qualification request failed.");
      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Qualification request failed.");
    } finally {
      setLoadingMode(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runEvaluation(payload, "manual");
  }

  const scorePct = Math.max(0, Math.min(100, result?.score ?? 0));

  return (
    <>
      {error && (
        <div className="rounded-xl border border-[var(--status-danger)]/30 bg-[var(--status-danger)]/10 px-4 py-3 text-sm text-[var(--status-danger)]">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardCheck className="h-4 w-4 text-[var(--brand)]" />
              <h2 className="text-lg font-semibold">Evaluate Saved Lead</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Preview an existing lead through the qualification policy without editing it.</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input value={leadId} onChange={e => setLeadId(e.target.value)} placeholder="Lead ID" className="flex-1" />
              <Button variant="brand" type="button" onClick={() => void runEvaluation({ lead_id: Number(leadId) }, "lead")}
                disabled={!leadId || loadingMode !== null}>
                {loadingMode === "lead" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Evaluate Lead
              </Button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-[var(--status-warning)]" />
              <h2 className="text-lg font-semibold">Manual Qualification Input</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-5">Test scoring policy, compare scenarios, validate gatekeeper logic.</p>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Company Name</span>
                <Input value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} className="w-full" />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Industry</span>
                <Input value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} className="w-full" />
              </label>
              <FieldSelect label="Company Size Band" value={form.company_size_band} onChange={v => setForm(p => ({ ...p, company_size_band: v }))} options={["unknown", "micro", "small", "medium", "enterprise"]} />
              <FieldSelect label="Target Industry Fit" value={form.target_industry_fit} onChange={v => setForm(p => ({ ...p, target_industry_fit: v }))} options={["unknown", "high", "medium", "low"]} />
              <FieldSelect label="Territory Fit" value={form.territory_fit} onChange={v => setForm(p => ({ ...p, territory_fit: v }))} options={["unknown", "true", "false"]} />
              <FieldSelect label="Pain Level" value={form.pain_level} onChange={v => setForm(p => ({ ...p, pain_level: v }))} options={["unknown", "high", "medium", "low"]} />
              <FieldSelect label="Use-Case Fit" value={form.use_case_fit} onChange={v => setForm(p => ({ ...p, use_case_fit: v }))} options={["unknown", "high", "medium", "low"]} />
              <FieldSelect label="Budget Status" value={form.budget_status} onChange={v => setForm(p => ({ ...p, budget_status: v }))} options={["unknown", "confirmed", "range", "unavailable"]} />
              <FieldSelect label="Commercial Urgency" value={form.commercial_urgency} onChange={v => setForm(p => ({ ...p, commercial_urgency: v }))} options={["unknown", "high", "medium", "low"]} />
              <FieldSelect label="Decision-Maker Engaged" value={form.decision_maker_engaged} onChange={v => setForm(p => ({ ...p, decision_maker_engaged: v }))} options={["unknown", "true", "false"]} />
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Stakeholder Count</span>
                <Input type="number" min="0" max="50" value={form.stakeholder_count} onChange={e => setForm(p => ({ ...p, stakeholder_count: e.target.value }))} className="w-full" />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Timeline (months)</span>
                <Input type="number" min="0" max="60" value={form.timeline_months} onChange={e => setForm(p => ({ ...p, timeline_months: e.target.value }))} className="w-full" />
              </label>
              <FieldSelect label="Contact Quality" value={form.contact_quality} onChange={v => setForm(p => ({ ...p, contact_quality: v }))} options={["absent", "strong", "weak"]} />
              <FieldSelect label="Technical Fit" value={form.technical_fit} onChange={v => setForm(p => ({ ...p, technical_fit: v }))} options={["unknown", "high", "medium", "low"]} />
              <FieldSelect label="Integration Complexity" value={form.integration_complexity} onChange={v => setForm(p => ({ ...p, integration_complexity: v }))} options={["unknown", "low", "medium", "high"]} />
            </div>
            <div className="mt-4 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Problem Statement</span>
                <Textarea value={form.problem_statement} onChange={e => setForm(p => ({ ...p, problem_statement: e.target.value }))} rows={4} className="w-full" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Required Capabilities</span>
                <Textarea value={form.required_capabilities} onChange={e => setForm(p => ({ ...p, required_capabilities: e.target.value }))} rows={3} placeholder="One capability per line" className="w-full" />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Notes</span>
                <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} className="w-full" />
              </label>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button variant="brand" type="submit" disabled={loadingMode !== null}>
                {loadingMode === "manual" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
                Run Qualification
              </Button>
              <Button variant="soft" type="button" onClick={() => { setForm(DEFAULT_FORM); setError(null); }}>
                Reset
              </Button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Result</p>
                <h2 className="mt-1 text-xl font-semibold">Gate Decision</h2>
              </div>
              {result && (
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_STYLE[result.status]}`}>
                  {result.status.replace("_", " ")}
                </span>
              )}
            </div>
            {result ? (
              <div className="space-y-5">
                <div>
                  <div className="mb-2 flex items-end justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Score</span>
                    <span className="text-3xl font-bold tabular-nums">{result.score}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-muted/50">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${scorePct}%`, backgroundColor: meterColor(result.status) }} />
                  </div>
                </div>
                {result.recommendation && (
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recommendation</p>
                    <p className="mt-1 text-sm">{result.recommendation}</p>
                  </div>
                )}
                <ResultList title="Reasoning" items={result.reasoning} icon={<CheckCircle2 className="h-4 w-4 text-[var(--status-success)]" />} empty="No reasoning." />
                <ResultList title="Risk Flags" items={result.risk_flags} icon={<AlertTriangle className="h-4 w-4 text-[var(--status-warning)]" />} empty="No risk flags." />
                <ResultList title="Hard Stops" items={result.hard_stops} icon={<ShieldAlert className="h-4 w-4 text-[var(--status-danger)]" />} empty="No hard-stops triggered." />
                <ResultList title="Critical Data Gaps" items={result.critical_data_gaps} icon={<AlertTriangle className="h-4 w-4 text-[var(--status-info)]" />} empty="No critical data gaps." />
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted/10 px-6 py-10 text-center text-sm text-muted-foreground">
                Enter lead evidence to generate an explainable result.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold mb-1">Dimension Breakdown</h2>
            <p className="text-sm text-muted-foreground mb-4">Each scoring dimension contributes to the gate decision.</p>
            <div className="space-y-4">
              {result ? Object.entries(result.dimension_breakdown).map(([key, value]) => (
                <div key={key} className="rounded-xl border border-border/60 bg-background/40 p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-medium capitalize">{key.replace(/_/g, " ")}</p>
                    <span className="text-sm font-semibold tabular-nums">{value.points}/{value.max_points}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted/50">
                    <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${Math.max(0, Math.min(100, value.max_points > 0 ? (value.points / value.max_points) * 100 : 0))}%` }} />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{value.summary}</p>
                </div>
              )) : (
                <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  Dimension scoring appears after evaluation.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Parameter Sets Tab ───────────────────────────────────────────────── */

function ParameterSetsTab() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [error, setError] = useState("");

  // Form fields
  const [formName, setFormName] = useState("");
  const [formVersion, setFormVersion] = useState("1.0");
  const [formDesc, setFormDesc] = useState("");
  const [formStatus, setFormStatus] = useState("draft");
  const [formParams, setFormParams] = useState<any[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["qualification-parameter-sets"],
    queryFn: async () => { const r = await apiFetch("/qualification/parameter-sets"); return r.json(); },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = editItem ? `/qualification/parameter-sets/${editItem.id}` : "/qualification/parameter-sets";
      const method = editItem ? "PUT" : "POST";
      const r = await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.message || "Save failed"); }
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["qualification-parameter-sets"] }); closeModal(); },
    onError: (e: any) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await apiFetch(`/qualification/parameter-sets/${id}`, { method: "DELETE" });
      if (!r.ok) { const e = await r.json(); throw new Error(e.message || "Delete failed"); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["qualification-parameter-sets"] }); setDeleteConfirm(null); },
    onError: (e: any) => setError(e.message),
  });

  const activateMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await apiFetch(`/qualification/parameter-sets/${id}/activate`, { method: "POST" });
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qualification-parameter-sets"] }),
  });

  const resetForm = () => {
    setFormName(""); setFormVersion("1.0"); setFormDesc(""); setFormStatus("draft"); setFormParams([]); setError("");
  };

  const openCreate = () => { setEditItem(null); resetForm(); setShowModal(true); };
  const openEdit = (s: any) => {
    setEditItem(s);
    setFormName(s.name || ""); setFormVersion(s.version || "1.0");
    setFormDesc(s.description || ""); setFormStatus(s.status || "draft");
    setFormParams((s.parameters || []).map((p: any) => ({
      dimension: p.dimension, parameter_key: p.parameter_key, label: p.label,
      input_type: p.input_type, max_points: p.max_points, is_required: !!p.is_required,
      options: (p.options || []).map((o: any) => ({ option_value: o.option_value, label: o.label, score: o.score })),
    })));
    setError(""); setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditItem(null); setError(""); };

  const addParam = () => setFormParams(prev => [...prev, emptyParam()]);
  const removeParam = (i: number) => setFormParams(prev => prev.filter((_, idx) => idx !== i));
  const updateParam = (i: number, key: string, val: any) =>
    setFormParams(prev => prev.map((p, idx) => idx === i ? { ...p, [key]: val } : p));
  const addOption = (pi: number) =>
    setFormParams(prev => prev.map((p, idx) => idx === pi ? { ...p, options: [...p.options, emptyOption()] } : p));
  const removeOption = (pi: number, oi: number) =>
    setFormParams(prev => prev.map((p, idx) => idx === pi ? { ...p, options: p.options.filter((_: any, i: number) => i !== oi) } : p));
  const updateOption = (pi: number, oi: number, key: string, val: any) =>
    setFormParams(prev => prev.map((p, idx) => idx === pi ? {
      ...p, options: p.options.map((o: any, i: number) => i === oi ? { ...o, [key]: val } : o),
    } : p));

  const handleSave = () => {
    if (!formName.trim()) { setError("Name is required"); return; }
    if (!formVersion.trim()) { setError("Version is required"); return; }
    saveMutation.mutate({ name: formName, version: formVersion, description: formDesc || null, status: formStatus, parameters: formParams });
  };

  const sets: any[] = data?.data || [];

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage qualification parameter sets used by the scoring engine.</p>
        <Button variant="brand" size="compact" onClick={openCreate}><Plus className="h-3.5 w-3.5" /> New Set</Button>
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--status-danger)]/30 bg-[color-mix(in_oklch,var(--status-danger)_10%,transparent)] px-4 py-2 text-xs text-[var(--status-danger)]">
          {error} <button onClick={() => setError("")} className="ml-2 opacity-70"><X className="inline h-3 w-3" /></button>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : sets.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-16 text-center text-xs text-muted-foreground">
          No parameter sets yet. Create one to define qualification criteria.
        </div>
      ) : (
        <div className="space-y-3">
          {sets.map((s: any) => (
            <div key={s.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm">{s.name}</h3>
                    <span className="text-xs text-muted-foreground font-mono">v{s.version}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${SET_STATUS_BADGE[s.status] ?? "badge-neutral"}`}>
                      {s.status}
                    </span>
                  </div>
                  {s.description && <p className="text-xs text-muted-foreground mt-1">{s.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{(s.parameters || []).length} parameter{(s.parameters || []).length !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {s.status !== "active" && (
                    <button onClick={() => activateMutation.mutate(s.id)} disabled={activateMutation.isPending}
                      className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-[var(--status-success)]/10 hover:text-[var(--status-success)]">
                      <Zap className="h-3.5 w-3.5" /> Activate
                    </button>
                  )}
                  {s.status === "active" && (
                    <span className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[var(--status-success)]">
                      <CheckCircle className="h-3.5 w-3.5" /> Active
                    </span>
                  )}
                  <button onClick={() => openEdit(s)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleteConfirm(s)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-[var(--status-danger)]/10 hover:text-[var(--status-danger)]">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Parameter preview */}
              {(s.parameters || []).length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {s.parameters.map((p: any) => (
                    <div key={p.id} className="rounded-lg bg-muted/40 px-3 py-2">
                      <p className="text-xs font-medium truncate">{p.label}</p>
                      <p className="text-[10px] text-muted-foreground">{p.dimension} · {p.max_points}pts</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={showModal}
        onClose={closeModal}
        title={editItem ? "Edit Parameter Set" : "Create Parameter Set"}
        size="lg"
        footer={
          <>
            <Button variant="soft" size="compact" onClick={closeModal}>Cancel</Button>
            <Button variant="brand" size="compact" disabled={saveMutation.isPending} onClick={handleSave}>
              {saveMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              {editItem ? "Update" : "Create"}
            </Button>
          </>
        }
      >
        {error && <p className="rounded-lg bg-[color-mix(in_oklch,var(--status-danger)_10%,transparent)] px-3 py-2 text-xs text-[var(--status-danger)]">{error}</p>}

        <div className="space-y-4">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Name *</label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Enterprise Qualification v2" className="mt-1 w-full" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Version *</label>
              <Input value={formVersion} onChange={e => setFormVersion(e.target.value)} placeholder="1.0" className="mt-1 w-full" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={formStatus} onChange={e => setFormStatus(e.target.value)} className="mt-1 w-full">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={2} className="mt-1 w-full" />
            </div>
          </div>

          {/* Parameters */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">Parameters</p>
              <button type="button" onClick={addParam}
                className="flex items-center gap-1 text-xs text-[var(--brand)] hover:opacity-80">
                <Plus className="h-3 w-3" /> Add Parameter
              </button>
            </div>
            {formParams.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                No parameters yet — click "Add Parameter" to define scoring dimensions.
              </div>
            ) : (
              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                {formParams.map((param, pi) => (
                  <div key={pi} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground">Parameter {pi + 1}</p>
                      <button type="button" onClick={() => removeParam(pi)} className="text-muted-foreground hover:text-[var(--status-danger)]"><X className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground">Dimension</label>
                        <Input value={param.dimension} onChange={e => updateParam(pi, "dimension", e.target.value)}
                          className="mt-0.5 w-full text-xs" placeholder="e.g. financial" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Key</label>
                        <Input value={param.parameter_key} onChange={e => updateParam(pi, "parameter_key", e.target.value)}
                          className="mt-0.5 w-full text-xs" placeholder="e.g. budget_status" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-muted-foreground">Label</label>
                        <Input value={param.label} onChange={e => updateParam(pi, "label", e.target.value)}
                          className="mt-0.5 w-full text-xs" placeholder="e.g. Budget Status" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Input Type</label>
                        <Select value={param.input_type} onChange={e => updateParam(pi, "input_type", e.target.value)}
                          className="mt-0.5 w-full text-xs">
                          {INPUT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </Select>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Max Points</label>
                        <Input type="number" min="0" max="100" value={param.max_points} onChange={e => updateParam(pi, "max_points", parseInt(e.target.value) || 0)}
                          className="mt-0.5 w-full text-xs" />
                      </div>
                      <div className="flex items-center gap-1.5 col-span-2">
                        <input type="checkbox" id={`req_${pi}`} checked={param.is_required} onChange={e => updateParam(pi, "is_required", e.target.checked)} />
                        <label htmlFor={`req_${pi}`} className="text-[10px] text-muted-foreground">Required field</label>
                      </div>
                    </div>

                    {/* Options (for enum type) */}
                    {param.input_type === "enum" && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-medium text-muted-foreground">Enum Options</p>
                          <button type="button" onClick={() => addOption(pi)} className="text-[10px] text-[var(--brand)] hover:opacity-80 flex items-center gap-0.5">
                            <Plus className="h-2.5 w-2.5" /> Add Option
                          </button>
                        </div>
                        {param.options.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground italic">No options yet.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {param.options.map((opt: any, oi: number) => (
                              <div key={oi} className="flex items-center gap-1.5">
                                <Input value={opt.option_value} onChange={e => updateOption(pi, oi, "option_value", e.target.value)}
                                  className="w-24 text-[10px]" placeholder="value" />
                                <Input value={opt.label} onChange={e => updateOption(pi, oi, "label", e.target.value)}
                                  className="flex-1 text-[10px]" placeholder="label" />
                                <Input type="number" min="-100" max="100" value={opt.score} onChange={e => updateOption(pi, oi, "score", parseInt(e.target.value) || 0)}
                                  className="w-16 text-[10px]" placeholder="pts" />
                                <button type="button" onClick={() => removeOption(pi, oi)} className="text-muted-foreground hover:text-[var(--status-danger)]"><X className="h-3 w-3" /></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Parameter Set"
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
          Delete <span className="font-semibold text-foreground">{deleteConfirm?.name}</span>? This will soft-delete the set and its parameters.
        </p>
      </Modal>
    </>
  );
}

/* ── Shared helpers ──────────────────────────────────────────────────── */

function FieldSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Select value={value} onChange={e => onChange(e.target.value)} className="w-full">
        {options.map(o => <option key={o} value={o}>{o.replace("_", " ")}</option>)}
      </Select>
    </label>
  );
}

function ResultList({ title, items, icon, empty }: { title: string; items: string[]; icon: ReactNode; empty: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <p className="text-sm font-semibold">{title}</p>
      </div>
      {items.length > 0 ? (
        <ul className="space-y-2 text-sm text-muted-foreground">
          {items.map(item => <li key={item} className="rounded-lg border border-border/50 bg-background/40 px-3 py-2">{item}</li>)}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}
