"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Monitor,
  Smartphone,
  Tablet,
  Bot,
  RefreshCw,
  LogOut,
  MapPin,
  Clock,
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  PowerOff,
} from "lucide-react";

import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FilterBar, FilterBarSearch } from "@/components/ui/filter-bar";
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
import { describeThrown } from "@/lib/apiError";

interface SessionItem {
  id: number;
  name: string;
  is_current_device: boolean;
  user: {
    id: number;
    name: string;
    email: string;
    avatar_url?: string;
    role: string;
    role_label: string;
    tenant_id?: number;
    tenant_name?: string;
  } | null;
  client: {
    device_type: "desktop" | "mobile" | "tablet" | "bot" | string;
    browser: string;
    os: string;
    user_agent?: string;
  };
  location: {
    ip_address: string;
    city: string;
    country_code: string;
    country_name: string;
    flag: string;
  };
  activity: {
    created_at: string;
    last_active_at: string;
    idle_minutes: number;
    status: "active" | "idle";
    is_idle: boolean;
  };
}

interface SessionsResponse {
  success: boolean;
  data: SessionItem[];
  summary: {
    total_sessions: number;
    active_sessions: number;
    idle_sessions: number;
    unique_users_count: number;
    locations_count: number;
    idle_threshold_minutes: number;
  };
}

function getDeviceIcon(deviceType: string) {
  switch (deviceType?.toLowerCase()) {
    case "mobile":
      return <Smartphone className="h-4 w-4 text-emerald-500" />;
    case "tablet":
      return <Tablet className="h-4 w-4 text-indigo-500" />;
    case "bot":
      return <Bot className="h-4 w-4 text-amber-500" />;
    default:
      return <Monitor className="h-4 w-4 text-blue-500" />;
  }
}

