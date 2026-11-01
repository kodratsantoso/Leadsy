"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mail,
  Server,
  Send,
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Info,
  Eye,
  EyeOff,
  Globe,
  Sparkles,
  ExternalLink,
  Check,
  HelpCircle,
  Clock,
  Lock,
} from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type ProviderPreset = "lark" | "gmail" | "office365" | "custom";
type EmailSubTab = "smtp" | "imap" | "guides";

const PRESETS: Record<
  ProviderPreset,
  {
    name: string;
    description: string;
    tag: string;
    smtpHost: string;
    smtpPort: number;
    smtpEnc: "ssl" | "tls";
    imapHost: string;
    imapPort: number;
    imapEnc: "ssl" | "tls";
  }
> = {
  lark: {
    name: "Lark Mail (Feishu)",
    description: "Rekomendasi internal ekosistem Lark & Feishu Suite",
    tag: "Direkomendasikan",
    smtpHost: "smtp.larksuite.com",
    smtpPort: 465,
    smtpEnc: "ssl",
    imapHost: "imap.larksuite.com",
    imapPort: 993,
    imapEnc: "ssl",
  },
  gmail: {
    name: "Google Workspace / Gmail",
    description: "Gunakan Google App Password (2-Step Verification)",
    tag: "Google Cloud",
    smtpHost: "smtp.gmail.com",
    smtpPort: 465,
    smtpEnc: "ssl",
    imapHost: "imap.gmail.com",
    imapPort: 993,
    imapEnc: "ssl",
  },
  office365: {
    name: "Microsoft 365 / Outlook",
    description: "Koneksi Exchange / Outlook dengan STARTTLS",
    tag: "Microsoft 365",
    smtpHost: "smtp.office365.com",
    smtpPort: 587,
    smtpEnc: "tls",
    imapHost: "outlook.office365.com",
    imapPort: 993,
    imapEnc: "ssl",
  },
  custom: {
    name: "Custom SMTP & IMAP",
    description: "Server mandiri, cPanel, Zimbra, Postfix, dsb.",
    tag: "Fleksibel",
    smtpHost: "",
    smtpPort: 465,
    smtpEnc: "ssl",
    imapHost: "",
    imapPort: 993,
    imapEnc: "ssl",
  },
};

