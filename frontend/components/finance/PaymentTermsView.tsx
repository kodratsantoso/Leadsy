"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  CalendarClock, Plus, RefreshCw, CheckCircle2, AlertCircle, 
  Clock, Layers, ShieldCheck, Trash2, Calendar, Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/loading";
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
          code: form.code,
          term_type: form.term_type,
          days_due: form.days_due,
          frequency: form.frequency,
          description: form.description,
          installments_config: form.term_type === "milestone" ? form.installments : null,
          is_active: true,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Gagal menyimpan Payment Term.");
      }

      setSuccessMsg(json.message || "Preset Payment Term berhasil disimpan!");
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
          <Card key={term.id} className="flex flex-col justify-between">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-start justify-between gap-2 w-full">
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">{term.name}</CardTitle>
                  <span className="font-mono text-xs text-muted-foreground">{term.code}</span>
                </div>
                <Badge 
                  variant={term.term_type === "calendar" ? "brand" : "info"}
                  className="uppercase text-[10px] shrink-0"
                >
                  {term.term_type === "calendar" ? "Calendar (SaaS)" : "Milestone (BAST)"}
                </Badge>
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
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rincian Termin:</div>
                  <div className="space-y-1">
                    {term.installments_config.map((inst, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-[color:var(--surface-subtle)] border border-border/50">
                        <span className="font-medium text-foreground">{inst.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[color:var(--brand)]">{inst.percentage}%</span>
                          <span className="text-[10px] text-muted-foreground">
                            {inst.trigger === "calendar_date" ? "Tgl Tetap" : "BAST Fisik"}
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

      {/* Add/Edit Payment Term Modal */}
      {showModal && (
        <Modal
          open={showModal}
          onOpenChange={(open: boolean) => setShowModal(open)}
          title="Konfigurasi Preset Payment Term Baru"
          size="xl"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>Batal</Button>
              <Button size="sm" onClick={handleSaveTerm} disabled={saving}>
                {saving ? <Spinner size="xs" className="mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                Simpan Payment Term
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Nama Term</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: Net 30 Days / Termin 50-50"
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Kode Term (Unique Key)</label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, "_") })}
                  placeholder="Contoh: NET_30 / TERMIN_50_50"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Model Termin</label>
                <Select
                  value={form.term_type}
                  onChange={(e) => setForm({ ...form, term_type: e.target.value as any })}
                  className="h-8 text-xs font-semibold"
                >
                  <option value="calendar">Time / Calendar-based (SaaS / Waktu)</option>
                  <option value="milestone">Progress / BAST-based (Project SOW)</option>
                </Select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Periode Jatuh Tempo (Hari)</label>
                <Input
                  type="number"
                  value={form.days_due}
                  onChange={(e) => setForm({ ...form, days_due: parseInt(e.target.value, 10) || 0 })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Deskripsi Singkat</label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Penjelasan termin pembayaran untuk dicetak di Quotation/SO..."
                className="h-8 text-xs"
              />
            </div>

            {/* Installments Breakdown Editor (Milestone Mode) */}
            {form.term_type === "milestone" && (
              <div className="pt-2 border-t border-border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-foreground">Konfigurasi Rincian Termin & Persentase</span>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={handleAddInstallmentRow}
                    className="text-xs h-7"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Tambah Termin
                  </Button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {form.installments.map((inst, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-[color:var(--surface-subtle)] border border-border">
                      <Input
                        value={inst.label}
                        onChange={(e) => {
                          const next = [...form.installments];
                          next[index].label = e.target.value;
                          setForm({ ...form, installments: next });
                        }}
                        placeholder="Label Termin (misal: Uang Muka)"
                        className="h-7 text-xs flex-1"
                      />

                      <div className="flex items-center gap-1 w-24">
                        <Input
                          type="number"
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

                      <div className="w-36">
                        <Select
                          value={inst.trigger}
                          onChange={(e) => {
                            const next = [...form.installments];
                            next[index].trigger = e.target.value as any;
                            setForm({ ...form, installments: next });
                          }}
                          className="h-7 text-[11px]"
                        >
                          <option value="calendar_date">Tanggal Tetap</option>
                          <option value="bast_milestone">Penyelesaian BAST</option>
                        </Select>
                      </div>

                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => handleRemoveInstallmentRow(index)}
                        disabled={form.installments.length <= 1}
                        className="h-7 w-7 p-0 text-[var(--status-danger)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center text-xs font-semibold pt-1 border-t border-border">
                  <span>Total Persentase Termin:</span>
                  <span className={`font-mono ${
                    Math.round(form.installments.reduce((acc, c) => acc + (c.percentage || 0), 0)) === 100 
                      ? "text-[var(--status-success)]" 
                      : "text-[var(--status-danger)]"
                  }`}>
                    {form.installments.reduce((acc, c) => acc + (c.percentage || 0), 0)}% / 100%
                  </span>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
