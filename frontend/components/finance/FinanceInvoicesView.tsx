"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Receipt, Search, Filter, RefreshCw, FileText, Download, 
  ExternalLink, CheckCircle2, AlertCircle, Clock, Calendar, 
  Building2, ArrowUpRight, Play, ShieldCheck, Send, Loader2, Sparkles, Hash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { apiFetch } from "@/lib/apiFetch";

interface InvoiceItem {
  id: number;
  invoice_number: string;
  milestone_name: string;
  milestone_percentage: number;
  subtotal: number;
  tax_percentage: number;
  tax_amount: number;
  withholding_tax_amount: number;
  total_amount: number;
  paid_amount: number;
  status: string;
  invoice_date: string;
  due_date: string;
  payment_terms: string;
  nsfp_number?: string;
  pdf_path?: string;
  faktur_pajak?: {
    id: number;
    nsfp_number: string;
    pdf_path?: string;
  };
  lead?: {
    id: number;
    company_name: string;
  };
  sales_order?: {
    id: number;
    sales_order_number: string;
  };
}

interface OverviewData {
  total_invoices_count: number;
  total_invoiced_amount: number;
  total_paid_amount: number;
  total_outstanding_amount: number;
  overdue_invoices_count: number;
  pending_schedules_due_count: number;
  nsfp_summary: {
    total_allocated: number;
    total_used: number;
    remaining: number;
  };
}

