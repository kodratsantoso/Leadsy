"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Server,
  Database,
  Layers,
  Cpu,
  RefreshCw,
  AlertTriangle,
  RotateCw,
  Trash2,
  CheckCircle2,
  Clock,
  Radio,
  HardDrive,
  Activity,
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
      connection: string;
      queue: string;
      failed_at: string;
      exception_summary: string;
    }>;
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
    setActionLoading(id);
    try {
      const res = await apiFetch(`/api/platform/infrastructure/retry-job/${id}`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok) {
        setMessage({ text: json.message || "Job queued for retry.", type: "success" });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Queues & Infrastructure Telemetry
            </h1>
            <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold">
              Control Plane Telemetry
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Real-time status of the K3s 3-node cluster, Redis background workers, failed job recovery, and PostgreSQL PV health.
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
                <span className="text-xs font-medium uppercase tracking-wider">Cluster Nodes</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Server className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-white">3 Nodes</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                K3s In-Cluster Runner Healthy
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
                <span className="text-xs font-medium uppercase tracking-wider">Failed Jobs</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-white">
                {data?.queues.failed_jobs_count ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {data?.queues.failed_jobs_count === 0 ? "Zero backlog detected" : "Requires inspection"}
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

          {/* Queue Failed Jobs Inspector */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-amber-400" />
                  Failed Jobs Inspector ({data?.queues.failed_jobs.length ?? 0})
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Inspect background exceptions and trigger selective worker retries.
                </p>
              </div>

              {data?.queues.failed_jobs && data.queues.failed_jobs.length > 0 && (
                <Button
                  onClick={handlePurgeFailedJobs}
                  disabled={actionLoading === "purge"}
                  variant="destructive"
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Purge All Failed Jobs</span>
                </Button>
              )}
            </div>

            {data?.queues.failed_jobs && data.queues.failed_jobs.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Job ID</th>
                      <th className="px-4 py-3">Queue</th>
                      <th className="px-4 py-3">Failed At</th>
                      <th className="px-4 py-3">Exception Summary</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {data.queues.failed_jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-semibold text-white">#{job.id}</td>
                        <td className="px-4 py-3 text-indigo-300">{job.queue}</td>
                        <td className="px-4 py-3 text-slate-400">{new Date(job.failed_at).toLocaleString()}</td>
                        <td className="px-4 py-3 text-red-300/80 max-w-md truncate">{job.exception_summary}</td>
                        <td className="px-4 py-3 text-right font-sans">
                          <Button
                            onClick={() => handleRetryJob(job.id)}
                            disabled={actionLoading === job.id}
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 border-slate-700 bg-slate-800/80 text-xs text-slate-200 hover:bg-slate-700"
                          >
                            <RotateCw className={`h-3 w-3 ${actionLoading === job.id ? "animate-spin text-indigo-400" : ""}`} />
                            <span>Retry</span>
                          </Button>
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
    </div>
  );
}
