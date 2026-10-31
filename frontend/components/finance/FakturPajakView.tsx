"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  FileSpreadsheet, Search, Download, 
  ShieldCheck, RefreshCw, FileText
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FilterBar, FilterBarSearch } from "@/components/ui/filter-bar";
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
      {/* Header Info Card */}
      <Card>
        <CardContent className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-[color:var(--brand)]/10 text-[var(--brand)] shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-foreground">Direktorat Jenderal Pajak (DJP) e-Faktur Generator</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Penerbitan faktur pajak otomatis berurutan dari NSFP Pool, perhitungan PPN 11%, dan ekspor format CSV resmi DJP (FK, LT, OF).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              size="sm"
              onClick={handleExportCsv}
              className="bg-[color:var(--brand)] hover:opacity-90 text-white text-xs shadow-sm font-semibold"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export DJP e-Faktur CSV
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
        </CardContent>
      </Card>

      {/* Filter and Search Bar */}
      <FilterBar className="justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Tahun Pajak:</span>
          <div className="w-28">
            <Select
              value={taxYear}
              onChange={(e) => setTaxYear(e.target.value)}
              className="h-8 text-xs font-medium"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </Select>
          </div>
        </div>

        <FilterBarSearch
          placeholder="Cari NSFP / Nama Pembeli / NPWP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:w-80"
        />
      </FilterBar>

      {/* Faktur Pajak Table */}
      <TableShell>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Kode & No. Seri (NSFP)</TableHeaderCell>
              <TableHeaderCell>Ref Faktur Komersial</TableHeaderCell>
              <TableHeaderCell>Nama & NPWP Pembeli (BKP/JKP)</TableHeaderCell>
              <TableHeaderCell>Masa / Tahun</TableHeaderCell>
              <TableHeaderCell className="text-right">DPP (Dasar Pengenaan)</TableHeaderCell>
              <TableHeaderCell className="text-right">PPN 11%</TableHeaderCell>
              <TableHeaderCell className="text-center">Status DJP</TableHeaderCell>
              <TableHeaderCell className="text-right">Aksi</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && fakturs.length === 0 ? (
              <TableLoading colSpan={8} label="Memuat data Faktur Pajak..." />
            ) : fakturs.length === 0 ? (
              <TableEmpty colSpan={8}>
                <div className="flex flex-col items-center justify-center text-center">
                  <FileSpreadsheet className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="font-semibold text-foreground">Belum ada Faktur Pajak</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Faktur Pajak akan otomatis diterbitkan dari NSFP pool saat penagihan invoice.
                  </p>
                </div>
              </TableEmpty>
            ) : (
              fakturs.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-bold font-mono text-[color:var(--brand)] whitespace-nowrap">
                    <button 
                      onClick={() => handlePreviewPdf(item)}
                      className="hover:underline flex items-center gap-1.5"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-[color:var(--brand)] shrink-0" />
                      {item.nsfp_number}
                    </button>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {item.invoice?.invoice_number || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-foreground">{item.buyer_name}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      NPWP: {item.buyer_npwp || item.buyer_nik || "00.000.000.0-000.000"}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono">
                    {String(item.tax_period_month).padStart(2, "0")} / {item.tax_period_year}
                  </TableCell>
                  <TableCell className="text-right font-mono text-foreground font-semibold">
                    {formatCurrency(item.dpp_amount)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-[var(--status-success)] font-bold">
                    {formatCurrency(item.ppn_amount)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={item.status === "approved" ? "success" : "neutral"} className="uppercase text-[10px]">
                      {item.status === "approved" ? "Siap Lapor" : item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => handlePreviewPdf(item)}
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                      title="Lihat Dokumen Faktur Pajak Resmi"
                    >
                      <FileText className="h-3.5 w-3.5 mr-1" />
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))
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
              <span className="text-xs text-muted-foreground">Dokumen Resmi Faktur Pajak Standar DJP e-Faktur</span>
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
                    Unduh PDF Faktur
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
                <span className="text-xs">Menyiapkan pratinjau Faktur Pajak...</span>
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