export function EmailIntegrationSubTab() {
  const toast = useToast();
  const qc = useQueryClient();

  const [activeSubTab, setActiveSubTab] = useState<EmailSubTab>("smtp");
  const [provider, setProvider] = useState<ProviderPreset>("lark");

  // SMTP States
  const [smtpHost, setSmtpHost] = useState("smtp.larksuite.com");
  const [smtpPort, setSmtpPort] = useState(465);
  const [smtpEnc, setSmtpEnc] = useState<"ssl" | "tls" | "none">("ssl");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [fromName, setFromName] = useState("Leadsy Sales Team");
  const [fromAddress, setFromAddress] = useState("");

  // IMAP States
  const [imapEnabled, setImapEnabled] = useState(true);
  const [imapHost, setImapHost] = useState("imap.larksuite.com");
  const [imapPort, setImapPort] = useState(993);
  const [imapEnc, setImapEnc] = useState<"ssl" | "tls" | "none">("ssl");
  const [imapUser, setImapUser] = useState("");
  const [imapPass, setImapPass] = useState("");
  const [showImapPass, setShowImapPass] = useState(false);
  const [syncInterval, setSyncInterval] = useState(15);

  // Testing & Diagnostics
  const [testResult, setTestResult] = useState<{
    type: "smtp" | "imap";
    success: boolean;
    message: string;
  } | null>(null);
  const [testingType, setTestingType] = useState<"smtp" | "imap" | null>(null);

  // Fetch saved configs
  const { data: configData, isLoading } = useQuery({
    queryKey: ["email-integration-config"],
    queryFn: async () => {
      const res = await apiFetch("/settings/email");
      if (!res.ok) throw new Error("Gagal mengambil konfigurasi email");
      const json = await res.json();
      return json.data;
    },
  });

  useEffect(() => {
    if (configData) {
      if (configData.mail_provider && configData.mail_provider in PRESETS) {
        setProvider(configData.mail_provider as ProviderPreset);
      }
      setSmtpHost(configData.smtp_host || "");
      setSmtpPort(configData.smtp_port || 465);
      setSmtpEnc(configData.smtp_encryption || "ssl");
      setSmtpUser(configData.smtp_username || "");
      setFromName(configData.mail_from_name || "Leadsy Sales Team");
      setFromAddress(configData.mail_from_address || "");

      setImapEnabled(Boolean(configData.imap_enabled));
      setImapHost(configData.imap_host || "");
      setImapPort(configData.imap_port || 993);
      setImapEnc(configData.imap_encryption || "ssl");
      setImapUser(configData.imap_username || "");
      setSyncInterval(configData.sync_interval || 15);
    }
  }, [configData]);

  const handleApplyPreset = (presetKey: ProviderPreset) => {
    setProvider(presetKey);
    const p = PRESETS[presetKey];
    if (presetKey !== "custom") {
      setSmtpHost(p.smtpHost);
      setSmtpPort(p.smtpPort);
      setSmtpEnc(p.smtpEnc);
      setImapHost(p.imapHost);
      setImapPort(p.imapPort);
      setImapEnc(p.imapEnc);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        mail_provider: provider,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_encryption: smtpEnc,
        smtp_username: smtpUser,
        mail_from_name: fromName,
        mail_from_address: fromAddress,
        imap_enabled: imapEnabled,
        imap_host: imapHost,
        imap_port: imapPort,
        imap_encryption: imapEnc,
        imap_username: imapUser,
        sync_interval: syncInterval,
      };
      if (smtpPass) payload.smtp_password = smtpPass;
      if (imapPass) payload.imap_password = imapPass;

      const res = await apiFetch("/settings/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal menyimpan konfigurasi email");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Berhasil Disimpan", "Pengaturan integrasi email dan sinkronisasi inbox telah diperbarui.");
      qc.invalidateQueries({ queryKey: ["email-integration-config"] });
    },
    onError: (err: Error) => {
      toast.error("Gagal Menyimpan", err.message || "Terjadi kesalahan saat menyimpan pengaturan.");
    },
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const syncMutation = useMutation({
    mutationFn: async () => {
      setIsSyncing(true);
      const res = await apiFetch("/settings/email/sync", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Gagal mensinkronkan email dari server IMAP.");
      }
      return json;
    },
    onSuccess: (data: { message?: string }) => {
      toast.success("Sinkronisasi Selesai", data.message || "Email berhasil disinkronkan.");
      qc.invalidateQueries({ queryKey: ["email-integration-config"] });
    },
    onError: (err: Error) => {
      toast.error("Sinkronisasi Gagal", err.message || "Pastikan kredensial IMAP benar dan App Password aktif.");
    },
    onSettled: () => {
      setIsSyncing(false);
    },
  });

  const runTestConnection = async (type: "smtp" | "imap") => {
    setTestingType(type);
    setTestResult(null);

    const host = type === "smtp" ? smtpHost : imapHost;
    const port = type === "smtp" ? smtpPort : imapPort;
    const encryption = type === "smtp" ? smtpEnc : imapEnc;
    const username = type === "smtp" ? smtpUser : imapUser;
    const password = type === "smtp" ? smtpPass : imapPass;

    try {
      const res = await apiFetch("/settings/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, host, port, encryption, username, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setTestResult({ type, success: false, message: json.message || "Koneksi gagal" });
      } else {
        setTestResult({ type, success: true, message: json.message || "Koneksi berhasil terhubung!" });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal menghubungkan ke server email.";
      setTestResult({ type, success: false, message });
    } finally {
      setTestingType(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <Card className="border-border bg-card">
        <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 border border-brand/20 text-brand">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold text-foreground">Email & SMTP Setup</h2>
                <Badge variant="outline" className="border-brand/30 bg-brand/5 text-brand text-[11px] font-medium">
                  {PRESETS[provider]?.name || "Custom Server"}
                </Badge>
                {imapEnabled ? (
                  <Badge variant="success" className="text-[10px]">
                    IMAP Sync Aktif
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    IMAP Nonaktif
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                Konfigurasikan outgoing server (SMTP) untuk pengiriman penawaran dan incoming server (IMAP) untuk sinkronisasi pesan prospek secara berkala ke Omnichannel Inbox.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncMutation.mutate()}
              disabled={isSyncing || isLoading || !imapEnabled}
              className="gap-1.5 h-9 text-xs border-brand/30 hover:bg-brand/10 text-brand"
              title="Tarik email baru dari kotak masuk IMAP ke Omnichannel Inbox"
            >
              {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Sinkronkan Sekarang
            </Button>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || isLoading}
              className="bg-brand text-white hover:bg-brand/90 gap-1.5 h-9 text-xs shadow-xs"
            >
              {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
              Simpan Konfigurasi
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Alert Banner if any */}
      {testResult && (
        <div
          className={cn(
            "p-4 rounded-xl border text-xs flex items-start gap-3 transition-all",
            testResult.success
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          )}
        >
          {testResult.success ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-semibold uppercase tracking-wider text-[10px]">
              Hasil Uji Koneksi {testResult.type.toUpperCase()}:
            </p>
            <p className="mt-0.5 leading-relaxed">{testResult.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setTestResult(null)}
            className="text-muted-foreground hover:text-foreground text-sm font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Sub-Tabs Navigation */}
      <Tabs
        value={activeSubTab}
        onValueChange={setActiveSubTab}
        items={[
          { key: "smtp", label: "Pengiriman (SMTP Outbound)", icon: Send },
          { key: "imap", label: "Penerimaan & Sinkronisasi (IMAP)", icon: Server },
          { key: "guides", label: "Panduan & Keamanan", icon: Shield },
        ]}
      />

      {/* SUB-TAB 1: SMTP OUTBOUND */}
      {activeSubTab === "smtp" && (
        <div className="space-y-6">
          {/* Preset Selector */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <Globe className="h-4 w-4 text-brand" />
                  Preset Layanan Email
                </CardTitle>
                <span className="text-[11px] text-muted-foreground">Pilih konfigurasi siap pakai</span>
              </div>
              <CardDescription className="text-xs">
                Pilih penyedia email perusahaan Anda untuk mengisi parameter host, port, dan enkripsi standar secara otomatis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(Object.keys(PRESETS) as ProviderPreset[]).map((key) => {
                  const isSelected = provider === key;
                  const item = PRESETS[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleApplyPreset(key)}
                      className={cn(
                        "p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[92px]",
                        isSelected
                          ? "border-brand bg-brand/10 text-brand ring-1 ring-brand font-medium shadow-xs"
                          : "border-border bg-card hover:bg-muted/40 text-foreground"
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold">{item.name}</p>
                          {isSelected && <Check className="h-3.5 w-3.5 text-brand shrink-0" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-snug line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                      <Badge variant="outline" className="mt-2 w-fit text-[9px] px-1.5 py-0 border-border/60">
                        {item.tag}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Outgoing Mail (SMTP) Settings Card */}
          <Card className="border-border bg-card">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Send className="h-4 w-4 text-brand" />
                    Konfigurasi Server Keluar (SMTP)
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Digunakan saat sales mengirim email penawaran, memo, atau membalas pesan dari Omnichannel Inbox.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  Outbound Mail
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-foreground">SMTP Host Server</label>
                  <Input
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.larksuite.com atau smtp.gmail.com"
                    className="h-9 text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">Hostname atau FQDN mail server pengirim.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Port SMTP</label>
                  <Input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(Number(e.target.value))}
                    placeholder="465"
                    className="h-9 text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">Standar: 465 (SSL) atau 587 (TLS).</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Protokol Enkripsi</label>
                  <select
                    value={smtpEnc}
                    onChange={(e) => setSmtpEnc(e.target.value as "ssl" | "tls" | "none")}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-hidden"
                  >
                    <option value="ssl">SSL / SMTPS (Port 465 - Direkomendasikan)</option>
                    <option value="tls">TLS / STARTTLS (Port 587)</option>
                    <option value="none">Plain / None (Port 25 - Tidak Terenkripsi)</option>
                  </select>
                  <p className="text-[10px] text-muted-foreground">Pilih enkripsi yang didukung server email Anda.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Username / Email Akun</label>
                  <Input
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder="sales@perusahaan.com"
                    className="h-9 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">Alamat email lengkap untuk login otentikasi.</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">
                    Password / App Password
                    {configData?.smtp_has_password && !smtpPass && (
                      <span className="ml-2 text-emerald-600 dark:text-emerald-400 text-[10px] font-normal">
                        ✓ Tersimpan aman di database terenkripsi
                      </span>
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSmtpPass(!showSmtpPass)}
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                  >
                    {showSmtpPass ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {showSmtpPass ? "Sembunyikan" : "Tampilkan"}
                  </button>
                </div>
                <Input
                  type={showSmtpPass ? "text" : "password"}
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  placeholder={
                    configData?.smtp_has_password
                      ? "•••••••• (Biarkan kosong jika tidak ingin mengubah password)"
                      : "Masukkan password atau App Authorization Code"
                  }
                  className="h-9 text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  Gunakan <strong>App Password (Google)</strong> atau <strong>Client Authorization Code (Lark)</strong>, bukan password login akun utama.
                </p>
              </div>

              {/* Sender Details */}
              <div className="pt-3 border-t border-border/50">
                <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-brand" />
                  Identitas Pengirim (Sender Identity)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Nama Pengirim (From Name)</label>
                    <Input
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      placeholder="Contoh: PT Leadsy Sukses Mandiri"
                      className="h-9 text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">Nama yang tampil pada kotak masuk penerima email.</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Email Pengirim (From Address)</label>
                    <Input
                      value={fromAddress}
                      onChange={(e) => setFromAddress(e.target.value)}
                      placeholder="sales@perusahaan.com"
                      className="h-9 text-xs font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">Alamat email yang digunakan sebagai alamat pengirim sah.</p>
                  </div>
                </div>
              </div>

              {/* Bottom Test Button */}
              <div className="pt-3 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  Uji koneksi sebelum menyimpan untuk memastikan otentikasi SMTP berhasil.
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => runTestConnection("smtp")}
                  disabled={testingType === "smtp" || !smtpHost}
                  className="h-9 text-xs gap-1.5 shrink-0"
                >
                  {testingType === "smtp" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Test Koneksi SMTP
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SUB-TAB 2: IMAP INBOUND SYNC */}
      {activeSubTab === "imap" && (
        <div className="space-y-6">
          {/* Inbound Sync Activation Card */}
          <Card className="border-border bg-card">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                  <Server className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">Sinkronisasi Kotak Masuk (IMAP Inbound)</h3>
                    <Badge variant={imapEnabled ? "success" : "outline"} className="text-[10px]">
                      {imapEnabled ? "Sinkronisasi Aktif" : "Nonaktif"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ketika aktif, sistem Leadsy secara berkala mengunduh email masuk dari kontak prospek dan memasukkannya ke thread percakapan Omnichannel.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={imapEnabled}
                  onChange={(e) => setImapEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
              </label>
            </CardContent>
          </Card>

          {/* Incoming Server (IMAP) Form Card */}
          <Card className={cn("border-border bg-card transition-opacity", !imapEnabled && "opacity-60")}>
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Server className="h-4 w-4 text-blue-500" />
                    Parameter Server Masuk (IMAP)
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Protokol penarikan pesan dari kotak masuk provider email Anda ke dalam Omnichannel Leadsy.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  Inbound Mail
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-medium text-foreground">IMAP Host Server</label>
                  <Input
                    disabled={!imapEnabled}
                    value={imapHost}
                    onChange={(e) => setImapHost(e.target.value)}
                    placeholder="imap.larksuite.com atau imap.gmail.com"
                    className="h-9 text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">Hostname mail server IMAP.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Port IMAP</label>
                  <Input
                    disabled={!imapEnabled}
                    type="number"
                    value={imapPort}
                    onChange={(e) => setImapPort(Number(e.target.value))}
                    placeholder="993"
                    className="h-9 text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">Standar: 993 (SSL) atau 143 (TLS).</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Protokol Enkripsi IMAP</label>
                  <select
                    disabled={!imapEnabled}
                    value={imapEnc}
                    onChange={(e) => setImapEnc(e.target.value as "ssl" | "tls" | "none")}
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-hidden disabled:opacity-50"
                  >
                    <option value="ssl">SSL / IMAPS (Port 993 - Direkomendasikan)</option>
                    <option value="tls">TLS / STARTTLS (Port 143)</option>
                    <option value="none">Plain / None (Port 143)</option>
                  </select>
                  <p className="text-[10px] text-muted-foreground">Direkomendasikan selalu menggunakan SSL (Port 993).</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Username / Email IMAP</label>
                  <Input
                    disabled={!imapEnabled}
                    value={imapUser}
                    onChange={(e) => setImapUser(e.target.value)}
                    placeholder="sales@perusahaan.com"
                    className="h-9 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">Alamat email lengkap untuk autentikasi IMAP.</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">
                    Password / App Password IMAP
                    {configData?.imap_has_password && !imapPass && (
                      <span className="ml-2 text-emerald-600 dark:text-emerald-400 text-[10px] font-normal">
                        ✓ Tersimpan aman di database terenkripsi
                      </span>
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowImapPass(!showImapPass)}
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                  >
                    {showImapPass ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {showImapPass ? "Sembunyikan" : "Tampilkan"}
                  </button>
                </div>
                <Input
                  disabled={!imapEnabled}
                  type={showImapPass ? "text" : "password"}
                  value={imapPass}
                  onChange={(e) => setImapPass(e.target.value)}
                  placeholder={
                    configData?.imap_has_password
                      ? "•••••••• (Biarkan kosong jika tidak ingin mengubah password)"
                      : "Masukkan password IMAP atau App Authorization Code"
                  }
                  className="h-9 text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  Gunakan App Authorization Code jika menggunakan Lark, atau App Password jika menggunakan Gmail.
                </p>
              </div>

              {/* Sync Interval */}
              <div className="pt-3 border-t border-border/50">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-brand" />
                    Frekuensi Sinkronisasi Otomatis
                  </label>
                  <select
                    disabled={!imapEnabled}
                    value={syncInterval}
                    onChange={(e) => setSyncInterval(Number(e.target.value))}
                    className="w-full md:w-80 h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground focus:outline-hidden disabled:opacity-50"
                  >
                    <option value={5}>Setiap 5 Menit (Cepat - Responsif)</option>
                    <option value={15}>Setiap 15 Menit (Standar - Direkomendasikan)</option>
                    <option value={30}>Setiap 30 Menit</option>
                    <option value={60}>Setiap 1 Jam</option>
                  </select>
                  <p className="text-[10px] text-muted-foreground">
                    Sistem scheduler akan memicu penarikan pesan dari kotak masuk setiap interval yang dipilih.
                  </p>
                </div>
              </div>

              {/* Bottom Test Button */}
              <div className="pt-3 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  Uji koneksi IMAP untuk memastikan Leadsy dapat membaca folder inbox email Anda.
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => runTestConnection("imap")}
                    disabled={testingType === "imap" || !imapEnabled || !imapHost}
                    className="h-9 text-xs gap-1.5 shrink-0"
                  >
                    {testingType === "imap" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Test Koneksi IMAP
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SUB-TAB 3: GUIDES & SECURITY */}
      {activeSubTab === "guides" && (
        <div className="space-y-6">
          {/* Important Security Callout */}
          <div className="rounded-xl border border-brand/20 bg-brand/5 p-4.5 text-xs text-foreground space-y-2">
            <div className="flex items-center gap-2 font-semibold text-brand">
              <Lock className="h-4 w-4" />
              <span>Standar Keamanan & Otentikasi Email Pihak Ketiga</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Sebagian besar penyedia email modern (Lark, Google Workspace, Microsoft) secara default memblokir login pihak ketiga yang menggunakan password login utama. Anda wajib menggunakan <strong>App Authorization Code</strong> atau <strong>App Password</strong> yang dibuat dari konsol keamanan masing-masing penyedia.
            </p>
          </div>

          {/* Provider Specific Step-by-Step Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Lark Mail Guide */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Sparkles className="h-4 w-4 text-brand" />
                    Panduan Lark Mail / Feishu
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] border-brand/30 text-brand">
                    Lark Suite
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-2.5 text-xs text-muted-foreground">
                <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                  <li>
                    Buka aplikasi <strong>Lark Desktop</strong> di komputer Anda.
                  </li>
                  <li>
                    Klik <strong>Foto Profil</strong> Anda di sudut kiri atas → pilih <strong>Settings</strong>.
                  </li>
                  <li>
                    Masuk ke menu <strong>Mail</strong>, lalu gulir ke bawah ke bagian <strong>Third-party client</strong>.
                  </li>
                  <li>
                    Aktifkan toggle <strong>IMAP/SMTP service</strong> menjadi On.
                  </li>
                  <li>
                    Klik tombol <strong>Generate</strong> untuk membuat <strong>Client Authorization Code (16 digit)</strong>.
                  </li>
                  <li>
                    Gunakan kode 16 digit tersebut sebagai password pada tab <strong>Pengiriman (SMTP)</strong> dan <strong>Penerimaan (IMAP)</strong> di Leadsy.
                  </li>
                </ol>
                <div className="mt-3 p-2.5 rounded-lg bg-muted/40 border border-border text-[11px]">
                  <strong>Host Lark:</strong> SMTP <code className="text-brand">smtp.larksuite.com:465 (SSL)</code> & IMAP <code className="text-brand">imap.larksuite.com:993 (SSL)</code>.
                </div>
              </CardContent>
            </Card>

            {/* Google Workspace Guide */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Globe className="h-4 w-4 text-brand" />
                    Panduan Google Workspace / Gmail
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px]">
                    Google Cloud
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-2.5 text-xs text-muted-foreground">
                <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                  <li>
                    Buka setelan akun Google di <strong>myaccount.google.com</strong>.
                  </li>
                  <li>
                    Pilih menu <strong>Security</strong> di sebelah kiri.
                  </li>
                  <li>
                    Pastikan <strong>2-Step Verification</strong> sudah dalam status <strong>Aktif</strong>.
                  </li>
                  <li>
                    Cari dan klik menu <strong>App Passwords</strong> (Sandi Aplikasi).
                  </li>
                  <li>
                    Ketik nama aplikasi (misal: <em>Leadsy CRM</em>), lalu klik <strong>Create</strong>.
                  </li>
                  <li>
                    Salin 16 digit sandi aplikasi yang dihasilkan (tanpa spasi) dan tempel ke kolom password SMTP & IMAP Leadsy.
                  </li>
                </ol>
                <div className="mt-3 p-2.5 rounded-lg bg-muted/40 border border-border text-[11px]">
                  <strong>Host Google:</strong> SMTP <code className="text-brand">smtp.gmail.com:465 (SSL)</code> & IMAP <code className="text-brand">imap.gmail.com:993 (SSL)</code>.
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Reference Table of Ports */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Info className="h-4 w-4 text-brand" />
                Daftar Port & Protokol Standar Industri
              </CardTitle>
              <CardDescription className="text-xs">
                Gunakan acuan port dan enkripsi berikut saat mengkonfigurasi server mandiri atau server khusus perusahaan.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground font-medium">
                      <th className="pb-2">Protokol</th>
                      <th className="pb-2">Fungsi</th>
                      <th className="pb-2">Port Standar</th>
                      <th className="pb-2">Tipe Enkripsi</th>
                      <th className="pb-2">Status Rekomendasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 text-foreground">
                    <tr>
                      <td className="py-2.5 font-medium font-mono">SMTP (SMTPS)</td>
                      <td className="py-2.5 text-muted-foreground">Pengiriman Pesan Keluar</td>
                      <td className="py-2.5 font-mono text-brand font-semibold">465</td>
                      <td className="py-2.5">SSL / TLS implisit</td>
                      <td className="py-2.5">
                        <Badge variant="success" className="text-[10px]">
                          Sangat Direkomendasikan
                        </Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-medium font-mono">SMTP (STARTTLS)</td>
                      <td className="py-2.5 text-muted-foreground">Pengiriman Pesan Keluar</td>
                      <td className="py-2.5 font-mono text-brand font-semibold">587</td>
                      <td className="py-2.5">STARTTLS eksplisit</td>
                      <td className="py-2.5">
                        <Badge variant="outline" className="text-[10px]">
                          Direkomendasikan (Outlook / O365)
                        </Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-medium font-mono">IMAP (IMAPS)</td>
                      <td className="py-2.5 text-muted-foreground">Sinkronisasi Kotak Masuk</td>
                      <td className="py-2.5 font-mono text-brand font-semibold">993</td>
                      <td className="py-2.5">SSL / TLS implisit</td>
                      <td className="py-2.5">
                        <Badge variant="success" className="text-[10px]">
                          Sangat Direkomendasikan
                        </Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-medium font-mono">IMAP (STARTTLS)</td>
                      <td className="py-2.5 text-muted-foreground">Sinkronisasi Kotak Masuk</td>
                      <td className="py-2.5 font-mono text-brand font-semibold">143</td>
                      <td className="py-2.5">STARTTLS eksplisit</td>
                      <td className="py-2.5">
                        <Badge variant="outline" className="text-[10px]">
                          Alternatif Legacy
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
