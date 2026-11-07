"use client";

import * as React from "react";
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Filter,
  Database,
  Sparkles,
  Users,
  Calendar,
  Loader2,
  Layers,
  FileText,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/apiFetch";

interface ExportLeadsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filteredCount?: number;
  totalCount?: number;
  activeFilterParams: Record<string, string | number | boolean | null | undefined>;
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

export function ExportLeadsModal({
  open,
  onOpenChange,
  filteredCount = 0,
  totalCount = 0,
  activeFilterParams,
  onSuccess,
  onError,
}: ExportLeadsModalProps) {
  const [scope, setScope] = React.useState<"filtered" | "all">("filtered");
  const [format, setFormat] = React.useState<"xlsx" | "csv">("xlsx");
  const [includeLeads, setIncludeLeads] = React.useState(true);
  const [includeAi, setIncludeAi] = React.useState(true);
  const [includeContacts, setIncludeContacts] = React.useState(true);
  const [includeActivities, setIncludeActivities] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportProgressText, setExportProgressText] = React.useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgressText("Menghubungi server...");

    try {
      if (format === "csv") {
        setExportProgressText("Menyiapkan berkas CSV...");
        const params = new URLSearchParams();
        if (scope === "filtered") {
          Object.entries(activeFilterParams).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== "") {
              params.set(k, String(v));
            }
          });
          params.set("scope", "filtered");
        } else {
          params.set("scope", "all");
        }
        params.set("format", "csv");

        const response = await apiFetch(`/leads/export?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Gagal mengunduh file CSV dari server.");
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
        link.download = `leadsy_export_${scope}_${timestamp}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // Multi-Sheet Excel via XLSX
        setExportProgressText("Mengambil seluruh dataset relasi (Leads, AI, Contacts, Activities)...");
        const params = new URLSearchParams();
        if (scope === "filtered") {
          Object.entries(activeFilterParams).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== "") {
              params.set(k, String(v));
            }
          });
          params.set("scope", "filtered");
        } else {
          params.set("scope", "all");
        }
        params.set("format", "json");

        const response = await apiFetch(`/leads/export?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Gagal memuat dataset export dari server.");
        }
        const json = await response.json();
        if (!json.success || !json.data) {
          throw new Error(json.message || "Struktur data export tidak valid.");
        }

        setExportProgressText("Merangkai Multi-Sheet Excel di browser...");
        const XLSX = await import("xlsx");
        const workbook = XLSX.utils.book_new();

        // 1. Leads Master
        if (includeLeads && json.data.leads && json.data.leads.length > 0) {
          const leadsSheet = XLSX.utils.json_to_sheet(json.data.leads);
          XLSX.utils.book_append_sheet(workbook, leadsSheet, "Master Leads");
        }

        // 2. AI Intelligence & Scoring
        if (includeAi && json.data.ai_intelligence && json.data.ai_intelligence.length > 0) {
          const aiSheet = XLSX.utils.json_to_sheet(json.data.ai_intelligence);
          XLSX.utils.book_append_sheet(workbook, aiSheet, "AI Intelligence");
        }

        // 3. Contact Persons
        if (includeContacts && json.data.contacts && json.data.contacts.length > 0) {
          const contactsSheet = XLSX.utils.json_to_sheet(json.data.contacts);
          XLSX.utils.book_append_sheet(workbook, contactsSheet, "Contact Persons");
        }

        // 4. Activities & Interaksi
        if (includeActivities && json.data.activities && json.data.activities.length > 0) {
          const activitiesSheet = XLSX.utils.json_to_sheet(json.data.activities);
          XLSX.utils.book_append_sheet(workbook, activitiesSheet, "Aktivitas & Notulen");
        }

        // Ensure at least one sheet exists
        if (workbook.SheetNames.length === 0) {
          const emptySheet = XLSX.utils.json_to_sheet([{ Info: "Tidak ada data yang dipilih untuk diexport" }]);
          XLSX.utils.book_append_sheet(workbook, emptySheet, "Info");
        }

        const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
        const filename = `Leadsy_Export_${scope === "all" ? "All_Leads" : "Filtered"}_${timestamp}.xlsx`;
        XLSX.writeFile(workbook, filename);
      }

      onSuccess?.(`Ekspor data ${scope === "all" ? "Semua Leads" : "Leads Terfilter"} berhasil diunduh.`);
      onOpenChange(false);
    } catch (err: any) {
      onError?.(err?.message || "Terjadi kesalahan saat mengekspor data.");
    } finally {
      setIsExporting(false);
      setExportProgressText(null);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Export Data Leads"
      description="Unduh data leads lengkap beserta detail penilaian AI Intelligence, Contact Person, dan riwayat interaksi."
      size="lg"
      preventClose={isExporting}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {isExporting ? (
              <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium animate-pulse">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {exportProgressText || "Memproses export..."}
              </span>
            ) : (
              <span>
                Target: <strong>{scope === "all" ? totalCount || "Semua" : filteredCount || 0} leads</strong> ({format.toUpperCase()})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isExporting}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Mengunduh...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Unduh Berkas
                </>
              )}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6 py-1">
        {/* SECTION 1: SCOPE SELECTION */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2.5">
            1. Cakupan Data yang Diexport
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Filtered Scope */}
            <div
              onClick={() => !isExporting && setScope("filtered")}
              className={`cursor-pointer rounded-xl border p-3.5 transition-all flex flex-col justify-between ${
                scope === "filtered"
                  ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm ring-1 ring-indigo-500/50"
                  : "border-border hover:border-slate-300 dark:hover:border-slate-700 bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${scope === "filtered" ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400" : "bg-muted text-muted-foreground"}`}>
                    <Filter className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Sesuai Filter di Layar</div>
                    <div className="text-xs text-muted-foreground">Hanya leads yang sedang tampil</div>
                  </div>
                </div>
                {scope === "filtered" && <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
              </div>
              <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Jumlah leads:</span>
                <Badge variant="outline" className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {filteredCount} Leads
                </Badge>
              </div>
            </div>

            {/* All Leads Scope */}
            <div
              onClick={() => !isExporting && setScope("all")}
              className={`cursor-pointer rounded-xl border p-3.5 transition-all flex flex-col justify-between ${
                scope === "all"
                  ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm ring-1 ring-indigo-500/50"
                  : "border-border hover:border-slate-300 dark:hover:border-slate-700 bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${scope === "all" ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400" : "bg-muted text-muted-foreground"}`}>
                    <Database className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Semua Data (All Leads)</div>
                    <div className="text-xs text-muted-foreground">Seluruh data database tanpa filter</div>
                  </div>
                </div>
                {scope === "all" && <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
              </div>
              <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Total database:</span>
                <Badge variant="outline" className="font-semibold">
                  {totalCount || "Seluruh"} Leads
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: FORMAT SELECTION */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2.5">
            2. Format Berkas
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Excel Multi-Sheet */}
            <div
              onClick={() => !isExporting && setFormat("xlsx")}
              className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                format === "xlsx"
                  ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm ring-1 ring-emerald-500/50"
                  : "border-border hover:border-slate-300 dark:hover:border-slate-700 bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${format === "xlsx" ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground">Excel (.xlsx)</span>
                      <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        Multi-Sheet
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      4 Sheet terpisah: Master, AI, PIC, & Log
                    </div>
                  </div>
                </div>
                {format === "xlsx" && <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
              </div>
            </div>

            {/* CSV Flat */}
            <div
              onClick={() => !isExporting && setFormat("csv")}
              className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                format === "csv"
                  ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-sm ring-1 ring-emerald-500/50"
                  : "border-border hover:border-slate-300 dark:hover:border-slate-700 bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${format === "csv" ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">CSV Flat (.csv)</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Satu baris per lead untuk CRM / BI tools
                    </div>
                  </div>
                </div>
                {format === "csv" && <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: MULTI-SHEET ENTITIES CHECKLIST (Only relevant for XLSX) */}
        {format === "xlsx" && (
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                Sheet yang Akan Dibuat dalam Excel:
              </label>
              <span className="text-[11px] text-muted-foreground">Pilih sheet aktif</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Sheet 1: Master Leads */}
              <label className="flex items-start gap-2.5 p-2 rounded-lg border border-border/60 bg-card hover:bg-muted/40 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={includeLeads}
                  onChange={(e) => setIncludeLeads(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="font-semibold text-foreground flex items-center gap-1">
                    <Database className="h-3 w-3 text-slate-500" />
                    Sheet 1: Master Leads
                  </div>
                  <div className="text-[11px] text-muted-foreground">Profil PT, Alamat, Status, Finansial & Owner</div>
                </div>
              </label>

              {/* Sheet 2: AI Intelligence */}
              <label className="flex items-start gap-2.5 p-2 rounded-lg border border-border/60 bg-card hover:bg-muted/40 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={includeAi}
                  onChange={(e) => setIncludeAi(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="font-semibold text-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    Sheet 2: AI Intelligence
                  </div>
                  <div className="text-[11px] text-muted-foreground">Lead Score, BANT, Fit Produk, & Next Actions</div>
                </div>
              </label>

              {/* Sheet 3: Contacts */}
              <label className="flex items-start gap-2.5 p-2 rounded-lg border border-border/60 bg-card hover:bg-muted/40 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={includeContacts}
                  onChange={(e) => setIncludeContacts(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="font-semibold text-foreground flex items-center gap-1">
                    <Users className="h-3 w-3 text-blue-500" />
                    Sheet 3: Contact Persons
                  </div>
                  <div className="text-[11px] text-muted-foreground">Daftar PIC, Title, WA, & Decision Makers</div>
                </div>
              </label>

              {/* Sheet 4: Activities */}
              <label className="flex items-start gap-2.5 p-2 rounded-lg border border-border/60 bg-card hover:bg-muted/40 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={includeActivities}
                  onChange={(e) => setIncludeActivities(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="font-semibold text-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-emerald-500" />
                    Sheet 4: Riwayat Notulen
                  </div>
                  <div className="text-[11px] text-muted-foreground">Meeting, Sales Visit, & Rangkuman AI Rapat</div>
                </div>
              </label>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
