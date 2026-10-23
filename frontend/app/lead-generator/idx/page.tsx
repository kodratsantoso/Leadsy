"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { throwIfApiError } from "@/lib/apiError";
import { ErrorNotice } from "@/components/ui/error-notice";
import { 
  ArrowLeft, 
  Search, 
  Loader2, 
  Plus, 
  CheckCircle, 
  SearchCode, 
  DatabaseBackup, 
  ExternalLink,
  Building2,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  SlidersHorizontal
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  TableShell,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableEmpty,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

export default function IdxGeneratorPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [activeSearch, setActiveSearch] = useState("");
  
  // Slicers & Filters
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "in_leads">("all");
  const [sector, setSector] = useState("");
  const [listingBoard, setListingBoard] = useState("");
  const [industry, setIndustry] = useState("");
  const [subIndustry, setSubIndustry] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch filters & summary counts
  const { data: filters } = useQuery({
    queryKey: ["idx-filters"],
    queryFn: async () => {
      const res = await apiFetch(`/lead-generator/idx-companies/filters`);
      if (!res.ok) throw new Error("Failed to fetch filters");
      return res.json();
    },
  });

  // Fetch companies with server-side filtering
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["idx-companies", activeSearch, statusFilter, sector, listingBoard, industry, subIndustry, page],
    queryFn: async () => {
      let url = `/lead-generator/idx-companies?page=${page}&per_page=50`;
      if (activeSearch) url += `&keyword=${encodeURIComponent(activeSearch)}`;
      if (statusFilter !== "all") url += `&status=${statusFilter}`;
      if (sector) url += `&sector=${encodeURIComponent(sector)}`;
      if (listingBoard) url += `&listing_board=${encodeURIComponent(listingBoard)}`;
      if (industry) url += `&industry=${encodeURIComponent(industry)}`;
      if (subIndustry) url += `&sub_industry=${encodeURIComponent(subIndustry)}`;
      
      const res = await apiFetch(url);
      await throwIfApiError(res, "The IDX company list could not be loaded.");
      return res.json();
    },
  });

  const importMutation = useMutation({
    mutationFn: async (companiesToImport: any[]) => {
      const res = await apiFetch(`/lead-generator/idx-companies/import`, {
        method: "POST",
        body: JSON.stringify({ companies: companiesToImport }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to import companies");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["idx-companies"] });
      queryClient.invalidateQueries({ queryKey: ["idx-filters"] });
      setSelectedIds([]);
      toast.success(`Import complete — ${data.results.imported} imported, ${data.results.skipped} skipped.`);
    },
    onError: (err) => {
      toast.fromError(err, "The import could not be completed.");
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(search);
  };

  const handleClearFilters = () => {
    setSearch("");
    setActiveSearch("");
    setStatusFilter("all");
    setSector("");
    setListingBoard("");
    setIndustry("");
    setSubIndustry("");
    setPage(1);
    setSelectedIds([]);
  };

  const handleRefreshCache = async () => {
    setIsRefreshing(true);
    try {
      await apiFetch(`/lead-generator/idx-companies?refresh=true`);
      queryClient.invalidateQueries({ queryKey: ["idx-companies"] });
      queryClient.invalidateQueries({ queryKey: ["idx-filters"] });
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const companies = data?.data || [];
  const meta = data?.meta;

  const summaryTotal = filters?.summary?.total ?? meta?.cached_companies ?? 957;
  const summaryInLeads = filters?.summary?.in_leads ?? meta?.total_in_leads ?? 35;
  const summaryNew = filters?.summary?.new ?? meta?.total_new ?? (summaryTotal - summaryInLeads);

  const hasActiveFilters = Boolean(
    activeSearch || statusFilter !== "all" || sector || listingBoard || industry || subIndustry
  );

  const getPageNumbers = () => {
    if (!meta) return [];
    const totalPages = meta.last_page;
    const currentPage = meta.current_page;
    const maxVisible = 5;

    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const importableCompanies = companies.filter((c: any) => !c.is_duplicate);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const importable = importableCompanies.map((c: any) => c.idx_code);
      setSelectedIds(importable);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (idxCode: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, idxCode]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== idxCode));
    }
  };

  const handleBulkImport = () => {
    const selectedCompanies = companies.filter((c: any) => selectedIds.includes(c.idx_code));
    if (selectedCompanies.length > 0) {
      importMutation.mutate(selectedCompanies);
    }
  };

  const renderBoardBadge = (board?: string | null) => {
    if (!board) return null;
    switch (board) {
      case "Utama":
        return <Badge variant="neutral" className="text-[10px] px-1.5 py-0 font-normal">Papan Utama</Badge>;
      case "Pemantauan Khusus":
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10">Pemantauan Khusus</Badge>;
      case "Pengembangan":
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5">Pengembangan</Badge>;
      case "Akselerasi":
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5">Akselerasi</Badge>;
      case "Ekonomi Baru":
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">Ekonomi Baru</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0">{board}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/lead-generator">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">IDX Public Companies</h1>
            <p className="text-sm text-muted-foreground">
              Search and import public listed companies from Bursa Efek Indonesia as Leads.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={handleRefreshCache} disabled={isRefreshing}>
          <DatabaseBackup className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh Cache
        </Button>
      </div>

      {/* KPI Slicer Cards (Status Overview) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* All Companies Card */}
        <button
          type="button"
          onClick={() => { setStatusFilter("all"); setPage(1); setSelectedIds([]); }}
          className={`flex items-start justify-between p-4 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === "all"
              ? "bg-muted/80 border-primary ring-1 ring-primary shadow-xs"
              : "bg-card hover:bg-muted/40 border-border"
          }`}
        >
          <div className="space-y-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Semua Emiten (All)
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {summaryTotal.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              Total emiten terdaftar di BEI / IDX
            </div>
          </div>
          <div className={`p-2.5 rounded-lg ${statusFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            <Building2 className="h-5 w-5" />
          </div>
        </button>

        {/* Ready to Prospect (New Only) */}
        <button
          type="button"
          onClick={() => { setStatusFilter("new"); setPage(1); setSelectedIds([]); }}
          className={`flex items-start justify-between p-4 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === "new"
              ? "bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500 shadow-xs"
              : "bg-card hover:bg-emerald-500/5 border-border"
          }`}
        >
          <div className="space-y-1">
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Belum di-Input (New Leads)
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {summaryNew.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              Siap di-import dan diprospek sales
            </div>
          </div>
          <div className={`p-2.5 rounded-lg ${statusFilter === "new" ? "bg-emerald-600 text-white" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>
            <Plus className="h-5 w-5" />
          </div>
        </button>

        {/* Already in Leads Card */}
        <button
          type="button"
          onClick={() => { setStatusFilter("in_leads"); setPage(1); setSelectedIds([]); }}
          className={`flex items-start justify-between p-4 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === "in_leads"
              ? "bg-blue-500/10 border-blue-500 ring-1 ring-blue-500 shadow-xs"
              : "bg-card hover:bg-blue-500/5 border-border"
          }`}
        >
          <div className="space-y-1">
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Sudah Ada di Leads
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {summaryInLeads.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              Sudah terdaftar di pipeline Leadsy CRM
            </div>
          </div>
          <div className={`p-2.5 rounded-lg ${statusFilter === "in_leads" ? "bg-blue-600 text-white" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"}`}>
            <CheckCircle className="h-5 w-5" />
          </div>
        </button>
      </div>

      {/* Slicers & Filter Card */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by Keyword, Ticker (e.g. BBCA), or Company Name..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchCode className="mr-2 h-4 w-4" />}
              Search
            </Button>
            {hasActiveFilters && (
              <Button type="button" variant="ghost" onClick={handleClearFilters} className="text-muted-foreground hover:text-foreground">
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </form>

          {/* Slicers: Sector, Board, Industry, Sub Industry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {/* Sector Slicer */}
            <div>
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Sektor (Sector)</label>
              <Select 
                value={sector} 
                onChange={(e) => { setSector(e.target.value); setPage(1); }}
                placeholder="Semua Sektor (All)"
              >
                {filters?.sectors?.map((sec: string) => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </Select>
            </div>

            {/* Listing Board Slicer */}
            <div>
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Papan Pencatatan (Board)</label>
              <Select 
                value={listingBoard} 
                onChange={(e) => { setListingBoard(e.target.value); setPage(1); }}
                placeholder="Semua Papan (All)"
              >
                {filters?.listing_boards?.map((brd: string) => (
                  <option key={brd} value={brd}>{brd}</option>
                ))}
              </Select>
            </div>

            {/* Industry Slicer */}
            <div>
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Industri (Industry)</label>
              <Select 
                value={industry} 
                onChange={(e) => { setIndustry(e.target.value); setPage(1); }}
                placeholder="Semua Industri (All)"
              >
                {filters?.industries?.map((ind: string) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </Select>
            </div>

            {/* Sub Industry Slicer */}
            <div>
              <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Sub Industri</label>
              <Select 
                value={subIndustry} 
                onChange={(e) => { setSubIndustry(e.target.value); setPage(1); }}
                placeholder="Semua Sub Industri (All)"
              >
                {filters?.sub_industries?.map((sind: string) => (
                  <option key={sind} value={sind}>{sind}</option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Bar & Results Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {meta?.total !== undefined ? `${meta.total.toLocaleString()} emiten ditemukan` : "Memuat data..."}
          </span>
          {statusFilter !== "all" && (
            <Badge variant="outline" className="text-xs">
              Filter: {statusFilter === "new" ? "Belum di-Input" : "Sudah di Leads"}
            </Badge>
          )}
          {sector && (
            <Badge variant="neutral" className="text-xs">
              {sector}
            </Badge>
          )}
          {listingBoard && (
            <Badge variant="neutral" className="text-xs">
              {listingBoard}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {selectedIds.length > 0 && (
            <span className="text-sm text-muted-foreground font-medium">
              {selectedIds.length} dipilih
            </span>
          )}
          <Button 
            onClick={handleBulkImport} 
            disabled={selectedIds.length === 0 || importMutation.isPending}
          >
            {importMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Add Selected to Leads ({selectedIds.length})
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <TableShell>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell className="w-12">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 w-4 h-4"
                  onChange={handleSelectAll}
                  checked={
                    importableCompanies.length > 0 &&
                    importableCompanies.every((c: any) => selectedIds.includes(c.idx_code))
                  }
                  disabled={importableCompanies.length === 0}
                />
              </TableHeaderCell>
              <TableHeaderCell>Ticker</TableHeaderCell>
              <TableHeaderCell>Company</TableHeaderCell>
              <TableHeaderCell>Sector / Board</TableHeaderCell>
              <TableHeaderCell>Industry</TableHeaderCell>
              <TableHeaderCell className="text-right">Action</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && companies.length === 0 ? (
              <TableEmpty colSpan={6}>
                <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" />
                Memuat data emiten...
              </TableEmpty>
            ) : isError ? (
              <TableEmpty colSpan={6}>
                <ErrorNotice
                  error={error}
                  fallbackTitle="The IDX company list could not be loaded."
                  onRetry={() => refetch()}
                  className="text-left"
                />
              </TableEmpty>
            ) : companies.length === 0 ? (
              <TableEmpty colSpan={6}>
                <div className="py-8 text-center space-y-2">
                  <SlidersHorizontal className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <div className="font-medium text-foreground">Tidak ada emiten yang sesuai kriteria filter.</div>
                  <div className="text-xs text-muted-foreground">
                    Coba ganti filter status, sektor, atau kata kunci pencarian Anda.
                  </div>
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={handleClearFilters} className="mt-2">
                      Reset Filter
                    </Button>
                  )}
                </div>
              </TableEmpty>
            ) : (
              companies.map((company: any) => (
                <TableRow key={company.idx_code}>
                  <TableCell>
                    <input 
                      type="checkbox"
                      className="rounded border-gray-300 w-4 h-4 disabled:opacity-40"
                      disabled={company.is_duplicate}
                      checked={selectedIds.includes(company.idx_code)}
                      onChange={(e) => handleSelect(company.idx_code, e.target.checked)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Badge variant="outline" className="font-mono text-xs font-semibold tracking-wider">
                      {company.idx_code}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">{company.company_name}</span>
                      {company.website && (
                        <a 
                          href={company.website.startsWith("http") ? company.website : `https://${company.website}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-xs text-[color:var(--brand)] hover:underline inline-flex items-center gap-1 mt-0.5"
                        >
                          {company.website}
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      <span className="text-sm font-medium">{company.sector || "-"}</span>
                      {renderBoardBadge(company.listing_board)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm">{company.industry || "-"}</span>
                      <span className="text-xs text-muted-foreground">{company.sub_industry || "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {company.is_duplicate ? (
                      <div className="flex items-center justify-end gap-2">
                        <Badge variant="success" className="px-2.5 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0 font-medium text-xs">
                          <CheckCircle className="mr-1 h-3.5 w-3.5" />
                          In Leads
                        </Badge>
                        {company.lead_id && (
                          <Link href={`/leads/${company.lead_id}`} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
                              View <ExternalLink className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => importMutation.mutate([company])}
                        disabled={importMutation.isPending}
                        className="h-8 text-xs font-medium"
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Add
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableShell>

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Menampilkan halaman {meta.current_page} dari {meta.last_page} ({meta.total.toLocaleString()} total)
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
            >
              Previous
            </Button>
            
            {getPageNumbers().map((pageNumber) => (
              <Button
                key={pageNumber}
                variant={page === pageNumber ? "default" : "outline"}
                size="sm"
                className="w-9 h-8 p-0"
                onClick={() => setPage(pageNumber)}
                disabled={isLoading}
              >
                {pageNumber}
              </Button>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= meta.last_page || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
