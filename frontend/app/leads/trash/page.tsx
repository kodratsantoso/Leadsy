"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Trash2,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  RefreshCw,
  Info,
} from "lucide-react";

import { useAuthStore } from "@/store/useAuthStore";
import { apiFetch } from "@/lib/apiFetch";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterBar, FilterBarSearch } from "@/components/ui/filter-bar";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableShell,
} from "@/components/ui/table";

type TrashedLead = {
  id: number;
  company_name: string;
  brand?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  deleted_at: string;
  created_at: string;
  retention_days: number;
  purge_at: string;
  days_remaining: number;
  hours_remaining: number;
  is_expired: boolean;
  retention_status: "active" | "expiring_soon" | "expired";
  industry?: { id: number; name: string } | null;
  sources?: Array<{
    id: number;
    source_type: string;
    channel_type?: { name: string } | null;
  }>;
  owner?: { id: number; name: string } | null;
};

type TrashSummary = {
  total_deleted: number;
  within_retention: number;
  expiring_soon: number;
  expired: number;
  retention_days: number;
};

type TrashResponse = {
  data: TrashedLead[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  summary: TrashSummary;
};

function formatDate(isoString: string): string {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getRelativeDays(isoString: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Hari ini";
  if (diffDays === 1) return "1 hari lalu";
  return `${diffDays} hari lalu`;
}

export default function DeletedLeadsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role?.name === "super_admin";

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [search, setSearch] = useState("");
  const [retentionStatus, setRetentionStatus] = useState("all");
  const [sourceType, setSourceType] = useState("");
  const [retentionDays, setRetentionDays] = useState(90);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals state
  const [restoreModalLead, setRestoreModalLead] = useState<TrashedLead | null>(null);
  const [forceDeleteModalLead, setForceDeleteModalLead] = useState<TrashedLead | null>(null);
  const [batchRestoreOpen, setBatchRestoreOpen] = useState(false);
  const [batchForceDeleteOpen, setBatchForceDeleteOpen] = useState(false);
  const [purgeExpiredOpen, setPurgeExpiredOpen] = useState(false);

  // Query Trashed Leads
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<TrashResponse>({
    queryKey: ["leads-trash", page, perPage, search, retentionStatus, sourceType, retentionDays],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("per_page", String(perPage));
      params.set("retention_days", String(retentionDays));
      if (search.trim()) params.set("search", search.trim());
      if (retentionStatus !== "all") params.set("retention_status", retentionStatus);
      if (sourceType) params.set("source_type", sourceType);

      const res = await apiFetch(`/leads/trash?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Gagal memuat daftar lead terhapus");
      }
      return res.json();
    },
  });

  const leads = data?.data ?? [];
  const meta = data?.meta ?? { current_page: 1, last_page: 1, per_page: perPage, total: 0 };
  const summary = data?.summary ?? {
    total_deleted: 0,
    within_retention: 0,
    expiring_soon: 0,
    expired: 0,
    retention_days: retentionDays,
  };

  // Restore Single Lead Mutation
  const restoreMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/leads/${id}/restore`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Gagal memulihkan lead");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads-trash"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setRestoreModalLead(null);
      setFeedback({ type: "success", message: "Lead berhasil dipulihkan ke daftar aktif." });
    },
    onError: (err: Error) => {
      setFeedback({ type: "error", message: err.message });
    },
  });

  // Batch Restore Mutation
  const batchRestoreMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiFetch("/leads/batch-restore", {
        method: "POST",
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Gagal memulihkan lead terpilih");
      }
      return res.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["leads-trash"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setSelectedIds([]);
      setBatchRestoreOpen(false);
      setFeedback({ type: "success", message: res.message || "Leads berhasil dipulihkan." });
    },
    onError: (err: Error) => {
      setFeedback({ type: "error", message: err.message });
      setBatchRestoreOpen(false);
    },
  });

  // Force Delete Single Mutation
  const forceDeleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/leads/${id}/force-delete`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Gagal menghapus lead permanen");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads-trash"] });
      setForceDeleteModalLead(null);
      setFeedback({ type: "success", message: "Lead telah dihapus permanen dari database." });
    },
    onError: (err: Error) => {
      setFeedback({ type: "error", message: err.message });
    },
  });

  // Batch Force Delete Mutation
  const batchForceDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await apiFetch("/leads/batch-force-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Gagal menghapus lead permanen");
      }
      return res.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["leads-trash"] });
      setSelectedIds([]);
      setBatchForceDeleteOpen(false);
      setFeedback({ type: "success", message: res.message || "Leads berhasil dihapus permanen." });
    },
    onError: (err: Error) => {
      setFeedback({ type: "error", message: err.message });
      setBatchForceDeleteOpen(false);
    },
  });

  // Purge Expired Leads Mutation
  const purgeExpiredMutation = useMutation({
    mutationFn: async (days: number) => {
      const res = await apiFetch("/leads/purge-expired", {
        method: "POST",
        body: JSON.stringify({ retention_days: days }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Gagal membersihkan lead kedaluwarsa");
      }
      return res.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["leads-trash"] });
      setPurgeExpiredOpen(false);
      setFeedback({ type: "success", message: res.message || "Lead kedaluwarsa berhasil dibersihkan." });
    },
    onError: (err: Error) => {
      setFeedback({ type: "error", message: err.message });
      setPurgeExpiredOpen(false);
    },
  });

  // Multi-select handlers
  const allCurrentIds = leads.map((l) => l.id);
  const isAllSelected = allCurrentIds.length > 0 && allCurrentIds.every((id) => selectedIds.includes(id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allCurrentIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...allCurrentIds])));
    }
  };

  const toggleSelectLead = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  return (
    <div className="space-y-6 p-6">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/leads"
              className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Kembali ke Active Leads
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Trash2 className="h-6 w-6 text-rose-500" />
            Keranjang Sampah & Retensi Leads
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Daftar lead yang diarsipkan/dihapus dengan pemantauan batas waktu retensi otomatis sebelum dihapus permanen.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isFetching && "animate-spin")} />
            Segarkan
          </Button>

          {isSuperAdmin && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setPurgeExpiredOpen(true)}
              disabled={summary.expired === 0}
              className="text-xs"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Bersihkan Expired ({summary.expired})
            </Button>
          )}
        </div>
      </div>

      {/* Feedback Toast/Alert */}
      {feedback && (
        <div
          className={cn(
            "p-3.5 rounded-xl border text-sm flex items-center justify-between shadow-xs transition-all",
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
          )}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFeedback(null)}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            ✕
          </Button>
        </div>
      )}

      {/* KPI Retention Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Trashed */}
        <Card className="border border-border/70 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium">
              <span>Total di Keranjang Sampah</span>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">
              {isLoading ? <span className="inline-block h-7 w-16 bg-muted animate-pulse rounded" /> : summary.total_deleted}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Seluruh lead berstatus soft-deleted</p>
          </CardContent>
        </Card>

        {/* Card 2: Within Retention */}
        <Card className="border border-border/70 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Dalam Masa Retensi
              </span>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {isLoading ? <span className="inline-block h-7 w-16 bg-muted animate-pulse rounded" /> : summary.within_retention}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Aman & dapat dipulihkan sewaktu-waktu</p>
          </CardContent>
        </Card>

        {/* Card 3: Expiring Soon */}
        <Card className="border border-border/70 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium text-amber-600 dark:text-amber-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Segera Kedaluwarsa (≤14 Hari)
              </span>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {isLoading ? <span className="inline-block h-7 w-16 bg-muted animate-pulse rounded" /> : summary.expiring_soon}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Mendekati batas waktu pembersihan</p>
          </CardContent>
        </Card>

        {/* Card 4: Retention Policy & Expired */}
        <Card className="border border-border/70 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium text-rose-600 dark:text-rose-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Kedaluwarsa / Siap Purge
              </span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {isLoading ? <span className="inline-block h-7 w-16 bg-muted animate-pulse rounded" /> : summary.expired}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Jendela Retensi:</span>
              <select
                value={retentionDays}
                onChange={(e) => {
                  setRetentionDays(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-transparent font-semibold text-foreground border-b border-border/80 focus:outline-none cursor-pointer"
              >
                <option value={30}>30 Hari</option>
                <option value={60}>60 Hari</option>
                <option value={90}>90 Hari (Default)</option>
                <option value={180}>180 Hari</option>
              </select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <FilterBar className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs">
        <FilterBarSearch
          placeholder="Cari nama perusahaan, email, atau telepon..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-md"
        />

        <div className="flex flex-wrap items-center gap-2.5 ml-auto">
          {/* Filter: Retention Status */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span>Status:</span>
            <select
              value={retentionStatus}
              onChange={(e) => {
                setRetentionStatus(e.target.value);
                setPage(1);
              }}
              className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="active">Dalam Retensi</option>
              <option value="expiring_soon">Segera Kedaluwarsa (≤14d)</option>
              <option value="expired">Kedaluwarsa</option>
            </select>
          </div>

          {/* Filter: Source */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Sumber:</span>
            <select
              value={sourceType}
              onChange={(e) => {
                setSourceType(e.target.value);
                setPage(1);
              }}
              className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              <option value="">Semua Sumber</option>
              <option value="lark_base">Lark Base</option>
              <option value="google_maps">Google Maps</option>
              <option value="website">Website</option>
              <option value="manual">Manual</option>
              <option value="lark">Lark</option>
            </select>
          </div>

          {/* Page size */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Baris:</span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none cursor-pointer"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </FilterBar>

      {/* Floating Multi-Select Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-4 z-20 flex items-center justify-between p-3.5 bg-card/95 backdrop-blur border border-primary/30 rounded-2xl shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Badge variant="neutral" className="px-2.5 py-1 text-xs font-semibold">
              {selectedIds.length} lead dipilih
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Pilih tindakan untuk data yang ditandai:
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBatchRestoreOpen(true)}
                className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-600 hover:text-white dark:text-emerald-400 text-xs font-medium"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Pulihkan Terpilih ({selectedIds.length})
              </Button>
            )}

            {isSuperAdmin && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBatchForceDeleteOpen(true)}
                className="text-xs font-medium"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Hapus Permanen ({selectedIds.length})
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="text-xs text-muted-foreground"
            >
              Batal
            </Button>
          </div>
        </div>
      )}

      {/* Main Table Shell */}
      <TableShell>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell className="w-10 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  aria-label="Pilih semua lead pada halaman ini"
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                />
              </TableHeaderCell>
              <TableHeaderCell>Perusahaan & Kontak</TableHeaderCell>
              <TableHeaderCell>Sumber Asal</TableHeaderCell>
              <TableHeaderCell>Tanggal Dihapus</TableHeaderCell>
              <TableHeaderCell>Sisa Waktu Retensi</TableHeaderCell>
              <TableHeaderCell>Batas Hapus Permanen</TableHeaderCell>
              <TableHeaderCell className="text-right">Aksi</TableHeaderCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {/* Loading State: Shimmer Skeletons */}
            {isLoading &&
              Array.from({ length: 6 }).map((_, idx) => (
                <TableRow key={`skeleton-${idx}`}>
                  <TableCell className="text-center">
                    <div className="h-4 w-4 bg-muted animate-pulse rounded mx-auto" />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1.5">
                      <div className="h-4 w-40 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-28 bg-muted animate-pulse rounded" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="h-5 w-20 bg-muted animate-pulse rounded-full" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-28 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="h-5 w-32 bg-muted animate-pulse rounded-full" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-28 bg-muted animate-pulse rounded" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="h-8 w-20 bg-muted animate-pulse rounded ml-auto" />
                  </TableCell>
                </TableRow>
              ))}

            {/* Error State */}
            {isError && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <div className="max-w-md mx-auto space-y-3">
                    <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
                    <p className="text-sm font-semibold text-foreground">Gagal memuat data dari server</p>
                    <p className="text-xs text-muted-foreground">{error?.message || "Terjadi kesalahan jaringan"}</p>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      Coba Lagi
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {/* Empty State */}
            {!isLoading && !isError && leads.length === 0 && (
              <TableEmpty colSpan={7}>
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Trash2 className="h-6 w-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">Tidak ada lead di keranjang sampah</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      {search || retentionStatus !== "all" || sourceType
                        ? "Tidak ada data yang cocok dengan kriteria pencarian atau filter saat ini."
                        : "Semua data lead dalam kondisi aktif di pipeline presales."}
                    </p>
                  </div>
                  {(search || retentionStatus !== "all" || sourceType) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearch("");
                        setRetentionStatus("all");
                        setSourceType("");
                        setPage(1);
                      }}
                    >
                      Reset Filter
                    </Button>
                  )}
                </div>
              </TableEmpty>
            )}

            {/* Hydrated Rows */}
            {!isLoading &&
              !isError &&
              leads.map((lead) => {
                const isSelected = selectedIds.includes(lead.id);
                const primarySource = lead.sources?.[0]?.source_type || "-";

                return (
                  <TableRow
                    key={lead.id}
                    className={cn(isSelected && "bg-muted/40", lead.is_expired && "opacity-80")}
                  >
                    {/* Checkbox */}
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectLead(lead.id)}
                        aria-label={`Pilih lead ${lead.company_name}`}
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                      />
                    </TableCell>

                    {/* Company & Details */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="font-medium text-foreground flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{lead.company_name}</span>
                          {lead.brand && (
                            <span className="text-xs font-normal text-muted-foreground">
                              ({lead.brand})
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          {lead.phone && <span>📞 {lead.phone}</span>}
                          {lead.email && <span>✉️ {lead.email}</span>}
                          {!lead.phone && !lead.email && <span>ID: #{lead.id}</span>}
                        </div>
                      </div>
                    </TableCell>

                    {/* Source */}
                    <TableCell>
                      <Badge
                        variant="neutral"
                        className={cn(
                          "text-[11px] font-normal capitalize px-2 py-0.5",
                          primarySource === "lark_base" && "bg-sky-500/10 text-sky-600 border-sky-500/20",
                          primarySource === "google_maps" && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                          primarySource === "website" && "bg-purple-500/10 text-purple-600 border-purple-500/20"
                        )}
                      >
                        {primarySource.replace("_", " ")}
                      </Badge>
                    </TableCell>

                    {/* Deleted Date */}
                    <TableCell>
                      <div className="text-xs text-foreground">{formatDate(lead.deleted_at)}</div>
                      <div className="text-[11px] text-muted-foreground">{getRelativeDays(lead.deleted_at)}</div>
                    </TableCell>

                    {/* Retention Countdown Badge */}
                    <TableCell>
                      {lead.is_expired ? (
                        <Badge
                          variant="danger"
                          className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-xs font-medium flex items-center gap-1 w-fit"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          Kedaluwarsa
                        </Badge>
                      ) : lead.days_remaining <= 14 ? (
                        <Badge
                          variant="outline"
                          className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs font-medium flex items-center gap-1 w-fit"
                        >
                          <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                          {lead.days_remaining === 1 && lead.hours_remaining <= 24
                            ? `${lead.hours_remaining} jam tersisa`
                            : `${lead.days_remaining} hari tersisa`}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs font-medium flex items-center gap-1 w-fit"
                        >
                          <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          {lead.days_remaining} hari tersisa
                        </Badge>
                      )}
                    </TableCell>

                    {/* Purge Date */}
                    <TableCell>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <span>{formatDate(lead.purge_at)}</span>
                      </div>
                    </TableCell>

                    {/* Action Buttons */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRestoreModalLead(lead)}
                          className="h-8 px-2.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/30"
                          title="Pulihkan lead ke pipeline aktif"
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1" />
                          Pulihkan
                        </Button>

                        {isSuperAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setForceDeleteModalLead(lead)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                            title="Hapus permanen"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </TableShell>

      {/* Pagination Footer */}
      {!isLoading && !isError && meta.total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground pt-2">
          <div>
            Menampilkan <span className="font-medium text-foreground">{(meta.current_page - 1) * meta.per_page + 1}</span> hingga{" "}
            <span className="font-medium text-foreground">
              {Math.min(meta.current_page * meta.per_page, meta.total)}
            </span>{" "}
            dari <span className="font-medium text-foreground">{meta.total}</span> lead terhapus
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={meta.current_page <= 1 || isFetching}
              className="h-8 text-xs"
            >
              Sebelumnya
            </Button>
            <span className="px-2">
              Halaman {meta.current_page} dari {meta.last_page}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
              disabled={meta.current_page >= meta.last_page || isFetching}
              className="h-8 text-xs"
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}

      {/* Modal: Single Restore */}
      <Modal
        open={Boolean(restoreModalLead)}
        onOpenChange={(open) => !open && setRestoreModalLead(null)}
        title="Pulihkan Lead"
        description="Lead ini akan dikembalikan ke daftar lead aktif di pipeline presales."
      >
        <div className="space-y-4 py-2">
          <p className="text-sm text-foreground">
            Anda akan memulihkan data lead untuk:{" "}
            <strong className="text-primary">{restoreModalLead?.company_name}</strong>.
          </p>
          <div className="p-3 bg-muted/50 rounded-xl text-xs space-y-1 text-muted-foreground">
            <div>• Tanggal Dihapus: {restoreModalLead ? formatDate(restoreModalLead.deleted_at) : "-"}</div>
            <div>• Sisa Retensi: {restoreModalLead?.days_remaining ?? 0} hari</div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setRestoreModalLead(null)}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={() => restoreModalLead && restoreMutation.mutate(restoreModalLead.id)}
              disabled={restoreMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {restoreMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Pulihkan Sekarang
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Batch Restore */}
      <Modal
        open={batchRestoreOpen}
        onOpenChange={setBatchRestoreOpen}
        title="Pulihkan Leads Terpilih"
        description="Semua data lead yang dipilih akan dipulihkan kembali ke pipeline aktif."
      >
        <div className="space-y-4 py-2">
          <p className="text-sm text-foreground">
            Apakah Anda yakin ingin memulihkan <strong>{selectedIds.length} leads</strong> terpilih?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setBatchRestoreOpen(false)}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={() => batchRestoreMutation.mutate(selectedIds)}
              disabled={batchRestoreMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {batchRestoreMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Pulihkan {selectedIds.length} Leads
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Single Force Delete */}
      <Modal
        open={Boolean(forceDeleteModalLead)}
        onOpenChange={(open) => !open && setForceDeleteModalLead(null)}
        title="Hapus Lead Permanen"
        description="PERINGATAN: Tindakan ini tidak dapat dibatalkan!"
      >
        <div className="space-y-4 py-2">
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              Data lead <strong>{forceDeleteModalLead?.company_name}</strong> dan seluruh riwayat relasinya akan dihapus
              secara fisik dari database PostgreSQL dan tidak dapat dikembalikan lagi.
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setForceDeleteModalLead(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => forceDeleteModalLead && forceDeleteMutation.mutate(forceDeleteModalLead.id)}
              disabled={forceDeleteMutation.isPending}
            >
              {forceDeleteMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Ya, Hapus Permanen
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Batch Force Delete */}
      <Modal
        open={batchForceDeleteOpen}
        onOpenChange={setBatchForceDeleteOpen}
        title="Hapus Permanen Leads Terpilih"
        description="PERINGATAN: Tindakan penghapusan massal ini tidak dapat dibatalkan!"
      >
        <div className="space-y-4 py-2">
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              Sebanyak <strong>{selectedIds.length} leads</strong> akan dihapus secara fisik dan permanen dari
              database. Tindakan ini tidak dapat dipulihkan.
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setBatchForceDeleteOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => batchForceDeleteMutation.mutate(selectedIds)}
              disabled={batchForceDeleteMutation.isPending}
            >
              {batchForceDeleteMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Hapus Permanen {selectedIds.length} Data
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Purge Expired */}
      <Modal
        open={purgeExpiredOpen}
        onOpenChange={setPurgeExpiredOpen}
        title="Bersihkan Seluruh Lead Kedaluwarsa"
        description="Menghapus permanen lead yang telah melewati periode retensi."
      >
        <div className="space-y-4 py-2">
          <p className="text-sm text-foreground">
            Sistem akan menghapus permanen sebanyak <strong>{summary.expired} leads</strong> yang masa retensinya telah
            kedaluwarsa (&gt; {retentionDays} hari sejak dihapus).
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setPurgeExpiredOpen(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => purgeExpiredMutation.mutate(retentionDays)}
              disabled={purgeExpiredMutation.isPending}
            >
              {purgeExpiredMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Bersihkan {summary.expired} Data Sekarang
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
