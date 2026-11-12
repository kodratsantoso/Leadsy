"use client";

import { useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Globe,
  User,
  Monitor,
  Smartphone,
  Tablet,
  Bot,
  Copy,
  Check,
  Eye,
  X,
  Clock,
  Terminal,
} from "lucide-react";
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
  "auth",
  "security",
  "leads",
  "products",
  "users",
  "ai_providers",
  "whatsapp",
  "settings",
  "system",
] as const;

const riskLevels = [
  { key: "all", label: "Semua Level Risiko" },
  { key: "critical", label: "🔴 Critical" },
  { key: "high", label: "🟠 High" },
  { key: "medium", label: "🟡 Medium" },
  { key: "low", label: "⚪ Low" },
] as const;

function actionVariant(action?: string) {
  if (!action) return "neutral";
  const a = action.toLowerCase();
  if (a.includes("create") || a.includes("login") && !a.includes("fail")) return "success";
  if (a.includes("update") || a.includes("rescore") || a.includes("sync")) return "info";
  if (a.includes("denied") || a.includes("export") || a.includes("purge")) return "warning";
  if (a.includes("delete") || a.includes("fail") || a.includes("terminate")) return "danger";
  return "neutral";
}

function getRiskBadge(risk?: string) {
  switch (risk?.toLowerCase()) {
    case "critical":
      return (
        <Badge variant="danger" className="text-[10px] font-bold uppercase tracking-wider py-0 px-1.5">
          Critical
        </Badge>
      );
    case "high":
      return (
        <Badge variant="warning" className="text-[10px] font-semibold uppercase tracking-wider py-0 px-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400">
          High
        </Badge>
      );
    case "medium":
      return (
        <Badge variant="info" className="text-[10px] font-medium uppercase tracking-wider py-0 px-1.5">
          Medium
        </Badge>
      );
    default:
      return (
        <Badge variant="neutral" className="text-[10px] font-normal uppercase tracking-wider py-0 px-1.5 text-muted-foreground">
          Low
        </Badge>
      );
  }
}

function getDeviceIcon(deviceType?: string) {
  switch (deviceType?.toLowerCase()) {
    case "mobile":
      return <Smartphone className="h-3.5 w-3.5 text-emerald-500" />;
    case "tablet":
      return <Tablet className="h-3.5 w-3.5 text-indigo-500" />;
    case "bot":
      return <Bot className="h-3.5 w-3.5 text-amber-500" />;
    default:
      return <Monitor className="h-3.5 w-3.5 text-blue-500" />;
  }
}

