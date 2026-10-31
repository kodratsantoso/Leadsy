"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Hash, Plus, RefreshCw, ShieldCheck, AlertCircle, CheckCircle2, 
  Layers, Database, Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/loading";
import {
  TableShell,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  TableEmpty,
  TableLoading,
} from "@/components/ui/table";
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
      setErrorMsg(err.message || "Gagal menyimpan alokasi NSFP.");
    } finally {
      setSaving(false);
    }
  };

  const usagePercent = totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0;

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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Jatah DJP</span>
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Database className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight">{totalAllocated}</div>
            <div className="text-xs text-muted-foreground">Total jatah nomor faktur pajak yang terdaftar</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nomor Terpakai</span>
              <div className="p-2 rounded-xl bg-[color:var(--brand)]/10 text-[var(--brand)]">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight text-[var(--brand)]">{totalUsed}</div>
            <div className="text-xs text-muted-foreground">{usagePercent}% kuota telah ditempelkan ke faktur komersial</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sisa Nomor Aktif</span>
              <div className="p-2 rounded-xl bg-[var(--status-success-soft)] text-[var(--status-success)]">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold tracking-tight text-[var(--status-success)]">{remaining}</div>
            <div className="text-xs text-muted-foreground">
              {remaining < 20 ? (
                <span className="text-[var(--status-danger)] font-semibold">Peringatan: Jatah NSFP hampir habis!</span>
              ) : (
                "Kapasitas NSFP aman untuk penagihan berjalan"
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Meter Card */}
      <Card>
        <CardContent className="p-5 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-foreground">Pemakaian Kuota NSFP Kumulatif</span>
            <span className="font-mono text-muted-foreground">{totalUsed} / {totalAllocated} Nomor ({usagePercent}%)</span>
          </div>
          <div className="w-full h-3 rounded-full bg-[color:var(--surface-subtle)] overflow-hidden p-0.5 border border-border">
            <div 
              className="h-full rounded-full bg-[color:var(--brand)] transition-all duration-500" 
              style={{ width: `${Math.min(100, Math.max(2, usagePercent))}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base font-bold tracking-tight text-foreground">Rentang Alokasi Surat DJP e-Nofa</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Setiap nomor seri diambil secara berurutan (*atomic sequence*) saat sistem menerbitkan faktur pajak otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="bg-[color:var(--brand)] hover:opacity-90 text-white text-xs shadow-sm font-semibold"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Input Jatah NSFP Baru
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

      {/* Pools Table */}
      <TableShell>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Tahun Pajak</TableHeaderCell>
              <TableHeaderCell>Kode Transaksi & Prefix</TableHeaderCell>
              <TableHeaderCell>Rentang Nomor (Awal - Akhir)</TableHeaderCell>
              <TableHeaderCell>Nomor Berjalan (Next)</TableHeaderCell>
              <TableHeaderCell className="text-center">Terpakai / Total</TableHeaderCell>
              <TableHeaderCell className="text-center">Status</TableHeaderCell>
              <TableHeaderCell>Catatan / No. Surat DJP</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && pools.length === 0 ? (
              <TableLoading colSpan={7} label="Memuat data alokasi NSFP..." />
            ) : pools.length === 0 ? (
              <TableEmpty colSpan={7}>
                <div className="flex flex-col items-center justify-center text-center">
                  <Hash className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="font-semibold text-foreground">Belum ada alokasi NSFP</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Silakan input jatah nomor dari surat keputusan pemberian NSFP DJP e-Nofa.
                  </p>
                </div>
              </TableEmpty>
            ) : (
              pools.map((p) => {
                const isExhausted = p.current_number > p.end_number;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-bold text-foreground">{p.tax_year}</TableCell>
                    <TableCell className="font-mono text-[color:var(--brand)] font-semibold">{p.prefix}</TableCell>
                    <TableCell className="font-mono text-foreground">
                      {p.prefix}{String(p.start_number).padStart(8, "0")} <span className="text-muted-foreground">s/d</span> {p.prefix}{String(p.end_number).padStart(8, "0")}
                    </TableCell>
                    <TableCell className="font-mono text-foreground font-semibold">
                      {p.prefix}{String(p.current_number).padStart(8, "0")}
                    </TableCell>
                    <TableCell className="text-center font-bold font-mono">
                      {p.total_used} / {p.total_allocated}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={p.is_active && !isExhausted ? "success" : "neutral"} 
                        className="uppercase text-[10px]"
                      >
                        {p.is_active && !isExhausted ? "Aktif" : "Habis"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.notes || "-"}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableShell>

      {/* Add Pool Modal */}
      {showAddModal && (
        <Modal
          open={showAddModal}
          onOpenChange={(open: boolean) => setShowAddModal(open)}
          title="Input Alokasi Nomor Seri Faktur Pajak (NSFP) DJP"
          size="xl"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>Batal</Button>
              <Button size="sm" onClick={handleAddPool} disabled={saving}>
                {saving ? <Spinner size="xs" className="mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                Simpan Alokasi NSFP
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-[color:var(--brand)]/10 text-[var(--brand)] border border-[color:var(--brand)]/20 leading-relaxed">
              Masukkan rentang nomor sesuai surat konfirmasi resmi pemberian Nomor Seri Faktur Pajak dari DJP Online (e-Nofa).
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Tahun Pajak</label>
                <Select
                  value={form.tax_year}
                  onChange={(e) => setForm({ ...form, tax_year: e.target.value })}
                  className="h-8 text-xs"
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                </Select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Prefix Kode & Tahun</label>
                <Input
                  value={form.prefix}
                  onChange={(e) => setForm({ ...form, prefix: e.target.value })}
                  placeholder="010.001-26."
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Nomor Awal (8 Digit)</label>
                <Input
                  type="number"
                  value={form.start_number}
                  onChange={(e) => setForm({ ...form, start_number: e.target.value })}
                  placeholder="00000001"
                  className="h-8 text-xs font-mono"
                />
                <span className="text-[10px] text-muted-foreground">Contoh: 1 (untuk 00000001)</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Nomor Akhir (8 Digit)</label>
                <Input
                  type="number"
                  value={form.end_number}
                  onChange={(e) => setForm({ ...form, end_number: e.target.value })}
                  placeholder="00000100"
                  className="h-8 text-xs font-mono"
                />
                <span className="text-[10px] text-muted-foreground">Contoh: 100 (untuk 00000100)</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Nomor Surat / Referensi DJP</label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Contoh: S-1234/WPJ.04/KP.0103/2026"
                className="h-8 text-xs"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
