"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Server,
  Layers,
  RefreshCw,
  AlertTriangle,
  RotateCw,
  Trash2,
  CheckCircle2,
  Radio,
  HardDrive,
  Activity,
  Zap,
  FileCode,
  X,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/apiFetch";

interface InfrastructureData {
  cluster: {
    name: string;
    status: string;
    environment: string;
    php_version: string;
    laravel_version: string;
    uptime: string;
    timestamp: string;
  };
  queues: {
    driver: string;
    status: string;
    pending_jobs: number;
    failed_jobs_count: number;
    failed_jobs: Array<{
      id: number;
      name?: string;
      full_class?: string;
      connection: string;
      queue: string;
      failed_at: string;
      exception_summary: string;
      full_exception?: string;
    }>;
  };
  semantic_cache?: {
    hits: number;
    misses: number;
    total_requests: number;
    hit_rate_pct: number;
    bytes_saved: number;
    estimated_tokens_saved: number;
    by_category?: {
      scrape: { hits: number; misses: number };
      company: { hits: number; misses: number };
      ai: { hits: number; misses: number };
    };
  };
  database: {
    connection: string;
    version: string;
    status: string;
    tables: {
      tenants: number;
      users: number;
      leads: number;
      audit_logs: number;
    };
  };
  services: Array<{
    name: string;
    type: string;
    status: string;
    latency?: string;
    rate_limit_remaining?: string;
    default_model?: string;
  }>;
}

