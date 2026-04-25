"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus, Pencil, Trash2, Loader2, Target, CheckCircle,
  XCircle, ArrowLeft, Zap, Sparkles, AlertCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import Link from "next/link";

/* ── Types ─────────────────────────────────────────────────── */

type IcpProfile = {
  id: number;
  name: string;
  description?: string;
  target_industries?: string[];
  target_company_sizes?: string[];
  target_territories?: string[];
  min_lead_score?: number;
  required_fields?: string[];
  weight_lead_score?: number;
  weight_industry?: number;
  weight_company_size?: number;
  weight_territory?: number;
  weight_contact_info?: number;
  is_active: boolean;
  created_at: string;
};

type ProfileForm = {
  name: string;
  description: string;
  target_industries: string;
  target_company_sizes: string;
  target_territories: string;
  min_lead_score: string;
  required_fields: string;
  weight_lead_score: string;
  weight_industry: string;
  weight_company_size: string;
  weight_territory: string;
  weight_contact_info: string;
  is_active: boolean;
};

const EMPTY_FORM: ProfileForm = {
  name: "",
  description: "",
  target_industries: "",
  target_company_sizes: "",
  target_territories: "",
  min_lead_score: "0",
  required_fields: "",
  weight_lead_score: "0.30",
  weight_industry: "0.25",
  weight_company_size: "0.20",
  weight_territory: "0.15",
  weight_contact_info: "0.10",
  is_active: true,
};

const COMPANY_SIZE_OPTIONS = [
  "1-10", "11-50", "51-200", "201-500", "501-1000", "1000+",
];

/* ── Helpers ────────────────────────────────────────────────── */

function arrToStr(arr?: string[]) {
  return arr?.join(", ") ?? "";
}

