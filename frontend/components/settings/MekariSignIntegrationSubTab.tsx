"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileCheck,
  Key,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  AlertCircle,
  Save,
  Lock,
  Zap,
  Check,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/apiFetch";
import { useAuthStore } from "@/store/useAuthStore";
import { isSuperAdminUser } from "@/lib/permissions";
import { cn } from "@/lib/utils";

interface MekariSignSettingsResponse {
  has_privilege: boolean;
  is_active: boolean;
  is_sandbox: boolean;
  client_id: string;
  has_secret: boolean;
  auto_meterai: boolean;
  webhook_url: string;
  message?: string;
}

type MekariSubTab = "credentials" | "meterai" | "webhook";

export function MekariSignIntegrationSubTab() {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = isSuperAdminUser(user);

  const [activeSubTab, setActiveSubTab] = useState<MekariSubTab>("credentials");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Settings State
  const [hasPrivilege, setHasPrivilege] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isSandbox, setIsSandbox] = useState<boolean>(true);
  const [clientId, setClientId] = useState<string>("");
  const [clientSecret, setClientSecret] = useState<string>("");
  const [hasSecretOnServer, setHasSecretOnServer] = useState<boolean>(false);
  const [autoMeterai, setAutoMeterai] = useState<boolean>(false);
  const [webhookUrl, setWebhookUrl] = useState<string>("");

  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/settings/integrations/mekari-sign");
      const json = await res.json();

      if (res.ok && json.data) {
        const data: MekariSignSettingsResponse = json.data;
        setHasPrivilege(data.has_privilege);
        setIsActive(data.is_active);
        setIsSandbox(data.is_sandbox);
        setClientId(data.client_id || "");
        setHasSecretOnServer(data.has_secret);
        setAutoMeterai(data.auto_meterai);
        setWebhookUrl(data.webhook_url || "");
      } else {
        setNotice({ type: "error", message: json.message || "Gagal memuat pengaturan Mekari Sign." });
      }
    } catch {
      setNotice({ type: "error", message: "Terjadi kesalahan jaringan saat mengambil konfigurasi." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setNotice(null);
    setTestResult(null);

    try {
      const payload = {
        is_active: isActive,
        is_sandbox: isSandbox,
        client_id: clientId,
        client_secret: clientSecret || undefined,
        auto_meterai: autoMeterai,
      };

      const res = await apiFetch("/api/settings/integrations/mekari-sign", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (res.ok) {
        setNotice({ type: "success", message: json.message || "Pengaturan Mekari Sign berhasil disimpan." });
        setClientSecret("");
        fetchSettings();
      } else {
        setNotice({ type: "error", message: json.message || "Gagal menyimpan pengaturan Mekari Sign." });
      }
    } catch {
      setNotice({ type: "error", message: "Gagal terhubung ke server untuk menyimpan data." });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const payload = {
        client_id: clientId || undefined,
        client_secret: clientSecret || undefined,
        is_sandbox: isSandbox,
      };

      const res = await apiFetch("/api/settings/integrations/mekari-sign/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setTestResult({
          success: true,
          message: json.message || "Koneksi OAuth 2.0 ke API Mekari Sign terverifikasi aktif!",
        });
      } else {
        setTestResult({
          success: false,
          message: json.message || "Koneksi ke Mekari Sign gagal. Periksa kembali Client ID & Secret Anda.",
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: "Uji koneksi gagal: Tidak dapat menghubungi server.",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleCopyWebhook = () => {
    if (webhookUrl) {
      navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[350px] flex-col items-center justify-center p-8 space-y-3">
        <RefreshCw className="h-7 w-7 animate-spin text-brand" />
        <p className="text-sm text-muted-foreground">Memeriksa hak akses & konfigurasi Mekari Sign...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <Card className="border-border bg-card">
        <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold text-foreground">Mekari Sign & e-Meterai Peruri</h2>
                {hasPrivilege ? (
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                    Paket Aktif
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-medium">
                    Paket Terkunci
                  </Badge>
                )}
                <Badge variant={isActive ? "success" : "outline"} className="text-[10px]">
                  {isActive ? "Integrasi Aktif" : "Nonaktif"}
                </Badge>
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  {isSandbox ? "Sandbox / Staging" : "Production Live"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                Tanda tangan digital tersertifikasi PSrE Kominfo dan pembubuhan e-Meterai resmi Perum Peruri langsung pada dokumen Quotation, Sales Order, dan Invoice.
              </p>
            </div>
          </div>

          {hasPrivilege && (
            <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={testing || (!clientId && !hasSecretOnServer)}
                className="gap-1.5 h-9 text-xs border-border hover:bg-muted/40"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", testing && "animate-spin text-brand")} />
                {testing ? "Menguji..." : "Uji Koneksi OAuth"}
              </Button>
              <Button
                size="sm"
                onClick={() => handleSave()}
                disabled={saving}
                className="bg-brand text-white hover:bg-brand/90 gap-1.5 h-9 text-xs shadow-xs"
              >
                <Save className={cn("h-3.5 w-3.5", saving && "animate-spin")} />
                {saving ? "Menyimpan..." : "Simpan Konfigurasi"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notice Alert */}
      {notice && (
        <div
          className={cn(
            "flex items-center justify-between rounded-xl border p-4 text-xs transition-all",
            notice.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          )}
        >
          <div className="flex items-center gap-2">
            {notice.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-muted-foreground hover:text-foreground font-bold ml-4 text-sm"
          >
            ×
          </button>
        </div>
      )}

      {/* Test Connection Banner */}
      {testResult && (
        <div
          className={cn(
            "rounded-xl border p-4 text-xs transition-all",
            testResult.success
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          )}
        >
          <div className="flex items-start gap-2.5">
            {testResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-semibold">{testResult.success ? "Uji Koneksi Berhasil" : "Uji Koneksi Gagal"}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed">{testResult.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setTestResult(null)}
              className="text-muted-foreground hover:text-foreground font-bold text-sm"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Case 1: Tenant Does Not Have Entitlement (Package Locked) */}
      {!hasPrivilege ? (
        <Card className="border-amber-500/20 bg-card shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border/50 pb-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base text-foreground">Paket Integrasi Mekari Sign Belum Diaktifkan</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Hak akses integrasi pihak ketiga (3rd party package) dikelola tersentralisasi oleh Administrator SaaS Leadsy.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6 text-xs text-foreground">
            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
              <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                Informasi Lisensi & Hak Akses Fitur
              </h4>
              <p className="leading-relaxed text-muted-foreground">
                Fitur integrasi Mekari Sign (Tanda Tangan Elektronik berbadan hukum dan e-Meterai resmi Peruri) dikelompokkan ke dalam paket lisensi add-on Enterprise. Akun workspace Anda saat ini belum diberikan privilege modul <code className="text-brand font-semibold px-1 py-0.5 rounded bg-brand/10">mekari_sign</code>.
              </p>
              <div className="space-y-2 border-t border-border/60 pt-3 text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Tanda tangan digital tersertifikasi sesuai regulasi UU ITE & Kominfo RI.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Pembubuhan e-Meterai otomatis dari Perum Peruri langsung pada Quotation & Sales Order.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Audit trail sertifikat digital otomatis terarsip dalam berkas PDF dokumen Leadsy.</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/60 pt-4">
              <span className="text-muted-foreground">
                Silakan hubungi Administrator SaaS Leadsy Anda untuk mengaktifkan paket ini pada workspace Anda.
              </span>
              {isSuperAdmin && (
                <Link href="/admin/feature-flags">
                  <Button size="sm" className="bg-brand hover:bg-brand/90 text-white gap-2 shrink-0 text-xs">
                    <Zap className="h-3.5 w-3.5" />
                    Buka Platform Admin (Aktifkan Paket)
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Case 2: Tenant Has Entitlement (Privilege Active) - Sub-Tabs Layout */
        <div className="space-y-6">
          <Tabs
            value={activeSubTab}
            onValueChange={setActiveSubTab}
            items={[
              { key: "credentials", label: "Kredensial & Lingkungan", icon: Key },
              { key: "meterai", label: "Aturan Pembubuhan e-Meterai", icon: FileCheck },
              { key: "webhook", label: "Webhook & Callback Status", icon: ShieldCheck },
            ]}
          />

          {/* SUB-TAB 1: KREDENSIAL & LINGKUNGAN */}
          {activeSubTab === "credentials" && (
            <div className="space-y-6">
              {/* Card: Status & Mode Operasional */}
              <Card className="border-border bg-card">
                <CardHeader className="border-b border-border/50 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                        <Key className="h-4 w-4 text-brand" />
                        Status & Lingkungan Operasional
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Aktifkan modul integrasi dan tentukan endpoint server Mekari Sign yang digunakan.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="border-brand/30 bg-brand/5 text-brand text-[10px]">
                      OAuth 2.0 Client Credentials
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 pt-5">
                  {/* Toggle Aktif */}
                  <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-foreground">Aktifkan Integrasi Mekari Sign</span>
                      <p className="text-[11px] text-muted-foreground">
                        Izinkan modul Order to Cash & Finance mengirim permohonan tanda tangan elektronik dan pembubuhan e-Meterai.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                    </label>
                  </div>

                  {/* Environment Selector: Sandbox vs Production */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                      onClick={() => setIsSandbox(true)}
                      className={cn(
                        "cursor-pointer rounded-xl border p-4 transition-all duration-200",
                        isSandbox
                          ? "border-amber-500/60 bg-amber-500/10 shadow-xs ring-1 ring-amber-500/30"
                          : "border-border bg-card hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-foreground">Sandbox / Staging</span>
                        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px]">
                          Uji Coba
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed font-mono">
                        https://sandbox-api.mekari.com/v2/esign
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        Gunakan kredensial sandbox akun Mekari Developer untuk simulasi pengujian tanpa memotong kuota dokumen riil.
                      </p>
                    </div>

                    <div
                      onClick={() => setIsSandbox(false)}
                      className={cn(
                        "cursor-pointer rounded-xl border p-4 transition-all duration-200",
                        !isSandbox
                          ? "border-emerald-500/60 bg-emerald-500/10 shadow-xs ring-1 ring-emerald-500/30"
                          : "border-border bg-card hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-foreground">Production Live</span>
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">
                          Legal Sah Berlaku
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed font-mono">
                        https://api.mekari.com/v2/esign
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        Menggunakan kuota tanda tangan digital resmi bersertifikat PSrE dan e-Meterai resmi Perum Peruri.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card: Kredensial API OAuth 2.0 */}
              <Card className="border-border bg-card">
                <CardHeader className="border-b border-border/50 pb-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Lock className="h-4 w-4 text-brand" />
                    Kredensial API Mekari Developer Portal
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Dapatkan Client ID dan Client Secret dari Mekari Developer Center (Grant Type: Client Credentials).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Client ID <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="Contoh: ms_client_live_abc123..."
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">Identifier unik aplikasi Mekari Sign perusahaan Anda.</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-foreground">
                        Client Secret <span className="text-destructive">*</span>
                      </label>
                      {hasSecretOnServer && (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                          <Check className="h-3 w-3" /> Secret tersimpan aman di server
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        type={showSecret ? "text" : "password"}
                        placeholder={hasSecretOnServer ? "•••••••••••••••• (Ketik untuk mengganti secret)" : "Masukkan Client Secret..."}
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                        className="h-9 text-xs font-mono pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Secret dienkripsi dengan standar AES-256-GCM pada tingkat database per tenant.
                    </p>
                  </div>

                  {/* Quick Bottom Action */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">
                      Lakukan uji koneksi OAuth untuk memastikan server Leadsy dapat meminta token akses API.
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTestConnection}
                        disabled={testing || (!clientId && !hasSecretOnServer)}
                        className="h-9 text-xs gap-1.5 shrink-0"
                      >
                        <RefreshCw className={cn("h-3.5 w-3.5", testing && "animate-spin text-brand")} />
                        {testing ? "Menguji..." : "Uji Koneksi OAuth"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSave()}
                        disabled={saving}
                        className="bg-brand text-white hover:bg-brand/90 gap-1.5 h-9 text-xs font-medium px-4 shrink-0"
                      >
                        <Save className={cn("h-3.5 w-3.5", saving && "animate-spin")} />
                        {saving ? "Menyimpan..." : "Simpan Konfigurasi"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* SUB-TAB 2: ATURAN PEMBUBUHAN E-METERAI */}
          {activeSubTab === "meterai" && (
            <div className="space-y-6">
              {/* Auto e-Meterai Toggle Card */}
              <Card className="border-border bg-card">
                <CardHeader className="border-b border-border/50 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                        <FileCheck className="h-4 w-4 text-brand" />
                        Otomatisasi Pembubuhan e-Meterai Perum Peruri
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Kepatuhan Bea Meterai resmi sesuai regulasi Undang-Undang No. 10 Tahun 2020.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px]">
                      UU Bea Meterai RI
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 pt-5">
                  <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-foreground">Pembubuhan e-Meterai Otomatis</span>
                      <p className="text-[11px] text-muted-foreground">
                        Secara otomatis mencentang pembubuhan e-Meterai pada dokumen komersial dengan nilai transaksi di atas batas regulasi (≥ Rp 5.000.000).
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={autoMeterai}
                        onChange={(e) => setAutoMeterai(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        <Sparkles className="h-4 w-4 text-brand" />
                        Quotation Resmi
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Dokumen penawaran harga final yang disepakati dapat dibubuhi e-Meterai untuk menjamin keabsahan hukum penawaran.
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        <Layers className="h-4 w-4 text-brand" />
                        Sales Order (SO)
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Surat konfirmasi pemesanan komersial antara Leadsy dan pembeli yang mengikat kedua belah pihak secara legal.
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                        <ShieldCheck className="h-4 w-4 text-brand" />
                        Validasi QR Peruri
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Setiap meterai digital menyertakan serial number dan QR Code unik yang dapat dipindai via portal resmi pos.peruri.co.id.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-3 border-t border-border/50">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSave()}
                      disabled={saving}
                      className="bg-brand text-white hover:bg-brand/90 gap-1.5 h-9 text-xs font-medium px-4"
                    >
                      <Save className={cn("h-3.5 w-3.5", saving && "animate-spin")} />
                      {saving ? "Menyimpan..." : "Simpan Pengaturan e-Meterai"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* SUB-TAB 3: WEBHOOK & CALLBACK STATUS */}
          {activeSubTab === "webhook" && (
            <div className="space-y-6">
              <Card className="border-border bg-card">
                <CardHeader className="border-b border-border/50 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                        <ShieldCheck className="h-4 w-4 text-brand" />
                        Webhook & Notifikasi Status Dokumen
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Pasang Webhook URL ini di dashboard Mekari Sign agar status penandatanganan dan e-Meterai otomatis terupdate di Leadsy.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      Real-time Callback
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Webhook Callback URL</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        readOnly
                        value={webhookUrl}
                        className="h-9 text-xs font-mono bg-muted/40"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCopyWebhook}
                        className="h-9 px-3 gap-1.5 text-xs shrink-0"
                      >
                        {copiedWebhook ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedWebhook ? "Tersalin" : "Salin URL"}</span>
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      URL endpoint publik aman yang menerima payload notifikasi event saat pihak rekanan menandatangani berkas.
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 text-xs">
                    <h5 className="font-semibold text-foreground flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-brand" />
                      Daftar Event Callback yang Didukung:
                    </h5>
                    <ul className="space-y-1.5 text-[11px] text-muted-foreground font-mono">
                      <li className="flex items-start gap-2">
                        <code className="text-brand font-semibold shrink-0">document.completed</code>
                        <span className="font-sans text-muted-foreground">— Dokumen selesai ditandatangani oleh seluruh pihak yang berwenang.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <code className="text-destructive font-semibold shrink-0">document.rejected</code>
                        <span className="font-sans text-muted-foreground">— Pihak customer atau penandatangan menolak permohonan tanda tangan.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <code className="text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">meterai.stamped</code>
                        <span className="font-sans text-muted-foreground">— e-Meterai resmi Perum Peruri sukses dibubuhkan pada dokumen.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs space-y-1">
                    <p className="font-semibold text-blue-600 dark:text-blue-400">Panduan Konfigurasi di Mekari Portal:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed">
                      <li>Buka Mekari Sign Developer Dashboard pada akun perusahaan Anda.</li>
                      <li>Pilih menu <strong>Webhooks / Integrations</strong> → klik <strong>Add Webhook URL</strong>.</li>
                      <li>Tempel Webhook Callback URL di atas dan centang semua event di atas.</li>
                      <li>Simpan setelan webhook. Seluruh perubahan status dokumen akan otomatis tersinkronisasi ke tab Order to Cash di Leadsy.</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