export default function PlatformInfrastructurePage() {
  const [data, setData] = useState<InfrastructureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [selectedException, setSelectedException] = useState<{
    id: number;
    name?: string;
    queue: string;
    exception: string;
  } | null>(null);

  const fetchInfrastructure = useCallback(async () => {
    try {
      const res = await apiFetch("/api/platform/infrastructure");
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (e) {
      console.error("Failed to load infrastructure telemetry:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInfrastructure();
  }, [fetchInfrastructure]);

  const handleRetryJob = async (id: number) => {
    setActionLoading(`retry-${id}`);
    try {
      const res = await apiFetch(`/api/platform/infrastructure/retry-job/${id}`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok) {
        setMessage({ text: json.message || `Job #${id} queued for retry.`, type: "success" });
        fetchInfrastructure();
      } else {
        setMessage({ text: json.message || "Failed to retry job.", type: "error" });
      }
    } catch {
      setMessage({ text: "Error retrying job.", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetryAllJobs = async () => {
    setActionLoading("retry-all");
    try {
      const res = await apiFetch("/api/platform/infrastructure/retry-all-jobs", {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok) {
        setMessage({ text: json.message || "All failed jobs queued for retry.", type: "success" });
        fetchInfrastructure();
      } else {
        setMessage({ text: json.message || "Failed to retry all jobs.", type: "error" });
      }
    } catch {
      setMessage({ text: "Error retrying all jobs.", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteFailedJob = async (id: number) => {
    setActionLoading(`delete-${id}`);
    try {
      const res = await apiFetch(`/api/platform/infrastructure/failed-jobs/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok) {
        setMessage({ text: json.message || `Job #${id} removed.`, type: "success" });
        fetchInfrastructure();
      } else {
        setMessage({ text: json.message || "Failed to delete job.", type: "error" });
      }
    } catch {
      setMessage({ text: "Error deleting job.", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePurgeFailedJobs = async () => {
    setActionLoading("purge");
    try {
      const res = await apiFetch("/api/platform/infrastructure/purge-failed-jobs", {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok) {
        setMessage({ text: json.message || "Failed jobs purged.", type: "success" });
        fetchInfrastructure();
      } else {
        setMessage({ text: json.message || "Failed to purge jobs.", type: "error" });
      }
    } catch {
      setMessage({ text: "Error purging failed jobs.", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetSemanticCache = async () => {
    setActionLoading("reset-cache");
    try {
      const res = await apiFetch("/api/platform/infrastructure/reset-semantic-cache", {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok) {
        setMessage({ text: json.message || "Semantic cache metrics reset.", type: "success" });
        fetchInfrastructure();
      }
    } catch {
      setMessage({ text: "Error resetting semantic cache metrics.", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Antrean Job, DLQ & Telemetri Infrastruktur
            </h1>
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs font-semibold">
              Observabilitas Produksi
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Status real-time node K3s, background worker Redis, Dead-Letter Queue (DLQ), Semantic Redis Cache, dan persistensi volume PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRefreshing(true);
              fetchInfrastructure();
            }}
            disabled={refreshing}
            className="h-8 gap-1.5 rounded-lg border-border bg-card text-xs text-foreground hover:bg-muted"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
            <span>Segarkan Telemetri</span>
          </Button>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs ${
            message.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-muted-foreground hover:text-foreground">
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">Cluster Pods</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Server className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">3 Nodes</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Zero-Downtime Rollout Siap
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">Antrean Worker Redis</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Layers className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">
                {data?.queues.pending_jobs ?? 0} <span className="text-xs text-muted-foreground font-normal">tertunda</span>
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                Driver: <span className="font-mono text-foreground font-medium">{data?.queues.driver}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">Dead-Letter Queue (DLQ)</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">
                {data?.queues.failed_jobs_count ?? 0}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data?.queues.failed_jobs_count === 0 ? "Zero backlog (semua bersih)" : "Job gagal dalam DLQ"}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">PostgreSQL PV</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                  <HardDrive className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">SSOT Persisted</p>
              <p className="mt-1 text-xs text-muted-foreground truncate">
                {data?.database.version}
              </p>
            </div>
          </div>

          {/* Semantic Cache Performance Section */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Semantic Redis Cache & Efisiensi Biaya AI
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Menyimpan cache konten web (TTL 14 hari), profil perusahaan, dan inferensi prompt duplikat guna memangkas konsumsi token eksternal.
                </p>
              </div>

              <Button
                onClick={handleResetSemanticCache}
                disabled={actionLoading === "reset-cache"}
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-lg border-border bg-card text-xs text-foreground hover:bg-muted"
              >
                <RefreshCw className={`h-3 w-3 ${actionLoading === "reset-cache" ? "animate-spin" : ""}`} />
                <span>Reset Telemetri Cache</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <span className="text-[11px] font-medium uppercase text-muted-foreground">Tingkat Hit (Hit Rate)</span>
                <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {data?.semantic_cache?.hit_rate_pct ?? 0}%
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {data?.semantic_cache?.hits ?? 0} hit / {data?.semantic_cache?.total_requests ?? 0} total request
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <span className="text-[11px] font-medium uppercase text-muted-foreground">Bandwidth Dihemat</span>
                <p className="mt-2 text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                  {formatBytes(data?.semantic_cache?.bytes_saved ?? 0)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Web scraping yang tersimpan di Redis
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <span className="text-[11px] font-medium uppercase text-muted-foreground">Estimasi Token AI Dihemat</span>
                <p className="mt-2 text-2xl font-bold text-primary">
                  {(data?.semantic_cache?.estimated_tokens_saved ?? 0).toLocaleString()} token
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Dihasilkan melalui dedup prompt semantik
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <span className="text-[11px] font-medium uppercase text-muted-foreground">Rincian Kategori</span>
                <div className="mt-2 space-y-1 text-[11px] text-foreground">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Web Scrape:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">{data?.semantic_cache?.by_category?.scrape.hits ?? 0} hits</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Profil Perusahaan:</span>
                    <span className="font-mono text-primary">{data?.semantic_cache?.by_category?.company.hits ?? 0} hits</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Inferensi AI:</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400">{data?.semantic_cache?.by_category?.ai.hits ?? 0} hits</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Microservices Health Section */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4 flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary" />
              Microservices & Gateway Terhubung
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {data?.services.map((svc, i) => (
                <div key={i} className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{svc.name}</span>
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">
                      {svc.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{svc.type}</p>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border pt-2">
                    <span>Metrik Performa</span>
                    <span className="font-mono text-foreground font-semibold">
                      {svc.latency || svc.rate_limit_remaining || svc.default_model}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Queue Failed Jobs Inspector (DLQ) */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4 text-amber-500" />
                  Inspektur Dead-Letter Queue (DLQ) ({data?.queues.failed_jobs.length ?? 0})
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Periksa exception background, buka stack trace lengkap, dan jalankan retry secara selektif atau massal.
                </p>
              </div>

              {data?.queues.failed_jobs && data.queues.failed_jobs.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleRetryAllJobs}
                    disabled={actionLoading === "retry-all"}
                    size="sm"
                    className="h-8 gap-1.5 rounded-lg bg-primary hover:bg-primary/90 text-xs text-primary-foreground font-semibold shadow-xs"
                  >
                    <RotateCw className={`h-3.5 w-3.5 ${actionLoading === "retry-all" ? "animate-spin" : ""}`} />
                    <span>Ulangi Semua Job (Retry All)</span>
                  </Button>
                  <Button
                    onClick={handlePurgeFailedJobs}
                    disabled={actionLoading === "purge"}
                    variant="destructive"
                    size="sm"
                    className="h-8 gap-1.5 rounded-lg text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Hapus Bersih DLQ</span>
                  </Button>
                </div>
              )}
            </div>

            {data?.queues.failed_jobs && data.queues.failed_jobs.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/60 text-[11px] font-semibold uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Job ID</th>
                      <th className="px-4 py-3">Kelas Job</th>
                      <th className="px-4 py-3">Antrean</th>
                      <th className="px-4 py-3">Gagal Pada</th>
                      <th className="px-4 py-3">Ringkasan Exception</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono">
                    {data.queues.failed_jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground">#{job.id}</td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-foreground">{job.name || "Unknown Job"}</span>
                          {job.full_class && job.full_class !== job.name && (
                            <p className="text-[10px] text-muted-foreground truncate max-w-xs">{job.full_class}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-primary font-sans">
                          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-[10px]">
                            {job.queue}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-[11px] font-sans">
                          {new Date(job.failed_at).toLocaleString("id-ID")}
                        </td>
                        <td className="px-4 py-3 max-w-md">
                          <div className="flex items-center gap-1.5">
                            <span className="text-destructive truncate">{job.exception_summary}</span>
                            <button
                              onClick={() => setSelectedException({
                                id: job.id,
                                name: job.name,
                                queue: job.queue,
                                exception: job.full_exception || job.exception_summary,
                              })}
                              className="text-muted-foreground hover:text-foreground shrink-0 p-0.5 cursor-pointer"
                              title="Lihat Stack Trace Lengkap"
                            >
                              <FileCode className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-sans">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              onClick={() => handleRetryJob(job.id)}
                              disabled={actionLoading === `retry-${job.id}`}
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 border-border bg-card text-xs text-foreground hover:bg-muted"
                            >
                              <RotateCw className={`h-3 w-3 ${actionLoading === `retry-${job.id}` ? "animate-spin text-primary" : ""}`} />
                              <span>Retry</span>
                            </Button>
                            <Button
                              onClick={() => handleDeleteFailedJob(job.id)}
                              disabled={actionLoading === `delete-${job.id}`}
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Hapus Job Ini"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-foreground">Zero Failed Jobs</p>
                <p className="mt-1 text-xs text-muted-foreground">Pipeline Redis worker memproses antrean dengan lancar tanpa exception.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Exception Detail Modal */}
      {selectedException && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Detail Exception: #{selectedException.id} ({selectedException.name || "Job"})
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Antrean: <span className="text-primary font-mono font-medium">{selectedException.queue}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedException(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-xl border border-border bg-muted/40 p-4 font-mono text-xs text-destructive leading-relaxed whitespace-pre-wrap">
              {selectedException.exception}
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedException(null)}
                className="border-border text-xs"
              >
                Tutup
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const id = selectedException.id;
                  setSelectedException(null);
                  handleRetryJob(id);
                }}
                className="bg-primary hover:bg-primary/90 text-xs text-primary-foreground font-semibold gap-1 shadow-xs"
              >
                <RotateCw className="h-3 w-3" />
                <span>Retry Job Ini</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
