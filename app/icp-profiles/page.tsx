"use client";

import { useState } from "react";
import { Target, Plus, Search, Pencil, Trash2, X, Loader2, CheckCircle, Zap } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

const FIELD_OPTIONS = ["company_name", "phone", "email", "address", "website", "industry"];
const COMPANY_SIZE_OPTIONS = ["micro", "small", "medium", "large", "enterprise"];

export default function IcpProfilesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [error, setError] = useState("");

  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formMinScore, setFormMinScore] = useState("50");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formSizes, setFormSizes] = useState<string[]>([]);
  const [formRequiredFields, setFormRequiredFields] = useState<string[]>([]);
  const [formWeightScore, setFormWeightScore] = useState("0.3");
  const [formWeightIndustry, setFormWeightIndustry] = useState("0.2");
  const [formWeightSize, setFormWeightSize] = useState("0.2");
  const [formWeightTerritory, setFormWeightTerritory] = useState("0.15");
  const [formWeightContact, setFormWeightContact] = useState("0.15");

  const { data, isLoading } = useQuery({
    queryKey: ["icp-profiles"],
    queryFn: async () => { const r = await apiFetch("/icp-profiles"); return r.json(); },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = editItem ? `/icp-profiles/${editItem.id}` : "/icp-profiles";
      const method = editItem ? "PUT" : "POST";
      const r = await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) { const err = await r.json(); throw new Error(err.message || "Save failed"); }
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["icp-profiles"] }); closeModal(); },
    onError: (e: any) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await apiFetch(`/icp-profiles/${id}`, { method: "DELETE" });
      if (!r.ok) { const err = await r.json(); throw new Error(err.message || "Delete failed"); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["icp-profiles"] }); setDeleteConfirm(null); },
    onError: (e: any) => setError(e.message),
  });

  const batchMatchMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await apiFetch(`/icp-profiles/${id}/batch-match`, { method: "POST" });
      return r.json();
    },
    onSuccess: (res) => alert(res.message || "Batch match complete"),
  });

  const resetForm = () => {
    setFormName(""); setFormDesc(""); setFormMinScore("50"); setFormIsActive(true);
    setFormSizes([]); setFormRequiredFields([]);
    setFormWeightScore("0.3"); setFormWeightIndustry("0.2"); setFormWeightSize("0.2");
    setFormWeightTerritory("0.15"); setFormWeightContact("0.15");
    setError("");
  };

  const openCreate = () => { setEditItem(null); resetForm(); setShowModal(true); };
  const openEdit = (p: any) => {
    setEditItem(p);
    setFormName(p.name || ""); setFormDesc(p.description || "");
    setFormMinScore(String(p.min_lead_score ?? 50)); setFormIsActive(p.is_active ?? true);
    setFormSizes(p.target_company_sizes || []); setFormRequiredFields(p.required_fields || []);
    setFormWeightScore(String(p.weight_lead_score ?? 0.3));
    setFormWeightIndustry(String(p.weight_industry ?? 0.2));
    setFormWeightSize(String(p.weight_company_size ?? 0.2));
    setFormWeightTerritory(String(p.weight_territory ?? 0.15));
    setFormWeightContact(String(p.weight_contact_info ?? 0.15));
    setError(""); setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditItem(null); setError(""); };

  const toggleArr = (arr: string[], val: string, set: (a: string[]) => void) =>
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const handleSave = () => {
    if (!formName.trim()) { setError("Name is required"); return; }
    saveMutation.mutate({
      name: formName.trim(),
      description: formDesc || null,
      min_lead_score: parseInt(formMinScore, 10),
      is_active: formIsActive,
      target_company_sizes: formSizes,
      required_fields: formRequiredFields,
      weight_lead_score: parseFloat(formWeightScore),
      weight_industry: parseFloat(formWeightIndustry),
      weight_company_size: parseFloat(formWeightSize),
      weight_territory: parseFloat(formWeightTerritory),
      weight_contact_info: parseFloat(formWeightContact),
    });
  };

  const profiles: any[] = (data?.data || []).filter((p: any) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ICP Profiles</h1>
          <p className="text-sm text-muted-foreground">Ideal Customer Profile definitions for lead matching</p>
        </div>
        <Button variant="brand" size="compact" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" /> Add Profile
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ICP profiles…" className="w-full pl-9" />
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--status-danger)]/30 bg-[color-mix(in_oklch,var(--status-danger)_10%,transparent)] px-4 py-2 text-xs text-[var(--status-danger)]">
          {error}
          <button onClick={() => setError("")} className="ml-2 opacity-70"><X className="inline h-3 w-3" /></button>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : profiles.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-16 text-center text-xs text-muted-foreground">
          No ICP profiles yet. Create one to enable automated lead matching.
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((p: any) => (
            <div key={p.id} className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)]/10">
                    <Target className="h-5 w-5 text-[var(--brand)]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{p.name}</h3>
                      {p.is_active && (
                        <span className="flex items-center gap-0.5 rounded-full bg-[color-mix(in_oklch,var(--status-success)_15%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--status-success)]">
                          <CheckCircle className="h-2.5 w-2.5" /> Active
                        </span>
                      )}
                    </div>
                    {p.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => batchMatchMutation.mutate(p.id)} disabled={batchMatchMutation.isPending}
                    className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-[var(--brand)]/10 hover:text-[var(--brand)]" title="Run batch match">
                    <Zap className="h-3.5 w-3.5" /> Match
                  </button>
                  <button onClick={() => openEdit(p)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" title="Edit">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleteConfirm(p)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-[var(--status-danger)]/10 hover:text-[var(--status-danger)]" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                {[
                  { label: "Min Score", val: p.min_lead_score ?? "—" },
                  { label: "Company Sizes", val: (p.target_company_sizes || []).length || "Any" },
                  { label: "Required Fields", val: (p.required_fields || []).length || "None" },
                  { label: "Score Weight", val: `${((p.weight_lead_score || 0) * 100).toFixed(0)}%` },
                ].map(({ label, val }) => (
                  <div key={label} className="rounded-lg bg-muted/40 p-2">
                    <p className="text-base font-bold tabular-nums">{val}</p>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={showModal}
        onClose={closeModal}
        title={editItem ? "Edit ICP Profile" : "Create ICP Profile"}
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
          <label className="text-xs font-medium text-muted-foreground">Name *</label>
          <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Enterprise Tech ICP" className="mt-1 w-full" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={2} className="mt-1 w-full" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Min Lead Score (0–100)</label>
            <Input type="number" min="0" max="100" value={formMinScore} onChange={e => setFormMinScore(e.target.value)} className="mt-1 w-full" />
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input type="checkbox" id="is_active" checked={formIsActive} onChange={e => setFormIsActive(e.target.checked)} />
            <label htmlFor="is_active" className="text-xs font-medium">Active profile</label>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Target Company Sizes</label>
          <div className="flex flex-wrap gap-1.5">
            {COMPANY_SIZE_OPTIONS.map(s => (
              <button key={s} type="button" onClick={() => toggleArr(formSizes, s, setFormSizes)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize border transition-colors ${formSizes.includes(s) ? "bg-[var(--brand)] border-[var(--brand)] text-white" : "border-border text-muted-foreground hover:border-[var(--brand)]"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">Required Fields</label>
          <div className="flex flex-wrap gap-1.5">
            {FIELD_OPTIONS.map(f => (
              <button key={f} type="button" onClick={() => toggleArr(formRequiredFields, f, setFormRequiredFields)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors ${formRequiredFields.includes(f) ? "bg-[var(--brand)] border-[var(--brand)] text-white" : "border-border text-muted-foreground hover:border-[var(--brand)]"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Match Weights (must sum to ~1.0)</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Lead Score", val: formWeightScore, set: setFormWeightScore },
              { label: "Industry", val: formWeightIndustry, set: setFormWeightIndustry },
              { label: "Company Size", val: formWeightSize, set: setFormWeightSize },
              { label: "Territory", val: formWeightTerritory, set: setFormWeightTerritory },
              { label: "Contact Info", val: formWeightContact, set: setFormWeightContact },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <label className="text-[10px] text-muted-foreground">{label}</label>
                <Input type="number" step="0.05" min="0" max="1" value={val} onChange={e => set(e.target.value)} className="mt-0.5 w-full text-xs" />
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete ICP Profile"
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
          Delete <span className="font-semibold text-foreground">{deleteConfirm?.name}</span>? This will remove the profile and all associated match data.
        </p>
      </Modal>
    </div>
  );
}