export function FinanceInvoicesView() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [runningScheduler, setRunningScheduler] = useState(false);
  const [schedulerOutput, setSchedulerOutput] = useState<string | null>(null);

  // PDF Preview Modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [loadingPdf, setLoadingPdf] = useState(false);

  // Generate Faktur Pajak State
  const [generatingFakturId, setGeneratingFakturId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, invRes] = await Promise.all([
        apiFetch("/finance/overview").then(r => r.json()),
        apiFetch(`/finance/invoices?status=${statusFilter}&search=${encodeURIComponent(search)}`).then(r => r.json()),
      ]);

      if (ovRes?.data) setOverview(ovRes.data);
      if (invRes?.data?.data) {
        setInvoices(invRes.data.data);
      } else if (Array.isArray(invRes?.data)) {
        setInvoices(invRes.data);
      }
    } catch (err: any) {
      console.error("Failed to load finance data:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRunScheduler = async () => {
    setRunningScheduler(true);
    setSchedulerOutput(null);
    try {
      const res = await apiFetch("/finance/run-scheduler", { method: "POST" });
      const json = await res.json();
      setActionMessage({ type: "success", text: json?.message || "Billing Scheduler berhasil dijalankan." });
      setSchedulerOutput(json?.output || null);
      loadData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Gagal menjalankan scheduler." });
    } finally {
      setRunningScheduler(false);
    }
  };

  const handleGenerateFaktur = async (invoiceId: number) => {
    setGeneratingFakturId(invoiceId);
    setActionMessage(null);
    try {
      const res = await apiFetch(`/finance/invoices/${invoiceId}/generate-faktur`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Gagal menerbitkan Faktur Pajak.");
      }
      setActionMessage({ type: "success", text: json.message || "Faktur Pajak berhasil diterbitkan!" });
      loadData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Gagal menerbitkan Faktur Pajak." });
    } finally {
      setGeneratingFakturId(null);
    }
  };

  const handlePreviewPdf = async (invoice: InvoiceItem) => {
    setLoadingPdf(true);
    setPreviewTitle(`Invoice #${invoice.invoice_number}`);
    setPreviewModalOpen(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`/api/finance/invoices/${invoice.id}/preview-pdf`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          Accept: "application/pdf",
        },
      });
      if (!res.ok) throw new Error("Gagal memuat PDF invoice");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      setPreviewUrl(blobUrl);
    } catch (err: any) {
      console.error(err);
      setActionMessage({ type: "error", text: err.message || "Gagal preview PDF." });
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {actionMessage && (
        <div className={`p-4 rounded-xl flex items-center justify-between border ${
          actionMessage.type === "success" 
            ? "bg-[var(--status-success-soft)] text-[var(--status-success)] border-[color:var(--status-success)]/30"
            : "bg-[var(--status-danger-soft)] text-[var(--status-danger)] border-[color:var(--status-danger)]/30"
        }`}>
          <div className="flex items-center gap-2 text-sm font-medium">
            {actionMessage.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-xs underline hover:opacity-80">Tutup</button>
        </div>
      )}

      {/* Scheduler Output Modal / Toast info */}
      {schedulerOutput && (
        <div className="p-4 rounded-xl bg-card border border-border text-xs font-mono space-y-1">
          <div className="font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-[var(--brand)]" />
            <span>Hasil Eksekusi Billing Scheduler Automation:</span>
          </div>
          <pre className="text-muted-foreground whitespace-pre-wrap">{schedulerOutput}</pre>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoiced */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Ditagihkan</span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight">
            {overview ? formatCurrency(overview.total_invoiced_amount) : "..."}
          </div>
          <div className="text-xs text-muted-foreground">
            Dari total <strong className="text-foreground">{overview?.total_invoices_count || 0}</strong> faktur komersial
          </div>
        </div>

        {/* Total Collected */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Terbayar</span>
            <div className="p-2 rounded-xl bg-[var(--status-success-soft)] text-[var(--status-success)]">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-[var(--status-success)]">
            {overview ? formatCurrency(overview.total_paid_amount) : "..."}
          </div>
          <div className="text-xs text-muted-foreground">
            Kas masuk yang telah terverifikasi lunas
          </div>
        </div>

        {/* Outstanding Piutang */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sisa Piutang (AR)</span>
            <div className="p-2 rounded-xl bg-[var(--status-warning-soft)] text-[var(--status-warning)]">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-[var(--status-warning)]">
            {overview ? formatCurrency(overview.total_outstanding_amount) : "..."}
          </div>
          <div className="text-xs text-muted-foreground">
            {overview?.overdue_invoices_count ? (
              <span className="text-[var(--status-danger)] font-semibold">{overview.overdue_invoices_count} faktur telah melewati jatuh tempo</span>
            ) : (
              "Semua tagihan masih dalam periode termin aman"
            )}
          </div>
        </div>

        {/* NSFP Quota Remaining */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kuota NSFP DJP</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-blue-600">
            {overview?.nsfp_summary ? `${overview.nsfp_summary.remaining} Nomor` : "..."}
          </div>
          <div className="text-xs text-muted-foreground">
            Terpakai {overview?.nsfp_summary?.total_used || 0} dari {overview?.nsfp_summary?.total_allocated || 0} alokasi e-Nofa
          </div>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Status filter pills */}
          {(["all", "draft", "sent", "paid", "partially_paid"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors capitalize ${
                statusFilter === status 
                  ? "bg-[var(--brand)] text-white shadow-sm" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {status === "all" ? "Semua Faktur" : status.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari No. Faktur / Customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRunScheduler}
            disabled={runningScheduler}
            className="text-xs whitespace-nowrap border-[color:var(--brand)]/30 text-[var(--brand)] hover:bg-[color:var(--brand)]/10"
            title="Scan jadwal termin yang jatuh tempo hari ini dan generate faktur otomatis"
          >
            {runningScheduler ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
            Jalankan Scheduler
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-9 px-2.5 text-muted-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                <th className="p-3.5">No. Faktur</th>
                <th className="p-3.5">Pelanggan & SO</th>
                <th className="p-3.5">Termin / Milestone</th>
                <th className="p-3.5">Tanggal & Jatuh Tempo</th>
                <th className="p-3.5 text-right">Nilai Tagihan</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5">Faktur Pajak (DJP)</th>
                <th className="p-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    Memuat data tagihan komersial...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground">
                    <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Belum ada faktur komersial yang diterbitkan.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const isOverdue = inv.status !== "paid" && new Date(inv.due_date) < new Date();
                  return (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3.5 font-bold font-mono text-foreground whitespace-nowrap">
                        <button 
                          onClick={() => handlePreviewPdf(inv)}
                          className="hover:underline text-[var(--brand)] flex items-center gap-1"
                        >
                          {inv.invoice_number}
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </button>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-foreground">{inv.lead?.company_name || "-"}</div>
                        {inv.sales_order && (
                          <div className="text-[11px] text-muted-foreground font-mono">
                            SO: #{inv.sales_order.sales_order_number}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-foreground">{inv.milestone_name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Porsi: {inv.milestone_percentage}% | {inv.payment_terms}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="text-foreground">{inv.invoice_date}</div>
                        <div className={`text-[11px] font-medium ${isOverdue ? "text-[var(--status-danger)]" : "text-muted-foreground"}`}>
                          Due: {inv.due_date} {isOverdue && "(Lewat)"}
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-bold font-mono">
                        <div>{formatCurrency(inv.total_amount)}</div>
                        <div className="text-[10px] text-muted-foreground font-normal">
                          DPP: {formatCurrency(inv.subtotal)}
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          inv.status === "paid" 
                            ? "bg-[var(--status-success-soft)] text-[var(--status-success)]"
                            : inv.status === "sent"
                            ? "bg-blue-500/10 text-blue-600"
                            : isOverdue
                            ? "bg-[var(--status-danger-soft)] text-[var(--status-danger)]"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {isOverdue ? "Overdue" : inv.status}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {inv.faktur_pajak?.nsfp_number || inv.nsfp_number ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 font-mono text-[11px] font-semibold">
                            <ShieldCheck className="h-3 w-3 text-blue-600" />
                            {inv.faktur_pajak?.nsfp_number || inv.nsfp_number}
                          </div>
                        ) : (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleGenerateFaktur(inv.id)}
                            disabled={generatingFakturId === inv.id}
                            className="text-[11px] h-6 border-blue-500/30 text-blue-600 hover:bg-blue-50"
                          >
                            {generatingFakturId === inv.id ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <ShieldCheck className="h-3 w-3 mr-1" />
                            )}
                            Terbitkan Faktur
                          </Button>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => handlePreviewPdf(inv)}
                            className="h-7 text-xs text-muted-foreground hover:text-foreground"
                            title="Preview Faktur PDF"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PDF Preview Modal */}
      {previewModalOpen && (
        <Modal
          open={previewModalOpen}
          onOpenChange={(open: boolean) => {
            if (!open) {
              setPreviewModalOpen(false);
              if (previewUrl) URL.revokeObjectURL(previewUrl);
              setPreviewUrl(null);
            }
          }}
          title={previewTitle}
          size="5xl"
          footer={
            <div className="flex justify-between w-full items-center">
              <span className="text-xs text-muted-foreground">Dokumen Faktur Komersial Standar Indonesia (PPN 11% + PPh 23)</span>
              <div className="flex gap-2">
                {previewUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = previewUrl;
                      a.download = `${previewTitle}.pdf`;
                      a.click();
                    }}
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Unduh PDF
                  </Button>
                )}
                <Button size="sm" onClick={() => setPreviewModalOpen(false)}>Tutup</Button>
              </div>
            </div>
          }
        >
          <div className="w-full h-[70vh] rounded-lg overflow-hidden border border-border bg-muted/20 flex items-center justify-center">
            {loadingPdf ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-xs">Menyiapkan pratinjau dokumen PDF...</span>
              </div>
            ) : previewUrl ? (
              <iframe src={previewUrl} className="w-full h-full border-0" title="PDF Preview" />
            ) : (
              <span className="text-xs text-muted-foreground">Gagal memuat pratinjau PDF.</span>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
