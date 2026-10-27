"use client";

import { useState } from "react";
import { sendDocumentForSignature, PsDocument } from "@/lib/api/professional-services";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { ShieldCheck, Award, FileText, CheckCircle2 } from "lucide-react";

interface SendSignatureModalProps {
  document: PsDocument;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SendSignatureModal({ document, open, onOpenChange, onSuccess }: SendSignatureModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<"privy_psre" | "documenso">("privy_psre");
  const [subject, setSubject] = useState(`Permintaan Tanda Tangan Resmi: ${document.document_title}`);
  const [message, setMessage] = useState("Mohon tinjau dan tandatangani dokumen perjanjian kerja berikut secara sah.");
  
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerNik, setCustomerNik] = useState("");
  const [internalName, setInternalName] = useState("");
  const [internalEmail, setInternalEmail] = useState("");

  const handleSend = async () => {
    if (!customerName || !customerEmail || !internalName || !internalEmail) {
      toast.error("Harap lengkapi nama dan email penandatangan kedua pihak.");
      return;
    }

    try {
      setLoading(true);
      await sendDocumentForSignature(document.id, {
        subject,
        message,
        provider,
        signers: [
          { 
            type: 'customer', 
            name: customerName, 
            email: customerEmail,
            nik: customerNik || undefined,
          },
          { 
            type: 'internal', 
            name: internalName, 
            email: internalEmail,
          }
        ]
      });
      toast.success(
        "Permintaan Dikirim",
        `Dokumen telah dikirim ke pihak klien dan internal via ${provider === 'privy_psre' ? 'PrivyID (PSrE Kominfo)' : 'Documenso'}.`
      );
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast.fromError(e, "Gagal mengirim permintaan tanda tangan digital.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Kirim Dokumen untuk Tanda Tangan Digital Resmi">
      <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
        {/* Provider Option */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            PENYEDIA SERTIFIKASI TANDA TANGAN (PSrE)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setProvider("privy_psre")}
              className={`p-3 rounded-xl border text-left transition-all ${
                provider === "privy_psre"
                  ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/40"
                  : "border-border bg-card hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-emerald-600" /> PrivyID PSrE
                </span>
                <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 py-0">
                  Resmi RI
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Terakreditasi Kominfo (UU ITE No. 1/2024) + e-Meterai Peruri Sah.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setProvider("documenso")}
              className={`p-3 rounded-xl border text-left transition-all ${
                provider === "documenso"
                  ? "border-brand bg-brand/5 ring-1 ring-brand/40"
                  : "border-border bg-card hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-brand" /> Documenso
                </span>
                <Badge variant="outline" className="text-[9px] py-0">
                  Internal
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Tanda tangan elektronik internal / non-komersial internasional.
              </p>
            </button>
          </div>
        </div>

        {provider === "privy_psre" && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>Dokumen ini akan memiliki sertifikat digital berkekuatan hukum penuh di pengadilan Indonesia.</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Subjek Email *</label>
          <Input value={subject} onChange={e => setSubject(e.target.value)} className="text-xs" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Pesan / Instruksi Penandatanganan</label>
          <textarea 
            value={message} 
            onChange={e => setMessage(e.target.value)} 
            rows={2} 
            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-brand"
          />
        </div>

        {/* Customer Signatory */}
        <div className="border-t border-border pt-3 space-y-3">
          <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">
            PENANDATANGAN PIHAK KLIEN (CUSTOMER)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Nama Lengkap (Sesuai KTP) *</label>
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="e.g. Bambang Susanto" className="text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Alamat Email *</label>
              <Input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="bambang@client.co.id" type="email" className="text-xs" />
            </div>
          </div>
          {provider === "privy_psre" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">NIK KTP (Opsional untuk verifikasi biometrik PSrE)</label>
              <Input value={customerNik} onChange={e => setCustomerNik(e.target.value)} placeholder="3171xxxxxxxxxxxx (16 Digit)" maxLength={16} className="text-xs font-mono" />
            </div>
          )}
        </div>

        {/* Internal Signatory */}
        <div className="border-t border-border pt-3 space-y-3">
          <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">
            PENANDATANGAN INTERNAL (LEADSY / VIRTUENET)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Nama Penandatangan Internal *</label>
              <Input value={internalName} onChange={e => setInternalName(e.target.value)} placeholder="e.g. Direktur Operasional" className="text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Email Internal *</label>
              <Input value={internalEmail} onChange={e => setInternalEmail(e.target.value)} placeholder="legal@leadsy.tech" type="email" className="text-xs" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-2 mt-4 pt-3 border-t border-border">
        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
          Batal
        </Button>
        <Button
          onClick={handleSend}
          disabled={loading}
          size="sm"
          className="bg-brand text-white hover:bg-brand/90 text-xs gap-1.5"
        >
          {loading ? "Mengirim ke PSrE..." : "Kirim Permintaan Tanda Tangan"}
        </Button>
      </div>
    </Modal>
  );
}