function strToArr(str: string): string[] {
  return str
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function formToPayload(f: ProfileForm) {
  return {
    name: f.name,
    description: f.description || undefined,
    target_industries: strToArr(f.target_industries),
    target_company_sizes: strToArr(f.target_company_sizes),
    target_territories: strToArr(f.target_territories),
    min_lead_score: f.min_lead_score ? Number(f.min_lead_score) : 0,
    required_fields: strToArr(f.required_fields),
    weight_lead_score: Number(f.weight_lead_score) || 0,
    weight_industry: Number(f.weight_industry) || 0,
    weight_company_size: Number(f.weight_company_size) || 0,
    weight_territory: Number(f.weight_territory) || 0,
    weight_contact_info: Number(f.weight_contact_info) || 0,
    is_active: f.is_active,
  };
}

function profileToForm(p: IcpProfile): ProfileForm {
  return {
    name: p.name,
    description: p.description ?? "",
    target_industries: arrToStr(p.target_industries),
    target_company_sizes: arrToStr(p.target_company_sizes),
    target_territories: arrToStr(p.target_territories),
    min_lead_score: String(p.min_lead_score ?? 0),
    required_fields: arrToStr(p.required_fields),
    weight_lead_score: String(p.weight_lead_score ?? 0.3),
    weight_industry: String(p.weight_industry ?? 0.25),
    weight_company_size: String(p.weight_company_size ?? 0.2),
    weight_territory: String(p.weight_territory ?? 0.15),
    weight_contact_info: String(p.weight_contact_info ?? 0.1),
    is_active: p.is_active,
  };
}

/* ── Weight bar ─────────────────────────────────────────────── */

function WeightBar({ label, fieldKey, form, setForm }: {
  label: string;
  fieldKey: keyof ProfileForm;
  form: ProfileForm;
  setForm: React.Dispatch<React.SetStateAction<ProfileForm>>;
}) {
  const val = Math.min(1, Math.max(0, Number(form[fieldKey]) || 0));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <span className="text-xs font-bold tabular-nums">{(val * 100).toFixed(0)}%</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={val}
          onChange={(e) => setForm((f) => ({ ...f, [fieldKey]: e.target.value }))}
          className="w-full accent-[color:var(--brand)]"
        />
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────── */

export default function IcpProfilesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<IcpProfile | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // AI generation state
  const [generateMode, setGenerateMode] = useState<'combined' | 'per_category'>('combined');
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ["icp-profiles"],
    queryFn: () => apiFetch("/icp-profiles").then((r) => r.json()),
  });

  const profiles: IcpProfile[] = data?.data ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["icp-profiles"] });

  const createMutation = useMutation({
    mutationFn: (payload: object) =>
      apiFetch("/icp-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => { invalidate(); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: object }) =>
      apiFetch(`/icp-profiles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => { invalidate(); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/icp-profiles/${id}`, { method: "DELETE" }),
    onSuccess: () => { invalidate(); setDeletingId(null); },
  });

  const batchMatchMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/icp-profiles/${id}/batch-match`, { method: "POST" }),
  });

  const generateMutation = useMutation({
    mutationFn: async (mode: 'combined' | 'per_category') => {
      const r = await apiFetch("/icp-profiles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || `Server error (${r.status})`);
      }
      return r.json();
    },
    onSuccess: (data) => {
      setGenerateError(null);
      if (data.error) {
        setGenerateError(data.error);
        return;
      }
      setSuggestions(data.suggestions ?? []);
      setShowSuggestionsModal(true);
      setShowModeMenu(false);
    },
    onError: (err: any) => {
      setGenerateError(err.message || "Generation failed.");
    },
  });

  function applySuggestion(s: any) {
    setForm({
      name:                  s.name ?? "",
      description:           s.description ?? "",
      target_industries:     (s.target_industries ?? []).join(", "),
      target_company_sizes:  (s.target_company_sizes ?? []).join(", "),
      target_territories:    (s.target_territories ?? []).join(", "),
      min_lead_score:        String(s.min_lead_score ?? 0),
      required_fields:       "",
      weight_lead_score:     String(s.weight_lead_score ?? 0.30),
      weight_industry:       String(s.weight_industry ?? 0.25),
      weight_company_size:   String(s.weight_company_size ?? 0.20),
      weight_territory:      String(s.weight_territory ?? 0.15),
      weight_contact_info:   String(s.weight_contact_info ?? 0.10),
      is_active:             true,
    });
    setEditingProfile(null);
    setShowSuggestionsModal(false);
    setShowModal(true);
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingProfile(null);
    setShowModal(true);
  }

  function openEdit(p: IcpProfile) {
    setForm(profileToForm(p));
    setEditingProfile(p);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingProfile(null);
  }

  function submit() {
    const payload = formToPayload(form);
    if (editingProfile) {
      updateMutation.mutate({ id: editingProfile.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;
  const totalWeight =
    (Number(form.weight_lead_score) || 0) +
    (Number(form.weight_industry) || 0) +
    (Number(form.weight_company_size) || 0) +
    (Number(form.weight_territory) || 0) +
    (Number(form.weight_contact_info) || 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </span>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">ICP Profiles</h1>
          <p className="text-sm text-muted-foreground">
            Define Ideal Customer Profiles. Leads are matched against active profiles to produce ICP scores.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Generate with AI — dropdown for mode selection */}
          <div className="relative">
            <div className="flex items-stretch overflow-hidden rounded-lg border border-[var(--brand)]/40">
              <Button
                variant="outline"
                onClick={() => generateMutation.mutate(generateMode)}
                disabled={generateMutation.isPending}
                className="rounded-none border-0 border-r border-[var(--brand)]/30 bg-[color-mix(in_oklch,var(--brand)_8%,transparent)] text-[var(--brand)] hover:bg-[color-mix(in_oklch,var(--brand)_15%,transparent)]"
              >
                {generateMutation.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Sparkles className="h-3.5 w-3.5" />}
                {generateMutation.isPending ? "Generating…" : "Generate with AI"}
              </Button>
              <button
                onClick={() => setShowModeMenu((v) => !v)}
                className="flex items-center px-2 bg-[color-mix(in_oklch,var(--brand)_8%,transparent)] text-[var(--brand)] hover:bg-[color-mix(in_oklch,var(--brand)_15%,transparent)] border-0"
              >
                {showModeMenu ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>
            {showModeMenu && (
              <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-xl border border-border bg-card p-1 shadow-xl">
                <button
                  onClick={() => { setGenerateMode("combined"); setShowModeMenu(false); }}
                  className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 ${generateMode === "combined" ? "text-[var(--brand)]" : ""}`}
                >
                  <CheckCircle className={`mt-0.5 h-4 w-4 shrink-0 ${generateMode === "combined" ? "text-[var(--brand)]" : "text-transparent"}`} />
                  <div>
                    <p className="font-medium">Combined</p>
                    <p className="text-xs text-muted-foreground">One ICP across all products</p>
                  </div>
                </button>
                <button
                  onClick={() => { setGenerateMode("per_category"); setShowModeMenu(false); }}
                  className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 ${generateMode === "per_category" ? "text-[var(--brand)]" : ""}`}
                >
                  <CheckCircle className={`mt-0.5 h-4 w-4 shrink-0 ${generateMode === "per_category" ? "text-[var(--brand)]" : "text-transparent"}`} />
                  <div>
                    <p className="font-medium">Per Category</p>
                    <p className="text-xs text-muted-foreground">One ICP per product category</p>
                  </div>
                </button>
              </div>
            )}
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Profile
          </Button>
        </div>

        {/* AI generation error */}
        {generateError && (
          <div className="flex items-center gap-2 rounded-xl border border-[var(--status-danger)]/30 bg-[color-mix(in_oklch,var(--status-danger)_8%,transparent)] px-4 py-3 text-sm text-[var(--status-danger)]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {generateError}
          </div>
        )}
      </div>

      {/* Profile list */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : profiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-20 text-center">
          <Target className="mb-4 h-10 w-10 text-muted-foreground/30" />
          <p className="font-semibold">No ICP profiles yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a profile to enable ICP matching on leads.
          </p>
          <Button onClick={openCreate} className="mt-4">
            <Plus className="h-4 w-4" /> Create First Profile
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {profiles.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--brand)_12%,transparent)]">
                      <Target className="h-4.5 w-4.5 text-[var(--brand)]" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      {p.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{p.description}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={p.is_active ? "success" : "neutral"}>
                    {p.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {/* Criteria summary */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="font-medium text-muted-foreground">Min Lead Score</p>
                    <p className="font-semibold">{p.min_lead_score ?? 0}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Industries</p>
                    <p className="font-semibold">{p.target_industries?.length ? p.target_industries.join(", ") : "Any"}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Company Sizes</p>
                    <p className="font-semibold">{p.target_company_sizes?.length ? p.target_company_sizes.join(", ") : "Any"}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Territories</p>
                    <p className="font-semibold">{p.target_territories?.length ? p.target_territories.join(", ") : "Any"}</p>
                  </div>
                </div>

                {/* Weight bars */}
                <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
                  {[
                    { label: "Lead Score", val: p.weight_lead_score },
                    { label: "Industry", val: p.weight_industry },
                    { label: "Company Size", val: p.weight_company_size },
                    { label: "Territory", val: p.weight_territory },
                    { label: "Contact Info", val: p.weight_contact_info },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="w-24 text-[10px] font-medium text-muted-foreground">{label}</span>
                      <div className="h-1.5 flex-1 rounded-full bg-muted/60">
                        <div
                          className="h-full rounded-full bg-[var(--brand)]"
                          style={{ width: `${Math.min(100, (val ?? 0) * 100)}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-[10px] tabular-nums text-muted-foreground">
                        {((val ?? 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(p)}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => batchMatchMutation.mutate(p.id)}
                    disabled={batchMatchMutation.isPending || !p.is_active}
                    title={!p.is_active ? "Activate profile first" : "Run against all leads"}
                  >
                    {batchMatchMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                    Batch Match Leads
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingId(p.id)}
                    className="ml-auto text-[var(--status-danger)] hover:bg-[color-mix(in_oklch,var(--status-danger)_10%,transparent)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      <Modal
        open={showModal}
        onOpenChange={(open) => { if (!open) closeModal(); }}
        title={editingProfile ? "Edit ICP Profile" : "New ICP Profile"}
        description="Define the criteria that describe your ideal customer. Leads are scored against these parameters."
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingProfile ? "Save Changes" : "Create Profile"}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {/* Basic info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Profile Name <span className="text-[var(--status-danger)]">*</span>
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Mid-Market Manufacturing Indonesia"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Brief description of what this profile represents"
                className="min-h-[56px] w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-[var(--brand)] focus-visible:ring-3 focus-visible:ring-[color:var(--brand)]/15"
              />
            </div>
          </div>

          {/* Targeting criteria */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Targeting Criteria</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Target Industries
                  <span className="ml-1 font-normal text-muted-foreground/60">(comma-separated)</span>
                </label>
                <Input
                  value={form.target_industries}
                  onChange={(e) => setForm((f) => ({ ...f, target_industries: e.target.value }))}
                  placeholder="Manufacturing, Retail, Technology"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Target Company Sizes</label>
                <div className="flex flex-wrap gap-1.5 rounded-xl border border-input bg-background p-2">
                  {COMPANY_SIZE_OPTIONS.map((size) => {
                    const active = form.target_company_sizes.includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          const current = strToArr(form.target_company_sizes);
                          const next = active
                            ? current.filter((s) => s !== size)
                            : [...current, size];
                          setForm((f) => ({ ...f, target_company_sizes: next.join(", ") }));
                        }}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                          active
                            ? "bg-[var(--brand)] text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/70"
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Target Territories
                  <span className="ml-1 font-normal text-muted-foreground/60">(comma-separated)</span>
                </label>
                <Input
                  value={form.target_territories}
                  onChange={(e) => setForm((f) => ({ ...f, target_territories: e.target.value }))}
                  placeholder="Jakarta, Surabaya, Bandung"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Minimum Lead Score
                  <span className="ml-1 font-normal text-muted-foreground/60">(0–100)</span>
                </label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.min_lead_score}
                  onChange={(e) => setForm((f) => ({ ...f, min_lead_score: e.target.value }))}
                  placeholder="e.g. 50"
                />
              </div>
            </div>
          </div>

          {/* Scoring weights */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scoring Weights</p>
              <span className={`text-xs font-bold ${Math.abs(totalWeight - 1) < 0.01 ? "text-[var(--status-success)]" : "text-[var(--status-warning)]"}`}>
                Total: {(totalWeight * 100).toFixed(0)}%
                {Math.abs(totalWeight - 1) < 0.01 ? " ✓" : " (should sum to 100%)"}
              </span>
            </div>
            <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
              {[
                { label: "Lead Score Weight", fieldKey: "weight_lead_score" as const },
                { label: "Industry Weight", fieldKey: "weight_industry" as const },
                { label: "Company Size Weight", fieldKey: "weight_company_size" as const },
                { label: "Territory Weight", fieldKey: "weight_territory" as const },
                { label: "Contact Info Weight", fieldKey: "weight_contact_info" as const },
              ].map((w) => (
                <WeightBar key={w.fieldKey} label={w.label} fieldKey={w.fieldKey} form={form} setForm={setForm} />
              ))}
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-xl border border-border p-4">
            <div>
              <p className="text-sm font-medium">Active Profile</p>
              <p className="text-xs text-muted-foreground">Only active profiles are used in ICP matching on leads.</p>
            </div>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                form.is_active ? "bg-[var(--brand)]" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  form.is_active ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirmation ── */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="mb-2 text-lg font-semibold">Delete ICP Profile?</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              This profile and all its lead match results will be permanently removed.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeletingId(null)}>Cancel</Button>
              <button
                onClick={() => deleteMutation.mutate(deletingId)}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--status-danger)] px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
              >
                {deleteMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Suggestions Modal ── */}
      <Modal
        open={showSuggestionsModal}
        onOpenChange={setShowSuggestionsModal}
        title="AI-Generated ICP Suggestions"
        description="Review the suggestions below. Click 'Use this ICP' to pre-fill the form — you can edit everything before saving."
        size="xl"
        footer={
          <Button variant="outline" onClick={() => setShowSuggestionsModal(false)}>
            Close
          </Button>
        }
      >
        {suggestions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <Sparkles className="h-8 w-8 opacity-30" />
            <p className="text-sm">No suggestions generated. Add more product metadata and try again.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map((s, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-card p-5 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{s.name}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{s.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {s.confidence != null && (
                      <span className="text-xs text-muted-foreground">Confidence: {s.confidence}%</span>
                    )}
                    <Button size="sm" onClick={() => applySuggestion(s)}>
                      <Sparkles className="h-3.5 w-3.5" /> Use this ICP
                    </Button>
                  </div>
                </div>

                {/* Criteria summary */}
                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                  <div>
                    <p className="font-medium text-muted-foreground">Industries</p>
                    <p>{(s.target_industries ?? []).join(", ") || "—"}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Company Sizes</p>
                    <p>{(s.target_company_sizes ?? []).join(", ") || "—"}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Territories</p>
                    <p>{(s.target_territories ?? []).join(", ") || "—"}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Min Lead Score</p>
                    <p>{s.min_lead_score ?? 0}</p>
                  </div>
                </div>

                {/* Suggested weights */}
                <div className="space-y-1.5 rounded-xl bg-muted/20 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Suggested Weights</p>
                  {[
                    { label: "Lead Score",   val: s.weight_lead_score },
                    { label: "Industry",     val: s.weight_industry },
                    { label: "Company Size", val: s.weight_company_size },
                    { label: "Territory",    val: s.weight_territory },
                    { label: "Contact Info", val: s.weight_contact_info },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="w-24 text-[10px] text-muted-foreground">{label}</span>
                      <div className="h-1.5 flex-1 rounded-full bg-muted/60 overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${Math.min(100, (val ?? 0) * 100)}%` }} />
                      </div>
                      <span className="w-8 text-right text-[10px] tabular-nums text-muted-foreground">
                        {((val ?? 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>

                {/* AI reasoning */}
                {s.reasoning && (
                  <div className="rounded-lg border border-[var(--brand)]/20 bg-[color-mix(in_oklch,var(--brand)_6%,transparent)] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--brand)] mb-1">AI Reasoning</p>
                    <p className="text-xs text-muted-foreground">{s.reasoning}</p>
                  </div>
                )}

                {/* Missing data notes */}
                {s.missing_data_notes && (
                  <div className="flex items-start gap-2 rounded-lg border border-[var(--status-warning)]/30 bg-[color-mix(in_oklch,var(--status-warning)_6%,transparent)] p-3">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--status-warning)]" />
                    <p className="text-xs text-muted-foreground">{s.missing_data_notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
