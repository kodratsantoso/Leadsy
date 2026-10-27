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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Queues, DLQ & Infrastructure Telemetry
            </h1>
            <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold">
              Sprint 2 Production Observability
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Real-time status of K3s pods, Redis background workers, Dead-Letter Queue (DLQ), Semantic Redis Cache, and PostgreSQL PV health.
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
            className="h-8 gap-1.5 rounded-lg border-slate-700 bg-slate-900/80 text-xs text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-indigo-400" : ""}`} />
            <span>Refresh Telemetry</span>
          </Button>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs ${
            message.type === "success"
              ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-300"
              : "border-red-500/30 bg-red-950/30 text-red-300"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">
            ×
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      ) : (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium uppercase tracking-wider">Cluster Pods</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Server className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-white">3 Nodes</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Zero-Downtime Rollout Configured
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium uppercase tracking-wider">Redis Worker Queue</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Layers className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-white">
                {data?.queues.pending_jobs ?? 0} <span className="text-xs text-slate-400 font-normal">pending</span>
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-indigo-300">
                Driver: <span className="font-mono">{data?.queues.driver}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium uppercase tracking-wider">Dead-Letter Queue (DLQ)</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-white">
                {data?.queues.failed_jobs_count ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {data?.queues.failed_jobs_count === 0 ? "Zero backlog detected" : "Failed jobs in DLQ"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium uppercase tracking-wider">PostgreSQL PV</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                  <HardDrive className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-white">SSOT Persisted</p>
              <p className="mt-1 text-xs text-cyan-300 truncate">
                {data?.database.version}
              </p>
            </div>
          </div>

          {/* Semantic Cache Performance Section */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  Semantic Redis Cache & Cost Efficiency
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Caches scraped URL contents (14-day TTL), company profiles, and duplicate AI inference prompts to optimize external token consumption.
                </p>
              </div>

              <Button
                onClick={handleResetSemanticCache}
                disabled={actionLoading === "reset-cache"}
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-lg border-slate-700 bg-slate-800 text-xs text-slate-300 hover:text-white"
              >
                <RefreshCw className={`h-3 w-3 ${actionLoading === "reset-cache" ? "animate-spin" : ""}`} />
                <span>Reset Cache Telemetry</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <span className="text-[11px] font-medium uppercase text-slate-400">Hit Rate</span>
                <p className="mt-2 text-2xl font-bold text-emerald-400">
                  {data?.semantic_cache?.hit_rate_pct ?? 0}%
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {data?.semantic_cache?.hits ?? 0} hits / {data?.semantic_cache?.total_requests ?? 0} total calls
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <span className="text-[11px] font-medium uppercase text-slate-400">Bandwidth Saved</span>
                <p className="mt-2 text-2xl font-bold text-cyan-400">
                  {formatBytes(data?.semantic_cache?.bytes_saved ?? 0)}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Scraped websites cached in Redis
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <span className="text-[11px] font-medium uppercase text-slate-400">Est. LLM Tokens Saved</span>
                <p className="mt-2 text-2xl font-bold text-indigo-400">
                  {(data?.semantic_cache?.estimated_tokens_saved ?? 0).toLocaleString()} tokens
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Saved via semantic prompt & profile deduplication
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <span className="text-[11px] font-medium uppercase text-slate-400">Category Breakdown</span>
                <div className="mt-2 space-y-1 text-[11px] text-slate-300">
                  <div className="flex justify-between">
                    <span>Web Scrape:</span>
                    <span className="font-mono text-emerald-300">{data?.semantic_cache?.by_category?.scrape.hits ?? 0} hits</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Company Profile:</span>
                    <span className="font-mono text-indigo-300">{data?.semantic_cache?.by_category?.company.hits ?? 0} hits</span>
                  </div>
                  <div className="flex justify-between">
                    <span>AI Inference:</span>
                    <span className="font-mono text-amber-300">{data?.semantic_cache?.by_category?.ai.hits ?? 0} hits</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Microservices Health Section */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
              <Radio className="h-4 w-4 text-indigo-400" />
              Connected Microservices & Gateways
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {data?.services.map((svc, i) => (
                <div key={i} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">{svc.name}</span>
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px]">
                      {svc.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">{svc.type}</p>
                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/60 pt-2">
                    <span>Performance Metric</span>
                    <span className="font-mono text-slate-300 font-semibold">
                      {svc.latency || svc.rate_limit_remaining || svc.default_model}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Queue Failed Jobs Inspector (DLQ) */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-amber-400" />
                  Dead-Letter Queue (DLQ) Inspector ({data?.queues.failed_jobs.length ?? 0})
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Inspect background exceptions, view stack traces, and trigger selective or bulk worker retries.
                </p>
              </div>

              {data?.queues.failed_jobs && data.queues.failed_jobs.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleRetryAllJobs}
                    disabled={actionLoading === "retry-all"}
                    size="sm"
                    className="h-8 gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white"
                  >
                    <RotateCw className={`h-3.5 w-3.5 ${actionLoading === "retry-all" ? "animate-spin" : ""}`} />
                    <span>Retry All Jobs</span>
                  </Button>
                  <Button
                    onClick={handlePurgeFailedJobs}
                    disabled={actionLoading === "purge"}
                    variant="destructive"
                    size="sm"
                    className="h-8 gap-1.5 rounded-lg text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Purge DLQ</span>
                  </Button>
                </div>
              )}
            </div>

            {data?.queues.failed_jobs && data.queues.failed_jobs.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Job ID</th>
                      <th className="px-4 py-3">Job Class</th>
                      <th className="px-4 py-3">Queue</th>
                      <th className="px-4 py-3">Failed At</th>
                      <th className="px-4 py-3">Exception Summary</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {data.queues.failed_jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-semibold text-white">#{job.id}</td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-200">{job.name || "Unknown Job"}</span>
                          {job.full_class && job.full_class !== job.name && (
                            <p className="text-[10px] text-slate-500 truncate max-w-xs">{job.full_class}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-indigo-300 font-sans">
                          <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-[10px]">
                            {job.queue}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-[11px] font-sans">
                          {new Date(job.failed_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 max-w-md">
                          <div className="flex items-center gap-1.5">
                            <span className="text-red-300/90 truncate">{job.exception_summary}</span>
                            <button
                              onClick={() => setSelectedException({
                                id: job.id,
                                name: job.name,
                                queue: job.queue,
                                exception: job.full_exception || job.exception_summary,
                              })}
                              className="text-slate-400 hover:text-white shrink-0 p-0.5"
                              title="View Full Stack Trace"
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
                              className="h-7 gap-1 border-slate-700 bg-slate-800/80 text-xs text-slate-200 hover:bg-slate-700"
                            >
                              <RotateCw className={`h-3 w-3 ${actionLoading === `retry-${job.id}` ? "animate-spin text-indigo-400" : ""}`} />
                              <span>Retry</span>
                            </Button>
                            <Button
                              onClick={() => handleDeleteFailedJob(job.id)}
                              disabled={actionLoading === `delete-${job.id}`}
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-slate-400 hover:text-red-400 hover:bg-red-950/20"
                              title="Dismiss / Delete Job"
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
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 py-10 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mb-2">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-slate-200">Zero Failed Jobs</p>
                <p className="mt-1 text-xs text-slate-400">The Redis queue worker pipeline is processing smoothly with zero exceptions.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Exception Detail Modal */}
      {selectedException && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Exception Detail: #{selectedException.id} ({selectedException.name || "Job"})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Queue: <span className="text-indigo-300 font-mono">{selectedException.queue}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedException(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-xl border border-slate-800/80 bg-slate-950 p-4 font-mono text-xs text-red-300/90 leading-relaxed whitespace-pre-wrap">
              {selectedException.exception}
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-800 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedException(null)}
                className="border-slate-700 text-xs"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const id = selectedException.id;
                  setSelectedException(null);
                  handleRetryJob(id);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-xs text-white gap-1"
              >
                <RotateCw className="h-3 w-3" />
                <span>Retry This Job</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
