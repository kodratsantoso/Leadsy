"use client";

import { useState } from "react";
import { Search, ChevronLeft, ChevronRight, Loader2, Download, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiFetch";
import { ACTION_BADGE } from "@/lib/design";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableWrapper, Table, TableHead, TableHeaderCell, TableBody, TableRow, TableCell } from "@/components/ui/table";

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
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">Complete activity trail — BRD §5.2</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="soft" size="compact" onClick={() => exportData("txt")}>
            <Download className="h-3.5 w-3.5" /> Export TXT
          </Button>
          <Button variant="soft" size="compact" onClick={() => exportData("xlsx")}>
            <Download className="h-3.5 w-3.5" /> Export XLSX
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchQ} onChange={e => { setSearchQ(e.target.value); setPage(1); }} placeholder="Search logs..." className="w-64 pl-9" />
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="px-2 text-xs" />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="px-2 text-xs" />
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card p-0.5">
          {modules.map((m) => (
            <button key={m} onClick={() => { setModuleFilter(m); setPage(1); }}
              className={`rounded-md px-2.5 py-1.5 text-[10px] font-medium capitalize transition-colors ${moduleFilter === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <TableWrapper>
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Timestamp</TableHeaderCell>
              <TableHeaderCell>User</TableHeaderCell>
              <TableHeaderCell>Action</TableHeaderCell>
              <TableHeaderCell>Module</TableHeaderCell>
              <TableHeaderCell>Record</TableHeaderCell>
              <TableHeaderCell>IP</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-20 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" />Loading audit logs...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-20 text-center text-muted-foreground">No audit logs found.</TableCell></TableRow>
            ) : logs.map((log: any) => (
              <TableRow key={log.id}>
                <TableCell muted><span className="font-mono text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</span></TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full avatar-brand text-[9px] font-bold text-white">{log.user ? log.user.name.charAt(0) : "?"}</div>
                    <span className="text-xs font-medium truncate max-w-[100px] block" title={log.user?.name ?? "System / Guest"}>{log.user?.name ?? "System / Guest"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={ACTION_BADGE[log.action] ?? "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold badge-neutral"}>{log.action}</span>
                  {log.status !== "success" && (
                    <span className={`block w-max mt-1 rounded-full px-2 py-0.5 text-[9px] font-semibold ${log.status === "denied" ? "badge-warning" : "badge-danger"}`}>{log.status}</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="w-max rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium">{log.module}</span>
                    {log.route_path && <span className="text-[9px] font-mono text-muted-foreground break-all">{log.request_method} /{log.route_path}</span>}
                  </div>
                </TableCell>
                <TableCell muted><span className="font-mono text-xs">{log.record_type ? `${log.record_type.split("\\").pop()}#${log.record_id}` : "—"}</span></TableCell>
                <TableCell muted><span className="font-mono text-xs">{log.ip_address || "—"}</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">Showing {data?.to || 0} of {data?.total || 0} entries</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50"><ChevronLeft className="h-3.5 w-3.5" /></button>
            <span className="px-2 text-xs font-medium">{page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={!data?.next_page_url} className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50"><ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </TableWrapper>
    </div>
  );
}
