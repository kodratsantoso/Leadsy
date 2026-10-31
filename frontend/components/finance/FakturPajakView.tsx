"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  FileSpreadsheet, Search, Download, ExternalLink, 
  ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Loader2, Calendar, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { apiFetch } from "@/lib/apiFetch";

interface FakturPajakItem {
  id: number;
  nsfp_number: string;
  tax_period_month: number;
  tax_period_year: number;
  transaction_code: string;
  faktur_date: string;
  seller_name: string;
  seller_npwp: string;
  buyer_name: string;
  buyer_npwp?: string;
  buyer_nik?: string;
  dpp_amount: number;
  ppn_percentage: number;
  ppn_amount: number;
  status: string;
  approval_code?: string;
  pdf_path?: string;
  invoice?: {
    id: number;
    invoice_number: string;
    lead?: {
      company_name: string;
    };
  };
}

export function FakturPajakView() {
  const [fakturs, setFakturs] = useState<FakturPajakItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [taxYear, setTaxYear] = useState("2026");

  // PDF Preview
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [loadingPdf, setLoadingPdf] = useState(false);

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
      const res = await apiFetch(`/finance/faktur-pajak?tax_year=${taxYear}&search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (json?.data?.data) {
        setFakturs(json.data.data);
      } else if (Array.isArray(json?.data)) {
        setFakturs(json.data);
      }
    } catch (err: any) {
      console.error("Failed to load Faktur Pajak:", err);
    } finally {
      setLoading(false);
    }
  }, [taxYear, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExportCsv = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    window.open(`/api/finance/faktur-pajak-export/djp-csv?tax_year=${taxYear}`, "_blank");
  };

  const handlePreviewPdf = async (faktur: FakturPajakItem) => {
    setLoadingPdf(true);
    setPreviewTitle(`Faktur Pajak - ${faktur.nsfp_number}`);
    setPreviewModalOpen(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`/api/finance/faktur-pajak/${faktur.id}/preview-pdf`, {
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
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Faktur Pajak Elektronik (DJP e-Faktur)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Daftar Faktur Pajak terbitan resmi sesuai format baku Direktorat Jenderal Pajak (DJP) Republik Indonesia.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={handleExportCsv}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs shadow-sm font-semibold"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export DJP e-Faktur CSV
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Tahun Pajak:</span>
            <select
              value={taxYear}
              onChange={(e) => setTaxYear(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-xs font-medium"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari NSFP / Nama Pembeli / NPWP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Faktur Pajak Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                <th className="p-3.5">Kode & No. Seri (NSFP)</th>
                <th className="p-3.5">Ref Faktur Komersial</th>
                <th className="p-3.5">Nama & NPWP Pembeli (BKP/JKP)</th>
                <th className="p-3.5">Masa / Tahun</th>
                <th className="p-3.5 text-right">DPP (Dasar Pengenaan)</th>
                <th className="p-3.5 text-right">PPN 11%</th>
                <th className="p-3.5 text-center">Status DJP</th>
                <th className="p-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && fakturs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    Memuat data Faktur Pajak...
                  </td>
                </tr>
              ) : fakturs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground">
                    <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Belum ada Faktur Pajak yang diterbitkan untuk periode ini.
                  </td>
                </tr>
              ) : (
                fakturs.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3.5 font-bold font-mono text-blue-600 whitespace-nowrap">
                      <button 
                        onClick={() => handlePreviewPdf(item)}
                        className="hover:underline flex items-center gap-1.5"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                        {item.nsfp_number}
                      </button>
                    </td>
                    <td className="p-3.5 font-mono text-muted-foreground">
                      {item.invoice?.invoice_number || "-"}
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-foreground">{item.buyer_name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        NPWP: {item.buyer_npwp || item.buyer_nik || "00.000.000.0-000.000"}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold">{String(item.tax_period_month).padStart(2, "0")}</span> / {item.tax_period_year}
                      <div className="text-[10px] text-muted-foreground">{item.faktur_date}</div>
                    </td>
                    <td className="p-3.5 text-right font-mono font-medium">
                      {formatCurrency(item.dpp_amount)}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-foreground">
                      {formatCurrency(item.ppn_amount)}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Approved
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => handlePreviewPdf(item)}
                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                        title="Unduh PDF Resmi DJP"
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        PDF DJP
                      </Button>
                    </td>
                  </tr>
                ))
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
              <span className="text-xs text-muted-foreground">Format Resmi Faktur Pajak Elektronik Direktorat Jenderal Pajak (UU HPP)</span>
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
                    Unduh PDF DJP
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
                <span className="text-xs">Menyiapkan pratinjau Faktur Pajak DJP...</span>
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
