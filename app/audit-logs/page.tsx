"use client";

import { useState } from "react";
import { FileText, Search, ChevronLeft, ChevronRight, Loader2, Download, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";

const actionColors: Record<string, string> = {
  created: "bg-emerald-500/10 text-emerald-500",
  updated: "bg-blue-500/10 text-blue-500",
  deleted: "bg-red-500/10 text-red-500",
  login: "bg-indigo-500/10 text-indigo-500",
  login_failed: "bg-red-500/10 text-red-500",
  logout: "bg-gray-500/10 text-gray-400",
  access_denied: "bg-amber-500/10 text-amber-500",
  export: "bg-amber-500/10 text-amber-500",
};

export default function AuditLogsPage() {
  const [moduleFilter, setModuleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [searchQ, setSearchQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, moduleFilter, searchQ, dateFrom, dateTo],
    queryFn: async () => {
      let url = `/audit-logs?page=${page}`;
      if (moduleFilter !== "all") url += `&module=${moduleFilter}`;
      if (searchQ) url += `&search=${encodeURIComponent(searchQ)}`;
      if (dateFrom) url += `&date_from=${dateFrom}`;
      if (dateTo) url += `&date_to=${dateTo}`;
      const res = await apiFetch(url);
      return res.json();
    },
  });

  const logs = data?.data || [];
  const modules = ["all", "system", "auth", "leads", "products", "industries", "users", "ai_providers", "whatsapp", "settings"];

  const exportData = (format: "txt" | "xlsx") => {
    if (format === "txt") {
      const lines = logs.map((log: any) =>
        `[${new Date(log.created_at).toISOString()}] ${log.user?.name ?? "System"} | ${log.action} | ${log.module} | ${log.record_type ? `${log.record_type.split("\\").pop()}#${log.record_id}` : "—"} | IP: ${log.ip_address || "—"}`
      );
      const blob = new Blob([lines.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.txt`; a.click();
      URL.revokeObjectURL(url);
    } else {
      // XLSX export using CSV as intermediate (browser-compatible without library)
      const header = "Timestamp,User,Action,Status,Module,Record,IP,Route";
      const rows = logs.map((log: any) =>
        [
          new Date(log.created_at).toISOString(),
          `"${log.user?.name ?? "System"}"`,
          log.action,
          log.status || "success",
          log.module,
          log.record_type ? `${log.record_type.split("\\").pop()}#${log.record_id}` : "",
          log.ip_address || "",
          log.route_path || "",
        ].join(",")
      );
      const csv = [header, ...rows].join("\n");
      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">Complete activity trail — BRD §5.2</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportData("txt")} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
            <Download className="h-3.5 w-3.5" /> Export TXT
          </button>
          <button onClick={() => exportData("xlsx")} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
            <Download className="h-3.5 w-3.5" /> Export XLSX
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={searchQ} onChange={e => { setSearchQ(e.target.value); setPage(1); }} placeholder="Search logs..." className="h-9 w-64 rounded-lg border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="h-9 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
          <span className="text-xs text-muted-foreground">to</span>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="h-9 rounded-lg border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card p-0.5">
          {modules.map((m) => (
            <button key={m} onClick={() => { setModuleFilter(m); setPage(1); }} className={`rounded-md px-2.5 py-1.5 text-[10px] font-medium capitalize transition-colors ${moduleFilter === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
              <th className="px-5 py-3 font-medium">Timestamp</th>
              <th className="px-5 py-3 font-medium">User</th>
              <th className="px-5 py-3 font-medium">Action</th>
              <th className="px-5 py-3 font-medium">Module</th>
              <th className="px-5 py-3 font-medium">Record</th>
              <th className="px-5 py-3 font-medium">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {isLoading ? (
              <tr><td colSpan={6} className="py-20 text-center text-muted-foreground"><Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" />Loading audit logs...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="py-20 text-center text-muted-foreground">No audit logs found.</td></tr>
            ) : logs.map((log: any) => (
              <tr key={log.id} className="cursor-pointer transition-colors hover:bg-accent/20">
                <td className="px-5 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[9px] font-bold text-white">{log.user ? log.user.name.charAt(0) : "?"}</div>
                    <span className="text-xs font-medium truncate max-w-[100px] block" title={log.user?.name ?? "System / Guest"}>{log.user?.name ?? "System / Guest"}</span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className={`block w-max rounded-full px-2 py-0.5 text-[10px] font-semibold ${actionColors[log.action] ?? "bg-muted text-muted-foreground"}`}>{log.action}</span>
                  {log.status !== 'success' && (
                    <span className={`block w-max mt-1 rounded-full px-2 py-0.5 text-[9px] font-semibold ${log.status === 'denied' ? 'bg-amber-500/20 text-amber-600' : 'bg-red-500/20 text-red-600'}`}>{log.status}</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-col gap-1">
                    <span className="w-max rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium">{log.module}</span>
                    {log.route_path && <span className="text-[9px] font-mono text-muted-foreground break-all">{log.request_method} /{log.route_path}</span>}
                  </div>
                </td>
                <td className="px-5 py-3 text-xs text-muted-foreground font-mono">{log.record_type ? `${log.record_type.split('\\').pop()}#${log.record_id}` : "—"}</td>
                <td className="px-5 py-3 text-xs text-muted-foreground font-mono">{log.ip_address || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">Showing {data?.to || 0} of {data?.total || 0} entries</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50"><ChevronLeft className="h-3.5 w-3.5" /></button>
            <span className="px-2 text-xs font-medium">{page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={!data?.next_page_url} className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50"><ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
