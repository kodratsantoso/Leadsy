"use client";

import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, Search, RefreshCw, Calendar, Globe, User, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/apiFetch";

interface AuditLogItem {
  id: number;
  tenant_id?: number;
  user_id?: number;
  action: string;
  module?: string;
  record_type?: string;
  record_id?: number;
  before_value?: any;
  after_value?: any;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export default function PlatformAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(page));

      const res = await apiFetch(`/api/platform/audit-logs?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data || []);
        if (json.meta) {
          setTotalPages(json.meta.last_page || 1);
          setTotalCount(json.meta.total || 0);
        }
      }
    } catch (e) {
      console.error("Failed to load platform audit logs:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionColor = (action: string) => {
    if (action.includes("impersonate")) return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    if (action.includes("provision") || action.includes("created")) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    if (action.includes("delete") || action.includes("suspended")) return "border-red-500/30 bg-red-500/10 text-red-300";
    return "border-indigo-500/30 bg-indigo-500/10 text-indigo-300";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Platform Audit Trail & Security
            </h1>
            <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold">
              Compliance & Security
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Immutable log of all superadmin activities, tenant provisioning, feature modifications, and support impersonations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRefreshing(true);
              fetchLogs();
            }}
            disabled={refreshing}
            className="h-8 gap-1.5 rounded-lg border-slate-700 bg-slate-900/80 text-xs text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-indigo-400" : ""}`} />
            <span>Refresh Logs</span>
          </Button>
        </div>
      </div>

      {/* Search and Table */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Audit Records ({totalCount})
            </h2>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search action or IP..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 pl-8 text-xs text-slate-200 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
          </div>
        ) : logs.length > 0 ? (
          <>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Tenant ID</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">IP Address</th>
                    <th className="px-4 py-3">Payload Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-slate-400 text-[11px]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-[10px] uppercase font-mono ${getActionColor(log.action)}`}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {log.tenant_id ? `#${log.tenant_id}` : "Global"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {log.user_id ? `User #${log.user_id}` : "System"}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{log.ip_address || "127.0.0.1"}</td>
                      <td className="px-4 py-3 max-w-xs truncate text-[11px] text-slate-400">
                        {log.after_value ? JSON.stringify(log.after_value) : log.new_values ? JSON.stringify(log.new_values) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    size="sm"
                    variant="outline"
                    className="h-7 border-slate-800 text-xs text-slate-300"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    size="sm"
                    variant="outline"
                    className="h-7 border-slate-800 text-xs text-slate-300"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 py-12 text-center text-slate-400">
            <Terminal className="h-8 w-8 text-slate-500 mb-2" />
            <p className="text-sm font-semibold text-slate-300">No Audit Logs Found</p>
            <p className="mt-1 text-xs">No records matched your search filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
