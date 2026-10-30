"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mail, Server, Key, Shield, CheckCircle2, XCircle, Loader2,
  RefreshCw, Send, ArrowRight, Info, Eye, EyeOff, Sparkles, Globe
} from "lucide-react";
import { BackToSettings } from "@/app/settings/_components/back-to-settings";
import { apiFetch } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

type ProviderPreset = "lark" | "gmail" | "office365" | "custom";

const PRESETS: Record<ProviderPreset, { name: string; smtpHost: string; smtpPort: number; smtpEnc: "ssl" | "tls"; imapHost: string; imapPort: number; imapEnc: "ssl" | "tls" }> = {
  lark: {
    name: "Lark Mail (Feishu / LarkSuite)",
    smtpHost: "smtp.larksuite.com",
    smtpPort: 465,
    smtpEnc: "ssl",
    imapHost: "imap.larksuite.com",
    imapPort: 993,
    imapEnc: "ssl"
  },
  gmail: {
    name: "Google Workspace / Gmail",
    smtpHost: "smtp.gmail.com",
    smtpPort: 465,
    smtpEnc: "ssl",
    imapHost: "imap.gmail.com",
    imapPort: 993,
    imapEnc: "ssl"
  },
  office365: {
    name: "Microsoft 365 / Outlook",
    smtpHost: "smtp.office365.com",
    smtpPort: 587,
    smtpEnc: "tls",
    imapHost: "outlook.office365.com",
    imapPort: 993,
    imapEnc: "ssl"
  },
  custom: {
    name: "Custom SMTP & IMAP Server",
    smtpHost: "",
    smtpPort: 465,
    smtpEnc: "ssl",
    imapHost: "",
    imapPort: 993,
    imapEnc: "ssl"
  }
};

