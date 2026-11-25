"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  CalendarClock, Plus, RefreshCw, CheckCircle2, AlertCircle, 
  Layers, Trash2, Calendar, Sparkles, Pencil, Zap,
  AlertTriangle, Check, ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/loading";
import { apiFetch } from "@/lib/apiFetch";

export interface InstallmentConfig {
  label: string;
  percentage: number;
  trigger: "calendar_date" | "bast_milestone";
  month_offset?: number;
  billing_rule?: "start_of_month" | "contract_day" | "custom_days";
  days_after?: number;
}

export interface PaymentTermItem {
  id: number;
  name: string;
  code: string;
  term_type: "calendar" | "milestone";
  days_due: number;
  frequency: string;
  description?: string;
  installments_config?: InstallmentConfig[];
  is_active: boolean;
}

export function PaymentTermsView() {
  const [terms, setTerms] = useState<PaymentTermItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [termTypeFilter, setTermTypeFilter] = useState<"all" | "calendar" | "milestone">("all");

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingTerm, setDeletingTerm] = useState<PaymentTermItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    code: "",
    term_type: "calendar" as "calendar" | "milestone",
    days_due: 30,
    frequency: "one_time",
    description: "",
    installments: [
      { 
        label: "Pelunasan Penuh (100%)", 
        percentage: 100, 
        trigger: "calendar_date" as const, 
        month_offset: 0, 
        billing_rule: "contract_day" as const,
        days_after: 0 
      },
    ] as InstallmentConfig[],
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/finance/payment-terms");
      const json = await res.json();
      if (json?.data) {
        setTerms(json.data);
      }
    } catch (err: any) {
      console.error("Failed to load payment terms:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({
      name: "",
      code: "",
      term_type: "calendar",
      days_due: 30,
      frequency: "one_time",
      description: "",
      installments: [
        { 
          label: "Pelunasan Penuh (100%)", 
          percentage: 100, 
          trigger: "calendar_date", 
          month_offset: 0, 
          billing_rule: "contract_day",
          days_after: 0 
        },
      ],
    });
    setErrorMsg(null);
    setShowModal(true);
  };

  const handleOpenEdit = (term: PaymentTermItem) => {
    setEditingId(term.id);
    setForm({
      name: term.name,
      code: term.code,
      term_type: term.term_type || "calendar",
      days_due: term.days_due ?? 30,
      frequency: term.frequency || "one_time",
      description: term.description || "",
      installments: Array.isArray(term.installments_config) && term.installments_config.length > 0
        ? term.installments_config.map((inst, idx) => ({
            label: inst.label || `Termin ${idx + 1}`,
            percentage: Number(inst.percentage || 0),
            trigger: inst.trigger || "calendar_date",
            month_offset: inst.month_offset !== undefined ? Number(inst.month_offset) : idx,
            billing_rule: inst.billing_rule || (term.frequency === "quarterly" ? "start_of_month" : "contract_day"),
            days_after: inst.days_after !== undefined ? Number(inst.days_after) : 0,
          }))
        : [
            { 
              label: "Pelunasan Penuh (100%)", 
              percentage: 100, 
              trigger: "calendar_date", 
              month_offset: 0, 
              billing_rule: "contract_day",
              days_after: 0 
            },
          ],
    });
    setErrorMsg(null);
    setShowModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTerm) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/finance/payment-terms/${deletingTerm.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Gagal menghapus Payment Term.");
      }
      setSuccessMsg(json.message || "Payment Term berhasil diproses.");
      setDeletingTerm(null);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menghapus Payment Term.");
    } finally {
      setDeleting(false);
    }
  };

  // Quick Preset Templates
  const applyPresetTemplate = (templateType: "monthly" | "quarterly" | "semi_annual" | "dp_bast" | "full") => {
    if (templateType === "monthly") {
      const monthlyInstallments: InstallmentConfig[] = Array.from({ length: 12 }, (_, i) => ({
        label: `Bulan ${i + 1}`,
        percentage: i === 11 ? 8.37 : 8.33,
        trigger: "calendar_date",
        month_offset: i,
        billing_rule: "start_of_month",
        days_after: 0,
      }));
      setForm({
        ...form,
        name: form.name || "TOP Bulanan (12x Recurring)",
        code: form.code || "TOP_BULANAN_12X",
        term_type: "calendar",
        frequency: "monthly",
        description: "Penagihan otomatis setiap awal bulan pertama selama periode kontrak.",
        installments: monthlyInstallments,
      });
    } else if (templateType === "quarterly") {
      setForm({
        ...form,
        name: form.name || "Termin Kuartalan (4x / Q1-Q4)",
        code: form.code || "TOP_QUARTERLY_4X",
        term_type: "calendar",
        frequency: "quarterly",
        description: "Penagihan kuartalan (4x) autogenerate pada awal bulan pertama setiap kuartal berdasarkan tgl start kontrak.",
        installments: [
          { label: "Kuartal 1 (Bulan 1)", percentage: 25, trigger: "calendar_date", month_offset: 0, billing_rule: "start_of_month", days_after: 0 },
          { label: "Kuartal 2 (Bulan 4)", percentage: 25, trigger: "calendar_date", month_offset: 3, billing_rule: "start_of_month", days_after: 0 },
          { label: "Kuartal 3 (Bulan 7)", percentage: 25, trigger: "calendar_date", month_offset: 6, billing_rule: "start_of_month", days_after: 0 },
          { label: "Kuartal 4 (Bulan 10)", percentage: 25, trigger: "calendar_date", month_offset: 9, billing_rule: "start_of_month", days_after: 0 },
        ],
      });
    } else if (templateType === "semi_annual") {
      setForm({
        ...form,
        name: form.name || "Termin Semesteran (2x / S1-S2)",
        code: form.code || "TOP_SEMI_ANNUAL_2X",
        term_type: "calendar",
        frequency: "semi_annual",
        description: "Penagihan semesteran (setiap 6 bulan) masing-masing 50% dari total nilai kontrak.",
        installments: [
          { label: "Semester 1 (Bulan 1)", percentage: 50, trigger: "calendar_date", month_offset: 0, billing_rule: "start_of_month", days_after: 0 },
          { label: "Semester 2 (Bulan 7)", percentage: 50, trigger: "calendar_date", month_offset: 6, billing_rule: "start_of_month", days_after: 0 },
        ],
      });
    } else if (templateType === "dp_bast") {
      setForm({
        ...form,
        name: form.name || "Termin DP 30% + Progress 40% + BAST 30%",
        code: form.code || "TERMIN_DP_PROGRESS_BAST",
        term_type: "milestone",
        frequency: "custom_milestone",
        description: "Uang Muka 30%, Termin Progress Fisik 40%, dan Pelunasan BAST 30%.",
        installments: [
          { label: "Uang Muka (DP 30%)", percentage: 30, trigger: "calendar_date", month_offset: 0, billing_rule: "contract_day", days_after: 7 },
          { label: "Progress Milestone (40%)", percentage: 40, trigger: "bast_milestone", month_offset: 2, billing_rule: "custom_days", days_after: 14 },
          { label: "Pelunasan Akhir BAST (30%)", percentage: 30, trigger: "bast_milestone", month_offset: 4, billing_rule: "custom_days", days_after: 14 },
        ],
      });
    } else if (templateType === "full") {
      setForm({
        ...form,
        name: form.name || "Net 30 Days (Full Payment)",
        code: form.code || "NET_30",
        term_type: "calendar",
        frequency: "one_time",
        description: "Pembayaran penuh 100% dengan jatuh tempo 30 hari kalender.",
        installments: [
          { label: "Pelunasan Penuh (100%)", percentage: 100, trigger: "calendar_date", month_offset: 0, billing_rule: "contract_day", days_after: 0 },
        ],
      });
    }
  };

  const handleAddInstallmentRow = () => {
    const nextOffset = form.installments.length > 0 
      ? (form.installments[form.installments.length - 1].month_offset ?? 0) + 1 
      : 0;

    setForm({
      ...form,
      installments: [
        ...form.installments,
        { 
          label: `Termin ${form.installments.length + 1}`, 
          percentage: 0, 
          trigger: form.term_type === "milestone" ? "bast_milestone" : "calendar_date", 
          month_offset: nextOffset,
          billing_rule: "start_of_month",
          days_after: 14 
        },
      ],
    });
  };

  const handleRemoveInstallmentRow = (index: number) => {
    const next = [...form.installments];
    next.splice(index, 1);
    setForm({ ...form, installments: next });
  };

  const totalPercentage = Math.round(form.installments.reduce((acc, curr) => acc + Number(curr.percentage || 0), 0) * 100) / 100;

  const handleSaveTerm = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      setErrorMsg("Nama dan kode Payment Term wajib diisi.");
      return;
    }

    if (form.installments.length > 1 || form.term_type === "milestone") {
      if (Math.round(totalPercentage) !== 100) {
        setErrorMsg(`Total persentase termin harus tepat 100%. Saat ini: ${totalPercentage}%`);
        return;
      }
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      const endpoint = editingId 
        ? `/finance/payment-terms/${editingId}` 
        : "/finance/payment-terms";
      const method = editingId ? "PUT" : "POST";

      const res = await apiFetch(endpoint, {
        method,
        body: JSON.stringify({
          name: form.name.trim(),
          code: form.code.trim(),
          term_type: form.term_type,
          days_due: form.days_due,
          frequency: form.frequency,
          description: form.description,
          installments_config: form.installments,
          is_active: true,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Gagal menyimpan Payment Term.");
      }

      setSuccessMsg(json.message || (editingId ? "Preset Payment Term berhasil diperbarui!" : "Preset Payment Term berhasil disimpan!"));
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan Payment Term.");
    } finally {
      setSaving(false);
    }
  };

  const filteredTerms = terms.filter((term) => {
    if (termTypeFilter === "all") return true;
    return term.term_type === termTypeFilter;
  });

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {successMsg && (
        <div className="p-4 rounded-xl flex items-center justify-between border bg-[var(--status-success-soft)] text-[var(--status-success)] border-[color:var(--status-success)]/30 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="underline hover:opacity-80">Tutup</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl flex items-center justify-between border bg-[var(--status-danger-soft)] text-[var(--status-danger)] border-[color:var(--status-danger)]/30 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="underline hover:opacity-80">Tutup</button>
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base font-bold tracking-tight text-foreground">Master Setup Payment Terms (Termin Penagihan)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Konfigurasi model termin berbasis kalender (waktu/SaaS recurring: bulanan, kuartalan, semesteran, kustom) dan termin berbasis progress fisik / BAST (Project/SOW).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="bg-[color:var(--brand)] hover:opacity-90 text-white text-xs shadow-sm font-semibold"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Tambah Payment Term Baru
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-8 px-2.5 text-muted-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border pb-3">
        {(["all", "calendar", "milestone"] as const).map((tab) => (
          <Button
            key={tab}
            type="button"
            size="sm"
            variant={termTypeFilter === tab ? "default" : "outline"}
            onClick={() => setTermTypeFilter(tab)}
            className="text-xs capitalize font-medium"
          >
            {tab === "all" ? "Semua Preset" : tab === "calendar" ? "Time / Calendar-based (SaaS)" : "Milestone / BAST (Project)"}
          </Button>
        ))}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && terms.length === 0 ? (
          <div className="col-span-3 p-12 text-center text-muted-foreground">
            <Spinner size="lg" className="mx-auto mb-2" />
            <p className="text-xs">Memuat preset payment terms...</p>
          </div>
        ) : filteredTerms.map((term) => (
          <Card key={term.id} className="flex flex-col justify-between group hover:border-[color:var(--brand)]/40 transition">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-start justify-between gap-2 w-full">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm font-bold text-foreground truncate">{term.name}</CardTitle>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono text-[11px] text-muted-foreground">{term.code}</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-[10px] capitalize text-muted-foreground font-medium">{term.frequency.replace(/_/g, " ")}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => handleOpenEdit(term)}
                    title="Edit Preset"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setDeletingTerm(term)}
                    title="Hapus Preset"
                    className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <Badge 
                  variant={term.term_type === "calendar" ? "brand" : "info"}
                  className="uppercase text-[9px] px-2 py-0.5"
                >
                  {term.term_type === "calendar" ? "Calendar (SaaS)" : "Milestone (BAST)"}
                </Badge>
                {term.is_active ? (
                  <Badge variant="success" className="text-[9px] px-2 py-0.5">Aktif</Badge>
                ) : (
                  <Badge variant="neutral" className="text-[9px] px-2 py-0.5">Nonaktif / Arsip</Badge>
                )}
              </div>

              <CardDescription className="text-xs text-muted-foreground line-clamp-2 mt-2">
                {term.description || "Tidak ada deskripsi rincian."}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 pt-0 space-y-3">
              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                <span>Jatuh Tempo Faktur:</span>
                <strong className="text-foreground">Net {term.days_due} Hari</strong>
              </div>

              {/* Installments Breakdown Preview */}
              {term.installments_config && term.installments_config.length > 0 && (
                <div className="pt-2 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex justify-between">
                    <span>Rincian Termin ({term.installments_config.length}x):</span>
                    <span className="font-mono text-[color:var(--brand)]">
                      {term.installments_config.reduce((acc, c) => acc + (Number(c.percentage) || 0), 0)}%
                    </span>
                  </div>
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
                    {term.installments_config.map((inst, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-[color:var(--surface-subtle)] border border-border/50">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-semibold text-foreground truncate">{inst.label}</span>
                          {inst.month_offset !== undefined && (
                            <span className="text-[10px] text-muted-foreground bg-background px-1.5 py-0.2 rounded border border-border/50 shrink-0">
                              Bln +{inst.month_offset}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-[color:var(--brand)] font-mono">{inst.percentage}%</span>
                          <span className="text-[9px] text-muted-foreground uppercase">
                            {inst.billing_rule === "start_of_month" ? "Awal Bln" : inst.trigger === "calendar_date" ? "Tgl Tetap" : "BAST"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingTerm && (
        <Modal
          open={!!deletingTerm}
          onOpenChange={(open: boolean) => !open && setDeletingTerm(null)}
          title="Konfirmasi Hapus Payment Term"
          size="sm"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" size="sm" onClick={() => setDeletingTerm(null)} disabled={deleting}>
                Batal
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleDeleteConfirm} 
                disabled={deleting}
              >
                {deleting ? <Spinner size="xs" className="mr-1.5" /> : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
                Hapus Preset
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <p className="text-foreground">
              Apakah Anda yakin ingin menghapus Payment Term: <strong>{deletingTerm.name}</strong> ({deletingTerm.code})?
            </p>
            <p className="text-muted-foreground bg-[color:var(--surface-subtle)] p-2.5 rounded-lg border border-border leading-relaxed">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 inline mr-1 -mt-0.5" />
              Jika termin ini sudah digunakan pada Penawaran (Quotation) atau Sales Order aktif, sistem akan mengarsipkan statusnya menjadi <strong>Nonaktif</strong> untuk menjaga integritas data penagihan.
            </p>
          </div>
        </Modal>
      )}

      {/* Add / Edit Payment Term Modal */}
      {showModal && (
        <Modal
          open={showModal}
          onOpenChange={(open: boolean) => setShowModal(open)}
          title={editingId ? `Edit Payment Term: ${form.name}` : "Konfigurasi Preset Payment Term Baru"}
          size="xl"
          footer={
            <div className="flex justify-between items-center w-full">
              <div className="text-xs">
                Total Komposisi:{" "}
                <span className={`font-mono font-bold ${Math.round(totalPercentage) === 100 ? "text-emerald-500" : "text-rose-500"}`}>
                  {totalPercentage}% / 100%
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowModal(false)} disabled={saving}>
                  Batal
                </Button>
                <Button size="sm" onClick={handleSaveTerm} disabled={saving}>
                  {saving ? <Spinner size="xs" className="mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                  {editingId ? "Perbarui Payment Term" : "Simpan Payment Term"}
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Quick Template Fillers */}
            <div className="p-3 rounded-xl bg-[color:var(--surface-subtle)] border border-border space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                <Zap className="h-3.5 w-3.5 text-[color:var(--brand)]" />
                <span>Pilih Template Cepat (Quick Preset):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="xs" 
                  onClick={() => applyPresetTemplate("quarterly")}
                  className="text-[11px] h-7 bg-background"
                >
                  ⚡ Kuartalan (4x Awal Bulan)
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="xs" 
                  onClick={() => applyPresetTemplate("monthly")}
                  className="text-[11px] h-7 bg-background"
                >
                  ⚡ Bulanan (12x TOP)
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="xs" 
                  onClick={() => applyPresetTemplate("semi_annual")}
                  className="text-[11px] h-7 bg-background"
                >
                  ⚡ Semesteran (2x / S1-S2)
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="xs" 
                  onClick={() => applyPresetTemplate("dp_bast")}
                  className="text-[11px] h-7 bg-background"
                >
                  ⚡ DP + Progress BAST
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="xs" 
                  onClick={() => applyPresetTemplate("full")}
                  className="text-[11px] h-7 bg-background"
                >
                  ⚡ Full Payment (Net 30)
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Nama Payment Term *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: Termin Kuartalan (Awal Bulan) / Net 30"
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Kode Unik (Unique Key) *</label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, "_") })}
                  placeholder="Contoh: TOP_QUARTERLY_AWAL_BLN"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Model Termin</label>
                <Select
                  value={form.term_type}
                  onChange={(e) => setForm({ ...form, term_type: e.target.value as any })}
                  className="h-8 text-xs font-semibold"
                >
                  <option value="calendar">Time / Calendar-based (SaaS Waktu)</option>
                  <option value="milestone">Progress / BAST-based (Project SOW)</option>
                </Select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Frekuensi Jadwal</label>
                <Select
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  className="h-8 text-xs font-semibold"
                >
                  <option value="one_time">Sekali Bayar (One-time)</option>
                  <option value="monthly">Bulanan (Monthly TOP)</option>
                  <option value="quarterly">Kuartalan (Quarterly / 3 Bulan)</option>
                  <option value="semi_annual">Semesteran (Semi-Annual / 6 Bulan)</option>
                  <option value="custom_months">Kustom Bulan Bebas (Custom Months)</option>
                  <option value="custom_milestone">Milestone / Progres BAST</option>
                </Select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Jatuh Tempo Faktur (Hari)</label>
                <Input
                  type="number"
                  value={form.days_due}
                  onChange={(e) => setForm({ ...form, days_due: parseInt(e.target.value, 10) || 0 })}
                  placeholder="30"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Deskripsi Singkat</label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Penjelasan jadwal pembayaran yang dicetak pada Quotation / Sales Order..."
                className="h-8 text-xs"
              />
            </div>

            {/* Installments Breakdown Editor */}
            <div className="pt-2 border-t border-border space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-bold text-foreground">Konfigurasi Komposisi & Jadwal Termin</span>
                  <p className="text-[10px] text-muted-foreground">
                    Atur pembagian persentase per termin serta waktu penerbitan faktur otomatis.
                  </p>
                </div>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={handleAddInstallmentRow}
                  className="text-xs h-7"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Tambah Baris Termin
                </Button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {form.installments.map((inst, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 p-2 rounded-lg bg-[color:var(--surface-subtle)] border border-border items-center">
                    {/* Label Termin */}
                    <div className="col-span-4">
                      <Input
                        value={inst.label}
                        onChange={(e) => {
                          const next = [...form.installments];
                          next[index].label = e.target.value;
                          setForm({ ...form, installments: next });
                        }}
                        placeholder={`Label Termin ${index + 1}`}
                        className="h-7 text-xs"
                      />
                    </div>

                    {/* Persentase % */}
                    <div className="col-span-2 flex items-center gap-1">
                      <Input
                        type="number"
                        step="0.01"
                        value={inst.percentage}
                        onChange={(e) => {
                          const next = [...form.installments];
                          next[index].percentage = parseFloat(e.target.value) || 0;
                          setForm({ ...form, installments: next });
                        }}
                        placeholder="%"
                        className="h-7 text-xs font-mono text-right"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>

                    {/* Target Bulan (Month Offset) */}
                    <div className="col-span-3">
                      <Select
                        value={String(inst.month_offset ?? index)}
                        onChange={(e) => {
                          const next = [...form.installments];
                          next[index].month_offset = parseInt(e.target.value, 10);
                          setForm({ ...form, installments: next });
                        }}
                        className="h-7 text-[11px]"
                      >
                        <option value="0">Bulan ke-1 (M+0 / Start)</option>
                        <option value="1">Bulan ke-2 (M+1)</option>
                        <option value="2">Bulan ke-3 (M+2)</option>
                        <option value="3">Bulan ke-4 (M+3 / Q2)</option>
                        <option value="4">Bulan ke-5 (M+4)</option>
                        <option value="5">Bulan ke-6 (M+5)</option>
                        <option value="6">Bulan ke-7 (M+6 / Q3/S2)</option>
                        <option value="7">Bulan ke-8 (M+7)</option>
                        <option value="8">Bulan ke-9 (M+8)</option>
                        <option value="9">Bulan ke-10 (M+9 / Q4)</option>
                        <option value="10">Bulan ke-11 (M+10)</option>
                        <option value="11">Bulan ke-12 (M+11 / Akhir Thn)</option>
                      </Select>
                    </div>

                    {/* Aturan Tanggal Autogenerate */}
                    <div className="col-span-2">
                      {form.term_type === "milestone" ? (
                        <Select
                          value={inst.trigger}
                          onChange={(e) => {
                            const next = [...form.installments];
                            next[index].trigger = e.target.value as any;
                            setForm({ ...form, installments: next });
                          }}
                          className="h-7 text-[11px]"
                        >
                          <option value="calendar_date">Tgl Tetap</option>
                          <option value="bast_milestone">Selesai BAST</option>
                        </Select>
                      ) : (
                        <Select
                          value={inst.billing_rule || "start_of_month"}
                          onChange={(e) => {
                            const next = [...form.installments];
                            next[index].billing_rule = e.target.value as any;
                            setForm({ ...form, installments: next });
                          }}
                          className="h-7 text-[11px]"
                        >
                          <option value="start_of_month">Awal Bulan (Tgl 1)</option>
                          <option value="contract_day">Sesuai Tgl Kontrak</option>
                          <option value="custom_days">H+X Hari</option>
                        </Select>
                      )}
                    </div>

                    {/* Hapus Baris */}
                    <div className="col-span-1 flex justify-end">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => handleRemoveInstallmentRow(index)}
                        disabled={form.installments.length <= 1}
                        className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
