"use client";

import { useState } from "react";
import { ShieldCheck, Plus, Pencil, Trash2, X, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { TableWrapper, Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/ui/table";

const CONDITION_TYPES = [
  { value: "score_below", label: "Score Below" },
  { value: "score_above", label: "Score Above" },
  { value: "missing_field", label: "Missing Field" },
  { value: "industry_not_in", label: "Industry Not In" },
  { value: "qualification_status", label: "Qualification Status" },
  { value: "ghost_lead", label: "Ghost Lead" },
];
const ACTIONS = ["block", "flag", "prioritize", "notify"];
const SEVERITIES = ["critical", "warning", "info"];

const SEVERITY_BADGE: Record<string, string> = {
  critical: "badge-danger",
  warning: "badge-warning",
  info: "badge-info",
};
const ACTION_BADGE: Record<string, string> = {
  block: "badge-danger",
  flag: "badge-warning",
  prioritize: "badge-success",
  notify: "badge-info",
};

export default function RevenueRulesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [error, setError] = useState("");

  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCondType, setFormCondType] = useState("score_below");
  const [formCondValue, setFormCondValue] = useState("");
  const [formAction, setFormAction] = useState("flag");
  const [formSeverity, setFormSeverity] = useState("warning");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formPriority, setFormPriority] = useState("1");

  const { data, isLoading } = useQuery({
    queryKey: ["revenue-rules"],
    queryFn: async () => { const r = await apiFetch("/revenue-rules"); return r.json(); },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = editItem ? `/revenue-rules/${editItem.id}` : "/revenue-rules";
      const method = editItem ? "PUT" : "POST";
      const r = await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) { const err = await r.json(); throw new Error(err.message || "Save failed"); }
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["revenue-rules"] }); closeModal(); },
    onError: (e: any) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await apiFetch(`/revenue-rules/${id}`, { method: "DELETE" });
      if (!r.ok) { const err = await r.json(); throw new Error(err.message || "Delete failed"); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["revenue-rules"] }); setDeleteConfirm(null); },
    onError: (e: any) => setError(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) =>
      apiFetch(`/revenue-rules/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["revenue-rules"] }),
  });

  const resetForm = () => {
    setFormName(""); setFormDesc(""); setFormCondType("score_below"); setFormCondValue("");
    setFormAction("flag"); setFormSeverity("warning"); setFormIsActive(true); setFormPriority("1");
    setError("");
  };

  const openCreate = () => { setEditItem(null); resetForm(); setShowModal(true); };
  const openEdit = (r: any) => {
    setEditItem(r);
    setFormName(r.name || ""); setFormDesc(r.description || "");
    setFormCondType(r.condition_type || "score_below");
    setFormCondValue(JSON.stringify(r.condition_value ?? {}));
    setFormAction(r.action || "flag"); setFormSeverity(r.severity || "warning");
    setFormIsActive(r.is_active ?? true); setFormPriority(String(r.priority ?? 1));
    setError(""); setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditItem(null); setError(""); };

  const parseCondValue = (raw: string): any => {
    try { return JSON.parse(raw); } catch { return { value: raw }; }
  };

  const handleSave = () => {
    if (!formName.trim()) { setError("Name is required"); return; }
    saveMutation.mutate({
      name: formName.trim(),
      description: formDesc || null,
      condition_type: formCondType,
      condition_value: parseCondValue(formCondValue),
      action: formAction,
      severity: formSeverity,
      is_active: formIsActive,
      priority: parseInt(formPriority, 10) || 1,
    });
  };

  const rules: any[] = data?.data || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revenue Rules</h1>
          <p className="text-sm text-muted-foreground">Automated rules for revenue intelligence blocking, flagging, and prioritization</p>
        </div>
        <Button variant="brand" size="compact" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Add Rule
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--status-danger)]/30 bg-[color-mix(in_oklch,var(--status-danger)_10%,transparent)] px-4 py-2 text-xs text-[var(--status-danger)]">
          {error} <button onClick={() => setError("")} className="ml-2 opacity-70"><X className="inline h-3 w-3" /></button>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : rules.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-16 text-center text-xs text-muted-foreground">
          No revenue rules yet. Add rules to automatically block, flag, or prioritize leads.
        </div>
      ) : (
        <TableWrapper>
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Priority</TableHeaderCell>
                <TableHeaderCell>Rule</TableHeaderCell>
                <TableHeaderCell>Condition</TableHeaderCell>
                <TableHeaderCell>Action</TableHeaderCell>
                <TableHeaderCell>Severity</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {rules.map((rule: any) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold">{rule.priority}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-[var(--brand)] shrink-0" />
                      <div>
                        <p className="font-medium text-sm">{rule.name}</p>
                        {rule.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{rule.description}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium capitalize">
                      {(rule.condition_type || "").replace(/_/g, " ")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${ACTION_BADGE[rule.action] ?? "badge-neutral"}`}>
                      {rule.action}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${SEVERITY_BADGE[rule.severity] ?? "badge-neutral"}`}>
                      {rule.severity}
                    </span>
                  </TableCell>
                  <TableCell>
                    <button onClick={() => toggleMutation.mutate({ id: rule.id, is_active: !rule.is_active })}
                      className="text-muted-foreground hover:text-foreground transition-colors" title={rule.is_active ? "Disable" : "Enable"}>
                      {rule.is_active
                        ? <ToggleRight className="h-5 w-5 text-[var(--status-success)]" />
                        : <ToggleLeft className="h-5 w-5" />}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(rule)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setDeleteConfirm(rule)} className="rounded-md p-1.5 text-muted-foreground hover:bg-[var(--status-danger)]/10 hover:text-[var(--status-danger)]"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableWrapper>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={showModal}
        onClose={closeModal}
        title={editItem ? "Edit Rule" : "Create Rule"}
        size="md"
        scrollable
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
        <div>
          <label className="text-xs font-medium text-muted-foreground">Rule Name *</label>
          <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Block low-score leads" className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={2} className="mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Condition Type</label>
            <Select value={formCondType} onChange={e => setFormCondType(e.target.value)} className="mt-1">
              {CONDITION_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Priority</label>
            <Input type="number" min="1" value={formPriority} onChange={e => setFormPriority(e.target.value)} className="mt-1" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Condition Value (JSON)</label>
          <Textarea value={formCondValue} onChange={e => setFormCondValue(e.target.value)} rows={2} className="mt-1 font-mono text-xs" placeholder={'{"threshold": 30}'} />
          <p className="mt-0.5 text-[10px] text-muted-foreground">Enter as JSON, e.g. {"{"}"threshold": 30{"}"}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Action</label>
            <Select value={formAction} onChange={e => setFormAction(e.target.value)} className="mt-1">
              {ACTIONS.map(a => <option key={a} value={a} className="capitalize">{a}</option>)}
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Severity</label>
            <Select value={formSeverity} onChange={e => setFormSeverity(e.target.value)} className="mt-1">
              {SEVERITIES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="rule_active" checked={formIsActive} onChange={e => setFormIsActive(e.target.checked)} />
          <label htmlFor="rule_active" className="text-xs font-medium">Active (enforce this rule)</label>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Rule"
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
          Delete <span className="font-semibold text-foreground">{deleteConfirm?.name}</span>? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
