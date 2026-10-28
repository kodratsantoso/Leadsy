'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/apiFetch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { useNumberFormat } from '@/lib/hooks/use-number-format';
import { GenerateInvoiceModal } from './GenerateInvoiceModal';
import {
  Receipt,
  Download,
  Plus,
  CreditCard,
  Calendar,
  AlertCircle,
  FileCheck2,
  Building2,
  DollarSign,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InvoicesListCardProps {
  leadId: number;
  companyName: string;
  quotationAmount?: number;
}

export function InvoicesListCard({
  leadId,
  companyName,
  quotationAmount = 100000000,
}: InvoicesListCardProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { formatCurrency } = useNumberFormat();
  const [modalOpen, setModalOpen] = React.useState(false);

  const { data, isLoading } = useQuery<{ data: any[]; summary: any }>({
    queryKey: ['lead-invoices', leadId],
    queryFn: async () => {
      const res = await apiFetch(`/leads/${leadId}/invoices`);
      if (!res.ok) throw new Error('Gagal memuat faktur.');
      return await res.json();
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async ({ invoiceId, amount }: { invoiceId: number; amount: number }) => {
      const res = await apiFetch(`/invoices/${invoiceId}/payment-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Gagal mencatat pembayaran.');
      }
      return await res.json();
    },
    onSuccess: (res: any) => {
      toast.success('Pembayaran Berhasil Dicatat', res.message);
      queryClient.invalidateQueries({ queryKey: ['lead-invoices', leadId] });
      queryClient.invalidateQueries({ queryKey: ['lead-activities', leadId] });
    },
    onError: (err: any) => {
      toast.error('Gagal Mencatat Pembayaran', err.message || 'Terjadi kesalahan.');
    },
  });

  const invoices = data?.data || [];
  const summary = data?.summary || {
    total_invoiced: 0,
    total_paid: 0,
    total_outstanding: 0,
    invoices_count: 0,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">Lunas (Paid)</Badge>;
      case 'partially_paid':
        return <Badge variant="warning">Sebagian (Partial)</Badge>;
      case 'overdue':
        return <Badge variant="danger">Jatuh Tempo (Overdue)</Badge>;
      case 'sent':
        return <Badge variant="info">Terkirim (Sent)</Badge>;
      default:
        return <Badge variant="neutral">Draf (Draft)</Badge>;
    }
  };

  return (
    <div className="col-span-full rounded-xl border border-border bg-card p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Faktur Penagihan Termin (Commercial Invoices)</h3>
            <p className="text-xs text-muted-foreground">
              Manajemen termin pembayaran, perhitungan PPN 11%, dan penagihan BAST untuk Finance & Accounting.
            </p>
          </div>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={() => setModalOpen(true)}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Terbitkan Faktur Termin
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-muted/30 p-3.5 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total Ditagihkan</span>
          <p className="text-base font-bold text-foreground tabular-nums">
            {formatCurrency(summary.total_invoiced)}
          </p>
          <span className="text-[10px] text-muted-foreground">{summary.invoices_count} faktur diterbitkan</span>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-3.5 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Sudah Diterima (Paid)</span>
          <p className="text-base font-bold text-[var(--status-success)] tabular-nums">
            {formatCurrency(summary.total_paid)}
          </p>
          <span className="text-[10px] text-muted-foreground">Kas masuk terkonfirmasi</span>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-3.5 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Piutang Berjalan (Outstanding)</span>
          <p className="text-base font-bold text-[var(--status-warning)] tabular-nums">
            {formatCurrency(summary.total_outstanding)}
          </p>
          <span className="text-[10px] text-muted-foreground">Menunggu pelunasan klien</span>
        </div>
      </div>

      {/* Invoices List / Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-xs text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Memuat data faktur komersial...
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Belum Ada Faktur Penagihan</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Faktur termin dapat diterbitkan otomatis setelah dokumen Berita Acara (BAST) disetujui klien.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setModalOpen(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Terbitkan Faktur Pertama
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                <th className="py-2.5 px-3 font-semibold">No. Faktur</th>
                <th className="py-2.5 px-3 font-semibold">Termin / Milestone</th>
                <th className="py-2.5 px-3 font-semibold text-right">Nilai Tagihan</th>
                <th className="py-2.5 px-3 font-semibold">Jatuh Tempo</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-primary">
                    {inv.invoice_number}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-foreground">{inv.milestone_name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {inv.ps_document ? `Ref BAST: #${inv.ps_document.document_number}` : 'Penagihan Langsung'}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-bold tabular-nums">
                    {formatCurrency(inv.total_amount)}
                  </td>
                  <td className="py-3 px-3 text-muted-foreground tabular-nums">
                    {inv.due_date}
                  </td>
                  <td className="py-3 px-3">
                    {getStatusBadge(inv.status)}
                  </td>
                  <td className="py-3 px-3 text-right space-x-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => window.open(`/api/invoices/${inv.id}/download`, '_blank')}
                    >
                      <Download className="h-3 w-3" />
                      PDF
                    </Button>
                    {inv.status !== 'paid' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        disabled={recordPaymentMutation.isPending}
                        onClick={() => {
                          const unpaid = inv.total_amount - (inv.paid_amount || 0);
                          recordPaymentMutation.mutate({ invoiceId: inv.id, amount: unpaid });
                        }}
                      >
                        <CreditCard className="h-3 w-3" />
                        Lunas
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <GenerateInvoiceModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        leadId={leadId}
        companyName={companyName}
        baseAmount={quotationAmount}
      />
    </div>
  );
}
