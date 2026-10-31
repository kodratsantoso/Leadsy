"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Hash, Plus, RefreshCw, ShieldCheck, AlertCircle, CheckCircle2, 
  Layers, Database, Sparkles, Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { apiFetch } from "@/lib/apiFetch";

interface NsfpPoolItem {
  id: number;
  tax_year: string;
  prefix: string;
  start_number: number;
  end_number: number;
  current_number: number;
  total_allocated: number;
  total_used: number;
  is_active: boolean;
  notes?: string;
}

export function NsfpPoolView() {
  const [pools, setPools] = useState<NsfpPoolItem[]>([]);
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [totalUsed, setTotalUsed] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(true);

  // Add Pool Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tax_year: "2026",
    prefix: "010.001-26.",
    start_number: "",
    end_number: "",
    notes: "",
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/finance/nsfp-pool");
      const json = await res.json();
      if (json?.data) {
        setTotalAllocated(json.data.total_allocated || 0);
        setTotalUsed(json.data.total_used || 0);
        setRemaining(json.data.remaining || 0);
        setPools(json.data.pools || []);
      }
    } catch (err: any) {
      console.error("Failed to load NSFP pools:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddPool = async () => {
    if (!form.start_number || !form.end_number) {
      setErrorMsg("Nomor awal dan nomor akhir NSFP wajib diisi.");
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch("/finance/nsfp-pool", {
        method: "POST",
        body: JSON.stringify({
          tax_year: form.tax_year,
          prefix: form.prefix,
          start_number: parseInt(form.start_number, 10),
          end_number: parseInt(form.end_number, 10),
          notes: form.notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Gagal menambahkan rentang NSFP.");
      }

      setSuccessMsg(json.message || "Alokasi nomor NSFP berhasil ditambahkan.");
      setShowAddModal(false);
      setForm({
        tax_year: "2026",
        prefix: "010.001-26.",
        start_number: "",
        end_number: "",
        notes: "",
      });
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menambahkan rentang NSFP.");
    } finally {
      setSaving(false);
    }
  };

  const usagePercent = totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Banner info / Success */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-[var(--status-success-soft)] text-[var(--status-success)] border border-[color:var(--status-success)]/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-xs underline">Tutup</button>
        </div>
      )}

      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Pool Nomor Seri Faktur Pajak (NSFP)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manajemen alokasi jatah nomor faktur dari DJP e-Nofa. Sistem otomatis menempelkan nomor sequential ke Faktur Pajak baru.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs shadow-sm font-semibold"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Tambah Rentang NSFP (e-Nofa)
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

      {/* Quota Progress Bar Card */}
      <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status Kuota NSFP Global</div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {remaining} <span className="text-sm font-normal text-muted-foreground">Nomor Tersedia ({100 - usagePercent}%)</span>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>Total Alokasi: <strong className="text-foreground">{totalAllocated}</strong></div>
            <div>Telah Digunakan: <strong className="text-blue-600">{totalUsed}</strong></div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              usagePercent > 85 ? "bg-[var(--status-danger)]" : usagePercent > 65 ? "bg-[var(--status-warning)]" : "bg-blue-600"
            }`}
            style={{ width: `${Math.min(100, Math.max(2, usagePercent))}%` }}
          />
        </div>

        {remaining < 15 && totalAllocated > 0 && (
          <div className="p-3 bg-[var(--status-warning-soft)] text-[var(--status-warning)] text-xs rounded-xl flex items-center gap-2 border border-[color:var(--status-warning)]/30">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Peringatan Kuota: Jatah nomor NSFP tersisa tinggal {remaining}. Segera ajukan permohonan NSFP baru ke e-Nofa DJP.</span>
          </div>
        )}
      </div>

      {/* Batches Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                <th className="p-3.5">Tahun Pajak</th>
                <th className="p-3.5">Prefix Format</th>
                <th className="p-3.5">Rentang Nomor Awal s/d Akhir</th>
                <th className="p-3.5">Posisi Terakhir Digunakan</th>
                <th className="p-3.5 text-center">Terpakai / Total</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5">Catatan / Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && pools.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    Memuat daftar pool NSFP...
                  </td>
                </tr>
              ) : pools.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground">
                    <Hash className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Belum ada rentang NSFP yang dimasukkan. Silakan klik &ldquo;Tambah Rentang NSFP&rdquo;.
                  </td>
                </tr>
              ) : (
                pools.map((p) => {
                  const isExhausted = p.current_number > p.end_number || !p.is_active;
                  return (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3.5 font-bold text-foreground">{p.tax_year}</td>
                      <td className="p-3.5 font-mono text-blue-600 font-semibold">{p.prefix}</td>
                      <td className="p-3.5 font-mono text-foreground">
                        {p.prefix}{String(p.start_number).padStart(8, "0")} <span className="text-muted-foreground">s/d</span> {p.prefix}{String(p.end_number).padStart(8, "0")}
                      </td>
                      <td className="p-3.5 font-mono text-foreground font-semibold">
                        {p.prefix}{String(p.current_number).padStart(8, "0")}
                      </td>
                      <td className="p-3.5 text-center font-bold">
                        {p.total_used} / {p.total_allocated}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          p.is_active && !isExhausted 
                            ? "bg-emerald-500/10 text-emerald-700" 
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {p.is_active && !isExhausted ? "Aktif" : "Habis"}
                        </span>
                      </td>
                      <td className="p-3.5 text-muted-foreground">{p.notes || "-"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Pool Modal */}
      {showAddModal && (
        <Modal
          open={showAddModal}
          onOpenChange={(open: boolean) => !open && setShowAddModal(false)}
          title="Tambah Alokasi Nomor Seri Faktur Pajak (NSFP)"
          description="Masukkan rentang nomor seri yang diberikan oleh DJP melalui surat persetujuan e-Nofa."
          size="lg"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>Batal</Button>
              <Button onClick={handleAddPool} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Simpan Alokasi NSFP
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
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Tahun Pajak</label>
                <Input
                  value={form.tax_year}
                  onChange={(e) => setForm({ ...form, tax_year: e.target.value })}
                  placeholder="2026"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Format Prefix (Kode Cabang + Tahun)</label>
                <Input
                  value={form.prefix}
                  onChange={(e) => setForm({ ...form, prefix: e.target.value })}
                  placeholder="010.001-26."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Nomor Awal (8 Digit)</label>
                <Input
                  type="number"
                  value={form.start_number}
                  onChange={(e) => setForm({ ...form, start_number: e.target.value })}
                  placeholder="10000001"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Nomor Akhir (8 Digit)</label>
                <Input
                  type="number"
                  value={form.end_number}
                  onChange={(e) => setForm({ ...form, end_number: e.target.value })}
                  placeholder="10000100"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Catatan / Surat e-Nofa</label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Contoh: Permohonan NSFP Surat KPP No. S-123/WPJ.04/KP.01/2026"
                />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
