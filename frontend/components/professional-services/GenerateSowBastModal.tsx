'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/apiFetch';
import { useToast } from '@/components/ui/toast';
import {
  FileText,
  CheckCircle2,
  Download,
  Loader2,
  FileCheck,
  ShieldCheck,
  ExternalLink,
  PenTool,
  Clock,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GenerateSowBastModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estimationId: number;
  estimationTitle: string;
  leadName?: string;
  onDocumentGenerated?: (document: any) => void;
  onOpenDigitalSignature?: (document: any) => void;
}

export function GenerateSowBastModal({
  open,
  onOpenChange,
  estimationId,
  estimationTitle,
  leadName,
  onDocumentGenerated,
  onOpenDigitalSignature,
}: GenerateSowBastModalProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [docType, setDocType] = React.useState<'sow' | 'bast'>('sow');
  const [includeCommercial, setIncludeCommercial] = React.useState(true);
  const [includeTaskBreakdown, setIncludeTaskBreakdown] = React.useState(true);
  const [includeAppendix, setIncludeAppendix] = React.useState(true);
  const [generatedDoc, setGeneratedDoc] = React.useState<any>(null);

  React.useEffect(() => {
    if (open) {
      setGeneratedDoc(null);
    }
  }, [open]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/professional-services/estimations/${estimationId}/documents/generate`, {
        method: 'POST',
        body: JSON.stringify({
          document_type: docType,
          include_commercial: includeCommercial,
          include_task_breakdown: includeTaskBreakdown,
          include_appendix: includeAppendix,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menghasilkan dokumen.');
      }
      return data;
    },
    onSuccess: (doc) => {
      setGeneratedDoc(doc);
      toast.success(
        'Dokumen Berhasil Dibuat',
        `${doc.document_title || 'Dokumen'} versi ${doc.version_number} siap dipratinjau dan ditandatangani.`
      );
      queryClient.invalidateQueries({ queryKey: ['ps-documents', estimationId] });
      onDocumentGenerated?.(doc);
    },
    onError: (err: any) => {
      toast.error('Gagal Membuat Dokumen', err.message || 'Terjadi kesalahan sistem.');
    },
  });

  const handleDownload = () => {
    if (!generatedDoc?.id) return;
    window.open(`/api/professional-services/documents/${generatedDoc.id}/download`, '_blank');
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={generatedDoc ? "Dokumen Berhasil Dibuat" : "Generator Dokumen Resmi SOW & BAST"}
      description={`Buat dokumen kontrak teknis resmi untuk estimasi "${estimationTitle}"`}
      size="xl"
      preventClose={generateMutation.isPending}
      footer={
        <div className="flex w-full items-center justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Dokumen diformat dengan kop surat resmi & nomor audit otomatis.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={generateMutation.isPending}
            >
              Tutup
            </Button>
            {!generatedDoc ? (
              <Button
                variant="default"
                disabled={generateMutation.isPending}
                onClick={() => generateMutation.mutate()}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menyusun PDF...
                  </>
                ) : (
                  <>
                    <FileCheck className="h-4 w-4" />
                    Generate Dokumen PDF
                  </>
                )}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  className="gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  Unduh PDF
                </Button>
                {onOpenDigitalSignature && (
                  <Button
                    variant="default"
                    onClick={() => {
                      onOpenDigitalSignature(generatedDoc);
                      onOpenChange(false);
                    }}
                    className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <PenTool className="h-4 w-4" />
                    Kirim Tanda Tangan (PSrE)
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {!generatedDoc ? (
          <>
            {/* Step 1: Document Type Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Pilih Format Dokumen
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setDocType('sow')}
                  className={cn(
                    "p-3.5 rounded-xl border transition cursor-pointer text-left space-y-1 relative",
                    docType === 'sow'
                      ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs"
                      : "border-border hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-indigo-500" />
                      Statement of Work (SOW)
                    </span>
                    {docType === 'sow' && <CheckCircle2 className="h-4 w-4 text-indigo-600" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Dokumen spesifikasi teknis, ruang lingkup implementasi, breakdown man-days, dan jadwal deliverables.
                  </p>
                </div>

                <div
                  onClick={() => setDocType('bast')}
                  className={cn(
                    "p-3.5 rounded-xl border transition cursor-pointer text-left space-y-1 relative",
                    docType === 'bast'
                      ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs"
                      : "border-border hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm flex items-center gap-1.5">
                      <FileCheck className="h-4 w-4 text-emerald-500" />
                      Berita Acara Serah Terima (BAST)
                    </span>
                    {docType === 'bast' && <CheckCircle2 className="h-4 w-4 text-indigo-600" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Dokumen serah terima hasil proyek, persetujuan UAT, pengalihan kunci sistem, dan otorisasi penagihan invoice.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2: Content & Appendix Options */}
            <div className="space-y-2 border-t pt-4">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Pengaturan Konten & Klausul
              </label>
              <div className="space-y-2.5 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeCommercial}
                    onChange={(e) => setIncludeCommercial(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Sertakan rincian nilai komersial & estimasi biaya (Commercial Summary)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeTaskBreakdown}
                    onChange={(e) => setIncludeTaskBreakdown(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Sertakan breakdown modul dan subtask per role engineer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeAppendix}
                    onChange={(e) => setIncludeAppendix(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Sertakan klausul garansi, batasan tanggung jawab, & halaman otorisasi tanda tangan</span>
                </label>
              </div>
            </div>

            {/* Target Client Info */}
            <div className="p-3 bg-muted/30 rounded-xl flex items-center justify-between text-xs text-muted-foreground">
              <span>Klien Penerima Dokumen:</span>
              <strong className="text-foreground">{leadName || 'Perusahaan Klien'}</strong>
            </div>
          </>
        ) : (
          /* Document Ready Screen */
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 text-center space-y-2">
              <div className="h-10 w-10 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h4 className="font-semibold text-base text-foreground">
                {generatedDoc.document_title}
              </h4>
              <p className="text-xs text-muted-foreground font-mono">
                Nomor Dokumen: <strong>{generatedDoc.document_number}</strong> (Versi {generatedDoc.version_number})
              </p>
            </div>

            <div className="border rounded-xl p-3 bg-card/70 space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Tipe Dokumen:</span>
                <Badge variant="outline" className="uppercase font-bold">{generatedDoc.document_type}</Badge>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">Ukuran File:</span>
                <span>{generatedDoc.file_size ? `${(generatedDoc.file_size / 1024).toFixed(1)} KB` : 'PDF Document'}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Waktu Generate:</span>
                <span>{new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