export default function EmailSettingsPage() {
  const toast = useToast();
  const qc = useQueryClient();

  const [provider, setProvider] = useState<ProviderPreset>("lark");
  const [smtpHost, setSmtpHost] = useState("smtp.larksuite.com");
  const [smtpPort, setSmtpPort] = useState(465);
  const [smtpEnc, setSmtpEnc] = useState<"ssl" | "tls" | "none">("ssl");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [fromName, setFromName] = useState("Leadsy Sales Team");
  const [fromAddress, setFromAddress] = useState("");

  const [imapEnabled, setImapEnabled] = useState(true);
  const [imapHost, setImapHost] = useState("imap.larksuite.com");
  const [imapPort, setImapPort] = useState(993);
  const [imapEnc, setImapEnc] = useState<"ssl" | "tls" | "none">("ssl");
  const [imapUser, setImapUser] = useState("");
  const [imapPass, setImapPass] = useState("");
  const [showImapPass, setShowImapPass] = useState(false);
  const [syncInterval, setSyncInterval] = useState(15);

  const [testResult, setTestResult] = useState<{ type: "smtp" | "imap"; success: boolean; message: string } | null>(null);
  const [testingType, setTestingType] = useState<"smtp" | "imap" | null>(null);

  // Fetch saved configs
  const { data: configData, isLoading } = useQuery({
    queryKey: ["email-integration-config"],
    queryFn: async () => {
      const res = await apiFetch("/settings/email");
      if (!res.ok) throw new Error("Gagal mengambil konfigurasi email");
      const json = await res.json();
      return json.data;
    }
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
      const payload: Record<string, any> = {
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
        body: JSON.stringify(payload)
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
    onError: (err: any) => {
      toast.error("Gagal Menyimpan", err.message || "Terjadi kesalahan saat menyimpan pengaturan.");
    }
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
    onSuccess: (data: any) => {
      toast.success("Sinkronisasi Selesai", data.message || "Email berhasil disinkronkan.");
      qc.invalidateQueries({ queryKey: ["email-integration-config"] });
    },
    onError: (err: any) => {
      toast.error("Sinkronisasi Gagal", err.message || "Pastikan kredensial IMAP benar dan App Password aktif.");
    },
    onSettled: () => {
      setIsSyncing(false);
    }
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
        body: JSON.stringify({ type, host, port, encryption, username, password })
      });
      const json = await res.json();
      if (!res.ok) {
        setTestResult({ type, success: false, message: json.message || "Koneksi gagal" });
      } else {
        setTestResult({ type, success: true, message: json.message || "Koneksi berhasil terhubung!" });
      }
    } catch (err: any) {
      setTestResult({ type, success: false, message: err.message || "Gagal menghubungkan ke server email." });
    } finally {
      setTestingType(null);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BackToSettings />
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Mail className="h-6 w-6 text-brand" />
              Email Integration Setup
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hubungkan akun email (Lark Mail, Google Workspace, atau Custom SMTP/IMAP) untuk sinkronisasi percakapan di Omnichannel Inbox.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={isSyncing || isLoading}
            className="gap-1.5 h-9 text-xs border-brand/30 hover:bg-brand/10 text-brand"
            title="Tarik email baru dari kotak masuk IMAP ke Omnichannel Inbox"
          >
            {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Sinkronkan Email Sekarang
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || isLoading}
            className="bg-brand text-white hover:bg-brand/90 gap-1.5 h-9 text-xs shadow-xs"
          >
            {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
            Simpan Konfigurasi
          </Button>
        </div>
      </div>

      {/* Guide Callout for Lark & Google Workspace */}
      <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 text-xs text-foreground space-y-1.5">
        <div className="flex items-center gap-2 font-semibold text-blue-600 dark:text-blue-400">
          <Info className="h-4 w-4" />
          <span>Panduan Penting: Otentikasi Password Email Pihak Ketiga (Lark & Gmail)</span>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Penyedia email modern melarang penggunaan password login akun utama untuk koneksi IMAP/SMTP pihak ketiga.
        </p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-1">
          <li>
            <strong>Lark Mail / Feishu:</strong> Buka <em>Lark Desktop → Settings → Mail → Third-party client</em>, aktifkan <strong>IMAP/SMTP service</strong>, lalu buat <strong>Client Authorization Code (16 digit)</strong> dan masukkan sebagai password di form ini.
          </li>
          <li>
            <strong>Google Workspace / Gmail:</strong> Aktifkan 2-Step Verification pada akun Google, lalu buat <strong>Google App Password</strong> (bukan password akun biasa).
          </li>
        </ul>
      </div>

      {/* Preset Selector */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Globe className="h-4 w-4 text-brand" />
            Pilih Layanan Email
          </CardTitle>
          <CardDescription className="text-xs">
            Gunakan konfigurasi otomatis dari penyedia email perusahaan Anda atau atur parameter secara manual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(Object.keys(PRESETS) as ProviderPreset[]).map((key) => {
              const isSelected = provider === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleApplyPreset(key)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-brand bg-brand/10 text-brand ring-1 ring-brand font-semibold shadow-xs"
                      : "border-border bg-background hover:bg-muted/40 text-foreground"
                  }`}
                >
                  <p className="text-xs font-semibold">{PRESETS[key].name}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {key === "lark" ? "Rekomendasi internal Lark" : key === "custom" ? "Port & SSL fleksibel" : "OAuth / App Password"}
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Test Alert Banner if any */}
      {testResult && (
        <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
          testResult.success
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            : "bg-destructive/10 border-destructive/30 text-destructive"
        }`}>
          {testResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
          <div className="flex-1">
            <p className="font-semibold uppercase tracking-wider text-[10px]">
              Hasil Uji Koneksi {testResult.type.toUpperCase()}:
            </p>
            <p className="mt-0.5 leading-relaxed">{testResult.message}</p>
          </div>
          <button type="button" onClick={() => setTestResult(null)} className="text-muted-foreground hover:text-foreground">
            ×
          </button>
        </div>
      )}

      {/* Grid: SMTP (Outgoing) and IMAP (Inbound Sync) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Outgoing Mail (SMTP) */}
        <Card className="border-border bg-card flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Send className="h-4 w-4 text-brand" />
                Outgoing Server (SMTP)
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">Pengiriman Pesan</Badge>
            </div>
            <CardDescription className="text-xs">
              Digunakan saat sales mengirimkan email penawaran atau membalas pesan dari Inbox.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5 flex-1">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">SMTP Host</label>
                <Input
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.larksuite.com"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Port</label>
                <Input
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(Number(e.target.value))}
                  placeholder="465"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Enkripsi</label>
                <select
                  value={smtpEnc}
                  onChange={(e) => setSmtpEnc(e.target.value as any)}
                  className="w-full h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus:outline-hidden"
                >
                  <option value="ssl">SSL (Port 465)</option>
                  <option value="tls">TLS / STARTTLS (Port 587)</option>
                  <option value="none">None (Port 25)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Username / Email</label>
                <Input
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="sales@perusahaan.com"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Password / App Password
                  {configData?.smtp_has_password && !smtpPass && (
                    <span className="ml-1.5 text-emerald-600 text-[10px]">(Tersimpan di server)</span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={() => setShowSmtpPass(!showSmtpPass)}
                  className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  {showSmtpPass ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {showSmtpPass ? "Sembunyikan" : "Lihat"}
                </button>
              </div>
              <Input
                type={showSmtpPass ? "text" : "password"}
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder={configData?.smtp_has_password ? "•••••••• (Biarkan kosong jika tidak diubah)" : "Masukkan password email"}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Sender From Name</label>
                <Input
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="Leadsy Sales Team"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Sender From Email</label>
                <Input
                  value={fromAddress}
                  onChange={(e) => setFromAddress(e.target.value)}
                  placeholder="sales@perusahaan.com"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => runTestConnection("smtp")}
                disabled={testingType === "smtp" || !smtpHost}
                className="h-8 text-xs gap-1.5"
              >
                {testingType === "smtp" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Test Koneksi SMTP
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Inbound Mail Sync (IMAP) */}
        <Card className="border-border bg-card flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Server className="h-4 w-4 text-blue-500" />
                Incoming Server (IMAP Sync)
              </CardTitle>
              <Badge variant={imapEnabled ? "success" : "outline"} className="text-[10px]">
                {imapEnabled ? "Sinkronisasi Aktif" : "Nonaktif"}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Menarik email masuk dari klien ke dalam timeline percakapan Omnichannel Inbox secara berkala.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5 flex-1">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border">
              <div>
                <p className="text-xs font-semibold text-foreground">Aktifkan Sinkronisasi Email Masuk</p>
                <p className="text-[10px] text-muted-foreground">Tarik email prospek otomatis ke tab Inbox.</p>
              </div>
              <input
                type="checkbox"
                checked={imapEnabled}
                onChange={(e) => setImapEnabled(e.target.checked)}
                className="h-4 w-4 rounded-md border-border text-brand focus:ring-brand"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">IMAP Host</label>
                <Input
                  disabled={!imapEnabled}
                  value={imapHost}
                  onChange={(e) => setImapHost(e.target.value)}
                  placeholder="imap.larksuite.com"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Port</label>
                <Input
                  disabled={!imapEnabled}
                  type="number"
                  value={imapPort}
                  onChange={(e) => setImapPort(Number(e.target.value))}
                  placeholder="993"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Enkripsi IMAP</label>
                <select
                  disabled={!imapEnabled}
                  value={imapEnc}
                  onChange={(e) => setImapEnc(e.target.value as any)}
                  className="w-full h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus:outline-hidden disabled:opacity-50"
                >
                  <option value="ssl">SSL (Port 993)</option>
                  <option value="tls">TLS (Port 143)</option>
                  <option value="none">None</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">IMAP Username</label>
                <Input
                  disabled={!imapEnabled}
                  value={imapUser}
                  onChange={(e) => setImapUser(e.target.value)}
                  placeholder="sales@perusahaan.com"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Password IMAP
                  {configData?.imap_has_password && !imapPass && (
                    <span className="ml-1.5 text-emerald-600 text-[10px]">(Tersimpan di server)</span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={() => setShowImapPass(!showImapPass)}
                  className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  {showImapPass ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {showImapPass ? "Sembunyikan" : "Lihat"}
                </button>
              </div>
              <Input
                disabled={!imapEnabled}
                type={showImapPass ? "text" : "password"}
                value={imapPass}
                onChange={(e) => setImapPass(e.target.value)}
                placeholder={configData?.imap_has_password ? "•••••••• (Biarkan kosong jika tidak diubah)" : "Masukkan password IMAP"}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1 pt-1 border-t border-border/50">
              <label className="text-[11px] font-medium text-muted-foreground">Interval Sinkronisasi Otomatis</label>
              <select
                disabled={!imapEnabled}
                value={syncInterval}
                onChange={(e) => setSyncInterval(Number(e.target.value))}
                className="w-full h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus:outline-hidden disabled:opacity-50"
              >
                <option value={5}>Setiap 5 Menit (Cepat)</option>
                <option value={15}>Setiap 15 Menit (Standar)</option>
                <option value={30}>Setiap 30 Menit</option>
                <option value={60}>Setiap 1 Jam</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => runTestConnection("imap")}
                disabled={testingType === "imap" || !imapEnabled || !imapHost}
                className="h-8 text-xs gap-1.5"
              >
                {testingType === "imap" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Test Koneksi IMAP
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lark Enterprise Note */}
      <Card className="border-border bg-card/60">
        <CardContent className="p-4 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-brand shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-foreground">Integrasi Native Lark Mail & Feishu Suite</p>
            <p className="text-muted-foreground leading-relaxed">
              Jika menggunakan akun email Lark (contoh: domain perusahaan yang dikelola via Lark Suite), cukup masukkan kredensial email pengguna di atas dengan server default <code className="text-brand">smtp.larksuite.com:465</code> dan <code className="text-brand">imap.larksuite.com:993</code>. Seluruh email masuk dari kontak prospek akan otomatis terpetakan ke timeline percakapan di Omnichannel Inbox.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
