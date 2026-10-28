'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/apiFetch';
import { useToast } from '@/components/ui/toast';
import { useNumberFormat } from '@/lib/hooks/use-number-format';
import {
  Receipt,
  FileCheck2,
  CheckCircle2,
  Download,
  Loader2,
  ArrowRight,
  Calculator,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GenerateInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: number;
  companyName: string;
  bastDocument?: any;
  baseAmount?: number;
  onInvoiceCreated?: (invoice: any) => void;
}

export function GenerateInvoiceModal({
  open,
  onOpenChange,
  leadId,
  companyName,
  bastDocument,
  baseAmount = 100000000,
  onInvoiceCreated,
}: GenerateInvoiceModalProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { formatCurrency } = useNumberFormat();

  const [milestoneName, setMilestoneName] = React.useState('Termin 2: BAST UAT 50%');
  const [milestonePct, setMilestonePct] = React.useState(50);
  const [taxPct, setTaxPct] = React.useState(11);
  const [withholdingPct, setWithholdingPct] = React.useState(0);
  const [paymentTerms, setPaymentTerms] = React.useState('Net 30');
  const [contractBase, setContractBase] = React.useState(baseAmount);
  const [createdInvoice, setCreatedInvoice] = React.useState<any>(null);

  React.useEffect(() => {
    if (open) {
      setCreatedInvoice(null);
      if (bastDocument?.document_title) {
        setMilestoneName(`Penagihan BAST: ${bastDocument.document_title}`);
      }
      if (baseAmount > 0) {
        setContractBase(baseAmount);
      }
    }
  }, [open, bastDocument, baseAmount]);

  // Live Calculations
  const subtotal = Math.round(contractBase * (milestonePct / 100));
  const taxAmount = Math.round(subtotal * (taxPct / 100));
  const withholdingAmount = Math.round(subtotal * (withholdingPct / 100));
  const totalAmount = subtotal + taxAmount - withholdingAmount;

  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      const bastId = bastDocument?.id || 1;
      const res = await apiFetch(`/leads/${leadId}/invoices/from-bast/${bastId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestone_name: milestoneName,
          milestone_percentage: milestonePct,
          tax_percentage: taxPct,
          withholding_tax_percentage: withholdingPct,
          payment_terms: paymentTerms,
          base_amount: contractBase,
        }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Gagal menerbitkan faktur.');
      }
      return await res.json();
    },
    onSuccess: (data: any) => {
      toast.success(
        'Faktur Penagihan Berhasil Diterbitkan',
        `Faktur #${data.data?.invoice_number} telah dibuat dan siap dikirim ke bagian Finance klien.`
      );
      queryClient.invalidateQueries({ queryKey: ['lead-invoices', leadId] });
      queryClient.invalidateQueries({ queryKey: ['lead-activities', leadId] });
      setCreatedInvoice(data.data);
      if (onInvoiceCreated) {
        onInvoiceCreated(data.data);
      }
    },
    onError: (err: any) => {
      toast.error('Gagal Menerbitkan Faktur', err.message || 'Terjadi kesalahan sistem saat membuat draf faktur.');
    },
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Terbitkan Faktur Termin (Milestone Invoicing)"
      description={`Generate faktur komersial otomatis berdasarkan persetujuan Berita Acara Serah Terima (BAST) untuk ${companyName}.`}
    >
      <div className="space-y-5 py-2">
        {!createdInvoice ? (
          <>
            {/* Context Card */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{companyName}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ref Dokumen BAST: <strong className="text-foreground">{bastDocument?.document_number || 'BAST-202610-001'}</strong>
                </p>
              </div>
              <Badge variant="success">BAST Terverifikasi</Badge>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                  Nama Termin Penagihan
                </label>
                <input
                  type="text"
                  value={milestoneName}
                  onChange={(e) => setMilestoneName(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Contoh: Termin 2: Selesai UAT 50%"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                    Basis Nilai Kontrak (IDR)
                  </label>
                  <input
                    type="number"
                    value={contractBase}
                    onChange={(e) => setContractBase(Number(e.target.value))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                    Persentase Termin (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={5}
                      max={100}
                      value={milestonePct}
                      onChange={(e) => setMilestonePct(Number(e.target.value))}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <span className="text-xs font-semibold text-muted-foreground">%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                    PPN (%)
                  </label>
                  <input
                    type="number"
                    value={taxPct}
                    onChange={(e) => setTaxPct(Number(e.target.value))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                    PPh 23 (%)
                  </label>
                  <input
                    type="number"
                    value={withholdingPct}
                    onChange={(e) => setWithholdingPct(Number(e.target.value))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="2"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                    Termin Bayar
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="Net 30">Net 30 Hari</option>
                    <option value="Net 14">Net 14 Hari</option>
                    <option value="Net 7">Net 7 Hari</option>
                    <option value="Immediate">Tunai Saat Terima</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Financial Summary Card */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border text-xs font-bold text-foreground">
                <Calculator className="h-4 w-4 text-primary" />
                <span>Kalkulasi Faktur Penagihan</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>DPP Subtotal ({milestonePct}%):</span>
                <span className="font-semibold text-foreground">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>PPN ({taxPct}%):</span>
                <span className="font-semibold text-foreground">{formatCurrency(taxAmount)}</span>
              </div>
              {withholdingAmount > 0 && (
                <div className="flex justify-between text-xs text-[var(--status-danger)]">
                  <span>Potongan PPh 23 ({withholdingPct}%):</span>
                  <span>- {formatCurrency(withholdingAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-border text-primary">
                <span>Total Nilai Tagihan:</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={createInvoiceMutation.isPending}>
                Batal
              </Button>
              <Button
                variant="default"
                onClick={() => createInvoiceMutation.mutate()}
                disabled={createInvoiceMutation.isPending}
                className="gap-2"
              >
                {createInvoiceMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menerbitkan Faktur...
                  </>
                ) : (
                  <>
                    <Receipt className="h-4 w-4" />
                    Terbitkan Faktur
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          /* Success Screen */
          <div className="space-y-5 text-center py-4">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--status-success)]/15 text-[var(--status-success)] ring-8 ring-[var(--status-success)]/5">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Faktur Penagihan Diterbitkan!</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Faktur resmi dengan nomor <strong>{createdInvoice.invoice_number}</strong> telah siap dikirim ke bagian Finance.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 text-left space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Nomor Faktur:</span>
                <span className="font-mono font-bold text-primary">{createdInvoice.invoice_number}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Termin:</span>
                <span className="font-semibold">{createdInvoice.milestone_name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total Tagihan:</span>
                <span className="font-bold text-foreground">{formatCurrency(createdInvoice.total_amount)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Jatuh Tempo:</span>
                <span className="font-semibold text-[var(--status-danger)]">{createdInvoice.due_date}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => window.open(`/api/invoices/${createdInvoice.id}/download`, '_blank')}
              >
                <Download className="h-4 w-4" />
                Unduh PDF Faktur
              </Button>
              <Button
                variant="default"
                onClick={() => onOpenChange(false)}
              >
                Selesai
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