export default function AuditLogsPage() {
  const pathname = usePathname();
  const [moduleFilter, setModuleFilter] = useState<(typeof modules)[number]>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [searchQ, setSearchQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [feedback, setFeedback] = useState("");
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["audit-logs", page, moduleFilter, riskFilter, searchQ, dateFrom, dateTo],
    queryFn: async () => {
      let url = `/audit-logs?page=${page}`;
      if (moduleFilter !== "all") url += `&module=${moduleFilter}`;
      if (riskFilter !== "all") url += `&risk_level=${riskFilter}`;
      if (searchQ) url += `&search=${encodeURIComponent(searchQ)}`;
      if (dateFrom) url += `&date_from=${dateFrom}`;
      if (dateTo) url += `&date_to=${dateTo}`;
      const response = await apiFetch(url);
      return response.json();
    },
  });

  const logs = data?.data ?? [];
  const summary = data?.summary ?? {
    total_events: data?.total || 0,
    high_risk_events: 0,
  };

  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  const exportData = (format: "txt" | "xlsx") => {
    if (format === "txt") {
      const lines = logs.map(
        (log: any) =>
          `[${new Date(log.created_at).toISOString()}] Actor: ${log.actor_name || log.user?.name || "System"} (${log.actor_email || log.user?.email || "internal"}) | Action: ${log.action} | Module: ${log.module} | Risk: ${log.risk_level || "low"} | Location: ${log.city || "—"}, ${log.country_name || "—"} (${log.ip_address || "—"}) | Route: ${log.request_method || "—"} /${log.route_path || "—"}`
      );
      const blob = new Blob([lines.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.txt`;
      anchor.click();
      URL.revokeObjectURL(url);
    } else {
      const header = "Timestamp,Actor Name,Actor Email,Actor Role,Action,Module,Event Category,Risk Level,Status,City,Country,IP,Device,Browser,OS,Route";
      const rows = logs.map((log: any) =>
        [
          new Date(log.created_at).toISOString(),
          `"${log.actor_name || log.user?.name || "System"}"`,
          `"${log.actor_email || log.user?.email || ""}"`,
          `"${log.actor_role || log.user?.role?.name || ""}"`,
          log.action,
          log.module,
          log.event_category || "",
          log.risk_level || "low",
          log.status || "success",
          `"${log.city || ""}"`,
          `"${log.country_name || ""}"`,
          log.ip_address || "",
          log.device_type || "",
          `"${log.browser || ""}"`,
          `"${log.os || ""}"`,
          `"${log.request_method || ""} /${log.route_path || ""}"`,
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
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="space-y-1">
            {pathname.startsWith("/settings/") ? <BackToSettings /> : null}
            <div className="flex items-center gap-2">
              <CardTitle>Jejak Audit &amp; Keamanan Organisasi</CardTitle>
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs font-semibold">
                Governance Trail
              </Badge>
            </div>
            <CardDescription>
              Catatan riwayat aktivitas operasional terenkripsi, identitas pelaksana (actor), telemetri lokasi, dan audit keamanan per tenant.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => exportData("txt")} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Export TXT
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportData("xlsx")} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
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

      {/* KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Entri Audit</span>
            <Terminal className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">{data?.total || 0}</span>
            <span className="text-xs text-muted-foreground">peristiwa tercatat</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Log immutable sesuai standar ISO 27001 &amp; UU PDP</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Peringatan Keamanan</span>
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-destructive">{summary.high_risk_events}</span>
            <span className="text-xs text-muted-foreground">high / critical</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Percobaan akses tidak sah atau perubahan krusial</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Cakupan Modul</span>
            <Shield className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">10</span>
            <span className="text-xs text-muted-foreground">domain sistem</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Auth, Leads, Security, Users, AI, Whatsapp</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Telemetri Real-Time</span>
            <Globe className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">Cloudflare</span>
            <span className="text-xs text-muted-foreground">Edge GeoIP</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Capture otomatis IP, Kota, Negara &amp; Perangkat</p>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar>
        <FilterBarSearch
          value={searchQ}
          onChange={(event) => {
            setSearchQ(event.target.value);
            setPage(1);
          }}
          placeholder="Cari aksi, pelaku, email, IP, atau kota..."
        />
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            type="date"
            className="w-auto h-8 text-xs"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setPage(1);
            }}
          />
          <span className="text-xs text-muted-foreground">-</span>
          <Input
            type="date"
            className="w-auto h-8 text-xs"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Risk Level Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {riskLevels.map((r) => (
            <button
              key={r.key}
              onClick={() => {
                setRiskFilter(r.key);
                setPage(1);
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                riskFilter === r.key
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <Tabs
          value={moduleFilter}
          onValueChange={(value) => {
            setModuleFilter(value as any);
            setPage(1);
          }}
          items={modules.map((module) => ({
            key: module,
            label: module.replace(/_/g, " "),
          }))}
        />
      </FilterBar>

      {/* Table Shell */}
      <TableShell>
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Waktu</TableHeaderCell>
              <TableHeaderCell>Pelaku (Actor)</TableHeaderCell>
              <TableHeaderCell>Aksi &amp; Risiko</TableHeaderCell>
              <TableHeaderCell>Modul &amp; Domain</TableHeaderCell>
              <TableHeaderCell>Lokasi &amp; Klien</TableHeaderCell>
              <TableHeaderCell className="text-right">Rincian</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableEmpty colSpan={6}>
                <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-primary" />
                Memuat jejak audit...
              </TableEmpty>
            ) : logs.length === 0 ? (
              <TableEmpty colSpan={6}>Tidak ada catatan audit yang cocok dengan filter.</TableEmpty>
            ) : (
              logs.map((log: any) => {
                const actorName = log.actor_name || log.user?.name || "System / CLI";
                const actorEmail = log.actor_email || log.user?.email || null;
                const actorRole = log.actor_role || log.user?.role?.display_name || log.user?.role?.name || null;
                const flagEmoji = log.flag_emoji || (log.country_code === "ID" ? "🇮🇩" : "🌐");

                return (
                  <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                    {/* Timestamp */}
                    <TableCell className="text-xs">
                      <div className="space-y-0.5">
                        <p className="font-medium text-foreground">
                          {new Date(log.created_at).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(log.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </TableCell>

                    {/* Actor */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                          {actorName
                            .split(" ")
                            .map((n: string) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-semibold text-xs text-foreground truncate">{actorName}</p>
                          {actorEmail && <p className="text-[11px] text-muted-foreground truncate">{actorEmail}</p>}
                          {actorRole && (
                            <Badge variant="neutral" className="text-[9px] py-0 px-1 mt-0.5">
                              {actorRole}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Action & Risk */}
                    <TableCell>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant={actionVariant(log.action)} className="text-[11px] font-mono">
                            {log.action}
                          </Badge>
                          {getRiskBadge(log.risk_level)}
                        </div>
                        {log.route_path && (
                          <p className="text-[10px] font-mono text-muted-foreground truncate max-w-xs">
                            {log.request_method} /{log.route_path}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Module */}
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="neutral" className="capitalize text-xs">
                          {log.module}
                        </Badge>
                        {log.record_type && (
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {log.record_type.split("\\").pop()}#{log.record_id}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Location & Client */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                          <span>{flagEmoji}</span>
                          <span>{log.city || "Jakarta"}</span>
                          <span className="text-[10px] text-muted-foreground">({log.country_code || "ID"})</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                          <span>{log.ip_address || "127.0.0.1"}</span>
                          {log.ip_address && (
                            <button
                              onClick={() => handleCopyIp(log.ip_address)}
                              className="hover:text-foreground transition-colors p-0.5 rounded cursor-pointer"
                              title="Salin IP"
                            >
                              {copiedIp === log.ip_address ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>
                        {(log.browser || log.device_type) && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            {getDeviceIcon(log.device_type)}
                            <span>{log.browser || "Browser"}</span>
                            {log.os && <span>• {log.os}</span>}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Action button */}
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        className="h-7 text-xs gap-1 hover:bg-muted"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Rincian
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Menampilkan {data?.to || 0} dari {data?.total || 0} entri
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              tooltip="Halaman sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-xs font-medium">{page}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPage((current) => current + 1)}
              disabled={!data?.next_page_url}
              tooltip="Halaman selanjutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </TableShell>

      {/* Inspector Modal for Audit Log Details */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">Rincian Peristiwa Audit #{selectedLog.id}</h3>
                  {getRiskBadge(selectedLog.risk_level)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Dicatat pada {new Date(selectedLog.created_at).toLocaleString("id-ID")}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Grid Attributes */}
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5">
                <span className="font-semibold text-muted-foreground block text-[11px] uppercase tracking-wider">
                  Pelaku &amp; Konteks
                </span>
                <p>
                  <strong className="text-foreground">Nama:</strong>{" "}
                  {selectedLog.actor_name || selectedLog.user?.name || "System"}
                </p>
                <p>
                  <strong className="text-foreground">Email:</strong>{" "}
                  {selectedLog.actor_email || selectedLog.user?.email || "—"}
                </p>
                <p>
                  <strong className="text-foreground">Peran:</strong>{" "}
                  {selectedLog.actor_role || selectedLog.user?.role?.display_name || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5">
                <span className="font-semibold text-muted-foreground block text-[11px] uppercase tracking-wider">
                  Telemetri &amp; Lokasi
                </span>
                <p>
                  <strong className="text-foreground">Lokasi:</strong> {selectedLog.city || "Jakarta"},{" "}
                  {selectedLog.country_name || "Indonesia"} ({selectedLog.country_code || "ID"})
                </p>
                <p>
                  <strong className="text-foreground">Alamat IP:</strong>{" "}
                  <span className="font-mono">{selectedLog.ip_address || "127.0.0.1"}</span>
                </p>
                <p>
                  <strong className="text-foreground">Perangkat:</strong>{" "}
                  {selectedLog.browser || "Browser"} • {selectedLog.os || "OS"} ({selectedLog.device_type || "desktop"})
                </p>
              </div>
            </div>

            {/* Request Route & Method */}
            {selectedLog.route_path && (
              <div className="rounded-xl border border-border bg-muted/20 p-3 text-xs space-y-1">
                <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider block">
                  HTTP Request Endpoint
                </span>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <Badge variant="outline" className="font-bold">
                    {selectedLog.request_method}
                  </Badge>
                  <span className="text-foreground">/{selectedLog.route_path}</span>
                  <Badge variant={selectedLog.status === "success" ? "success" : "danger"} className="ml-auto text-[10px]">
                    Status: {selectedLog.status || "success"}
                  </Badge>
                </div>
              </div>
            )}

            {/* Payload Changes Diff */}
            <div className="space-y-3">
              <span className="font-semibold text-foreground text-xs block">Payload Perubahan Data:</span>
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground">Nilai Sebelumnya (Before):</span>
                  <pre className="max-h-48 overflow-auto rounded-xl border border-border bg-background p-3 font-mono text-[11px] text-muted-foreground">
                    {selectedLog.before_value ? JSON.stringify(selectedLog.before_value, null, 2) : "null / tidak ada"}
                  </pre>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground">Nilai Sesudahnya (After):</span>
                  <pre className="max-h-48 overflow-auto rounded-xl border border-border bg-background p-3 font-mono text-[11px] text-foreground">
                    {selectedLog.after_value ? JSON.stringify(selectedLog.after_value, null, 2) : "null / tidak ada"}
                  </pre>
                </div>
              </div>

              {selectedLog.metadata_json && (
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground">Metadata Tambahan:</span>
                  <pre className="max-h-36 overflow-auto rounded-xl border border-border bg-background p-3 font-mono text-[11px] text-muted-foreground">
                    {JSON.stringify(selectedLog.metadata_json, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