export default function ActiveSessionsPage() {
  const queryClient = useQueryClient();
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "idle">("all");
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [confirmSessionToLogout, setConfirmSessionToLogout] = useState<SessionItem | null>(null);
  const [confirmPurgeIdle, setConfirmPurgeIdle] = useState(false);
  const [bannerFeedback, setBannerFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { data, isLoading, isRefetching, refetch } = useQuery<SessionsResponse>({
    queryKey: ["settings-sessions"],
    queryFn: async () => {
      const res = await apiFetch("/settings/sessions");
      if (!res.ok) {
        throw new Error("Gagal mengambil data sesi aktif.");
      }
      return res.json();
    },
    refetchInterval: 30000, // auto-refresh every 30s
  });

  const sessions = data?.data ?? [];
  const summary = data?.summary ?? {
    total_sessions: 0,
    active_sessions: 0,
    idle_sessions: 0,
    unique_users_count: 0,
    locations_count: 0,
    idle_threshold_minutes: 15,
  };

  // Terminate single session mutation
  const terminateSessionMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/settings/sessions/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Gagal memutuskan sesi.");
      }
      return json;
    },
    onSuccess: (res) => {
      setBannerFeedback({ type: "success", message: res.message || "Sesi berhasil diputus." });
      setConfirmSessionToLogout(null);
      queryClient.invalidateQueries({ queryKey: ["settings-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
    onError: (err) => {
      setBannerFeedback({ type: "error", message: describeThrown(err).title });
      setConfirmSessionToLogout(null);
    },
  });

  // Terminate all idle sessions mutation
  const terminateIdleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/settings/sessions/terminate-idle", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Gagal membersihkan sesi idle.");
      }
      return json;
    },
    onSuccess: (res) => {
      setBannerFeedback({ type: "success", message: res.message || "Semua sesi idle berhasil di-logout." });
      setConfirmPurgeIdle(false);
      queryClient.invalidateQueries({ queryKey: ["settings-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
    onError: (err) => {
      setBannerFeedback({ type: "error", message: describeThrown(err).title });
      setConfirmPurgeIdle(false);
    },
  });

  const handleCopyIp = useCallback((ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  }, []);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (statusFilter === "active" && s.activity.status !== "active") return false;
      if (statusFilter === "idle" && s.activity.status !== "idle") return false;

      if (!searchQ.trim()) return true;
      const q = searchQ.toLowerCase();
      const userName = s.user?.name?.toLowerCase() || "";
      const userEmail = s.user?.email?.toLowerCase() || "";
      const ip = s.location.ip_address?.toLowerCase() || "";
      const city = s.location.city?.toLowerCase() || "";
      const browser = s.client.browser?.toLowerCase() || "";
      const os = s.client.os?.toLowerCase() || "";

      return (
        userName.includes(q) ||
        userEmail.includes(q) ||
        ip.includes(q) ||
        city.includes(q) ||
        browser.includes(q) ||
        os.includes(q)
      );
    });
  }, [sessions, statusFilter, searchQ]);

  return (
    <div className="space-y-6 p-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="space-y-1">
            <BackToSettings />
            <div className="flex items-center gap-2">
              <CardTitle>Sesi Pengguna &amp; Perangkat Aktif</CardTitle>
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs">
                Live Governance
              </Badge>
            </div>
            <CardDescription>
              Pantau siapa saja anggota tim yang sedang login, status aktivitas live, perangkat &amp; lokasi IP, serta kontrol pemutusan sesi idle.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin text-primary" : ""}`} />
              Segarkan
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmPurgeIdle(true)}
              disabled={summary.idle_sessions === 0 || terminateIdleMutation.isPending}
              className="gap-1.5"
            >
              <PowerOff className="h-3.5 w-3.5" />
              Logout Sesi Idle ({summary.idle_sessions})
            </Button>
          </div>
        </CardHeader>

        {bannerFeedback && (
          <div className="px-5 pb-5">
            <div
              className={`flex items-center justify-between rounded-lg p-3 text-xs font-medium ${
                bannerFeedback.type === "success"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}
            >
              <div className="flex items-center gap-2">
                {bannerFeedback.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <span>{bannerFeedback.message}</span>
              </div>
              <button
                onClick={() => setBannerFeedback(null)}
                className="text-xs hover:opacity-75 underline ml-4 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Sesi Terkoneksi</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">{summary.total_sessions}</span>
            <span className="text-xs text-muted-foreground">({summary.unique_users_count} user)</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Seluruh token akses aktif organisasi</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Sesi Aktif</span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {summary.active_sessions}
            </span>
            <span className="text-xs text-muted-foreground">berjalan</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Aktivitas &lt; {summary.idle_threshold_minutes} menit terakhir</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Sesi Idle</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {summary.idle_sessions}
            </span>
            <span className="text-xs text-muted-foreground">inaktif</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Tidak aktif &ge; {summary.idle_threshold_minutes} menit</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Lokasi Akses</span>
            <MapPin className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">{summary.locations_count}</span>
            <span className="text-xs text-muted-foreground">kota/titik</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Deteksi via Cloudflare Edge GeoIP</p>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar>
        <FilterBarSearch
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="Cari user, email, browser, atau alamat IP..."
        />
        <Tabs
          value={statusFilter}
          onValueChange={(val) => setStatusFilter(val as any)}
          items={[
            { key: "all", label: `Semua (${sessions.length})` },
            { key: "active", label: `🟢 Aktif (${summary.active_sessions})` },
            { key: "idle", label: `🟡 Idle (${summary.idle_sessions})` },
          ]}
        />
      </FilterBar>

      {/* Table Shell */}
      <TableShell>
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Pengguna (User)</TableHeaderCell>
              <TableHeaderCell>Status Sesi</TableHeaderCell>
              <TableHeaderCell>Perangkat &amp; Browser</TableHeaderCell>
              <TableHeaderCell>Lokasi &amp; Alamat IP</TableHeaderCell>
              <TableHeaderCell>Aktivitas Terakhir</TableHeaderCell>
              <TableHeaderCell className="text-right">Aksi</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableEmpty colSpan={6}>
                <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-primary" />
                Memuat daftar sesi aktif...
              </TableEmpty>
            ) : filteredSessions.length === 0 ? (
              <TableEmpty colSpan={6}>Tidak ada sesi yang cocok dengan kriteria pencarian.</TableEmpty>
            ) : (
              filteredSessions.map((session) => (
                <TableRow key={session.id}>
                  {/* User info */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {session.user?.name
                            ? session.user.name
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()
                            : "U"}
                        </div>
                        <span
                          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-background ${
                            session.activity.status === "active" ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                        />
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground text-xs">{session.user?.name ?? "Guest / CLI"}</span>
                          {session.is_current_device && (
                            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-[10px] text-primary font-medium py-0 px-1.5">
                              Perangkat Ini
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{session.user?.email ?? "—"}</p>
                        <Badge variant="neutral" className="text-[9px] py-0 px-1 mt-0.5">
                          {session.user?.role_label ?? "Member"}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    {session.activity.status === "active" ? (
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <Badge variant="success" className="text-[10px] font-medium">
                          Aktif
                        </Badge>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        <Badge variant="warning" className="text-[10px] font-medium">
                          Idle ({session.activity.idle_minutes} mnt)
                        </Badge>
                      </div>
                    )}
                  </TableCell>

                  {/* Device & Client */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted border border-border">
                        {getDeviceIcon(session.client.device_type)}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-foreground">{session.client.browser}</p>
                        <p className="text-[11px] text-muted-foreground">{session.client.os}</p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Location & IP */}
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                        <span className="text-sm">{session.location.flag}</span>
                        <span>{session.location.city || "Jakarta"}</span>
                        <span className="text-muted-foreground text-[11px]">({session.location.country_code})</span>
                      </div>
                      <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                        <span>{session.location.ip_address}</span>
                        <button
                          onClick={() => handleCopyIp(session.location.ip_address)}
                          className="hover:text-foreground transition-colors p-0.5 rounded cursor-pointer"
                          title="Salin IP"
                        >
                          {copiedIp === session.location.ip_address ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </TableCell>

                  {/* Activity timestamps */}
                  <TableCell>
                    <div className="space-y-0.5 text-xs">
                      <p className="text-foreground font-medium">
                        {new Date(session.activity.last_active_at).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Login:{" "}
                        {new Date(session.activity.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </TableCell>

                  {/* Action */}
                  <TableCell className="text-right">
                    {session.is_current_device ? (
                      <span className="text-[11px] font-medium text-muted-foreground italic">
                        Sesi Saat Ini
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmSessionToLogout(session)}
                        className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
                      >
                        <LogOut className="h-3 w-3" />
                        Logout Sesi
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableShell>

      {/* Confirmation Modal for Single Session Logout */}
      {confirmSessionToLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Putuskan Sesi Pengguna?</h3>
                <p className="text-xs text-muted-foreground">Tindakan ini akan langsung menghentikan sesi login pengguna.</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pengguna:</span>
                <span className="font-semibold text-foreground">{confirmSessionToLogout.user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-mono text-foreground">{confirmSessionToLogout.user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Perangkat:</span>
                <span className="text-foreground">
                  {confirmSessionToLogout.client.browser} ({confirmSessionToLogout.client.os})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lokasi / IP:</span>
                <span className="text-foreground">
                  {confirmSessionToLogout.location.flag} {confirmSessionToLogout.location.city} ({confirmSessionToLogout.location.ip_address})
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Pengguna akan langsung menerima respon 401 dan dialihkan ke halaman login pada aksi selanjutnya di browser mereka.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmSessionToLogout(null)}
                disabled={terminateSessionMutation.isPending}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => terminateSessionMutation.mutate(confirmSessionToLogout.id)}
                disabled={terminateSessionMutation.isPending}
                className="gap-1.5"
              >
                {terminateSessionMutation.isPending ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LogOut className="h-3.5 w-3.5" />
                )}
                Putuskan Sesi
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Bulk Purge Idle Sessions */}
      {confirmPurgeIdle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                <PowerOff className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Logout Semua Sesi Idle?</h3>
                <p className="text-xs text-muted-foreground">
                  Pembersihan sesi tidak aktif untuk mengamankan kredensial tim.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Sebanyak <strong className="text-foreground font-semibold">{summary.idle_sessions} sesi idle</strong> (inaktif lebih dari {summary.idle_threshold_minutes} menit) akan diputus secara bersamaan. Perangkat Anda saat ini tidak akan terpengaruh.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmPurgeIdle(false)}
                disabled={terminateIdleMutation.isPending}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => terminateIdleMutation.mutate()}
                disabled={terminateIdleMutation.isPending}
                className="gap-1.5"
              >
                {terminateIdleMutation.isPending ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <PowerOff className="h-3.5 w-3.5" />
                )}
                Logout {summary.idle_sessions} Sesi Idle
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
