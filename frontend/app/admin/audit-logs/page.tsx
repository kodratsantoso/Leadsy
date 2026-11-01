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
    if (action.includes("impersonate")) return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";
    if (action.includes("provision") || action.includes("created")) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    if (action.includes("delete") || action.includes("suspended")) return "border-destructive/30 bg-destructive/10 text-destructive";
    return "border-primary/30 bg-primary/10 text-primary";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Jejak Audit & Keamanan Platform
            </h1>
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs font-semibold">
              Kepatuhan & Keamanan
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Catatan log immutable seluruh aktivitas superadmin, provisi tenant, modifikasi fitur, dan impersonasi dukungan.
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
            className="h-8 gap-1.5 rounded-lg border-border bg-card text-xs text-foreground hover:bg-muted"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
            <span>Segarkan Log</span>
          </Button>
        </div>
      </div>

      {/* Search and Table */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Catatan Audit ({totalCount})
            </h2>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari aksi atau alamat IP..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 pl-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : logs.length > 0 ? (
          <>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/60 text-[11px] font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-4 py-3">Aksi</th>
                    <th className="px-4 py-3">Tenant ID</th>
                    <th className="px-4 py-3">Pelaku (Actor)</th>
                    <th className="px-4 py-3">Alamat IP</th>
                    <th className="px-4 py-3">Rincian Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground text-[11px]">
                        {new Date(log.created_at).toLocaleString("id-ID")}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-[10px] uppercase font-mono ${getActionColor(log.action)}`}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {log.tenant_id ? `#${log.tenant_id}` : "Global"}
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {log.user_id ? `User #${log.user_id}` : "System"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{log.ip_address || "127.0.0.1"}</td>
                      <td className="px-4 py-3 max-w-xs truncate text-[11px] text-muted-foreground">
                        {log.after_value ? JSON.stringify(log.after_value) : log.new_values ? JSON.stringify(log.new_values) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Halaman {page} dari {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    size="sm"
                    variant="outline"
                    className="h-7 border-border text-xs text-foreground hover:bg-muted"
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    size="sm"
                    variant="outline"
                    className="h-7 border-border text-xs text-foreground hover:bg-muted"
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center text-muted-foreground">
            <Terminal className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-semibold text-foreground">Tidak Ada Catatan Audit</p>
            <p className="mt-1 text-xs">Tidak ada data log yang cocok dengan filter pencarian Anda.</p>
          </div>
        )}
      </div>
    </div>
  );
}
