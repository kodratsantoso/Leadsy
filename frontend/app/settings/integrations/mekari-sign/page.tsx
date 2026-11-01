"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  ArrowLeft, 
  Check, 
  Save, 
  Lock, 
  ShieldCheck, 
  ShieldAlert, 
  ExternalLink, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Copy, 
  CheckCircle2, 
  AlertCircle,
  FileCheck,
  Zap
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/apiFetch";
import { useAuthStore } from "@/store/useAuthStore";
import { isSuperAdminUser } from "@/lib/permissions";

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

export default function MekariSignSettingsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = isSuperAdminUser(user);

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
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 space-y-3">
        <RefreshCw className="h-7 w-7 animate-spin text-indigo-500" />
        <p className="text-sm text-slate-400">Memeriksa hak akses & konfigurasi Mekari Sign...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-6 space-y-6 w-full max-w-5xl mx-auto">
      {/* Navigation Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push("/settings/integrations")}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Kembali
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <FileCheck className="h-6 w-6 text-indigo-400" />
                Mekari Sign & e-Meterai
              </h1>
              {hasPrivilege ? (
                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs">
                  Paket Aktif
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs">
                  Paket Terkunci
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Tanda tangan digital tersertifikasi PSrE dan pembubuhan e-Meterai resmi Peruri untuk Quotation, Sales Order & Faktur.
            </p>
          </div>
        </div>
      </div>

      {/* Notice Alert */}
      {notice && (
        <div
          className={`flex items-center justify-between rounded-xl border p-4 text-xs ${
            notice.type === "success"
              ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-300"
              : "border-red-500/30 bg-red-950/30 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertCircle className="h-4 w-4 text-red-400" />}
            <span>{notice.message}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-white font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {/* Case 1: Tenant Does Not Have Entitlement (Package Locked) */}
      {!hasPrivilege ? (
        <Card className="border-amber-500/20 bg-gradient-to-b from-slate-900/90 to-slate-950/90 shadow-xl overflow-hidden">
          <CardHeader className="border-b border-slate-800/80 pb-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg text-white">Paket Integrasi Mekari Sign Belum Diaktifkan</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Hak akses integrasi pihak ketiga (3rd party package) dikelola tersentralisasi oleh Administrator SaaS Leadsy.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6 text-xs text-slate-300">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
              <h4 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
                Informasi Lisensi & Privilege Paket
              </h4>
              <p className="leading-relaxed text-slate-400">
                Fitur integrasi Mekari Sign (Tanda Tangan Elektronik berbadan hukum dan e-Meterai resmi Peruri) dikelompokkan ke dalam paket lisensi add-on Enterprise. Akun workspace Anda saat ini belum diberikan privilege modul <span className="font-mono text-indigo-300 bg-indigo-950/50 px-1 py-0.5 rounded">mekari_sign</span>.
              </p>
              <div className="space-y-2 border-t border-slate-800/80 pt-3">
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span>Tanda tangan digital tersertifikasi sesuai regulasi UU ITE & Kominfo RI.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span>Pembubuhan e-Meterai otomatis dari Perum Peruri langsung pada Quotation & Sales Order.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span>Audit trail sertifikat digital otomatis terarsip dalam berkas PDF Leadsy.</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80 pt-4">
              <span className="text-slate-400">
                Silakan hubungi Administrator SaaS Leadsy Anda untuk mengaktifkan paket ini pada workspace Anda.
              </span>
              {isSuperAdmin && (
                <Link href="/admin/feature-flags">
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 shrink-0">
                    <Zap className="h-3.5 w-3.5" />
                    Buka Platform Admin (Aktifkan Paket)
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Case 2: Tenant Has Entitlement (Privilege Active) - Configure Credentials */
        <form onSubmit={handleSave} className="space-y-6">
          {/* Card 1: Status & Mode Operasional */}
          <Card className="border-slate-800 bg-slate-900/60 shadow-sm">
            <CardHeader className="border-b border-slate-800/80 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base text-white">Status & Lingkungan Operasional</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Aktifkan modul integrasi dan pilih endpoint server Mekari Sign yang digunakan.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs">
                  Enterprise Entitlement
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              {/* Toggle Aktif */}
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-white">Aktifkan Integrasi Mekari Sign</span>
                  <p className="text-[11px] text-slate-400">
                    Izinkan modul Finance Hub mengirim permohonan tanda tangan elektronik dan pembubuhan e-Meterai.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Environment Selector: Sandbox vs Production */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setIsSandbox(true)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all ${
                    isSandbox
                      ? "border-amber-500/60 bg-amber-950/20 shadow-sm shadow-amber-500/10"
                      : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-white">Sandbox / Staging</span>
                    <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px]">
                      Uji Coba
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                    https://sandbox-api.mekari.com/v2/esign
                  </p>
                  <p className="text-[10px] text-slate-400 mt-2">
                    Gunakan kredensial sandbox akun Mekari Developer untuk pengujian tanpa memotong kuota dokumen riil.
                  </p>
                </div>

                <div
                  onClick={() => setIsSandbox(false)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all ${
                    !isSandbox
                      ? "border-emerald-500/60 bg-emerald-950/20 shadow-sm shadow-emerald-500/10"
                      : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-white">Production Live</span>
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px]">
                      Legal Berlaku
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                    https://api.mekari.com/v2/esign
                  </p>
                  <p className="text-[10px] text-slate-400 mt-2">
                    Menggunakan kuota tanda tangan resmi bersertifikat dan e-Meterai berbadan hukum Republik Indonesia.
                  </p>
                </div>
              </div>

              {/* Auto e-Meterai Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">Otomatisasi Pembubuhan e-Meterai Peruri</span>
                    <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-300 text-[10px]">
                      UU Bea Meterai No. 10/2020
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Secara otomatis mencentang pembubuhan e-Meterai pada dokumen komersial dengan nilai transaksi di atas batas regulasi.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoMeterai}
                    onChange={(e) => setAutoMeterai(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Kredensial API OAuth 2.0 */}
          <Card className="border-slate-800 bg-slate-900/60 shadow-sm">
            <CardHeader className="border-b border-slate-800/80 pb-4">
              <CardTitle className="text-base text-white">Kredensial API Mekari Sign</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Didapatkan dari Mekari Developer Portal (Client Credentials Grant Type).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">
                  Client ID <span className="text-red-400">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Contoh: ms_client_live_abc123..."
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs font-mono text-slate-200 focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200">
                    Client Secret <span className="text-red-400">*</span>
                  </label>
                  {hasSecretOnServer && (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                      <Check className="h-3 w-3" /> Secret tersimpan di server
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type={showSecret ? "text" : "password"}
                    placeholder={hasSecretOnServer ? "•••••••••••••••• (Ketik untuk mengganti)" : "Masukkan Client Secret..."}
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs font-mono text-slate-200 pr-10 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Nilai secret dienkripsi menggunakan AES-256-GCM pada tingkat database per tenant.
                </p>
              </div>

              {/* Test Connection Banner */}
              {testResult && (
                <div
                  className={`rounded-xl border p-4 text-xs ${
                    testResult.success
                      ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-300"
                      : "border-red-500/30 bg-red-950/30 text-red-300"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {testResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold">{testResult.success ? "Uji Koneksi Berhasil" : "Uji Koneksi Gagal"}</p>
                      <p className="mt-0.5 text-[11px] text-slate-300">{testResult.message}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={testing || (!clientId && !hasSecretOnServer)}
                  className="w-full sm:w-auto h-9 gap-1.5 border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800 hover:text-white text-xs"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${testing ? "animate-spin text-indigo-400" : ""}`} />
                  <span>{testing ? "Menguji Koneksi..." : "Uji Koneksi OAuth"}</span>
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  className="w-full sm:w-auto h-9 gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5"
                >
                  <Save className={`h-3.5 w-3.5 ${saving ? "animate-spin" : ""}`} />
                  <span>{saving ? "Menyimpan..." : "Simpan Konfigurasi"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Webhook Callback URL */}
          <Card className="border-slate-800 bg-slate-900/60 shadow-sm">
            <CardHeader className="border-b border-slate-800/80 pb-4">
              <CardTitle className="text-base text-white">Webhook & Notifikasi Status Dokumen</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Pasang Webhook URL ini di dashboard Mekari Sign agar status penandatanganan dan e-Meterai otomatis terupdate di Leadsy.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">Webhook Callback URL</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="bg-slate-950 border-slate-800 text-xs font-mono text-slate-300"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyWebhook}
                    className="h-9 px-3 gap-1.5 border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800 text-xs shrink-0"
                  >
                    {copiedWebhook ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedWebhook ? "Tersalin" : "Salin URL"}</span>
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2 text-xs text-slate-400">
                <h5 className="font-semibold text-slate-300 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-400" />
                  Event yang didukung:
                </h5>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400 pl-1 font-mono">
                  <li>document.completed <span className="text-slate-400 font-sans">(Dokumen selesai ditandatangani semua pihak)</span></li>
                  <li>document.rejected <span className="text-slate-400 font-sans">(Pihak customer menolak penandatanganan)</span></li>
                  <li>meterai.stamped <span className="text-slate-400 font-sans">(e-Meterai Peruri berhasil dibubuhkan)</span></li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
