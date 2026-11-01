"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Hash,
  RefreshCw,
  Edit2,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  FileCheck2,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";

interface SequenceRecord {
  id: number;
  tenant_id: number;
  document_type: string;
  prefix: string;
  format: string;
  counter_digits: number;
  current_counter: number;
  reset_frequency: "monthly" | "yearly" | "never";
  last_reset_date: string | null;
  description: string | null;
  is_active: boolean;
  preview?: string;
}

const DOCUMENT_TYPE_LABELS: Record<string, { label: string; desc: string; icon: any; color: string }> = {
  quotation: {
    label: "Quotation / Penawaran Harga",
    desc: "Dokumen penawaran harga komersial ke calon klien",
    icon: FileText,
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  },
  sales_order: {
    label: "Sales Order / Pesanan Penjualan",
    desc: "Pesanan penjualan disetujui untuk delivery & billing",
    icon: FileSpreadsheet,
    color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  },
  invoice: {
    label: "Commercial Invoice / Faktur Penagihan",
    desc: "Faktur penagihan resmi termin atau final ke klien",
    icon: Receipt,
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
  bast: {
    label: "BAST (Berita Acara Serah Terima)",
    desc: "Dokumen serah terima milestone pekerjaan deliverable",
    icon: FileCheck2,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
  sow: {
    label: "SOW (Statement of Work)",
    desc: "Dokumen ruang lingkup kerja profesional services",
    icon: Layers,
    color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  },
};

export default function DocumentNumberingView() {
  const qc = useQueryClient();
  const [editingItem, setEditingItem] = useState<SequenceRecord | null>(null);
  const [formData, setFormData] = useState<{
    prefix: string;
    format: string;
    counter_digits: number;
    current_counter: number;
    reset_frequency: "monthly" | "yearly" | "never";
    description: string;
    is_active: boolean;
  }>({
    prefix: "",
    format: "",
    counter_digits: 4,
    current_counter: 0,
    reset_frequency: "monthly",
    description: "",
    is_active: true,
  });

  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch sequences
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["document-numbering-settings"],
    queryFn: async () => {
      const res = await apiFetch("/settings/document-numbering");
      if (!res.ok) throw new Error("Gagal mengambil data penomoran dokumen");
      return res.json();
    },
  });

  const sequences: SequenceRecord[] = data?.data || [];
  const availableTokens: { token: string; description: string }[] = data?.available_tokens || [];

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ docType, payload }: { docType: string; payload: typeof formData }) => {
      const res = await apiFetch(`/settings/document-numbering/${docType}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Gagal memperbarui konfigurasi penomoran.");
      }
      return res.json();
    },
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ["document-numbering-settings"] });
      showToast("success", res.message || `Format ${vars.docType} berhasil disimpan.`);
      setEditingItem(null);
    },
    onError: (err: any) => {
      showToast("error", err.message || "Terjadi kesalahan saat menyimpan.");
    },
  });

  const handleOpenEdit = (seq: SequenceRecord) => {
    setEditingItem(seq);
    setFormData({
      prefix: seq.prefix,
      format: seq.format,
      counter_digits: seq.counter_digits,
      current_counter: seq.current_counter,
      reset_frequency: seq.reset_frequency,
      description: seq.description || "",
      is_active: seq.is_active,
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    updateMutation.mutate({
      docType: editingItem.document_type,
      payload: formData,
    });
  };

  // Live client-side preview calculation
  const livePreview = useMemo(() => {
    if (!formData.format) return "";
    const now = new Date();
    const YYYY = String(now.getFullYear());
    const YY = YYYY.slice(-2);
    const MM = String(now.getMonth() + 1).padStart(2, "0");
    const DD = String(now.getDate()).padStart(2, "0");
    const counterVal = formData.current_counter > 0 ? formData.current_counter : 1;
    const COUNTER = String(counterVal).padStart(formData.counter_digits, "0");

    let result = formData.format;
    result = result.replace(/\{PREFIX\}/g, formData.prefix || "");
    result = result.replace(/\{YYYY\}/g, YYYY);
    result = result.replace(/\{YY\}/g, YY);
    result = result.replace(/\{MM\}/g, MM);
    result = result.replace(/\{DD\}/g, DD);
    result = result.replace(/\{COUNTER\}/g, COUNTER);
    return result;
  }, [formData]);

  const insertToken = (token: string) => {
    setFormData((prev) => ({
      ...prev,
      format: prev.format + token,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium transition-all animate-in fade-in slide-in-from-top-4 ${
            toastMessage.type === "success"
              ? "bg-emerald-950/90 text-emerald-200 border-emerald-800"
              : "bg-red-950/90 text-red-200 border-red-800"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <X className="h-5 w-5 text-red-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Banner / Explanation */}
      <Card className="border-border/60 bg-gradient-to-r from-card via-card to-muted/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-[color:var(--brand)]/10 text-[var(--brand)]">
                  <Hash className="h-5 w-5" />
                </span>
                <h2 className="text-lg font-bold tracking-tight">Pengaturan Penomoran Dokumen Tenant</h2>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 bg-emerald-500/10">
                  Tenant Autonomous
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Setiap tenant berhak menyesuaikan format penomoran dokumen resmi perusahaan Anda (Quotation, Sales Order, Invoice, BAST, SOW). Nomor dibuat secara berurutan, aman dari duplikasi, dan otomatis di-reset sesuai kebijakan siklus akuntansi perusahaan Anda.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-2 shrink-0 self-start md:self-center"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Available Tokens Reference */}
      <Card className="border-border/50 bg-card/60">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--brand)]" />
            <CardTitle className="text-sm font-semibold">Variabel Token Penomoran yang Didukung</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Gunakan variabel di bawah pada template format dokumen untuk menghasilkan nomor dinamis otomatis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {[
              { token: "{PREFIX}", desc: "Prefix dokumen", example: "QT, SO, INV" },
              { token: "{YYYY}", desc: "Tahun 4 Digit", example: new Date().getFullYear().toString() },
              { token: "{YY}", desc: "Tahun 2 Digit", example: new Date().getFullYear().toString().slice(-2) },
              { token: "{MM}", desc: "Bulan 2 Digit", example: String(new Date().getMonth() + 1).padStart(2, "0") },
              { token: "{DD}", desc: "Hari / Tanggal", example: String(new Date().getDate()).padStart(2, "0") },
              { token: "{COUNTER}", desc: "Nomor Urut Padded", example: "0001, 0002" },
            ].map((t) => (
              <div
                key={t.token}
                className="p-2.5 rounded-lg border border-border/60 bg-muted/30 flex flex-col justify-between"
              >
                <div className="font-mono text-xs font-bold text-[var(--brand)]">{t.token}</div>
                <div className="text-[11px] text-muted-foreground font-medium mt-1">{t.desc}</div>
                <div className="text-[10px] text-muted-foreground/70 mt-0.5">Hasil: {t.example}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sequences Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold tracking-tight">Daftar Dokumen Resmi & Format Aktif</h3>
          <span className="text-xs text-muted-foreground">{sequences.length} tipe dokumen terdaftar</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 bg-card border border-border rounded-xl">
            <RefreshCw className="h-6 w-6 animate-spin text-[var(--brand)]" />
            <span className="ml-3 text-sm text-muted-foreground font-medium">Memuat konfigurasi penomoran...</span>
          </div>
        ) : isError ? (
          <div className="p-8 text-center bg-card border border-destructive/30 rounded-xl">
            <p className="text-sm text-destructive font-medium">Gagal memuat konfigurasi penomoran dokumen.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">
              Coba Lagi
            </Button>
          </div>
        ) : sequences.length === 0 ? (
          <div className="p-8 text-center bg-card border border-border rounded-xl">
            <p className="text-sm text-muted-foreground">Belum ada seri penomoran yang diinisialisasi.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {sequences.map((seq) => {
              const meta = DOCUMENT_TYPE_LABELS[seq.document_type] || {
                label: seq.document_type.toUpperCase(),
                desc: "Dokumen komersial",
                icon: FileText,
                color: "text-slate-500 bg-slate-500/10 border-slate-500/20",
              };
              const Icon = meta.icon;

              return (
                <Card
                  key={seq.id}
                  className="border-border/60 hover:border-border transition-all shadow-xs overflow-hidden"
                >
                  <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Info */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div className={`p-2.5 rounded-xl border shrink-0 ${meta.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-foreground">{meta.label}</h4>
                          <Badge
                            variant={seq.is_active ? "success" : "neutral"}
                            className="text-[10px] px-2 py-0.5 h-auto font-medium"
                          >
                            {seq.is_active ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{seq.description || meta.desc}</p>

                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-mono">
                            <span className="text-muted-foreground/70">Prefix:</span>
                            <strong className="text-foreground">{seq.prefix}</strong>
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <span className="text-muted-foreground/70">Format:</span>
                            <span className="bg-muted px-1.5 py-0.5 rounded text-[11px] text-foreground">
                              {seq.format}
                            </span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="text-muted-foreground/70">Reset:</span>
                            <span className="capitalize font-medium text-foreground">
                              {seq.reset_frequency === "monthly"
                                ? "Bulanan"
                                : seq.reset_frequency === "yearly"
                                ? "Tahunan"
                                : "Berkelanjutan"}
                            </span>
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <span className="text-muted-foreground/70">Urutan Terakhir:</span>
                            <strong className="text-foreground">#{seq.current_counter}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Live Preview & Action */}
                    <div className="flex items-center justify-between lg:justify-end gap-5 border-t lg:border-t-0 pt-3 lg:pt-0 shrink-0">
                      <div className="flex flex-col items-start lg:items-end gap-1">
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                          Contoh Nomor Dokumen
                        </span>
                        <div className="font-mono text-sm font-bold px-3 py-1.5 rounded-lg bg-[color:var(--brand)]/10 text-[var(--brand)] border border-[color:var(--brand)]/20 shadow-xs">
                          {seq.preview || `${seq.prefix}-${seq.current_counter || 1}`}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(seq)}
                        className="gap-1.5 shrink-0"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Sesuaikan Format
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Format Modal */}
      {editingItem && (
        <Modal
          open={!!editingItem}
          onOpenChange={(open) => {
            if (!open) setEditingItem(null);
          }}
          title={`Konfigurasi Penomoran: ${DOCUMENT_TYPE_LABELS[editingItem.document_type]?.label || editingItem.document_type}`}
          description="Sesuaikan prefix, pola urutan tanggal, dan panjang digit penomoran resmi perusahaan Anda."
          size="lg"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingItem(null)}
                disabled={updateMutation.isPending}
              >
                Batal
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="gap-1.5"
              >
                {updateMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Simpan Konfigurasi
              </Button>
            </div>
          }
        >
          <form onSubmit={handleSave} className="space-y-5 py-1">
            {/* Real-time Dynamic Preview Card */}
            <div className="p-4 rounded-xl border border-[color:var(--brand)]/30 bg-[color:var(--brand)]/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--brand)] flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Pratinjau Hasil Penomoran (Live Output)
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {formData.counter_digits} digit padding
                </span>
              </div>
              <div className="font-mono text-xl font-bold text-foreground bg-background p-3 rounded-lg border border-border shadow-inner flex items-center justify-between">
                <span>{livePreview || "(Format kosong)"}</span>
                <Badge variant="outline" className="border-border text-xs font-normal">
                  Dokumen Berikutnya
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Prefix */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Prefix Dokumen <span className="text-destructive">*</span>
                </label>
                <Input
                  value={formData.prefix}
                  onChange={(e) => setFormData((prev) => ({ ...prev, prefix: e.target.value.toUpperCase() }))}
                  placeholder="Contoh: QT, SO, INV, PRAS-QT"
                  className="font-mono"
                  required
                />
                <p className="text-[11px] text-muted-foreground">Inisial penanda jenis dokumen atau singkatan unit bisnis.</p>
              </div>

              {/* Counter Digits */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Jumlah Digit Nomor Urut <span className="text-destructive">*</span>
                </label>
                <Select
                  value={String(formData.counter_digits)}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, counter_digits: parseInt(e.target.value) || 4 }))
                  }
                >
                  <option value="3">3 Digit (001 s/d 999)</option>
                  <option value="4">4 Digit (0001 s/d 9999) - Standar</option>
                  <option value="5">5 Digit (00001 s/d 99999)</option>
                  <option value="6">6 Digit (000001 s/d 999999)</option>
                </Select>
                <p className="text-[11px] text-muted-foreground">Panjang angka nol di depan nomor urut.</p>
              </div>
            </div>

            {/* Format Pattern */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Format Pola Penomoran <span className="text-destructive">*</span>
                </label>
                <span className="text-[11px] text-muted-foreground font-mono">Klik token untuk menyisipkan:</span>
              </div>
              <Input
                value={formData.format}
                onChange={(e) => setFormData((prev) => ({ ...prev, format: e.target.value }))}
                placeholder="{PREFIX}-{YYYY}{MM}-{COUNTER}"
                className="font-mono text-sm"
                required
              />

              {/* Quick Token Inject Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {["{PREFIX}", "{YYYY}", "{YY}", "{MM}", "{DD}", "{COUNTER}"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => insertToken(t)}
                    className="text-[11px] font-mono px-2 py-0.5 rounded border border-border bg-muted hover:bg-muted/80 text-foreground transition-colors"
                  >
                    +{t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Reset Frequency */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Siklus Reset Nomor Urut <span className="text-destructive">*</span>
                </label>
                <Select
                  value={formData.reset_frequency}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      reset_frequency: e.target.value as "monthly" | "yearly" | "never",
                    }))
                  }
                >
                  <option value="monthly">Bulanan (Mulai dari 1 setiap awal bulan)</option>
                  <option value="yearly">Tahunan (Mulai dari 1 setiap awal tahun)</option>
                  <option value="never">Berkelanjutan (Tidak pernah reset)</option>
                </Select>
                <p className="text-[11px] text-muted-foreground">Kapan nomor urut dikembalikan ke 1.</p>
              </div>

              {/* Current Counter / Starting Value */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Nilai Counter Saat Ini / Awal
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.current_counter}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, current_counter: parseInt(e.target.value) || 0 }))
                  }
                  className="font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  Nomor dokumen berikutnya akan menjadi #{formData.current_counter + 1}.
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Deskripsi / Catatan Internal</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Catatan standar penomoran dokumen ini..."
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
