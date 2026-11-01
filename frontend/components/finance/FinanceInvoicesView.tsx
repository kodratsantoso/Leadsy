"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Receipt, Search, RefreshCw, FileText, Download, 
  CheckCircle2, AlertCircle, Clock, 
  Building2, ArrowUpRight, Play, ShieldCheck, Sparkles,
  Mail, CreditCard, Send, Check
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { FilterBar, FilterBarSearch } from "@/components/ui/filter-bar";
import { Modal } from "@/components/ui/modal";
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

  // Payment Recording State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<InvoiceItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Email Dispatch State
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedInvoiceForEmail, setSelectedInvoiceForEmail] = useState<InvoiceItem | null>(null);
  const [emailRecipient, setEmailRecipient] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState<string>("");
  const [emailMessage, setEmailMessage] = useState<string>("");
  const [sendingEmail, setSendingEmail] = useState(false);

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

  const handlePreviewFakturPajakPdf = async (fakturId: number, nsfp: string) => {
    setLoadingPdf(true);
    setPreviewTitle(`Faktur Pajak #${nsfp}`);
    setPreviewModalOpen(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`/api/finance/faktur-pajak/${fakturId}/preview-pdf`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          Accept: "application/pdf",
        },
      });
      if (!res.ok) throw new Error("Gagal memuat PDF Faktur Pajak");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      setPreviewUrl(blobUrl);
    } catch (err: any) {
      console.error(err);
      setActionMessage({ type: "error", text: err.message || "Gagal preview Faktur Pajak PDF." });
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleOpenPaymentModal = (invoice: InvoiceItem) => {
    setSelectedInvoiceForPayment(invoice);
    const unpaid = Math.max(0, invoice.total_amount - (invoice.paid_amount || 0));
    setPaymentAmount(unpaid);
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentNotes("");
    setPaymentModalOpen(true);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPayment) return;
    setRecordingPayment(true);
    try {
      const res = await apiFetch(`/finance/invoices/${selectedInvoiceForPayment.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: paymentAmount,
          paid_at: paymentDate,
          notes: paymentNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal mencatat pembayaran.");
      setActionMessage({ type: "success", text: json.message || "Pembayaran berhasil diverifikasi." });
      setPaymentModalOpen(false);
      loadData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Gagal mencatat pembayaran." });
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleOpenEmailModal = (invoice: InvoiceItem) => {
    setSelectedInvoiceForEmail(invoice);
    setEmailRecipient("");
    setEmailSubject(`Faktur Penagihan #${invoice.invoice_number} - Leadsy Enterprise`);
    setEmailMessage(
      `Yth. Tim Finance & Pengadaan,\n\nTerlampir kami sampaikan Faktur Penagihan resmi #${invoice.invoice_number} senilai ${formatCurrency(invoice.total_amount)} atas layanan/produk kami.\n\nMohon lakukan transfer ke rekening bank resmi yang tercantum pada faktur sebelum tanggal jatuh tempo ${invoice.due_date}.\n\nTerima kasih atas kerja samanya.\n\nSalam hormat,\nFinance Team`
    );
    setEmailModalOpen(true);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForEmail) return;
    setSendingEmail(true);
    try {
      const res = await apiFetch(`/finance/invoices/${selectedInvoiceForEmail.id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_email: emailRecipient,
          subject: emailSubject,
          message: emailMessage,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal mengirim email faktur.");
      setActionMessage({ type: "success", text: json.message || "Email faktur berhasil dikirim!" });
      setEmailModalOpen(false);
      loadData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Gagal mengirim email faktur." });
    } finally {
      setSendingEmail(false);
    }
  };

  const getStatusBadge = (status: string, isOverdue: boolean) => {
    if (status === "paid") {
      return <Badge variant="success">Lunas</Badge>;
    }
    if (status === "sent") {
      return <Badge variant="info">Terkirim</Badge>;
    }
    if (isOverdue) {
      return <Badge variant="danger">Overdue</Badge>;
    }
    return <Badge variant="neutral">{status}</Badge>;
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
        <Card className="p-4 bg-card text-xs font-mono space-y-1">
          <div className="font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-[var(--brand)]" />
            <span>Hasil Eksekusi Billing Scheduler Automation:</span>
          </div>
          <pre className="text-muted-foreground whitespace-pre-wrap">{schedulerOutput}</pre>
        </Card>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoiced */}
        <Card>
          <CardContent className="p-5 space-y-2">
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
          </CardContent>
        </Card>

        {/* Total Collected */}
        <Card>
          <CardContent className="p-5 space-y-2">
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
          </CardContent>
        </Card>

        {/* Outstanding Piutang */}
        <Card>
          <CardContent className="p-5 space-y-2">
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
          </CardContent>
        </Card>

        {/* NSFP Pool Status */}
        <Card>
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sisa Kuota NSFP</span>
              <div className="p-2 rounded-xl bg-[color:var(--brand)]/10 text-[var(--brand)]">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight text-[var(--brand)]">
              {overview?.nsfp_summary ? overview.nsfp_summary.remaining : "..."}
            </div>
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              <span>Terpakai: {overview?.nsfp_summary?.total_used || 0}</span>
              <span>Alokasi: {overview?.nsfp_summary?.total_allocated || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Action Bar */}
      <FilterBar className="justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {["all", "draft", "sent", "paid", "overdue"].map((status) => (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={statusFilter === status ? "default" : "outline"}
              onClick={() => setStatusFilter(status)}
              className="text-xs capitalize font-medium"
            >
              {status === "all" ? "Semua Faktur" : status.replace("_", " ")}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <FilterBarSearch
            placeholder="Cari No. Faktur / Customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:w-64"
          />

          <Button
            variant="outline"
            size="sm"
            onClick={handleRunScheduler}
            disabled={runningScheduler}
            className="text-xs whitespace-nowrap border-[color:var(--brand)]/30 text-[var(--brand)] hover:bg-[color:var(--brand)]/10"
            title="Scan jadwal termin yang jatuh tempo hari ini dan generate faktur otomatis"
          >
            {runningScheduler ? <Spinner size="xs" className="mr-1.5" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
            Jalankan Scheduler
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-8 px-2.5 text-muted-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </FilterBar>

      {/* Invoices Table */}
      <TableShell>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>No. Faktur</TableHeaderCell>
              <TableHeaderCell>Pelanggan & SO</TableHeaderCell>
              <TableHeaderCell>Termin / Milestone</TableHeaderCell>
              <TableHeaderCell>Tanggal & Jatuh Tempo</TableHeaderCell>
              <TableHeaderCell className="text-right">Nilai Tagihan</TableHeaderCell>
              <TableHeaderCell className="text-center">Status</TableHeaderCell>
              <TableHeaderCell>Faktur Pajak (DJP)</TableHeaderCell>
              <TableHeaderCell className="text-right">Aksi</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && invoices.length === 0 ? (
              <TableLoading colSpan={8} label="Memuat data tagihan komersial..." />
            ) : invoices.length === 0 ? (
              <TableEmpty colSpan={8}>
                <div className="flex flex-col items-center justify-center text-center">
                  <Receipt className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="font-semibold text-foreground">Belum ada faktur komersial</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Faktur akan terbit otomatis melalui billing scheduler atau konfirmasi BAST.
                  </p>
                </div>
              </TableEmpty>
            ) : (
              invoices.map((inv) => {
                const isOverdue = inv.status !== "paid" && new Date(inv.due_date) < new Date();
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-bold font-mono text-[color:var(--brand)]">
                      <button 
                        onClick={() => handlePreviewPdf(inv)}
                        className="hover:underline flex items-center gap-1.5"
                      >
                        <Receipt className="h-3.5 w-3.5 shrink-0" />
                        {inv.invoice_number}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                        {inv.lead?.company_name || "-"}
                      </div>
                      {inv.sales_order && (
                        <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                          SO: {inv.sales_order.sales_order_number}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{inv.milestone_name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Porsi: {inv.milestone_percentage}% | {inv.payment_terms}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-foreground">{inv.invoice_date}</div>
                      <div className={`text-[11px] font-medium ${isOverdue ? "text-[var(--status-danger)]" : "text-muted-foreground"}`}>
                        Due: {inv.due_date} {isOverdue && "(Lewat)"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold font-mono">
                      <div>{formatCurrency(inv.total_amount)}</div>
                      <div className="text-[10px] text-muted-foreground font-normal">
                        DPP: {formatCurrency(inv.subtotal)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(inv.status, isOverdue)}
                    </TableCell>
                    <TableCell>
                      {inv.faktur_pajak?.nsfp_number || inv.nsfp_number ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              handlePreviewFakturPajakPdf(
                                inv.faktur_pajak?.id || 0,
                                inv.faktur_pajak?.nsfp_number || inv.nsfp_number || ""
                              )
                            }
                            className="inline-flex items-center hover:opacity-80 transition"
                            title="Klik untuk Pratinjau Faktur Pajak PDF"
                          >
                            <Badge variant="info" className="font-mono text-[11px] cursor-pointer">
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              {inv.faktur_pajak?.nsfp_number || inv.nsfp_number}
                            </Badge>
                          </button>
                        </div>
                      ) : (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleGenerateFaktur(inv.id)}
                          disabled={generatingFakturId === inv.id}
                          className="text-[11px] h-6 border-[color:var(--brand)]/30 text-[var(--brand)] hover:bg-[color:var(--brand)]/10"
                        >
                          {generatingFakturId === inv.id ? (
                            <Spinner size="xs" className="mr-1" />
                          ) : (
                            <ShieldCheck className="h-3 w-3 mr-1" />
                          )}
                          Terbitkan Faktur
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.status !== "paid" && (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleOpenPaymentModal(inv)}
                            className="h-7 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 font-medium"
                            title="Verifikasi & Catat Pembayaran Klien"
                          >
                            <CreditCard className="h-3.5 w-3.5 mr-1" />
                            Catat Bayar
                          </Button>
                        )}
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => handleOpenEmailModal(inv)}
                          className="h-7 text-xs text-muted-foreground hover:text-foreground"
                          title="Kirim Faktur via Email ke Customer"
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </Button>
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
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableShell>

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
          <div className="w-full h-[70vh] rounded-xl overflow-hidden border border-border bg-muted/20 flex items-center justify-center">
            {loadingPdf ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Spinner size="lg" />
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

      {/* Record Payment Modal */}
      {paymentModalOpen && selectedInvoiceForPayment && (
        <Modal
          open={paymentModalOpen}
          onOpenChange={(open: boolean) => {
            if (!open) setPaymentModalOpen(false);
          }}
          title={`Verifikasi & Catat Pembayaran: #${selectedInvoiceForPayment.invoice_number}`}
          description={`Klien: ${selectedInvoiceForPayment.lead?.company_name || "-"} | Total Tagihan: ${formatCurrency(selectedInvoiceForPayment.total_amount)}`}
          size="md"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" size="sm" onClick={() => setPaymentModalOpen(false)} disabled={recordingPayment}>
                Batal
              </Button>
              <Button variant="default" size="sm" onClick={handleSubmitPayment} disabled={recordingPayment} className="gap-1.5">
                {recordingPayment ? <Spinner size="xs" /> : <Check className="h-4 w-4" />}
                Verifikasi & Terima Pelunasan
              </Button>
            </div>
          }
        >
          <form onSubmit={handleSubmitPayment} className="space-y-4 py-2">
            <div className="p-3 bg-muted/30 rounded-xl border border-border text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Tagihan:</span>
                <span className="font-bold">{formatCurrency(selectedInvoiceForPayment.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sudah Dibayar:</span>
                <span className="text-emerald-600 font-semibold">{formatCurrency(selectedInvoiceForPayment.paid_amount || 0)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1">
                <span className="font-semibold">Sisa Tagihan (AR):</span>
                <span className="font-bold text-foreground">
                  {formatCurrency(Math.max(0, selectedInvoiceForPayment.total_amount - (selectedInvoiceForPayment.paid_amount || 0)))}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Jumlah Pembayaran Diterima (Rp) *</label>
              <Input
                type="number"
                min="1"
                max={selectedInvoiceForPayment.total_amount}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Tanggal Dana Diterima *</label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Catatan Mutasi Bank / Rekening Tujuan</label>
              <Input
                placeholder="Contoh: Transfer BCA Rek. 122-001 atas nama PT Virtuenet"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Send Invoice Email Modal */}
      {emailModalOpen && selectedInvoiceForEmail && (
        <Modal
          open={emailModalOpen}
          onOpenChange={(open: boolean) => {
            if (!open) setEmailModalOpen(false);
          }}
          title={`Kirim Faktur via Email: #${selectedInvoiceForEmail.invoice_number}`}
          description={`Kirim file PDF faktur resmi dan rincian rekening pembayaran langsung ke email customer.`}
          size="lg"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" size="sm" onClick={() => setEmailModalOpen(false)} disabled={sendingEmail}>
                Batal
              </Button>
              <Button variant="default" size="sm" onClick={handleSendEmail} disabled={sendingEmail} className="gap-1.5">
                {sendingEmail ? <Spinner size="xs" /> : <Send className="h-4 w-4" />}
                Kirim Faktur ke Pelanggan
              </Button>
            </div>
          }
        >
          <form onSubmit={handleSendEmail} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Email Penerima (Customer / Accounting) *</label>
              <Input
                type="email"
                placeholder="accounting@customer.com"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Subjek Email *</label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Pesan Pengantar</label>
              <textarea
                rows={5}
                className="w-full text-xs rounded-xl border border-input bg-background p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
              />
            </div>

            <div className="p-3 bg-muted/20 border border-border rounded-xl text-xs text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-[var(--brand)] shrink-0" />
              <span>File PDF <strong>Invoice #{selectedInvoiceForEmail.invoice_number}.pdf</strong> akan dilampirkan secara otomatis ke dalam email ini.</span>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
