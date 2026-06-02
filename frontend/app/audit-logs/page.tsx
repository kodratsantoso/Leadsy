"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Calendar, ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterBar, FilterBarSearch } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
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
import { Tabs } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/apiFetch";

const modules = [
  "all",
  "system",
  "auth",
  "leads",
  "products",
  "industries",
  "users",
  "ai_providers",
  "whatsapp",
  "settings",
] as const;

function actionVariant(action?: string) {
  if (action === "created" || action === "login") return "success";
  if (action === "updated") return "info";
  if (action === "access_denied" || action === "export") return "warning";
  if (action === "deleted" || action === "login_failed") return "danger";
  return "neutral";
}

export default function AuditLogsPage() {
  const pathname = usePathname();
  const [moduleFilter, setModuleFilter] = useState<(typeof modules)[number]>("all");
  const [page, setPage] = useState(1);
  const [searchQ, setSearchQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [feedback, setFeedback] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, moduleFilter, searchQ, dateFrom, dateTo],
    queryFn: async () => {
      let url = `/audit-logs?page=${page}`;
      if (moduleFilter !== "all") url += `&module=${moduleFilter}`;
      if (searchQ) url += `&search=${encodeURIComponent(searchQ)}`;
      if (dateFrom) url += `&date_from=${dateFrom}`;
      if (dateTo) url += `&date_to=${dateTo}`;
      const response = await apiFetch(url);
      return response.json();
    },
  });

  const logs = data?.data ?? [];

  const exportData = (format: "txt" | "xlsx") => {
    if (format === "txt") {
      const lines = logs.map(
        (log: any) =>
          `[${new Date(log.created_at).toISOString()}] ${log.user?.name ?? "System"} | ${log.action} | ${log.module} | ${
            log.record_type ? `${log.record_type.split("\\").pop()}#${log.record_id}` : "—"
          } | IP: ${log.ip_address || "—"}`
      );
      const blob = new Blob([lines.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.txt`;
      anchor.click();
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
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
    }

    setFeedback(`Audit log export generated as ${format.toUpperCase()}.`);
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="space-y-1">
            {pathname.startsWith("/settings/") ? <BackToSettings /> : null}
            <CardTitle>Audit Logs</CardTitle>
            <CardDescription>Standardized audit trail view using the same admin layout as Leads and Users.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => exportData("txt")}>
              <Download className="h-4 w-4" />
              Export TXT
            </Button>
            <Button variant="outline" onClick={() => exportData("xlsx")}>
              <Download className="h-4 w-4" />
              Export XLSX
            </Button>
          </div>
        </CardHeader>
        {feedback ? (
          <div className="px-5 pb-5">
            <Badge variant="info">{feedback}</Badge>
          </div>
        ) : null}
      </Card>

      <FilterBar>
        <FilterBarSearch
          value={searchQ}
          onChange={(event) => {
            setSearchQ(event.target.value);
            setPage(1);
          }}
          placeholder="Search logs"
        />
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            className="w-auto"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setPage(1);
            }}
          />
          <Input
            type="date"
            className="w-auto"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Tabs
          value={moduleFilter}
          onValueChange={(value) => {
            setModuleFilter(value);
            setPage(1);
          }}
          items={modules.map((module) => ({
            key: module,
            label: module.replace(/_/g, " "),
          }))}
        />
      </FilterBar>

      <TableShell>
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
              <TableEmpty colSpan={6}>
                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                Loading audit logs...
              </TableEmpty>
            ) : logs.length === 0 ? (
              <TableEmpty colSpan={6}>No audit logs found.</TableEmpty>
            ) : (
              logs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">{log.user?.name ?? "System / Guest"}</p>
                      {log.route_path ? (
                        <p className="break-all text-xs text-muted-foreground">
                          {log.request_method} /{log.route_path}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Badge variant={actionVariant(log.action)}>{log.action}</Badge>
                      {log.status && log.status !== "success" ? (
                        <Badge variant={log.status === "denied" ? "warning" : "danger"}>
                          {log.status}
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral">{log.module}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.record_type ? `${log.record_type.split("\\").pop()}#${log.record_id}` : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.ip_address || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Showing {data?.to || 0} of {data?.total || 0} entries
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              tooltip="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-xs font-medium">{page}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPage((current) => current + 1)}
              disabled={!data?.next_page_url}
              tooltip="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </TableShell>
    </div>
  );
}
