"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Calendar,
  Globe,
  User,
  Terminal,
  Building,
  ShieldAlert,
  Monitor,
  Smartphone,
  Tablet,
  Bot,
  Copy,
  Check,
  Eye,
  X,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/apiFetch";

interface AuditLogItem {
  id: number;
  tenant_id?: number;
  tenant_name?: string;
  tenant?: {
    id: number;
    name: string;
  };
  user_id?: number;
  actor_name?: string;
  actor_email?: string;
  actor_role?: string;
  user?: {
    id: number;
    name: string;
    email: string;
    role?: {
      name: string;
      display_name?: string;
    };
  };
  action: string;
  module?: string;
  event_category?: string;
  record_type?: string;
  record_id?: number;
  before_value?: any;
  after_value?: any;
  ip_address?: string;
  user_agent?: string;
  city?: string;
  country_code?: string;
  country_name?: string;
  flag_emoji?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  risk_level?: string;
  status?: string;
  request_method?: string;
  route_path?: string;
  metadata_json?: any;
  created_at: string;
}

interface TenantItem {
  id: number;
  name: string;
}

const riskLevels = [
  { key: "all", label: "Semua Level Risiko" },
  { key: "critical", label: "🔴 Critical" },
  { key: "high", label: "🟠 High" },
  { key: "medium", label: "🟡 Medium" },
  { key: "low", label: "⚪ Low" },
] as const;

function getActionColor(action: string) {
  const a = action.toLowerCase();
  if (a.includes("impersonate") || a.includes("purge"))
    return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";
  if (a.includes("provision") || a.includes("created") || (a.includes("login") && !a.includes("fail")))
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  if (a.includes("delete") || a.includes("suspended") || a.includes("fail") || a.includes("terminate"))
    return "border-destructive/30 bg-destructive/10 text-destructive";
  return "border-primary/30 bg-primary/10 text-primary";
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
        <Badge
          variant="warning"
          className="text-[10px] font-semibold uppercase tracking-wider py-0 px-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400"
        >
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
        <Badge
          variant="neutral"
          className="text-[10px] font-normal uppercase tracking-wider py-0 px-1.5 text-muted-foreground"
        >
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

export default function PlatformAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>("all");
  const [selectedRisk, setSelectedRisk] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const [summary, setSummary] = useState({
    total_events: 0,
    critical_events: 0,
    active_tenants: 0,
    unique_countries: 0,
  });

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedTenant !== "all") params.set("tenant_id", selectedTenant);
      if (selectedRisk !== "all") params.set("risk_level", selectedRisk);
      params.set("page", String(page));

      const res = await apiFetch(`/api/platform/audit-logs?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data || []);
        if (json.meta) {
          setTotalPages(json.meta.last_page || 1);
          setTotalCount(json.meta.total || 0);
        }
        if (json.summary) {
          setSummary(json.summary);
        }
        if (json.tenants) {
          setTenants(json.tenants);
        }
      }
    } catch (e) {
      console.error("Failed to load platform audit logs:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, selectedTenant, selectedRisk, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Jejak Audit &amp; Keamanan Platform SaaS
            </h1>
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs font-semibold">
              Superadmin Governance
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Catatan log immutable seluruh aktivitas superadmin, tenant isolation, provisi workspace, impersonasi, dan telemetri geografis global.
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

      {/* Analytics KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Entri Platform</span>
            <Terminal className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">{totalCount}</span>
            <span className="text-xs text-muted-foreground">aksi global</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Seluruh histori operasional lintas tenant</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Peringatan Kritis / Tinggi</span>
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-destructive">{summary.critical_events}</span>
            <span className="text-xs text-muted-foreground">peristiwa</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Aksi berisiko tinggi / anomali keamanan</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Tenant Beroperasi</span>
            <Building className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">{summary.active_tenants}</span>
            <span className="text-xs text-muted-foreground">organisasi</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Memiliki jejak aktivitas teraudit</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Negara Akses</span>
            <Globe className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">{summary.unique_countries}</span>
            <span className="text-xs text-muted-foreground">negara</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Terdeteksi via Cloudflare GeoIP Edge</p>
        </div>
      </div>

      {/* Filters and Table */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Catatan Audit Platform ({totalCount})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tenant Selector Dropdown */}
            <div className="flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={selectedTenant}
                onChange={(e) => {
                  setSelectedTenant(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value="all">🌐 Seluruh Tenant (Global)</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.id} - {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari aksi, user, tenant, IP..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 pl-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              >
              </input>
            </div>
          </div>
        </div>

        {/* Risk Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {riskLevels.map((r) => (
            <button
              key={r.key}
              onClick={() => {
                setSelectedRisk(r.key);
                setPage(1);
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                selectedRisk === r.key
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
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
                    <th className="px-4 py-3">Tenant</th>
                    <th className="px-4 py-3">Pelaku (Actor)</th>
                    <th className="px-4 py-3">Aksi &amp; Risiko</th>
                    <th className="px-4 py-3">Lokasi &amp; Klien</th>
                    <th className="px-4 py-3 text-right">Rincian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log) => {
                    const actorName = log.actor_name || log.user?.name || "System";
                    const actorEmail = log.actor_email || log.user?.email || null;
                    const tenantDisplayName = log.tenant_name || log.tenant?.name || (log.tenant_id ? `Tenant #${log.tenant_id}` : "Global / Platform");
                    const flagEmoji = log.flag_emoji || (log.country_code === "ID" ? "🇮🇩" : "🌐");

                    return (
                      <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                        {/* Timestamp */}
                        <td className="px-4 py-3 text-muted-foreground text-[11px] whitespace-nowrap">
                          <p className="font-medium text-foreground">
                            {new Date(log.created_at).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </p>
                          <p className="text-[10px]">
                            {new Date(log.created_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </td>

                        {/* Tenant */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Building className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-semibold text-foreground text-xs">{tenantDisplayName}</span>
                          </div>
                          {log.tenant_id && (
                            <span className="text-[10px] text-muted-foreground font-mono">#{log.tenant_id}</span>
                          )}
                        </td>

                        {/* Actor */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                              {actorName
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate max-w-[140px]">{actorName}</p>
                              {actorEmail && (
                                <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{actorEmail}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Action & Risk */}
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant="outline" className={`text-[10px] uppercase font-mono ${getActionColor(log.action)}`}>
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
                        </td>

                        {/* Location & Client */}
                        <td className="px-4 py-3">
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
                                  onClick={() => handleCopyIp(log.ip_address!)}
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
                        </td>

                        {/* Rincian Button */}
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                            className="h-7 text-xs gap-1 hover:bg-muted"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Rincian
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Halaman {page} dari {totalPages} ({totalCount} total entri)
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

      {/* Inspector Modal for Platform Audit Log */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">Peristiwa Audit Platform #{selectedLog.id}</h3>
                  {getRiskBadge(selectedLog.risk_level)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Tercatat pada {new Date(selectedLog.created_at).toLocaleString("id-ID")}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Context details */}
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5">
                <span className="font-semibold text-muted-foreground block text-[11px] uppercase tracking-wider">
                  Organisasi &amp; Pelaku
                </span>
                <p>
                  <strong className="text-foreground">Tenant:</strong>{" "}
                  {selectedLog.tenant_name || selectedLog.tenant?.name || (selectedLog.tenant_id ? `#${selectedLog.tenant_id}` : "Global / Platform")}
                </p>
                <p>
                  <strong className="text-foreground">Pelaksana:</strong>{" "}
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
                  Telemetri Akses &amp; GeoIP
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
                  <strong className="text-foreground">Klien:</strong>{" "}
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
