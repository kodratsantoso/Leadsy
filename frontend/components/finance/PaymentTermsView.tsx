"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  CalendarClock, Plus, RefreshCw, CheckCircle2, AlertCircle, 
  Clock, Layers, ShieldCheck, Loader2, Trash2, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { apiFetch } from "@/lib/apiFetch";

interface InstallmentConfig {
  label: string;
  percentage: number;
  trigger: "calendar_date" | "bast_milestone";
  days_after?: number;
}

interface PaymentTermItem {
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

  // Add / Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    term_type: "calendar" as "calendar" | "milestone",
    days_due: 30,
    frequency: "one_time",
    description: "",
    installments: [
      { label: "Uang Muka (DP 50%)", percentage: 50, trigger: "calendar_date", days_after: 7 },
      { label: "Pelunasan BAST (50%)", percentage: 50, trigger: "bast_milestone", days_after: 14 },
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

  const handleAddInstallmentRow = () => {
    setForm({
      ...form,
      installments: [
        ...form.installments,
        { label: `Termin ${form.installments.length + 1}`, percentage: 0, trigger: "bast_milestone", days_after: 14 },
      ],
    });
  };

  const handleRemoveInstallmentRow = (index: number) => {
    const next = [...form.installments];
    next.splice(index, 1);
    setForm({ ...form, installments: next });
  };

  const handleSaveTerm = async () => {
    if (!form.name || !form.code) {
      setErrorMsg("Nama dan kode Payment Term wajib diisi.");
      return;
    }

    if (form.term_type === "milestone") {
      const totalPct = form.installments.reduce((acc, curr) => acc + Number(curr.percentage || 0), 0);
      if (Math.round(totalPct) !== 100) {
        setErrorMsg(`Total persentase termin harus tepat 100%. Saat ini: ${totalPct}%`);
        return;
      }
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch("/finance/payment-terms", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          code: form.code.toUpperCase().replace(/\s+/g, "_"),
          term_type: form.term_type,
          days_due: Number(form.days_due),
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

      setSuccessMsg(json.message || "Setup Payment Term berhasil disimpan.");
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan Payment Term.");
    } finally {
      setSaving(false);
    }
  };

  const filteredTerms = terms.filter((t) => termTypeFilter === "all" || t.term_type === termTypeFilter);

  return (
    <div className="space-y-6">
      {/* Success banner */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-[var(--status-success-soft)] text-[var(--status-success)] border border-[color:var(--status-success)]/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-xs underline">Tutup</button>
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Master Setup Payment Terms (Termin Penagihan)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Konfigurasi model termin berbasis kalender (waktu/SaaS recurring) dan termin berbasis progress fisik / BAST (Project/SOW).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => {
              setForm({
                name: "",
                code: "",
                term_type: "calendar",
                days_due: 30,
                frequency: "one_time",
                description: "",
                installments: [
                  { label: "Uang Muka (DP 50%)", percentage: 50, trigger: "calendar_date", days_after: 7 },
                  { label: "Pelunasan BAST (50%)", percentage: 50, trigger: "bast_milestone", days_after: 14 },
                ],
              });
              setShowModal(true);
            }}
            className="bg-[var(--brand)] hover:opacity-90 text-white text-xs shadow-sm font-semibold"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Tambah Payment Term Baru
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-9 px-2.5 text-muted-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Tab Filter */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        {(["all", "calendar", "milestone"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setTermTypeFilter(tab)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors capitalize ${
              termTypeFilter === tab 
                ? "bg-[var(--brand)] text-white shadow-sm" 
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {tab === "all" ? "Semua Preset" : tab === "calendar" ? "Time / Calendar-based (SaaS)" : "Milestone / BAST (Project)"}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && terms.length === 0 ? (
          <div className="col-span-3 p-12 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
            Memuat preset payment terms...
          </div>
        ) : filteredTerms.map((term) => (
          <div key={term.id} className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-foreground text-sm">{term.name}</h3>
                  <span className="font-mono text-xs text-muted-foreground">{term.code}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                  term.term_type === "calendar" 
                    ? "bg-blue-500/10 text-blue-700" 
                    : "bg-purple-500/10 text-purple-700"
                }`}>
                  {term.term_type === "calendar" ? "Calendar (SaaS)" : "Milestone (BAST)"}
                </span>
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2">
                {term.description || "Tidak ada deskripsi rincian."}
              </p>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                <span>Jatuh Tempo Faktur:</span>
                <strong className="text-foreground">Net {term.days_due} Hari</strong>
              </div>

              {/* Installments Breakdown Preview */}
              {term.installments_config && term.installments_config.length > 0 && (
                <div className="pt-2 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rincian Termin:</div>
                  <div className="space-y-1">
                    {term.installments_config.map((inst, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded-md bg-muted/40 font-mono">
                        <span className="text-foreground truncate max-w-[160px]">{inst.label}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-bold text-[var(--brand)]">{inst.percentage}%</span>
                          <span className="text-[10px] text-muted-foreground">({inst.trigger === 'bast_milestone' ? 'BAST' : 'Kalender'})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${term.is_active ? "text-emerald-600" : "text-muted-foreground"}`}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                {term.is_active ? "Preset Aktif" : "Non-aktif"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showModal && (
        <Modal
          open={showModal}
          onOpenChange={(open: boolean) => !open && setShowModal(false)}
          title="Tambah Setup Payment Term Baru"
          description="Tentukan skema jatuh tempo dan pembagian termin porsi faktur."
          size="xl"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" onClick={() => setShowModal(false)}>Batal</Button>
              <Button onClick={handleSaveTerm} disabled={saving} className="bg-[var(--brand)] hover:opacity-90 text-white">
                {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Simpan Payment Term
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-[var(--status-danger-soft)] text-[var(--status-danger)] text-xs rounded-lg flex items-center gap-2 border border-[color:var(--status-danger)]/30">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Nama Termin</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: Termin 3 Tahap (30-40-30)"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Kode Identifikasi</label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="TERMIN_30_40_30"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Tipe Model Termin</label>
                <select
                  value={form.term_type}
                  onChange={(e) => setForm({ ...form, term_type: e.target.value as any })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="calendar">Time / Calendar-based (SaaS Subscription)</option>
                  <option value="milestone">Progress Fisik / BAST (Project SOW)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Hari Jatuh Tempo Pembayaran</label>
                <Input
                  type="number"
                  value={form.days_due}
                  onChange={(e) => setForm({ ...form, days_due: parseInt(e.target.value, 10) || 0 })}
                  placeholder="30"
                />
                <span className="text-[10px] text-muted-foreground">Faktur jatuh tempo X hari setelah tanggal diterbitkan (Net X).</span>
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Deskripsi Termin</label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Penjelasan jadwal penagihan untuk proposal atau kontrak"
                />
              </div>
            </div>

            {/* Installments Table if Milestone */}
            {form.term_type === "milestone" && (
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-foreground">Rincian Porsi & Trigger Termin (Harus 100%)</span>
                  <Button size="xs" variant="outline" onClick={handleAddInstallmentRow}>
                    <Plus className="h-3 w-3 mr-1" /> Tambah Termin
                  </Button>
                </div>

                <div className="space-y-2">
                  {form.installments.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-muted/30 p-2 rounded-lg border border-border">
                      <div className="col-span-5">
                        <Input
                          placeholder="Label Termin"
                          value={row.label}
                          onChange={(e) => {
                            const next = [...form.installments];
                            next[idx].label = e.target.value;
                            setForm({ ...form, installments: next });
                          }}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            placeholder="Persen"
                            value={row.percentage}
                            onChange={(e) => {
                              const next = [...form.installments];
                              next[idx].percentage = parseFloat(e.target.value) || 0;
                              setForm({ ...form, installments: next });
                            }}
                            className="h-8 text-xs font-mono"
                          />
                          <span className="text-xs font-bold">%</span>
                        </div>
                      </div>
                      <div className="col-span-3">
                        <select
                          value={row.trigger}
                          onChange={(e) => {
                            const next = [...form.installments];
                            next[idx].trigger = e.target.value as any;
                            setForm({ ...form, installments: next });
                          }}
                          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                        >
                          <option value="calendar_date">Tanggal Order</option>
                          <option value="bast_milestone">Persetujuan BAST</option>
                        </select>
                      </div>
                      <div className="col-span-1 text-right">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => handleRemoveInstallmentRow(idx)}
                          className="h-7 w-7 p-0 text-[var(--status-danger)]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
